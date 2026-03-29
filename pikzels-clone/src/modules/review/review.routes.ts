/**
 * Review Routes (User-facing + Public)
 *
 * Public routes: GET approved reviews + stats (no auth)
 * User routes: Submit, view, update, delete own review (auth required)
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  getPublicReviews,
  getPublicStats,
  submitReview,
  getMyReview,
  updateMyReview,
  deleteMyReview,
} from './review.controller';

const router = Router();

// ============================================
// PUBLIC ROUTES (no auth)
// ============================================

// GET /api/reviews/public - Get all approved reviews
router.get('/public', getPublicReviews);

// GET /api/reviews/stats - Get public stats
router.get('/stats', getPublicStats);

// ============================================
// USER ROUTES (auth required)
// ============================================

// POST /api/reviews - Submit a new review
router.post('/', authenticateToken, (req, res) => submitReview(req as unknown as AuthRequest, res));

// GET /api/reviews/mine - Get user's own review
router.get('/mine', authenticateToken, (req, res) => getMyReview(req as unknown as AuthRequest, res));

// PUT /api/reviews/mine - Update user's own review
router.put('/mine', authenticateToken, (req, res) => updateMyReview(req as unknown as AuthRequest, res));

// DELETE /api/reviews/mine - Delete user's own review
router.delete('/mine', authenticateToken, (req, res) => deleteMyReview(req as unknown as AuthRequest, res));

export default router;
