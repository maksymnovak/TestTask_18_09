import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '@/config/database';
import { InvestabilityService } from '@/services/investability';
import { validateParams } from '@/middleware/security';
import type { ApiResponse, InvestabilityScore } from '@capital-marketplace/types';

const ParamsSchema = z.object({
  companyId: z.string().uuid(),
});

export async function scoreRoutes(fastify: FastifyInstance) {
  /**
   * Get investability score for a company
   * GET /api/score/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<InvestabilityScore>;
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
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        // Calculate investability score
        const score = await InvestabilityService.calculateScore(companyId);

        const response: ApiResponse<InvestabilityScore> = {
          success: true,
          data: score,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error calculating investability score:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to calculate investability score',
        });
      }
    }
  );

  /**
   * Get score recommendations for improving investability
   * GET /api/score/:companyId/recommendations
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<string[]>;
  }>(
    '/:companyId/recommendations',
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

        // Get recommendations
        const recommendations = await InvestabilityService.getRecommendations(companyId);

        const response: ApiResponse<string[]> = {
          success: true,
          data: recommendations,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching score recommendations:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch recommendations',
        });
      }
    }
  );

  /**
   * Get detailed score breakdown
   * GET /api/score/:companyId/breakdown
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<{
      score: InvestabilityScore;
      recommendations: string[];
      history?: any[];
    }>;
  }>(
    '/:companyId/breakdown',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { companyId } = request.params;

        // Verify company exists
        const company = await db.company.findUnique({
          where: { id: companyId },
          include: {
            documents: true,
          },
        });

        if (!company) {
          return reply.status(404).send({
            success: false,
            error: 'Company not found',
          });
        }

        // Get score and recommendations
        const [score, recommendations] = await Promise.all([
          InvestabilityService.calculateScore(companyId),
          InvestabilityService.getRecommendations(companyId),
        ]);

        // In a real system, you might also include score history
        const history = await getScoreHistory(companyId);

        const response = {
          success: true,
          data: {
            score,
            recommendations,
            history,
            companyInfo: {
              name: company.name,
              sector: company.sector,
              revenue: company.revenue,
              targetRaise: company.targetRaise,
              documentCount: company.documents.length,
              kycVerified: company.kycVerified,
              financialsLinked: company.financialsLinked,
            },
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching score breakdown:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch score breakdown',
        });
      }
    }
  );

  /**
   * Recalculate score (for admin/debug purposes)
   * POST /api/score/:companyId/recalculate
   */
  fastify.post<{
    Params: { companyId: string };
    Reply: ApiResponse<InvestabilityScore>;
  }>(
    '/:companyId/recalculate',
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

        // Force recalculation (bypass cache)
        const score = await InvestabilityService.calculateScore(companyId);

        // Trigger any side effects
        await InvestabilityService.onCompanyDataChange(companyId);

        const response: ApiResponse<InvestabilityScore> = {
          success: true,
          data: score,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error recalculating score:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to recalculate score',
        });
      }
    }
  );
}

/**
 * Get score history for a company
 * In production, you might store score snapshots over time
 */
async function getScoreHistory(companyId: string): Promise<any[]> {
  // Mock implementation - in production, query score history table
  // or calculate based on audit logs

  try {
    // Get relevant audit events that would affect score
    const auditEvents = await db.auditLog.findMany({
      where: {
        resource: `Company:${companyId}`,
        action: {
          in: ['kyc_verified', 'financials_linked', 'document_uploaded'],
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Simulate score progression based on events
    let currentScore = 0;
    const history = [];

    for (const event of auditEvents) {
      switch (event.action) {
        case 'kyc_verified':
          currentScore += 30;
          break;
        case 'financials_linked':
          currentScore += 20;
          break;
        case 'document_uploaded':
          currentScore += 5; // Simplified - actual calculation is more complex
          break;
      }

      history.push({
        date: event.createdAt,
        score: Math.min(currentScore, 100),
        event: event.action,
        change: event.action === 'kyc_verified' ? 30 :
                event.action === 'financials_linked' ? 20 : 5,
      });
    }

    return history;
  } catch (error) {
    console.error('Error fetching score history:', error);
    return [];
  }
}