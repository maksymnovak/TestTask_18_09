import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '@/config/database';
import { validateRequest } from '@/middleware/security';
import { NotificationService } from '@/services/notification';
import { InvestabilityService } from '@/services/investability';
import {
  LinkFinancialsRequestSchema,
  LinkFinancialsResponseSchema,
  ApiResponse,
  type LinkFinancialsRequest,
  type LinkFinancialsResponse,
} from '@capital-marketplace/types';

export async function financialsRoutes(fastify: FastifyInstance) {
  /**
   * Link financial accounts (Plaid integration)
   * POST /api/financials/link
   */
  fastify.post<{
    Body: LinkFinancialsRequest;
    Reply: ApiResponse<LinkFinancialsResponse>;
  }>(
    '/link',
    {
      preHandler: validateRequest(LinkFinancialsRequestSchema),
    },
    async (request, reply) => {
      try {
        const { companyId, plaidToken, accountId } = request.body;

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

        // Check if already linked
        if (company.financialsLinked) {
          return reply.status(400).send({
            success: false,
            error: 'Financials already linked for this company',
          });
        }

        // Validate Plaid token and link account
        const linked = await linkWithPlaid(plaidToken, accountId);

        if (linked) {
          // Update company financial link status
          await db.company.update({
            where: { id: companyId },
            data: {
              financialsLinked: true,
              updatedAt: new Date(),
            },
          });

          // Send notification
          await NotificationService.notifyFinancialsLinked(company.userId);

          // Trigger score recalculation
          await InvestabilityService.onCompanyDataChange(companyId);

          // Log audit event
          await db.auditLog.create({
            data: {
              userId: company.userId,
              action: 'financials_linked',
              resource: `Company:${companyId}`,
              metadata: JSON.stringify({
                plaidToken: '[REDACTED]', // Never log sensitive tokens
                accountId,
                timestamp: new Date().toISOString(),
              }),
              createdAt: new Date(),
            },
          });
        }

        const response: ApiResponse<LinkFinancialsResponse> = {
          success: true,
          data: {
            success: true,
            linked,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error linking financials:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to link financial accounts',
        });
      }
    }
  );

  /**
   * Get financial link status
   * GET /api/financials/status/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<{ linked: boolean; linkedAt?: string; accounts?: any[] }>;
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

        // In production, you might fetch account details from Plaid
        const accounts = company.financialsLinked ? await getLinkedAccounts(companyId) : [];

        const response = {
          success: true,
          data: {
            linked: company.financialsLinked,
            linkedAt: company.financialsLinked ? company.updatedAt.toISOString() : undefined,
            accounts,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching financial status:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch financial status',
        });
      }
    }
  );

  /**
   * Unlink financial accounts
   * DELETE /api/financials/link/:companyId
   */
  fastify.delete<{
    Params: { companyId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>(
    '/link/:companyId',
    async (request, reply) => {
      try {
        const { companyId } = request.params;

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

        if (!company.financialsLinked) {
          return reply.status(400).send({
            success: false,
            error: 'No financial accounts linked',
          });
        }

        // Unlink from Plaid
        await unlinkFromPlaid(companyId);

        // Update company status
        await db.company.update({
          where: { id: companyId },
          data: {
            financialsLinked: false,
            updatedAt: new Date(),
          },
        });

        // Trigger score recalculation
        await InvestabilityService.onCompanyDataChange(companyId);

        // Log audit event
        await db.auditLog.create({
          data: {
            userId: company.userId,
            action: 'financials_unlinked',
            resource: `Company:${companyId}`,
            metadata: JSON.stringify({
              timestamp: new Date().toISOString(),
            }),
            createdAt: new Date(),
          },
        });

        const response = {
          success: true,
          data: { success: true },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error unlinking financials:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to unlink financial accounts',
        });
      }
    }
  );

  /**
   * Get financial data summary
   * GET /api/financials/summary/:companyId
   */
  fastify.get<{
    Params: { companyId: string };
    Reply: ApiResponse<any>;
  }>(
    '/summary/:companyId',
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

        if (!company.financialsLinked) {
          return reply.status(400).send({
            success: false,
            error: 'Financial accounts not linked',
          });
        }

        // Get financial summary from Plaid
        const summary = await getFinancialSummary(companyId);

        const response = {
          success: true,
          data: summary,
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching financial summary:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch financial summary',
        });
      }
    }
  );

  /**
   * Webhook endpoint for Plaid updates
   * POST /api/financials/webhook
   */
  fastify.post(
    '/webhook',
    async (request, reply) => {
      try {
        // In production, verify webhook signature
        const webhookData = request.body as any;

        console.log('Plaid webhook received:', webhookData);

        // Handle different webhook types
        switch (webhookData.webhook_type) {
          case 'TRANSACTIONS':
            // Handle transaction updates
            break;
          case 'ITEM':
            // Handle item-level updates
            break;
          case 'ERROR':
            // Handle errors
            break;
        }

        return reply.status(200).send({ received: true });
      } catch (error) {
        console.error('Error processing Plaid webhook:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to process webhook',
        });
      }
    }
  );
}

