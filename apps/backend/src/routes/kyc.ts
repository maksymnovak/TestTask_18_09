import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '@/config/database';
import { validateRequest } from '@/middleware/security';
import { NotificationService } from '@/services/notification';
import { InvestabilityService } from '@/services/investability';
import {
  KycVerificationRequestSchema,
  KycVerificationResponseSchema,
  ApiResponse,
  type KycVerificationRequest,
  type KycVerificationResponse,
} from '@capital-marketplace/types';

export async function kycRoutes(fastify: FastifyInstance) {
  /**
   * Verify KYC for a company
   * POST /api/kyc/verify
   */
  fastify.post<{
    Body: KycVerificationRequest;
    Reply: ApiResponse<KycVerificationResponse>;
  }>(
    '/verify',
    {
      preHandler: validateRequest(KycVerificationRequestSchema),
    },
    async (request, reply) => {
      try {
        const { companyId, inquiryId, mockVerify } = request.body;

        // Find company
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

        // Check if already verified
        if (company.kycVerified) {
          return reply.status(400).send({
            success: false,
            error: 'KYC already verified for this company',
          });
        }

        let verified = false;

        if (mockVerify) {
          // For development/testing - automatically verify
          verified = true;
        } else if (inquiryId) {
          // In production, integrate with Persona API
          verified = await verifyWithPersona(inquiryId);
        } else {
          return reply.status(400).send({
            success: false,
            error: 'Either mockVerify or inquiryId is required',
          });
        }

        if (verified) {
          // Update company KYC status
          await db.company.update({
            where: { id: companyId },
            data: {
              kycVerified: true,
              updatedAt: new Date(),
            },
          });

          // Send notification
          await NotificationService.notifyKycVerified(company.userId);

          // Trigger score recalculation
          await InvestabilityService.onCompanyDataChange(companyId);

          // Log audit event
          await db.auditLog.create({
            data: {
              userId: company.userId,
              action: 'kyc_verified',
              resource: `Company:${companyId}`,
              metadata: JSON.stringify({
                inquiryId,
                mockVerify,
                timestamp: new Date().toISOString(),
              }),
              createdAt: new Date(),
            },
          });
        }

        const response: ApiResponse<KycVerificationResponse> = {
          success: true,
          data: {
            success: true,
            verified,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error verifying KYC:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to verify KYC',
        });
      }
    }
  );

  /**
   * Get KYC status for a company
   * GET /api/kyc/status/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<{ verified: boolean; verifiedAt?: string }>;
  }>(
    '/status/:companyId',
    async (request, reply) => {
      try {
        const { companyId } = request.params;

        const company = await db.company.findUnique({
          where: { id: companyId },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        const response = {
          success: true,
          data: {
            verified: company.kycVerified,
            // In a real system, you'd store the verification timestamp
            verifiedAt: company.kycVerified ? company.updatedAt.toISOString() : undefined,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching KYC status:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch KYC status',
        });
      }
    }
  );

  /**
   * Webhook endpoint for Persona KYC updates
   * POST /api/kyc/webhook
   */
  fastify.post(
    '/webhook',
    async (request, reply) => {
      try {
        // In production, verify webhook signature
        const webhookData = request.body as any;

        if (webhookData.data?.type === 'inquiry' && webhookData.data?.attributes?.status === 'completed') {
          const inquiryId = webhookData.data.id;
          const passed = webhookData.data.attributes.status === 'passed';

          // Find company by inquiry ID (you'd need to store this mapping)
          // For now, we'll just log it
          console.log('Persona webhook received:', { inquiryId, passed });

          // Update company KYC status based on webhook
          // Implementation would depend on how you track inquiry IDs
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        console.error('Error processing KYC webhook:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to process webhook',
        });
      }
    }
  );
}

/**
 * Mock Persona API verification
 * In production, replace with actual Persona API integration
 */
async function verifyWithPersona(inquiryId: string): Promise<boolean> {
  // Mock implementation - in production, call Persona API
  // const personaApi = new PersonaApi({
  //   apiKey: config.external.persona.apiKey,
  //   environment: config.external.persona.environment,
  // });

  // const inquiry = await personaApi.getInquiry(inquiryId);
  // return inquiry.status === 'passed';

  // For demo purposes, randomly succeed 90% of the time
  return Math.random() > 0.1;
}

/**
 * Production Persona integration example:
 */
/*
import { PersonaApi } from 'persona-api'; // Hypothetical SDK

async function verifyWithPersona(inquiryId: string): Promise<boolean> {
  try {
    const personaApi = new PersonaApi({
      apiKey: config.external.persona.apiKey,
      environment: config.external.persona.environment,
    });

    const inquiry = await personaApi.retrieveInquiry(inquiryId);

    return inquiry.attributes.status === 'passed';
  } catch (error) {
    console.error('Persona API error:', error);
    throw new Error('Failed to verify with Persona');
  }
}
*/