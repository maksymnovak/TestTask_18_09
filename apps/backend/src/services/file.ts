import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import mimeTypes from 'mime-types';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { db } from '@/config/database';
import { config } from '@/config/environment';
import type { Document } from '@capital-marketplace/types';
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@capital-marketplace/types';

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

export class FileService {
  private static readonly UPLOAD_DIR = config.upload.uploadDir;
  private static readonly MAX_FILE_SIZE = config.upload.maxFileSize;

  /**
   * Initialize upload directory
   */
  static async initialize(): Promise<void> {
    try {
      await fs.access(this.UPLOAD_DIR);
    } catch {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    }
  }

  /**
   * Validate file before upload
   */
  static async validateFile(file: UploadedFile): Promise<void> {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size ${file.size} exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    // Validate file type using file-type library (more secure than trusting mimetype)
    const fileType = await fileTypeFromBuffer(file.buffer);

    if (!fileType) {
      throw new Error('Unable to determine file type');
    }

    if (!ALLOWED_FILE_TYPES.includes(fileType.mime as any)) {
      throw new Error(`File type ${fileType.mime} is not allowed`);
    }

    // Additional security checks
    await this.performSecurityChecks(file);
  }

  /**
   * Upload file to storage
   */
  static async uploadFile(
    file: UploadedFile,
    companyId: string,
    category?: string
  ): Promise<Document> {
    await this.validateFile(file);

    const fileId = uuid();
    const fileExtension = path.extname(file.originalname);
    const sanitizedName = this.sanitizeFileName(file.originalname);
    const fileName = `${fileId}${fileExtension}`;
    const filePath = path.join(this.UPLOAD_DIR, fileName);

    // Create company subdirectory
    const companyDir = path.join(this.UPLOAD_DIR, companyId);
    await fs.mkdir(companyDir, { recursive: true });

    const finalPath = path.join(companyDir, fileName);

    // Process file based on type
    let processedBuffer = file.buffer;
    if (file.mimetype.startsWith('image/')) {
      processedBuffer = await this.processImage(file.buffer);
    }

    // Write file to disk
    await fs.writeFile(finalPath, processedBuffer);

    // Save to database
    const document = await db.document.create({
      data: {
        id: fileId,
        companyId,
        name: sanitizedName,
        mimeType: file.mimetype,
        size: processedBuffer.length,
        path: finalPath,
        category: category || 'other',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return this.transformDocument(document);
  }

  /**
   * Get file by ID
   */
  static async getFile(fileId: string, companyId: string): Promise<{ document: Document; filePath: string }> {
    const document = await db.document.findFirst({
      where: {
        id: fileId,
        companyId, // Ensure user can only access their company's files
      },
    });

    if (!document) {
      throw new Error('File not found');
    }

    // Verify file exists on disk
    try {
      await fs.access(document.path);
    } catch {
      throw new Error('File not found on disk');
    }

    return {
      document: this.transformDocument(document),
      filePath: document.path,
    };
  }

  /**
   * Get all files for a company
   */
  static async getFilesByCompany(companyId: string): Promise<Document[]> {
    const documents = await db.document.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map(this.transformDocument);
  }

  /**
   * Delete file
   */
  static async deleteFile(fileId: string, companyId: string): Promise<void> {
    const document = await db.document.findFirst({
      where: {
        id: fileId,
        companyId,
      },
    });

    if (!document) {
      throw new Error('File not found');
    }

    // Delete from disk
    try {
      await fs.unlink(document.path);
    } catch (error) {
      console.warn(`Failed to delete file from disk: ${document.path}`, error);
    }

    // Delete from database
    await db.document.delete({
      where: { id: fileId },
    });
  }

  /**
   * Get file stats for a company
   */
  static async getCompanyFileStats(companyId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByCategory: Record<string, number>;
  }> {
    const documents = await db.document.findMany({
      where: { companyId },
    });

    const stats = {
      totalFiles: documents.length,
      totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
      filesByCategory: {} as Record<string, number>,
    };

    documents.forEach(doc => {
      const category = doc.category || 'other';
      stats.filesByCategory[category] = (stats.filesByCategory[category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Process images (resize, optimize)
   */
  private static async processImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(buffer)
        .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
    } catch {
      // If image processing fails, return original buffer
      return buffer;
    }
  }

  /**
   * Sanitize file name to prevent path traversal
   */
  private static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace non-alphanumeric chars
      .replace(/\.{2,}/g, '.') // Replace multiple dots
      .substring(0, 100); // Limit length
  }

  /**
   * Perform additional security checks
   */
  private static async performSecurityChecks(file: UploadedFile): Promise<void> {
    // Check for embedded scripts in images (basic check)
    if (file.mimetype.startsWith('image/')) {
      const bufferString = file.buffer.toString('ascii');
      const suspiciousPatterns = ['<script', 'javascript:', 'vbscript:', '<?php'];

      for (const pattern of suspiciousPatterns) {
        if (bufferString.includes(pattern)) {
          throw new Error('File contains potentially malicious content');
        }
      }
    }

    // Check for ZIP bombs (very basic check)
    if (file.mimetype.includes('zip') || file.mimetype.includes('compressed')) {
      const compressionRatio = file.buffer.length / file.size;
      if (compressionRatio > 100) {
        throw new Error('File appears to be a compression bomb');
      }
    }
  }

  /**
   * Transform database document to API format
   */
  private static transformDocument(document: any): Document {
    return {
      id: document.id,
      companyId: document.companyId,
      name: document.name,
      mimeType: document.mimeType,
      size: document.size,
      path: document.path,
      createdAt: document.createdAt,
    };
  }

  /**
   * Cleanup orphaned files (run periodically)
   */
  static async cleanupOrphanedFiles(): Promise<{ deleted: number; errors: number }> {
    const documents = await db.document.findMany();
    let deleted = 0;
    let errors = 0;

    for (const doc of documents) {
      try {
        await fs.access(doc.path);
      } catch {
        // File doesn't exist on disk, remove from database
        try {
          await db.document.delete({ where: { id: doc.id } });
          deleted++;
        } catch {
          errors++;
        }
      }
    }

    return { deleted, errors };
  }
}