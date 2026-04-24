/**
 * Review Controller
 *
 * WHAT: Thin HTTP layer for review endpoints
 * WHY: Keeps request/response handling separate from business logic
 * HOW: Validates input, delegates to ReviewService, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Service Factory: Uses lazy-init pattern (like feedback.controller.ts)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { ReviewService } from './review.service';
import { logger } from '../../utils/logger';
import type { CreateReviewInput, UpdateReviewInput, AdminReviewUpdate, ReviewStatus } from './types';

// ============================================
// LAZY SERVICE INITIALIZATION
// ============================================

let reviewService: ReviewService;

export const initializeServices = (prismaClient?: PrismaClient) => {
  const prisma = prismaClient || getPrisma();
  reviewService = new ReviewService(prisma);
};

if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

const getReviewService = (): ReviewService => {
  if (!reviewService) initializeServices();
  return reviewService;
};

// ============================================
// VALIDATION CONSTANTS
// ============================================

const MIN_RATING = 1;
const MAX_RATING = 5;
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 2000;
const MAX_CHANNEL_NAME_LENGTH = 100;
const MAX_NICHE_LENGTH = 50;
const MAX_IMPROVEMENT_LENGTH = 100;
const VALID_STATUSES: ReviewStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

// ============================================
// PUBLIC ENDPOINTS (no auth required)
// ============================================

/**
 * GET /api/reviews/public - Get all approved reviews for public display
 */
export const getPublicReviews = async (
  req: any,
  res: Response
): Promise<any> => {
  try {
    const featured = req.query.featured === 'true' ? true : undefined;
    const limit = parseInt(req.query.limit as string) || undefined;

    const reviews = await getReviewService().getPublicReviews({
      ...(featured ? { featured } : {}),
      ...(limit ? { limit } : {}),
    });

    return res.json({ reviews });
  } catch (error: any) {
    logger.error('Failed to get public reviews', error);
    return res.status(500).json({ error: 'Failed to get reviews' });
  }
};

/**
 * GET /api/reviews/stats - Get public review stats
 */
export const getPublicStats = async (
  _req: any,
  res: Response
): Promise<any> => {
  try {
    const stats = await getReviewService().getPublicStats();
    return res.json(stats);
  } catch (error: any) {
    logger.error('Failed to get review stats', error);
    return res.status(500).json({ error: 'Failed to get stats' });
  }
};

// ============================================
// USER ENDPOINTS (auth required)
// ============================================

/**
 * POST /api/reviews - Submit a new review
 */
export const submitReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rating, title, body, channelName, channelUrl, subscribers, niche, improvement } = req.body;

    // Validate required fields
    if (!rating || !body) {
      return res.status(400).json({ error: 'rating and body are required' });
    }

    if (typeof rating !== 'number' || rating < MIN_RATING || rating > MAX_RATING) {
      return res.status(400).json({ error: `rating must be between ${MIN_RATING} and ${MAX_RATING}` });
    }

    if (title && title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `title must be ${MAX_TITLE_LENGTH} characters or less` });
    }

    if (body.length > MAX_BODY_LENGTH) {
      return res.status(400).json({ error: `body must be ${MAX_BODY_LENGTH} characters or less` });
    }

    if (channelName && channelName.length > MAX_CHANNEL_NAME_LENGTH) {
      return res.status(400).json({ error: `channelName must be ${MAX_CHANNEL_NAME_LENGTH} characters or less` });
    }

    if (niche && niche.length > MAX_NICHE_LENGTH) {
      return res.status(400).json({ error: `niche must be ${MAX_NICHE_LENGTH} characters or less` });
    }

    if (improvement && improvement.length > MAX_IMPROVEMENT_LENGTH) {
      return res.status(400).json({ error: `improvement must be ${MAX_IMPROVEMENT_LENGTH} characters or less` });
    }

    const input: CreateReviewInput = {
      rating,
      title: title?.trim(),
      body: body.trim(),
      channelName: channelName?.trim(),
      channelUrl: channelUrl?.trim(),
      subscribers: subscribers?.trim(),
      niche: niche?.trim(),
      improvement: improvement?.trim(),
    };

    const review = await getReviewService().create(req.user.id, input);

    return res.status(201).json(review);
  } catch (error: any) {
    if (error.message === 'You have already submitted a review') {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Failed to submit review', error, { userId: req.user?.id || '' });
    return res.status(500).json({ error: 'Failed to submit review' });
  }
};

