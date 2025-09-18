import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createReadStream } from 'fs';
import { db } from '@/config/database';
import { FileService } from '@/services/file';
import { NotificationService } from '@/services/notification';
import { InvestabilityService } from '@/services/investability';
import { validateParams, validateQuery } from '@/middleware/security';
import type { ApiResponse, Document } from '@capital-marketplace/types';

const ParamsSchema = z.object({
  companyId: z.string().uuid(),
});

const FileParamsSchema = z.object({
  companyId: z.string().uuid(),
  fileId: z.string().uuid(),
});

const QuerySchema = z.object({
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function filesRoutes(fastify: FastifyInstance) {
  /**
   * Upload file to company data room
   * POST /api/files/:companyId
   */
  fastify.post<{
    Params: { companyId: string };
    Reply: ApiResponse<Document>;
  }>(
    '/:companyId',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;

        // Verify company exists
        const company = await db.company.findUnique({
          where: { id: companyId },
          include: { user: true },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        // Process multipart upload
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file provided',
          });
        }

        const buffer = await data.toBuffer();
        const file = {
          fieldname: data.fieldname,
          originalname: data.filename,
          encoding: data.encoding,
          mimetype: data.mimetype,
          buffer,
          size: buffer.length,
        };

        // Get category from fields
        const fields = data.fields as any;
        const category = fields?.category?.value || 'other';

        // Upload file
        const document = await FileService.uploadFile(file, companyId, category);

        // Send notification
        await NotificationService.notifyDocumentUploaded(company.userId, document.name);

        // Trigger score recalculation
        await InvestabilityService.onCompanyDataChange(companyId);

        // Log audit event
        await db.auditLog.create({
          data: {
            userId: company.userId,
            action: 'document_uploaded',
            resource: `Document:${document.id}`,
            metadata: JSON.stringify({
              fileName: document.name,
              fileSize: document.size,
              mimeType: document.mimeType,
              category,
              timestamp: new Date().toISOString(),
            }),
            createdAt: new Date(),
          },
        });

        const response: ApiResponse<Document> = {
          success: true,
          data: document,
          timestamp: new Date().toISOString(),
        };

        return reply.status(201).send(response);
      } catch (error) {
        console.error('Error uploading file:', error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to upload file',
        });
      }
    }
  );

  /**
   * Get all files for a company
   * GET /api/files/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
    Querystring: { category?: string; limit?: number; offset?: number };
    Reply: ApiResponse<Document[]>;
  }>(
    '/:companyId',
    {
      preHandler: [
        validateParams(ParamsSchema),
        validateQuery(QuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;
        const { category, limit, offset } = request.query;

        // Verify company exists
        const company = await db.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        // Get files with filtering
        const whereClause: any = { companyId };
        if (category) {
          whereClause.category = category;
        }

        const documents = await db.document.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        });

        const transformedDocuments = documents.map(doc => ({
          id: doc.id,
          companyId: doc.companyId,
          name: doc.name,
          mimeType: doc.mimeType,
          size: doc.size,
          path: doc.path,
          createdAt: doc.createdAt,
        }));

        const response: ApiResponse<Document[]> = {
          success: true,
          data: transformedDocuments,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching files:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch files',
        });
      }
    }
  );

  /**
   * Download file
   * GET /api/files/:companyId/:fileId/download
   */
  fastify.get<{
    Params: { companyId: string; fileId: string };
  }>(
    '/:companyId/:fileId/download',
    {
      preHandler: validateParams(FileParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId, fileId } = request.params;

        // Get file info
        const { document, filePath } = await FileService.getFile(fileId, companyId);

        // Set headers for download
        reply.header('Content-Disposition', `attachment; filename="${document.name}"`);
        reply.header('Content-Type', document.mimeType);
        reply.header('Content-Length', document.size);

        // Stream file
        const stream = createReadStream(filePath);
        return reply.send(stream);
      } catch (error) {
        console.error('Error downloading file:', error);
        return reply.status(404).send({
          success: false,
          error: error instanceof Error ? error.message : 'File not found',
        });
      }
    }
  );

  /**
   * Get file metadata
   * GET /api/files/:companyId/:fileId
   */
  fastify.get<{
    Params: { companyId: string; fileId: string };
    Reply: ApiResponse<Document>;
  }>(
    '/:companyId/:fileId',
    {
      preHandler: validateParams(FileParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId, fileId } = request.params;

        const { document } = await FileService.getFile(fileId, companyId);

        const response: ApiResponse<Document> = {
          success: true,
          data: document,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching file metadata:', error);
        return reply.status(404).send({
          success: false,
          error: error instanceof Error ? error.message : 'File not found',
        });
      }
    }
  );

  /**
   * Delete file
   * DELETE /api/files/:companyId/:fileId
   */
  fastify.delete<{
    Params: { companyId: string; fileId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>(
    '/:companyId/:fileId',
    {
      preHandler: validateParams(FileParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId, fileId } = request.params;

        // Get file info before deletion for audit log
        const { document } = await FileService.getFile(fileId, companyId);

        // Find company for audit logging
        const company = await db.company.findUnique({
          where: { id: companyId },
          include: { user: true },
        });

        // Delete file
        await FileService.deleteFile(fileId, companyId);

        // Trigger score recalculation
        await InvestabilityService.onCompanyDataChange(companyId);

        // Log audit event
        if (company) {
          await db.auditLog.create({
            data: {
              userId: company.userId,
              action: 'document_deleted',
              resource: `Document:${fileId}`,
              metadata: JSON.stringify({
                fileName: document.name,
                fileSize: document.size,
                mimeType: document.mimeType,
                timestamp: new Date().toISOString(),
              }),
              createdAt: new Date(),
            },
          });
        }

        const response: ApiResponse<{ success: boolean }> = {
          success: true,
          data: { success: true },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error deleting file:', error);
        return reply.status(404).send({
          success: false,
          error: error instanceof Error ? error.message : 'File not found',
        });
      }
    }
  );

  /**
   * Get file statistics for company
   * GET /api/files/:companyId/stats
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<any>;
  }>(
    '/:companyId/stats',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;

        // Verify company exists
        const company = await db.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        const stats = await FileService.getCompanyFileStats(companyId);

        const response = {
          success: true,
          data: stats,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching file stats:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch file statistics',
        });
      }
    }
  );
}