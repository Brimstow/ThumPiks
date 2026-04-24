/**
 * User Notification Routes
 *
 * User-facing routes for viewing and managing personal notifications.
 * Protected by user auth middleware.
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import {
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
  deleteNotification,
  bulkDeleteNotifications,
} from './user-notification.controller';

const router = Router();

// All routes require user authentication
router.use(authenticateToken);

// GET    /                 — List user's notifications (paginated)
// GET    /unread-count     — Get unread count for badge
// PATCH  /:id/read         — Mark single notification as read
// POST   /mark-all-read    — Mark all notifications as read
// POST   /bulk-delete      — Delete multiple notifications
// DELETE /:id              — Delete single notification

router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markRead);
router.post('/mark-all-read', markAllRead);
router.post('/bulk-delete', bulkDeleteNotifications);
router.delete('/:id', deleteNotification);

export default router;
