/**
 * Admin Notification Inbox Routes
 *
 * Admin-only routes for viewing and managing admin notification records.
 * Protected by admin auth middleware.
 * All routes under /inbox to avoid conflict with existing /config routes.
 */

import { Router } from 'express';
import { authenticateAdmin, requireAdmin } from '../admin/admin-auth.middleware';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  bulkDeleteNotifications,
} from './admin-notification.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireAdmin);

// GET    /inbox              — List all admin notifications (paginated)
// GET    /inbox/unread-count — Get unread count for badge
// PATCH  /inbox/:id/read     — Mark single notification as read
// POST   /inbox/mark-all-read — Mark all notifications as read
// DELETE /inbox/:id           — Delete single notification
// POST   /inbox/bulk-delete   — Bulk delete notifications

router.get('/inbox', listNotifications);
router.get('/inbox/unread-count', getUnreadCount);
router.patch('/inbox/:id/read', markRead);
router.post('/inbox/mark-all-read', markAllRead);
router.delete('/inbox/:id', deleteNotification);
router.post('/inbox/bulk-delete', bulkDeleteNotifications);

export default router;
