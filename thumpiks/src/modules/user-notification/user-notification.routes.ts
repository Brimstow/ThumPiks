/**
 * User Notification Routes
 *
 * User-facing routes for viewing and managing personal notifications.
 * Protected by user auth middleware.
 */

import { Router, RequestHandler } from 'express';
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

router.get('/', listNotifications as unknown as RequestHandler);
router.get('/unread-count', getUnreadCount as unknown as RequestHandler);
router.patch('/:id/read', markRead as unknown as RequestHandler);
router.post('/mark-all-read', markAllRead as unknown as RequestHandler);
router.post('/bulk-delete', bulkDeleteNotifications as unknown as RequestHandler);
router.delete('/:id', deleteNotification as unknown as RequestHandler);

export default router;
