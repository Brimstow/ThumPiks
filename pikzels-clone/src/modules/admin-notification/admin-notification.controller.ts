/**
 * Admin Notification Controller
 *
 * WHAT: Thin HTTP handlers for admin notification inbox
 * WHY: Admin panel needs to view and manage notification records
 * HOW: Validates request, delegates to service, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Thin controllers: validation + delegation only
 */

import { Request, Response } from 'express';
import { getAdminNotificationService } from './admin-notification.service';
import { logger } from '../../utils/logger';

/** GET /inbox — List admin notifications */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const service = getAdminNotificationService();
    const query = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      type: req.query.type as string | undefined,
      priority: req.query.priority as string | undefined,
      isRead: req.query.isRead === 'true' ? true : req.query.isRead === 'false' ? false : undefined,
    };
    const result = await service.list(query);
    res.json(result);
  } catch (err: any) {
    logger.error('Failed to list admin notifications', err);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
}

/** GET /inbox/unread-count — Get unread count for badge */
export async function getUnreadCount(_req: Request, res: Response): Promise<void> {
  try {
    const service = getAdminNotificationService();
    const unreadCount = await service.countUnread();
    res.json({ unreadCount });
  } catch (err: any) {
    logger.error('Failed to get admin unread count', err);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
}

/** PATCH /inbox/:id/read — Mark a notification as read */
export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Notification ID required' });
      return;
    }
    const service = getAdminNotificationService();
    await service.markRead(id);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    logger.error('Failed to mark admin notification read', err);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
}

/** POST /inbox/mark-all-read — Mark all notifications as read */
export async function markAllRead(_req: Request, res: Response): Promise<void> {
  try {
    const service = getAdminNotificationService();
    const count = await service.markAllRead();
    res.json({ success: true, count });
  } catch (err: any) {
    logger.error('Failed to mark all admin notifications read', err);
    res.status(500).json({ error: 'Failed to mark all read' });
  }
}

/** DELETE /inbox/:id — Delete a notification */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Notification ID required' });
      return;
    }
    const service = getAdminNotificationService();
    await service.delete(id);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    logger.error('Failed to delete admin notification', err);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}

/** POST /inbox/bulk-delete — Bulk delete notifications */
export async function bulkDeleteNotifications(req: Request, res: Response): Promise<void> {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids must be a non-empty array' });
      return;
    }
    const service = getAdminNotificationService();
    const count = await service.bulkDelete(ids);
    res.json({ success: true, count });
  } catch (err: any) {
    logger.error('Failed to bulk delete admin notifications', err);
    res.status(500).json({ error: 'Failed to delete notifications' });
  }
}
