/**
 * User Notification Controller
 *
 * WHAT: Thin HTTP handlers for user notification endpoints
 * WHY: Users need to view, acknowledge, and dismiss their notifications
 * HOW: Extracts userId from auth, delegates to service, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Thin controllers: validation + delegation only
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { getUserNotificationService } from './user-notification.service';
import { logger } from '../../utils/logger';

function isPrismaNotFound(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2025';
}

/** GET / — List user's notifications */
export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const service = getUserNotificationService();
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      type: req.query.type as string | undefined,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
    };
    const result = await service.listForUser(userId, query);
    res.json(result);
  } catch (err: unknown) {
    logger.error('Failed to list user notifications', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to load notifications' });
  }
}

/** GET /unread-count — Get unread count for badge */
export async function getUnreadCount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const service = getUserNotificationService();
    const unreadCount = await service.countUnread(userId);
    res.json({ unreadCount });
  } catch (err: unknown) {
    logger.error('Failed to get user unread count', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/** PATCH /:id/read — Mark a notification as read */
export async function markRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Notification ID required' });
      return;
    }

    const service = getUserNotificationService();
    await service.markRead(userId, id);
    res.json({ success: true });
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    logger.error('Failed to mark user notification read', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
}

/** POST /mark-all-read — Mark all notifications as read */
export async function markAllRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const service = getUserNotificationService();
    const count = await service.markAllRead(userId);
    res.json({ success: true, count });
  } catch (err: unknown) {
    logger.error('Failed to mark all user notifications read', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to mark all read' });
  }
}

/** DELETE /:id — Delete a notification */
export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Notification ID required' });
      return;
    }

    const service = getUserNotificationService();
    await service.delete(userId, id);
    res.json({ success: true });
  } catch (err: unknown) {
    if (isPrismaNotFound(err)) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    logger.error('Failed to delete user notification', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/** POST /bulk-delete — Delete multiple notifications at once */
export async function bulkDeleteNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || ids.some((id: unknown) => typeof id !== 'string')) {
      res.status(400).json({ error: 'ids must be a non-empty array of strings' });
      return;
    }
    if (ids.length > 100) {
      res.status(400).json({ error: 'Cannot delete more than 100 notifications at once' });
      return;
    }

    const service = getUserNotificationService();
    const count = await service.bulkDelete(userId, ids);
    res.json({ success: true, count });
  } catch (err: unknown) {
    logger.error('Failed to bulk-delete user notifications', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Failed to bulk-delete notifications' });
  }
}
