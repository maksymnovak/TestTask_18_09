import { z } from 'zod';

// ====== Base Types ======
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: z.date(),
});

export const CompanySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(255),
  sector: z.string().min(1).max(100),
  targetRaise: z.number().positive(),
  revenue: z.number().nonnegative(),
  kycVerified: z.boolean().default(false),
  financialsLinked: z.boolean().default(false),
  createdAt: z.date(),
});

export const DocumentSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().positive(),
  path: z.string(),
  createdAt: z.date(),
});

export const NotificationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(['info', 'success', 'warning', 'error']),
  message: z.string().min(1),
  createdAt: z.date(),
  readAt: z.date().optional(),
});

// ====== API Request/Response Types ======

// Company Creation
export const CreateCompanyRequestSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  sector: z.string().min(1, 'Sector is required').max(100),
  targetRaise: z.number().positive('Target raise must be positive'),
  revenue: z.number().nonnegative('Revenue cannot be negative'),
  email: z.string().email('Valid email is required'),
});

export const CreateCompanyResponseSchema = z.object({
  success: z.boolean(),
  data: CompanySchema.optional(),
  error: z.string().optional(),
});

// KYC Verification
export const KycVerificationRequestSchema = z.object({
  companyId: z.string().uuid(),
  inquiryId: z.string().optional(), // Persona inquiry ID
  mockVerify: z.boolean().default(false), // For development/testing
});

export const KycVerificationResponseSchema = z.object({
  success: z.boolean(),
  verified: z.boolean(),
  error: z.string().optional(),
});

// Financial Linking
export const LinkFinancialsRequestSchema = z.object({
  companyId: z.string().uuid(),
  plaidToken: z.string().min(1, 'Plaid token is required'),
  accountId: z.string().optional(),
});

export const LinkFinancialsResponseSchema = z.object({
  success: z.boolean(),
  linked: z.boolean(),
  error: z.string().optional(),
});

// File Upload
export const FileUploadResponseSchema = z.object({
  success: z.boolean(),
  data: DocumentSchema.optional(),
  error: z.string().optional(),
});

// Investability Score
export const InvestabilityScoreSchema = z.object({
  score: z.number().min(0).max(100),
  breakdown: z.object({
    kycVerified: z.number(),
    financialsLinked: z.number(),
    documentsUploaded: z.number(),
    revenueScore: z.number(),
  }),
});

export const InvestabilityScoreResponseSchema = z.object({
  success: z.boolean(),
  data: InvestabilityScoreSchema.optional(),
  error: z.string().optional(),
});

// Notifications
export const NotificationResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(NotificationSchema).optional(),
  error: z.string().optional(),
});

// ====== Frontend Types ======
export const OnboardingStepSchema = z.object({
  step: z.number().min(1).max(3),
  completed: z.boolean(),
  data: z.record(z.any()).optional(),
});

export const DashboardStatsSchema = z.object({
  totalDocuments: z.number(),
  investabilityScore: z.number(),
  kycStatus: z.enum(['pending', 'verified', 'failed']),
  financialStatus: z.enum(['pending', 'linked', 'failed']),
  lastUpdated: z.date(),
});

// ====== Type Exports ======
export type User = z.infer<typeof UserSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type Document = z.infer<typeof DocumentSchema>;
export type Notification = z.infer<typeof NotificationSchema>;

export type CreateCompanyRequest = z.infer<typeof CreateCompanyRequestSchema>;
export type CreateCompanyResponse = z.infer<typeof CreateCompanyResponseSchema>;
export type KycVerificationRequest = z.infer<typeof KycVerificationRequestSchema>;
export type KycVerificationResponse = z.infer<typeof KycVerificationResponseSchema>;
export type LinkFinancialsRequest = z.infer<typeof LinkFinancialsRequestSchema>;
export type LinkFinancialsResponse = z.infer<typeof LinkFinancialsResponseSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type InvestabilityScore = z.infer<typeof InvestabilityScoreSchema>;
export type InvestabilityScoreResponse = z.infer<typeof InvestabilityScoreResponseSchema>;
export type NotificationResponse = z.infer<typeof NotificationResponseSchema>;

export type OnboardingStep = z.infer<typeof OnboardingStepSchema>;
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// ====== API Response Wrapper ======
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
};

// ====== Constants ======
export const SECTORS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Consumer Goods',
  'Energy',
  'Real Estate',
  'Manufacturing',
  'Education',
  'Transportation',
  'Other'
] as const;

export const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'error'] as const;

export const FILE_TYPES = {
  PITCH_DECK: 'pitch-deck',
  FINANCIAL_STATEMENTS: 'financial-statements',
  BUSINESS_PLAN: 'business-plan',
  LEGAL_DOCUMENTS: 'legal-documents',
  OTHER: 'other'
} as const;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB