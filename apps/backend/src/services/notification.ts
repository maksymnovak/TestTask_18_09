import { db } from '@/config/database';
import type { Notification } from '@capital-marketplace/types';
import { v4 as uuid } from 'uuid';

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  static async create(
    userId: string,
    type: 'info' | 'success' | 'warning' | 'error',
    message: string,
    title?: string,
    data?: Record<string, any>
  ): Promise<Notification> {
    const notification = await db.notification.create({
      data: {
        id: uuid(),
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // In a real system, you might also:
    // 1. Send push notifications
    // 2. Send emails for important notifications
    // 3. Use WebSocket to push real-time updates

    return this.transformNotification(notification);
  }

  /**
   * Get all notifications for a user
   */
  static async getForUser(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
    } = {}
  ): Promise<Notification[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    const notifications = await db.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    return notifications.map(this.transformNotification);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await db.notification.updateMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only mark their own notifications
      },
      data: {
        readAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await db.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete notification
   */
  static async delete(notificationId: string, userId: string): Promise<void> {
    await db.notification.deleteMany({
      where: {
        id: notificationId,
        userId, // Ensure user can only delete their own notifications
      },
    });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return db.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  /**
   * System notification helpers
   */
  static async notifyOnboardingComplete(userId: string, companyName: string): Promise<void> {
    await this.create(
      userId,
      'success',
      `Welcome to Capital Marketplace! Your company "${companyName}" has been successfully onboarded.`,
      'Onboarding Complete',
      { event: 'onboarding_complete', companyName }
    );
  }

  static async notifyKycVerified(userId: string): Promise<void> {
    await this.create(
      userId,
      'success',
      'Your KYC verification has been completed successfully. You earned 30 investability points!',
      'KYC Verified',
      { event: 'kyc_verified', pointsEarned: 30 }
    );
  }

  static async notifyFinancialsLinked(userId: string): Promise<void> {
    await this.create(
      userId,
      'success',
      'Your bank account has been successfully linked. You earned 20 investability points!',
      'Financials Linked',
      { event: 'financials_linked', pointsEarned: 20 }
    );
  }

  static async notifyDocumentUploaded(userId: string, documentName: string): Promise<void> {
    await this.create(
      userId,
      'info',
      `Document "${documentName}" has been uploaded successfully to your data room.`,
      'Document Uploaded',
      { event: 'document_uploaded', documentName }
    );
  }

  static async notifyScoreImproved(userId: string, oldScore: number, newScore: number): Promise<void> {
    const improvement = newScore - oldScore;
    await this.create(
      userId,
      'success',
      `Great progress! Your investability score improved by ${improvement} points (${oldScore} → ${newScore}).`,
      'Score Improved',
      { event: 'score_improved', oldScore, newScore, improvement }
    );
  }

  /**
   * Transform database notification to API format
   */
  private static transformNotification(notification: any): Notification {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type as 'info' | 'success' | 'warning' | 'error',
      message: notification.message,
      createdAt: notification.createdAt,
      readAt: notification.readAt || undefined,
    };
  }

  /**
   * Cleanup old notifications (run periodically)
   */
  static async cleanup(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await db.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        readAt: {
          not: null, // Only delete read notifications
        },
      },
    });

    return result.count;
  }
}