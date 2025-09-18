'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  EyeIcon,
  TrashIcon,
  PlusIcon,
  FolderIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { formatFileSize, formatDate } from '@/lib/utils';
import { FILE_TYPES, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@capital-marketplace/types';

interface Document {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  category?: string;
  createdAt: string | Date;
}

interface FileCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  acceptedTypes: string[];
  documents: Document[];
}

// Helper function to format file types in a user-friendly way
const getFileTypeDescription = (acceptedTypes: string[]): string => {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'image/jpeg': 'JPEG',
    'image/png': 'PNG'
  };

  const uniqueTypes = Array.from(new Set(acceptedTypes.map(type => typeMap[type] || type)));
  if (uniqueTypes.length <= 3) {
    return uniqueTypes.join(', ');
  }
  return `${uniqueTypes.slice(0, 2).join(', ')} and ${uniqueTypes.length - 2} more`;
};

export default function DataRoomPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const categories: FileCategory[] = [
    {
      id: FILE_TYPES.PITCH_DECK,
      name: 'Pitch Deck',
      description: 'Your company presentation for investors',
      icon: DocumentTextIcon,
      acceptedTypes: ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      documents: documents.filter(doc => doc.category === FILE_TYPES.PITCH_DECK),
    },
    {
      id: FILE_TYPES.FINANCIAL_STATEMENTS,
      name: 'Financial Statements',
      description: 'Financial reports, P&L, balance sheets',
      icon: DocumentTextIcon,
      acceptedTypes: ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      documents: documents.filter(doc => doc.category === FILE_TYPES.FINANCIAL_STATEMENTS),
    },
    {
      id: FILE_TYPES.BUSINESS_PLAN,
      name: 'Business Plan',
      description: 'Detailed business plan and strategy',
      icon: DocumentTextIcon,
      acceptedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      documents: documents.filter(doc => doc.category === FILE_TYPES.BUSINESS_PLAN),
    },
    {
      id: FILE_TYPES.LEGAL_DOCUMENTS,
      name: 'Legal Documents',
      description: 'Contracts, incorporation docs, IP',
      icon: DocumentTextIcon,
      acceptedTypes: ['application/pdf'],
      documents: documents.filter(doc => doc.category === FILE_TYPES.LEGAL_DOCUMENTS),
    },
    {
      id: FILE_TYPES.OTHER,
      name: 'Other Documents',
      description: 'Additional supporting materials',
      icon: FolderIcon,
      acceptedTypes: ALLOWED_FILE_TYPES as any,
      documents: documents.filter(doc => !doc.category || doc.category === FILE_TYPES.OTHER),
    },
  ];

  useEffect(() => {
    // Get company ID from various sources, same as dashboard
    loadCompanyData();
  }, []);

  const loadCompanyData = async () => {
    try {
      let company = null;

      // 1. Try to get from current session (login)
      const currentCompany = sessionStorage.getItem('current_company');
      if (currentCompany) {
        company = JSON.parse(currentCompany);
        console.log('Data room: Loaded company from session:', company.name);
      }

      // 2. Try to get from onboarding progress
      if (!company) {
        const progress = sessionStorage.getItem('onboarding_progress');
        if (progress) {
          const progressData = JSON.parse(progress);
          if (progressData.companyId) {
            const userEmail = sessionStorage.getItem('current_user_email') || 'test@example.com';
            company = await api.getCompanyByEmail(userEmail);
            console.log('Data room: Loaded company from onboarding:', company.name);
          }
        }
      }

      // 3. Fallback: try to get existing test company
      if (!company) {
        company = await api.getCompanyByEmail('test@example.com');
        console.log('Data room: Loaded existing test company:', company.name);
      }

      if (company) {
        console.log('🏢 Data Room: Using company:', company.name, 'ID:', company.id);
        setCompanyId(company.id);

        // Save company ID to session for dashboard consistency
        sessionStorage.setItem('current_company', JSON.stringify(company));
        sessionStorage.setItem('current_user_email', 'test@example.com');
      } else {
        toast.error('No company found. Please complete onboarding first.');
      }
    } catch (error) {
      console.error('Error loading company data:', error);
      toast.error('Failed to load company data');
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchDocuments();
    }
  }, [companyId]);

  const fetchCompanyByEmail = async (email: string) => {
    try {
      const company = await api.getCompanyByEmail(email);
      setCompanyId(company.id);
    } catch (error) {
      console.error('Error fetching company:', error);
    }
  };

  const fetchDocuments = async () => {
    if (!companyId) return;

    setIsLoading(true);
    try {
      const documentsData = await api.getDocuments(companyId);
      setDocuments(documentsData);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    }
    setIsLoading(false);
  };

  const handleFileUpload = async (files: File[], category: string) => {
    if (!companyId) {
      toast.error('Company not found');
      return;
    }

    for (const file of files) {
      const fileId = `${file.name}_${Date.now()}`;
      setUploadingFiles(prev => new Set(prev).add(fileId));

      try {
        // Validate file
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}`);
          continue;
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type as any)) {
          toast.error(`File type "${file.type}" is not allowed for "${file.name}"`);
          continue;
        }

        console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
        const document = await api.uploadFile(companyId, file, category);
        toast.success(`"${file.name}" uploaded successfully`);
        await fetchDocuments(); // Refresh document list
      } catch (error: any) {
        console.error('Upload error:', error);

        // Better error handling
        let errorMessage = `Failed to upload "${file.name}"`;
        if (error.response) {
          errorMessage = error.response.data?.error || error.response.statusText || errorMessage;
        } else if (error.message) {
          errorMessage = error.message;
        }

        toast.error(errorMessage);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          next.delete(fileId);
          return next;
        });
      }
    }
  };

  const handleDeleteDocument = async (documentId: string, documentName: string) => {
    if (!companyId) return;

    if (!confirm(`Are you sure you want to delete "${documentName}"?`)) {
      return;
    }

    try {
      await api.deleteFile(companyId, documentId);
      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const handleDownloadDocument = async (documentId: string, documentName: string) => {
    if (!companyId) return;

    try {
      const blob = await api.downloadFile(companyId, documentId);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', documentName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const CategoryDropzone = ({ category }: { category: FileCategory }) => {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      accept: category.acceptedTypes.reduce((acc, type) => {
        acc[type] = [];
        return acc;
      }, {} as Record<string, string[]>),
      maxSize: MAX_FILE_SIZE,
      onDrop: (acceptedFiles) => {
        handleFileUpload(acceptedFiles, category.id);
      },
    });

    const isUploading = Array.from(uploadingFiles).some(fileId =>
      fileId.includes(category.id) || uploadingFiles.size > 0
    );

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <category.icon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-500">{category.description}</p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`p-6 m-2 border-2 border-dashed transition-colors cursor-pointer ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <input {...getInputProps()} />
          <div className="text-center">
            <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-1">
              {isDragActive ? 'Drop files here...' : 'Click to upload or drag and drop'}
            </p>
            <p className="text-xs text-gray-500">
              Up to {formatFileSize(MAX_FILE_SIZE)} • {getFileTypeDescription(category.acceptedTypes)} files
            </p>
          </div>
        </div>

        {/* Document List */}
        {category.documents.length > 0 && (
          <div className="p-6 pt-0">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Uploaded Documents ({category.documents.length})
            </h4>
            <div className="space-y-2">
              {category.documents.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.size)} • {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDownloadDocument(doc.id, doc.name)}
                    >
                      <ArrowDownTrayIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteDocument(doc.id, doc.name)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {isUploading && (
          <div className="p-4 bg-blue-50 border-t border-blue-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-blue-800">Uploading files...</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading data room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Room</h1>
              <p className="text-gray-600">
                Upload and organize your documents securely for investors
              </p>
            </div>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <DocumentTextIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
                <p className="text-sm text-gray-500">Total Documents</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <FolderIcon className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.documents.length > 0).length}
                </p>
                <p className="text-sm text-gray-500">Categories Used</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <CloudArrowUpIcon className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(documents.reduce((total, doc) => total + doc.size, 0))}
                </p>
                <p className="text-sm text-gray-500">Total Storage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Guidelines */}
        {documents.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Tips for a Strong Data Room
                </h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Upload your pitch deck first - it's what investors see first</li>
                  <li>Include recent financial statements (P&L, balance sheet, cash flow)</li>
                  <li>Add your business plan with market analysis and projections</li>
                  <li>Include legal documents like incorporation and IP materials</li>
                  <li>Keep documents current (within the last 12 months)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Document Categories */}
        <div className="space-y-8">
          {categories.map((category) => (
            <CategoryDropzone key={category.id} category={category} />
          ))}
        </div>

        {/* Security Notice */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center mt-1">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Your Data is Secure
              </h3>
              <p className="text-sm text-green-800 mb-2">
                All documents are encrypted at rest and in transit. Only verified investors
                can access your data room with your explicit permission.
              </p>
              <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
                <li>Bank-grade encryption (AES-256)</li>
                <li>Secure access controls and audit logs</li>
                <li>SOC 2 Type II compliant infrastructure</li>
                <li>Regular security audits and penetration testing</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}