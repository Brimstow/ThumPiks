/**
 * Contact Routes
 *
 * WHAT: Route definitions for contact form API endpoints
 * WHY: Separate route definitions from business logic; define public and admin endpoints
 * HOW: Maps HTTP methods/paths to controller functions; applies middleware
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Public API: POST /api/contact requires no authentication
 * - Admin API: GET/PATCH endpoints require authentication + admin role
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  submitContactForm,
  listContactSubmissions,
  getContactSubmission,
  updateContactStatus,
  getContactStats,
} from './contact.controller';

const router = Router();

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Admin role check middleware
 * Ensures the authenticated user has admin privileges
 */
const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authReq = req as AuthRequest;

  if (!authReq.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Check if user has admin role
  // This assumes the user object has a role or isAdmin property
  // Adjust based on your auth implementation
  if (authReq.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
};

/**
 * Optional authentication middleware
 * Adds user info if token is present, but doesn't require it
 */
const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  // If no auth header, continue without user
  if (!authHeader) {
    next();
    return;
  }

  // If auth header present, try to authenticate
  // If it fails, continue without user (don't block the request)
  try {
    await authenticateToken(req, res, () => {
      // Authentication succeeded, user is now on request
      next();
    });
  } catch (error) {
    // Authentication failed, but continue anyway
    next();
  }
};

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * POST /api/contact
 *
 * Submit a new contact form
 *
 * Body:
 * - name: string (required) - Contact name
 * - email: string (required) - Contact email
 * - subject: string (required) - One of: general, support, billing, feature, bug
 * - message: string (required) - Contact message (10-5000 chars)
 * - honeypot?: string - Spam protection field (should be empty)
 * - formLoadTime?: number - Timestamp when form was loaded (for time-based spam check)
 *
 * Response:
 * - success: boolean
 * - message: string
 * - submissionId?: string
 */
router.post('/', optionalAuth, (req: Request, res: Response) => {
  submitContactForm(req, res);
});

// ============================================
// ADMIN ROUTES (Authentication + Admin Role Required)
// ============================================

/**
 * GET /api/contact/stats
 *
 * Get contact submission statistics
 *
 * Response:
 * - total: number
 * - pending: number
 * - triaged: number
 * - resolved: number
 * - dismissed: number
 */
router.get(
  '/stats',
  authenticateToken,
  requireAdmin,
  (req: Request, res: Response) => {
    getContactStats(req, res);
  }
);

/**
 * GET /api/contact
 *
 * List all contact submissions with pagination and filtering
 *
 * Query Parameters:
 * - page?: number (default: 1)
 * - pageSize?: number (default: 20, max: 100)
 * - status?: string - Filter by status: PENDING, TRIAGED, AUTO_RESOLVED, TICKET_CREATED, DISMISSED
 * - subject?: string - Filter by subject: general, support, billing, feature, bug
 * - sortBy?: string - Sort field: createdAt, email, status (default: createdAt)
 * - sortOrder?: string - Sort order: asc, desc (default: desc)
 * - search?: string - Search by name, email, or message content
 *
 * Response:
 * - data: ContactSubmissionRecord[]
 * - total: number
 * - page: number
 * - pageSize: number
 * - totalPages: number
 */
router.get(
  '/',
  authenticateToken,
  requireAdmin,
  (req: Request, res: Response) => {
    listContactSubmissions(req, res);
  }
);

/**
 * GET /api/contact/:id
 *
 * Get a single contact submission by ID
 *
 * Response:
 * - ContactSubmissionRecord
 */
router.get(
  '/:id',
  authenticateToken,
  requireAdmin,
  (req: Request, res: Response) => {
    getContactSubmission(req, res);
  }
);

/**
 * PATCH /api/contact/:id/status
 *
 * Update contact submission status
 *
 * Body:
 * - status: string (required) - One of: PENDING, TRIAGED, AUTO_RESOLVED, TICKET_CREATED, DISMISSED
 * - ticketId?: string - Associated ticket ID (if creating a ticket from this submission)
 *
 * Response:
 * - ContactSubmissionRecord
 */
router.patch(
  '/:id/status',
  authenticateToken,
  requireAdmin,
  (req: Request, res: Response) => {
    updateContactStatus(req, res);
  }
);

// ============================================
// EXPORT
// ============================================

export default router;
