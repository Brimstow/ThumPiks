/**
 * Review Admin Routes
 *
 * All routes require admin authentication.
 * Admins can list, approve/reject, feature, and delete reviews.
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  adminListReviews,
  adminUpdateReview,
  adminDeleteReview,
} from './review.controller';

const router = Router();

// All admin review routes require authentication
router.use(authenticateToken);

// GET /api/admin/reviews - List all reviews
router.get('/', (req, res) => adminListReviews(req as unknown as AuthRequest, res));

// PATCH /api/admin/reviews/:id - Update review (approve/reject/feature)
router.patch('/:id', (req, res) => adminUpdateReview(req as unknown as AuthRequest, res));

// DELETE /api/admin/reviews/:id - Delete any review
router.delete('/:id', (req, res) => adminDeleteReview(req as unknown as AuthRequest, res));

export default router;
