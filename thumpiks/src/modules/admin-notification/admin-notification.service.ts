/**
 * Admin Notification Service
 *
 * WHAT: CRUD operations for reading admin notification records
 * WHY: Admin panel needs to view, manage, and acknowledge notifications
 * HOW: Direct Prisma queries on AdminNotification table
 *
 * Alignment:
 * - Layered: controller -> service -> Prisma
 * - Service Factory: lazy singleton via getAdminNotificationService()
 */

import { getPrisma } from '../../utils/prisma-factory';
import type { AdminNotificationListQuery, AdminNotificationListResponse } from './types';

let instance: AdminNotificationService | null = null;

export function getAdminNotificationService(): AdminNotificationService {
  if (!instance) {
    instance = new AdminNotificationService();
  }
  return instance;
}

export class AdminNotificationService {
  /**
   * List admin notifications with pagination and filtering.
   * Sorted newest-first. Includes unread count.
   */
  async list(query: AdminNotificationListQuery = {}): Promise<AdminNotificationListResponse> {
    const prisma = getPrisma();
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (typeof query.isRead === 'boolean') where.isRead = query.isRead;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminNotification.count({ where }),
      prisma.adminNotification.count({ where: { isRead: false } }),
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

  /** Count unread admin notifications (for badge display). */
  async countUnread(): Promise<number> {
    const prisma = getPrisma();
    return prisma.adminNotification.count({ where: { isRead: false } });
  }

  /** Mark a single notification as read. */
  async markRead(id: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.adminNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /** Mark all unread notifications as read. Returns count updated. */
  async markAllRead(): Promise<number> {
    const prisma = getPrisma();
    const result = await prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return result.count;
  }

  /** Delete a single notification. */
  async delete(id: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.adminNotification.delete({ where: { id } });
  }

  /** Bulk delete notifications by IDs. Returns count deleted. */
  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const prisma = getPrisma();
    const result = await prisma.adminNotification.deleteMany({
      where: { id: { in: ids } },
    });
    return result.count;
  }
}
