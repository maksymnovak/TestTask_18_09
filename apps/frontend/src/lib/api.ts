import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ApiResponse,
  CreateCompanyRequest,
  CreateCompanyResponse,
  Company,
  KycVerificationRequest,
  KycVerificationResponse,
  LinkFinancialsRequest,
  LinkFinancialsResponse,
  InvestabilityScore,
  Document,
  Notification,
} from '@capital-marketplace/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth headers (when implemented)
apiClient.interceptors.request.use(
  (config) => {
    // Add authorization header when auth is implemented
    // const token = getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login when auth is implemented
      console.warn('Unauthorized request');
    } else if (error.response?.status >= 500) {
      // Handle server errors
      console.error('Server error:', error.response.data);
    }
    return Promise.reject(error);
  }
);

// ====== Company API ======
export const companyApi = {
  create: async (data: CreateCompanyRequest): Promise<Company> => {
    const response = await apiClient.post<ApiResponse<Company>>('/company', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create company');
    }
    return response.data.data;
  },

  getById: async (id: string, email: string): Promise<Company> => {
    const response = await apiClient.get<ApiResponse<Company>>(`/company/${id}?email=${encodeURIComponent(email)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch company');
    }
    return response.data.data;
  },

  getByEmail: async (email: string): Promise<Company> => {
    const response = await apiClient.get<ApiResponse<Company>>(`/company/by-email/${encodeURIComponent(email)}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch company');
    }
    return response.data.data;
  },

  update: async (id: string, data: Partial<CreateCompanyRequest>): Promise<Company> => {
    const response = await apiClient.put<ApiResponse<Company>>(`/company/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update company');
    }
    return response.data.data;
  },
};

// ====== KYC API ======
export const kycApi = {
  verify: async (data: KycVerificationRequest): Promise<KycVerificationResponse> => {
    const response = await apiClient.post<ApiResponse<KycVerificationResponse>>('/kyc/verify', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to verify KYC');
    }
    return response.data.data;
  },

  getStatus: async (companyId: string): Promise<{ verified: boolean; verifiedAt?: string }> => {
    const response = await apiClient.get<ApiResponse<{ verified: boolean; verifiedAt?: string }>>(`/kyc/status/${companyId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch KYC status');
    }
    return response.data.data;
  },
};

// ====== Financials API ======
export const financialsApi = {
  link: async (data: LinkFinancialsRequest): Promise<LinkFinancialsResponse> => {
    const response = await apiClient.post<ApiResponse<LinkFinancialsResponse>>('/financials/link', data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to link financials');
    }
    return response.data.data;
  },

  getStatus: async (companyId: string): Promise<{ linked: boolean; linkedAt?: string; accounts?: any[] }> => {
    const response = await apiClient.get<ApiResponse<{ linked: boolean; linkedAt?: string; accounts?: any[] }>>(`/financials/status/${companyId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch financial status');
    }
    return response.data.data;
  },

  getSummary: async (companyId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/financials/summary/${companyId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch financial summary');
    }
    return response.data.data;
  },

  unlink: async (companyId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/financials/link/${companyId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to unlink financials');
    }
  },
};

// ====== Files API ======
export const filesApi = {
  upload: async (companyId: string, file: File, category?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    if (category) {
      formData.append('category', category);
    }

    const response = await apiClient.post<ApiResponse<Document>>(`/files/${companyId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to upload file');
    }
    return response.data.data;
  },

  getList: async (companyId: string, options?: { category?: string; limit?: number; offset?: number }): Promise<Document[]> => {
    const params = new URLSearchParams();
    if (options?.category) params.append('category', options.category);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());

    const queryString = params.toString();
    const response = await apiClient.get<ApiResponse<Document[]>>(`/files/${companyId}${queryString ? `?${queryString}` : ''}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch files');
    }
    return response.data.data;
  },

  getById: async (companyId: string, fileId: string): Promise<Document> => {
    const response = await apiClient.get<ApiResponse<Document>>(`/files/${companyId}/${fileId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch file');
    }
    return response.data.data;
  },

  download: async (companyId: string, fileId: string): Promise<Blob> => {
    const response = await apiClient.get(`/files/${companyId}/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  delete: async (companyId: string, fileId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/files/${companyId}/${fileId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete file');
    }
  },

  getStats: async (companyId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/files/${companyId}/stats`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch file stats');
    }
    return response.data.data;
  },
};

// ====== Score API ======
export const scoreApi = {
  get: async (companyId: string): Promise<InvestabilityScore> => {
    const response = await apiClient.get<ApiResponse<InvestabilityScore>>(`/score/${companyId}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch score');
    }
    return response.data.data;
  },

  getRecommendations: async (companyId: string): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>(`/score/${companyId}/recommendations`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch recommendations');
    }
    return response.data.data;
  },

  getBreakdown: async (companyId: string): Promise<any> => {
    const response = await apiClient.get<ApiResponse<any>>(`/score/${companyId}/breakdown`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch score breakdown');
    }
    return response.data.data;
  },

  recalculate: async (companyId: string): Promise<InvestabilityScore> => {
    const response = await apiClient.post<ApiResponse<InvestabilityScore>>(`/score/${companyId}/recalculate`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to recalculate score');
    }
    return response.data.data;
  },
};

// ====== Notifications API ======
export const notificationsApi = {
  getList: async (
    userId: string,
    options?: { limit?: number; offset?: number; unreadOnly?: boolean }
  ): Promise<{
    notifications: Notification[];
    unreadCount: number;
    totalCount: number;
  }> => {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.unreadOnly) params.append('unreadOnly', options.unreadOnly.toString());

    const queryString = params.toString();
    const response = await apiClient.get<ApiResponse<{
      notifications: Notification[];
      unreadCount: number;
      totalCount: number;
    }>>(`/notifications/${userId}${queryString ? `?${queryString}` : ''}`);

    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch notifications');
    }
    return response.data.data;
  },

  markAsRead: async (userId: string, notificationId: string): Promise<void> => {
    const response = await apiClient.put<ApiResponse<{ success: boolean }>>(`/notifications/${userId}/${notificationId}/read`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to mark notification as read');
    }
  },

  markAllAsRead: async (userId: string): Promise<{ markedCount: number }> => {
    const response = await apiClient.put<ApiResponse<{ success: boolean; markedCount: number }>>(`/notifications/${userId}/read-all`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to mark all notifications as read');
    }
    return response.data.data;
  },

  delete: async (userId: string, notificationId: string): Promise<void> => {
    const response = await apiClient.delete<ApiResponse<{ success: boolean }>>(`/notifications/${userId}/${notificationId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete notification');
    }
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(`/notifications/${userId}/unread-count`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch unread count');
    }
    return response.data.data.count;
  },
};

// ====== Health API ======
export const healthApi = {
  check: async (): Promise<any> => {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },
};

// ====== Simplified API Methods for Components ======
export const api = {
  // Company methods
  createCompany: companyApi.create,
  getCompany: companyApi.getById,
  getCompanyByEmail: companyApi.getByEmail,
  updateCompany: companyApi.update,

  // KYC methods
  verifyKyc: async (companyId: string, data?: { mockVerify?: boolean }) => {
    return kycApi.verify({ companyId, mockVerify: data?.mockVerify || false });
  },
  getKycStatus: kycApi.getStatus,

  // Financial methods
  linkFinancials: async (companyId: string, plaidToken: string) => {
    return financialsApi.link({ companyId, plaidToken });
  },
  getFinancialStatus: financialsApi.getStatus,

  // File methods
  uploadFile: filesApi.upload,
  getDocuments: filesApi.getList,
  downloadFile: filesApi.download,
  deleteFile: filesApi.delete,

  // Score methods
  getInvestabilityScore: scoreApi.get,
  getRecommendations: scoreApi.getRecommendations,
  recalculateScore: scoreApi.recalculate,

  // Notification methods
  getNotifications: notificationsApi.getList,
  markNotificationRead: notificationsApi.markAsRead,
  markAllNotificationsRead: notificationsApi.markAllAsRead,
  deleteNotification: notificationsApi.delete,
  getUnreadCount: notificationsApi.getUnreadCount,

  // Health check
  healthCheck: healthApi.check,
};

export default api;