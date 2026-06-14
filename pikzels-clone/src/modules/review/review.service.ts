/**
 * Review Service
 *
 * WHAT: Core business logic for review CRUD + admin moderation
 * WHY: Keeps controllers thin; all validation, DB operations live here
 * HOW: Prisma for data, layered architecture (controller → service → Prisma)
 */

import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import type {
  CreateReviewInput,
  UpdateReviewInput,
  AdminReviewUpdate,
  PublicReview,
  ReviewRecord,
  ReviewListQuery,
  PaginatedResponse,
} from './types';

export class ReviewService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrisma();
  }

  /**
   * Submit a new review (one per user).
   */
  async create(userId: string, input: CreateReviewInput): Promise<ReviewRecord> {
    // Check if user already has a review
    const existing = await this.prisma.review.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new Error('You have already submitted a review');
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        rating: input.rating,
        title: input.title || null,
        body: input.body,
        channelName: input.channelName || null,
        channelUrl: input.channelUrl || null,
        subscribers: input.subscribers || null,
        niche: input.niche || null,
        improvement: input.improvement || null,
        status: 'PENDING',
      },
    });

    logger.info('Review submitted', { reviewId: review.id, userId });

    return review as ReviewRecord;
  }

  /**
   * Update user's own review (only if still PENDING).
   */
  async update(
    userId: string,
    input: UpdateReviewInput
  ): Promise<ReviewRecord | null> {
    const existing = await this.prisma.review.findUnique({
      where: { userId },
    });

    if (!existing) return null;

    // Only allow editing PENDING or REJECTED reviews
    if (existing.status === 'APPROVED') {
      throw new Error('Cannot edit an approved review. Contact support to request changes.');
    }

    const data: Record<string, unknown> = {};
    if (input.title !== undefined) data.title = input.title;
    if (input.body !== undefined) data.body = input.body;
    if (input.channelName !== undefined) data.channelName = input.channelName;
    if (input.channelUrl !== undefined) data.channelUrl = input.channelUrl;
    if (input.subscribers !== undefined) data.subscribers = input.subscribers;
    if (input.niche !== undefined) data.niche = input.niche;
    if (input.improvement !== undefined) data.improvement = input.improvement;

    // Re-set to PENDING after edit
    data.status = 'PENDING';

    const review = await this.prisma.review.update({
      where: { userId },
      data,
    });

    return review as ReviewRecord;
  }

  /**
   * Delete user's own review.
   */
  async delete(userId: string): Promise<boolean> {
    const result = await this.prisma.review.deleteMany({
      where: { userId },
    });
    return result.count > 0;
  }

  /**
   * Get user's own review.
   */
  async getByUserId(userId: string): Promise<ReviewRecord | null> {
    const review = await this.prisma.review.findUnique({
      where: { userId },
    });
    return review as ReviewRecord | null;
  }

  /**
   * Get all APPROVED reviews for public display.
   * Includes author name and avatar from User.
   */
  async getPublicReviews(
    options: { featured?: boolean; limit?: number } = {}
  ): Promise<PublicReview[]> {
    const where: Record<string, unknown> = { status: 'APPROVED' };
    if (options.featured) where.isFeatured = true;

    const reviews = await this.prisma.review.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { createdAt: 'desc' },
      ],
      take: options.limit || 50,
      include: {
        User: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return reviews.map((r) => ({
      id: r.id,
      rating: r.rating,
      title: r.title,
      body: r.body,
      channelName: r.channelName,
      subscribers: r.subscribers,
      niche: r.niche,
      improvement: r.improvement,
      isFeatured: r.isFeatured,
      createdAt: r.createdAt,
      authorName: r.User.name,
      authorAvatar: r.User.avatarUrl,
    }));
  }

  /**
   * Get review stats for the public stats section.
   * Excludes test/seed accounts (RFC-reserved domains + common test patterns).
   */
  async getPublicStats(): Promise<{
    totalReviews: number;
    averageRating: number;
    totalUsers: number;
    totalThumbnails: number;
  }> {
    const realUserFilter = {
      isActive: true,
      NOT: [
        { email: { endsWith: '@example.com' } },
        { email: { endsWith: '@test.com' } },
        { email: { endsWith: '@test.org' } },
        { email: { contains: 'tester' } },
        { email: { contains: 'testuser' } },
      ],
    };

    const [reviewStats, totalUsers, totalThumbnails] = await Promise.all([
      this.prisma.review.aggregate({
        where: { status: 'APPROVED' },
        _count: true,
        _avg: { rating: true },
      }),
      this.prisma.user.count({ where: realUserFilter }),
      this.prisma.thumbnail.count({
        where: {
          deletedAt: null,
          User: realUserFilter,
        },
      }),
    ]);

    return {
      totalReviews: reviewStats._count,
      averageRating: reviewStats._avg.rating || 0,
      totalUsers,
      totalThumbnails,
    };
  }

  // ============================================
  // ADMIN METHODS
  // ============================================

  /**
   * List all reviews with pagination and filters (admin).
   */
  async adminList(
    query: ReviewListQuery
  ): Promise<PaginatedResponse<ReviewRecord & { User: { name: string; email: string } }>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;

    const orderBy: Record<string, string> = {};
    const sortBy = query.sortBy || 'createdAt';
    orderBy[sortBy] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          User: { select: { name: true, email: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: data as unknown as (ReviewRecord & { User: { name: string; email: string } })[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Admin: approve, reject, feature, or add notes to a review.
   */
  async adminUpdate(
    reviewId: string,
    adminUserId: string,
    input: AdminReviewUpdate
  ): Promise<ReviewRecord | null> {
    const existing = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!existing) return null;

    const data: Record<string, unknown> = {};
    if (input.status !== undefined) {
      data.status = input.status;
      data.reviewedAt = new Date();
      data.reviewedBy = adminUserId;
    }
    if (input.isFeatured !== undefined) data.isFeatured = input.isFeatured;
    if (input.adminNote !== undefined) data.adminNote = input.adminNote;

    const review = await this.prisma.review.update({
      where: { id: reviewId },
      data,
    });

    logger.info('Admin updated review', {
      reviewId,
      adminUserId,
      changes: Object.keys(data),
    });

    return review as ReviewRecord;
  }

  /**
   * Admin: delete any review.
   */
  async adminDelete(reviewId: string): Promise<boolean> {
    const result = await this.prisma.review.deleteMany({
      where: { id: reviewId },
    });
    return result.count > 0;
  }
}
