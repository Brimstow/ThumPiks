/**
 * Feedback Admin Routes
 *
 * Admin-only routes for feedback management and ticketing.
 * Protected by admin auth middleware.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateAdmin, requireAdmin } from '../../modules/admin/admin-auth.middleware';
import type { AuthRequest } from '../../types/auth';
import {
  listAllFeedback,
  listTickets,
  getTicket,
  updateTicket,
  addTicketReply,
  createManualTicket,
} from './feedback.controller';

const router = Router();

// All admin feedback routes require admin authentication + admin role
router.use(authenticateAdmin);
router.use(requireAdmin);

// Bridge adminUser -> user so controllers that read req.user work
router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.adminUser && !(req as any).user) {
    (req as any).user = {
      id: req.adminUser.id,
      email: req.adminUser.email,
      name: req.adminUser.name,
    };
  }
  next();
});

// GET /api/admin/feedback - List ALL feedback
router.get('/feedback', (req, res) =>
  listAllFeedback(req as unknown as AuthRequest, res)
);

// GET /api/admin/tickets - List all tickets
router.get('/tickets', (req, res) =>
  listTickets(req as unknown as AuthRequest, res)
);

// POST /api/admin/tickets/create - Create manual ticket
router.post('/tickets/create', (req, res) =>
  createManualTicket(req as unknown as AuthRequest, res)
);

// GET /api/admin/tickets/:id - Get ticket with replies
router.get('/tickets/:id', (req, res) =>
  getTicket(req as unknown as AuthRequest, res)
);

// PATCH /api/admin/tickets/:id - Update ticket
router.patch('/tickets/:id', (req, res) =>
  updateTicket(req as unknown as AuthRequest, res)
);

// POST /api/admin/tickets/:id/replies - Add reply to ticket
router.post('/tickets/:id/replies', (req, res) =>
  addTicketReply(req as unknown as AuthRequest, res)
);

export default router;
