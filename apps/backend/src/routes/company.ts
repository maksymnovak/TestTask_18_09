import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { db } from '@/config/database';
import { validateRequest } from '@/middleware/security';
import { NotificationService } from '@/services/notification';
import {
  CreateCompanyRequestSchema,
  ApiResponse,
  type CreateCompanyRequest,
  type Company,
} from '@capital-marketplace/types';

const ParamsSchema = z.object({
  id: z.string().uuid(),
});

const QuerySchema = z.object({
  email: z.string().email(),
});

export async function companyRoutes(fastify: FastifyInstance) {
  /**
   * Create a new company
   * POST /api/company
   */
  fastify.post<{
    Body: CreateCompanyRequest;
    Reply: ApiResponse<Company>;
  }>(
    '/',
    {
      preHandler: validateRequest(CreateCompanyRequestSchema),
    },
    async (request, reply) => {
      try {
        const { name, sector, targetRaise, revenue, email } = request.body;

        // Find or create user
        let user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await db.user.create({
            data: {
              id: uuid(),
              email,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }

        // Check if user already has a company
        const existingCompany = await db.company.findFirst({
          where: { userId: user.id },
        });

        if (existingCompany) {
          return reply.status(409).send({
            success: false,
            error: 'User already has a company registered',
          });
        }

        // Create company
        const company = await db.company.create({
          data: {
            id: uuid(),
            userId: user.id,
            name,
            sector,
            targetRaise,
            revenue,
            kycVerified: false,
            financialsLinked: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        console.log(`🏢 Company Created: ${name} (ID: ${company.id}) for user ${email} (UserID: ${user.id})`);

        // Send welcome notification
        await NotificationService.notifyOnboardingComplete(user.id, name);

        const response: ApiResponse<Company> = {
          success: true,
          data: {
            id: company.id,
            userId: company.userId,
            name: company.name,
            sector: company.sector,
            targetRaise: company.targetRaise,
            revenue: company.revenue,
            kycVerified: company.kycVerified,
            financialsLinked: company.financialsLinked,
            createdAt: company.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.status(201).send(response);
      } catch (error) {
        console.error('Error creating company:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create company',
        });
      }
    }
  );

  /**
   * Get company by ID
   * GET /api/company/:id
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { email: string };
    Reply: ApiResponse<Company>;
  }>(
    '/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { email } = request.query;

        // Validate parameters
        const paramsValidation = ParamsSchema.safeParse({ id });
        const queryValidation = QuerySchema.safeParse({ email });

        if (!paramsValidation.success) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid company ID',
          });
        }

        if (!queryValidation.success) {
          return reply.status(400).send({
            success: false,
            error: 'Valid email is required',
          });
        }

        // Find user
        const user = await db.user.findUnique({
          where: { email },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Find company
        const company = await db.company.findFirst({
          where: {
            id,
            userId: user.id, // Ensure user can only access their own company
          },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        const response: ApiResponse<Company> = {
          success: true,
          data: {
            id: company.id,
            userId: company.userId,
            name: company.name,
            sector: company.sector,
            targetRaise: company.targetRaise,
            revenue: company.revenue,
            kycVerified: company.kycVerified,
            financialsLinked: company.financialsLinked,
            createdAt: company.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching company:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch company',
        });
      }
    }
  );

  /**
   * Update company
   * PUT /api/company/:id
   */
  fastify.put<{
    Params: { id: string };
    Body: Partial<CreateCompanyRequest>;
    Reply: ApiResponse<Company>;
  }>(
    '/:id',
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updateData = request.body;

        // Find company (in real app, would use JWT auth)
        const company = await db.company.findUnique({
          where: { id },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        // Update company
        const updatedCompany = await db.company.update({
          where: { id },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });

        const response: ApiResponse<Company> = {
          success: true,
          data: {
            id: updatedCompany.id,
            userId: updatedCompany.userId,
            name: updatedCompany.name,
            sector: updatedCompany.sector,
            targetRaise: updatedCompany.targetRaise,
            revenue: updatedCompany.revenue,
            kycVerified: updatedCompany.kycVerified,
            financialsLinked: updatedCompany.financialsLinked,
            createdAt: updatedCompany.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error updating company:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to update company',
        });
      }
    }
  );

  /**
   * Get company by user email
   * GET /api/company/by-email/:email
   */
  fastify.get<{
    Params: { email: string };
    Reply: ApiResponse<Company>;
  }>(
    '/by-email/:email',
    async (request, reply) => {
      try {
        const { email } = request.params;

        // Find user
        const user = await db.user.findUnique({
          where: { email },
          include: {
            companies: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Get user's most recent company
        const company = user.companies[0];

        console.log(`📊 Company API: Found ${user.companies.length} companies for ${email}`);
        if (user.companies.length > 0) {
          user.companies.forEach((comp, index) => {
            console.log(`  ${index}: ${comp.name} (ID: ${comp.id}, Created: ${comp.createdAt})`);
          });
          console.log(`📊 Company API: Returning most recent: ${company.name} (ID: ${company.id})`);
        }

        if (!company) {
          console.log(`❌ Company API: No company found for user ${email}`);
          return reply.status(404).send({
            success: false,
            error: 'No company found for this user',
          });
        }

        const response: ApiResponse<Company> = {
          success: true,
          data: {
            id: company.id,
            userId: company.userId,
            name: company.name,
            sector: company.sector,
            targetRaise: company.targetRaise,
            revenue: company.revenue,
            kycVerified: company.kycVerified,
            financialsLinked: company.financialsLinked,
            createdAt: company.createdAt,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching company by email:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch company',
        });
      }
    }
  );
}