/**
 * Mock Plaid integration functions
 * In production, replace with actual Plaid API calls
 */
async function linkWithPlaid(plaidToken: string, accountId?: string): Promise<boolean> {
  // Mock implementation - in production, exchange public token for access token
  // const plaidClient = new PlaidApi({
  //   clientId: config.external.plaid.clientId,
  //   secret: config.external.plaid.secret,
  //   env: config.external.plaid.environment,
  // });

  // const response = await plaidClient.itemPublicTokenExchange({
  //   public_token: plaidToken,
  // });

  // Store access token securely for future API calls
  // const accessToken = response.access_token;

  // For demo purposes, accept any non-empty token
  return plaidToken.length > 0;
}

async function getLinkedAccounts(companyId: string): Promise<any[]> {
  // Mock implementation - in production, fetch from Plaid
  return [
    {
      id: 'account_123',
      name: 'Business Checking',
      type: 'depository',
      subtype: 'checking',
      balances: {
        available: 25000.50,
        current: 25000.50,
      },
    },
    {
      id: 'account_456',
      name: 'Business Savings',
      type: 'depository',
      subtype: 'savings',
      balances: {
        available: 100000.00,
        current: 100000.00,
      },
    },
  ];
}

async function unlinkFromPlaid(companyId: string): Promise<void> {
  // Mock implementation - in production, remove item from Plaid
  // const plaidClient = new PlaidApi({...});
  // await plaidClient.itemRemove({ access_token });
  console.log(`Unlinking Plaid accounts for company ${companyId}`);
}

async function getFinancialSummary(companyId: string): Promise<any> {
  // Mock implementation - in production, aggregate data from Plaid
  return {
    totalBalance: 125000.50,
    monthlyRevenue: 45000,
    monthlyExpenses: 32000,
    averageBalance: 118000,
    accountCount: 2,
    lastUpdated: new Date().toISOString(),
    trends: {
      revenueGrowth: 0.12, // 12% growth
      expenseRatio: 0.71,  // 71% expense ratio
    },
  };
}

/**
 * Production Plaid integration example:
 */
/*
import { PlaidApi, Configuration, PlaidEnvironments } from 'plaid';

const configuration = new Configuration({
  basePath: PlaidEnvironments[config.external.plaid.environment],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': config.external.plaid.clientId,
      'PLAID-SECRET': config.external.plaid.secret,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

async function linkWithPlaid(plaidToken: string): Promise<boolean> {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: plaidToken,
    });

    // Store access token securely (encrypt in database)
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Store in database for future use
    return true;
  } catch (error) {
    console.error('Plaid token exchange error:', error);
    throw error;
  }
}
*/