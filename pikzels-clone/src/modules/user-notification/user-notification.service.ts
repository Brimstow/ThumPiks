/**
 * User Notification Service
 *
 * WHAT: CRUD operations for per-user notifications
 * WHY: Users need to receive and manage notifications (thumbnails, credits, billing, security)
 * HOW: Prisma queries on UserNotification table + SSE invalidation signals
 *
 * Alignment:
 * - Layered: controller -> service -> Prisma
 * - Service Factory: lazy singleton via getUserNotificationService()
 * - Event-Driven: emits SSE invalidation after creating notifications
 */

import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import type {
  CreateUserNotificationInput,
  UserNotificationListQuery,
  UserNotificationListResponse,
  UserNotificationRecord,
} from './types';

let instance: UserNotificationService | null = null;

export function getUserNotificationService(): UserNotificationService {
  if (!instance) {
    instance = new UserNotificationService();
  }
  return instance;
}

export class UserNotificationService {
  /**
   * Create a new user notification. After persisting, emits SSE invalidation.
   * Returns the created notification record.
   */
  async create(input: CreateUserNotificationInput): Promise<UserNotificationRecord> {
    const prisma = getPrisma();

    const notification = await prisma.userNotification.create({
      data: {
        id: uuidv4(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        priority: input.priority || 'normal',
        actionUrl: input.actionUrl || null,
        metadata: (input.metadata ?? null) as never,
        expiresAt: input.expiresAt || null,
      },
    });

    logger.info('User notification created', {
      userId: input.userId,
      type: input.type,
      notificationId: notification.id,
    });

    // SSE invalidation is handled by the caller (NotificationRouter.routeToUser)
    // to avoid circular dependency with SSEService

    return {
      ...notification,
      metadata: notification.metadata as Record<string, unknown> | null,
    };
  }

  /**
   * List notifications for a user with pagination and filtering.
   * Sorted newest-first. Includes unread count.
   */
  async listForUser(userId: string, query: UserNotificationListQuery = {}): Promise<UserNotificationListResponse> {
    const prisma = getPrisma();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (query.type) where.type = query.type;
    if (typeof query.isRead === 'boolean') where.isRead = query.isRead;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userNotification.count({ where }),
      prisma.userNotification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications: notifications.map((n) => ({
        ...n,
        metadata: n.metadata as Record<string, unknown> | null,
      })),
      unreadCount,
      total,
      page,
      limit,
    };
  }

  /** Count unread notifications for a user (for badge display). */
  async countUnread(userId: string): Promise<number> {
    const prisma = getPrisma();
    return prisma.userNotification.count({ where: { userId, isRead: false } });
  }

  /** Mark a single notification as read. Validates ownership. */
  async markRead(userId: string, notificationId: string): Promise<void> {
    const prisma = getPrisma();
    const notification = await prisma.userNotification.findUnique({
      where: { id: notificationId },
    });

    if (notification?.userId !== userId) {
      throw Object.assign(new Error('Notification not found'), { code: 'P2025' });
    }

    await prisma.userNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Mark all unread notifications as read for a user. Returns count updated. */
  async markAllRead(userId: string): Promise<number> {
    const prisma = getPrisma();
    const result = await prisma.userNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  /** Delete a single notification. Validates ownership. */
  async delete(userId: string, notificationId: string): Promise<void> {
    const prisma = getPrisma();
    const notification = await prisma.userNotification.findUnique({
      where: { id: notificationId },
    });

    if (notification?.userId !== userId) {
      throw Object.assign(new Error('Notification not found'), { code: 'P2025' });
    }

    await prisma.userNotification.delete({ where: { id: notificationId } });
  }

  /**
   * Bulk-delete notifications by IDs. Validates ownership atomically via the WHERE clause.
   * @param userId The user who owns the notifications
   * @param ids Array of notification IDs to delete (max 100)
   * @returns Count of deleted notifications
   */
  async bulkDelete(userId: string, ids: string[]): Promise<number> {
    if (!ids.length || ids.length > 100) {
      throw new Error('ids must contain 1-100 notification IDs');
    }

    const prisma = getPrisma();
    const result = await prisma.userNotification.deleteMany({
      where: { id: { in: ids }, userId },
    });

    logger.info('Bulk-deleted user notifications', {
      userId,
      requested: ids.length,
      deleted: result.count,
    });

    return result.count;
  }

  /**
   * Check if a notification of this type was already sent to this user recently.
   * Used for deduplication of high-frequency notifications (credits_low).
   * @param userId The user to check
   * @param type The notification type
   * @param withinMs Time window in milliseconds (default: 24 hours)
   */
  async hasDuplicate(userId: string, type: string, withinMs: number = 24 * 60 * 60 * 1000): Promise<boolean> {
    const prisma = getPrisma();
    const since = new Date(Date.now() - withinMs);
    const count = await prisma.userNotification.count({
      where: {
        userId,
        type,
        createdAt: { gte: since },
      },
    });
    return count > 0;
  }
}