/**
 * GET /api/reviews/mine - Get user's own review
 */
export const getMyReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const review = await getReviewService().getByUserId(req.user.id);

    return res.json({ review });
  } catch (error: any) {
    logger.error('Failed to get user review', error, { userId: req.user?.id || '' });
    return res.status(500).json({ error: 'Failed to get review' });
  }
};

/**
 * PUT /api/reviews/mine - Update user's own review
 */
export const updateMyReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rating, title, body, channelName, channelUrl, subscribers, niche, improvement } = req.body;

    if (rating !== undefined && (typeof rating !== 'number' || rating < MIN_RATING || rating > MAX_RATING)) {
      return res.status(400).json({ error: `rating must be between ${MIN_RATING} and ${MAX_RATING}` });
    }

    if (title && title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `title must be ${MAX_TITLE_LENGTH} characters or less` });
    }

    if (body && body.length > MAX_BODY_LENGTH) {
      return res.status(400).json({ error: `body must be ${MAX_BODY_LENGTH} characters or less` });
    }

    const input: UpdateReviewInput = {};
    if (rating !== undefined) input.rating = rating;
    if (title !== undefined) input.title = title?.trim();
    if (body !== undefined) input.body = body?.trim();
    if (channelName !== undefined) input.channelName = channelName?.trim();
    if (channelUrl !== undefined) input.channelUrl = channelUrl?.trim();
    if (subscribers !== undefined) input.subscribers = subscribers?.trim();
    if (niche !== undefined) input.niche = niche?.trim();
    if (improvement !== undefined) input.improvement = improvement?.trim();

    const review = await getReviewService().update(req.user.id, input);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json(review);
  } catch (error: any) {
    if (error.message?.includes('Cannot edit an approved review')) {
      return res.status(403).json({ error: error.message });
    }
    logger.error('Failed to update review', error, { userId: req.user?.id || '' });
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

/**
 * DELETE /api/reviews/mine - Delete user's own review
 */
export const deleteMyReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const deleted = await getReviewService().delete(req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete review', error, { userId: req.user?.id || '' });
    return res.status(500).json({ error: 'Failed to delete review' });
  }
};

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/admin/reviews - List all reviews (admin)
 */
export const adminListReviews = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const query = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      ...(req.query.status ? { status: req.query.status as ReviewStatus } : {}),
      ...(req.query.isFeatured === 'true' ? { isFeatured: true } : req.query.isFeatured === 'false' ? { isFeatured: false } : {}),
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await getReviewService().adminList(query);

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to list reviews (admin)', error);
    return res.status(500).json({ error: 'Failed to list reviews' });
  }
};

/**
 * PATCH /api/admin/reviews/:id - Update review status/featured (admin)
 */
export const adminUpdateReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    const { status, isFeatured, adminNote } = req.body;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const input: AdminReviewUpdate = {};
    if (status !== undefined) input.status = status;
    if (isFeatured !== undefined) input.isFeatured = isFeatured;
    if (adminNote !== undefined) input.adminNote = adminNote;

    const review = await getReviewService().adminUpdate(id, req.user!.id, input);

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.json(review);
  } catch (error: any) {
    logger.error('Failed to update review (admin)', error, { reviewId: req.params.id });
    return res.status(500).json({ error: 'Failed to update review' });
  }
};

/**
 * DELETE /api/admin/reviews/:id - Delete any review (admin)
 */
export const adminDeleteReview = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const id = req.params.id as string;

    const deleted = await getReviewService().adminDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Review not found' });
    }

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete review (admin)', error, { reviewId: req.params?.id || '' });
    return res.status(500).json({ error: 'Failed to delete review' });
  }
};
