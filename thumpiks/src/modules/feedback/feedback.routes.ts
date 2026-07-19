/**
 * Feedback Routes (User-facing)
 *
 * All routes require authentication.
 * Users can only access their own feedback.
 */

import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  submitFeedback,
  listFeedback,
  getFeedback,
  deleteFeedback,
} from './feedback.controller';

const router = Router();

// All feedback routes require authentication
router.use(authenticateToken);

// POST /api/feedback - Submit new feedback
router.post('/', (req, res) => submitFeedback(req as unknown as AuthRequest, res));

// GET /api/feedback - List user's feedback
router.get('/', (req, res) => listFeedback(req as unknown as AuthRequest, res));

// GET /api/feedback/:id - Get single feedback
router.get('/:id', (req, res) => getFeedback(req as unknown as AuthRequest, res));

// DELETE /api/feedback/:id - Delete user's own feedback
router.delete('/:id', (req, res) => deleteFeedback(req as unknown as AuthRequest, res));

export default router;
