/**
 * SSE (Server-Sent Events) Routes for Real-Time Notifications
 *
 * WHAT: Provides SSE endpoints for user and admin notification streams
 * WHY: Enables real-time notification push via invalidation pattern
 * HOW: Uses SSEService to manage connections; auth middleware validates identity
 *
 * Endpoints:
 *   GET /api/notifications/stream       — User SSE stream (cookie auth)
 *   GET /api/admin/notifications/stream  — Admin SSE stream (JWT header auth)
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { authenticateAdmin, requireAdmin } from '../admin/admin-auth.middleware';
import { getService } from '../../utils/service-factory';

const router = Router();

/**
 * User SSE endpoint.
 * Uses cookie-based auth via authenticateToken.
 * Client connects with native EventSource({ withCredentials: true }).
 */
router.get('/stream', authenticateToken, (req: Request, res: Response): void => {
  const userId = (req as any).user?.id;
  if (!userId) {
    res.status(401).json({ error: 'User ID not found' });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const sse = getService('sse');
  sse.registerUserConnection(userId, ip, req, res);
});

export default router;

/**
 * Admin SSE endpoint (separate router for admin mount point).
 * Uses admin JWT auth via authenticateAdmin + requireAdmin.
 * Client connects with @microsoft/fetch-event-source (JWT in Authorization header).
 */
export const adminSSERouter = Router();

adminSSERouter.get(
  '/stream',
  authenticateAdmin,
  requireAdmin,
  (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const sse = getService('sse');
    sse.registerAdminConnection(ip, req, res);
  },
);
