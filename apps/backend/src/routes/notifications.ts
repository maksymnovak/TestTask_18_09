import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '@/config/database';
import { NotificationService } from '@/services/notification';
import { validateParams, validateQuery } from '@/middleware/security';
import type { ApiResponse, Notification } from '@capital-marketplace/types';

const ParamsSchema = z.object({
  userId: z.string().uuid(),
});

const NotificationParamsSchema = z.object({
  userId: z.string().uuid(),
  notificationId: z.string().uuid(),
});

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  unreadOnly: z.coerce.boolean().default(false),
});

export async function notificationsRoutes(fastify: FastifyInstance) {
  /**
   * Get notifications for a user
   * GET /api/notifications/:userId
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: { limit?: number; offset?: number; unreadOnly?: boolean };
    Reply: ApiResponse<{
      notifications: Notification[];
      unreadCount: number;
      totalCount: number;
    }>;
  }>(
    '/:userId',
    {
      preHandler: [
        validateParams(ParamsSchema),
        validateQuery(QuerySchema),
      ],
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const { limit, offset, unreadOnly } = request.query;

        // Verify user exists
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        // Get notifications
        const [notifications, unreadCount, totalCount] = await Promise.all([
          NotificationService.getForUser(userId, { limit, offset, unreadOnly }),
          NotificationService.getUnreadCount(userId),
          db.notification.count({ where: { userId } }),
        ]);

        const response = {
          success: true,
          data: {
            notifications,
            unreadCount,
            totalCount,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch notifications',
        });
      }
    }
  );

  /**
   * Mark notification as read
   * PUT /api/notifications/:userId/:notificationId/read
   */
  fastify.put<{
    Params: { userId: string; notificationId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>(
    '/:userId/:notificationId/read',
    {
      preHandler: validateParams(NotificationParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId, notificationId } = request.params;

        await NotificationService.markAsRead(notificationId, userId);

        const response = {
          success: true,
          data: { success: true },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to mark notification as read',
        });
      }
    }
  );

  /**
   * Mark all notifications as read
   * PUT /api/notifications/:userId/read-all
   */
  fastify.put<{
    Params: { userId: string };
    Reply: ApiResponse<{ success: boolean; markedCount: number }>;
  }>(
    '/:userId/read-all',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;

        // Get unread count before marking all as read
        const unreadCount = await NotificationService.getUnreadCount(userId);

        await NotificationService.markAllAsRead(userId);

        const response = {
          success: true,
          data: {
            success: true,
            markedCount: unreadCount,
          },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to mark all notifications as read',
        });
      }
    }
  );

  /**
   * Delete notification
   * DELETE /api/notifications/:userId/:notificationId
   */
  fastify.delete<{
    Params: { userId: string; notificationId: string };
    Reply: ApiResponse<{ success: boolean }>;
  }>(
    '/:userId/:notificationId',
    {
      preHandler: validateParams(NotificationParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId, notificationId } = request.params;

        await NotificationService.delete(notificationId, userId);

        const response = {
          success: true,
          data: { success: true },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error deleting notification:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to delete notification',
        });
      }
    }
  );

  /**
   * Get unread count
   * GET /api/notifications/:userId/unread-count
   */
  fastify.get<{
    Params: { userId: string };
    Reply: ApiResponse<{ count: number }>;
  }>(
    '/:userId/unread-count',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;

        const count = await NotificationService.getUnreadCount(userId);

        const response = {
          success: true,
          data: { count },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error fetching unread count:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to fetch unread count',
        });
      }
    }
  );

  /**
   * Create notification (for admin/system use)
   * POST /api/notifications/:userId
   */
  fastify.post<{
    Params: { userId: string };
    Body: {
      type: 'info' | 'success' | 'warning' | 'error';
      message: string;
      title?: string;
      data?: Record<string, any>;
    };
    Reply: ApiResponse<Notification>;
  }>(
    '/:userId',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const { type, message, title, data } = request.body;

        // Validate input
        if (!message || message.trim().length === 0) {
          return reply.status(400).send({
            success: false,
            error: 'Message is required',
          });
        }

        if (!['info', 'success', 'warning', 'error'].includes(type)) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid notification type',
          });
        }

        // Verify user exists
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const notification = await NotificationService.create(
          userId,
          type,
          message,
          title,
          data
        );

        const response = {
          success: true,
          data: notification,
          timestamp: new Date().toISOString(),
        };

        return reply.status(201).send(response);
      } catch (error) {
        console.error('Error creating notification:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to create notification',
        });
      }
    }
  );

  /**
   * Clear old notifications (cleanup endpoint)
   * DELETE /api/notifications/:userId/cleanup
   */
  fastify.delete<{
    Params: { userId: string };
    Querystring: { olderThanDays?: number };
    Reply: ApiResponse<{ deletedCount: number }>;
  }>(
    '/:userId/cleanup',
    {
      preHandler: validateParams(ParamsSchema),
    },
    async (request, reply) => {
      try {
        const { userId } = request.params;
        const query = request.query as any;
        const olderThanDays = query.olderThanDays ? parseInt(query.olderThanDays) : 30;

        // Verify user exists
        const user = await db.user.findUnique({
          where: { id: userId },
        });

        if (!user) {
          return reply.status(404).send({
            success: false,
            error: 'User not found',
          });
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await db.notification.deleteMany({
          where: {
            userId,
            createdAt: {
              lt: cutoffDate,
            },
            readAt: {
              not: null, // Only delete read notifications
            },
          },
        });

        const response = {
          success: true,
          data: { deletedCount: result.count },
          timestamp: new Date().toISOString(),
        };

        return reply.send(response);
      } catch (error) {
        console.error('Error cleaning up notifications:', error);
        return reply.status(500).send({
          success: false,
          error: 'Failed to cleanup notifications',
        });
      }
    }
  );
}