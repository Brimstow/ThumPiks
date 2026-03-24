/**
 * Feedback Service
 *
 * WHAT: Core business logic for feedback CRUD + AI enrichment + notification dispatch
 * WHY: Keeps controllers thin; all validation, DB operations, and side effects live here
 * HOW: Prisma for data, analyzeFeedback() for AI, NotificationRouter for alerts
 *
 * Alignment:
 * - Layered: controller → service → Prisma (no direct DB in controller)
 * - Event-Driven: Emits events after feedback creation for async processing
 * - Service Factory: Instantiated via factory, injected Prisma for testability
 */

import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { analyzeFeedback } from './feedback.ai';
import { NotificationRouter } from '../../services/notification-router.service';
import {
  feedbackSubmittedEmail,
} from '../../services/email-templates';
import type {
  CreateFeedbackInput,
  FeedbackRecord,
  FeedbackWithTicket,
  FeedbackListQuery,
  PaginatedResponse,
} from './types';

export class FeedbackService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrisma();
  }

  /**
   * Submit new feedback. Triggers AI analysis + notification routing (async).
   */
  async create(
    userId: string,
    input: CreateFeedbackInput
  ): Promise<FeedbackRecord> {
    // 1. Create the feedback row immediately (fast path)
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        type: input.type,
        subject: input.subject,
        message: input.message,
        screenshotUrl: input.screenshotUrl || null,
        screenshotPublicId: input.screenshotPublicId || null,
        tags: [],
        priority: 'MEDIUM',
      },
    });

    // 2. Fire-and-forget: AI analysis + notification (don't block the user)
    this.enrichAndNotify(feedback as FeedbackRecord).catch((error) => {
      logger.error(
        'Background feedback enrichment failed',
        error as Error,
        { feedbackId: feedback.id }
      );
    });

    return feedback as FeedbackRecord;
  }

  /**
   * Get a single feedback by ID (scoped to user, or any for admin)
   */
  async getById(
    feedbackId: string,
    userId?: string
  ): Promise<FeedbackWithTicket | null> {
    const where: any = { id: feedbackId };
    if (userId) where.userId = userId;

    const result = await this.prisma.feedback.findFirst({
      where,
      include: { Ticket: true },
    });

    if (!result) return null;
    return { ...result, tags: result.tags as string[] } as FeedbackWithTicket;
  }

  /**
   * List feedback with pagination and filters
   */
  async list(
    query: FeedbackListQuery,
    userId?: string
  ): Promise<PaginatedResponse<FeedbackRecord>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (userId) where.userId = userId;
    if (query.type) where.type = query.type;
    if (query.priority) where.priority = query.priority;
    if (query.sentiment) where.sentiment = query.sentiment;
    if (query.category) where.category = query.category;

    const orderBy: any = {};
    const sortBy = query.sortBy || 'createdAt';
    orderBy[sortBy] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.feedback.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { Ticket: { select: { id: true, status: true } } },
      }),
      this.prisma.feedback.count({ where }),
    ]);

    return {
      data: data.map((d) => ({ ...d, tags: d.tags as string[] })) as FeedbackRecord[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Delete feedback (user can only delete their own)
   */
  async delete(feedbackId: string, userId: string): Promise<boolean> {
    const result = await this.prisma.feedback.deleteMany({
      where: { id: feedbackId, userId },
    });
    return result.count > 0;
  }

  // ---- Background Processing ----

  /**
   * Enrich feedback with AI analysis and dispatch notifications.
   * Runs asynchronously after feedback creation.
   */
  private async enrichAndNotify(feedback: FeedbackRecord): Promise<void> {
    // AI Analysis
    const analysis = await analyzeFeedback(
      feedback.type as any,
      feedback.subject,
      feedback.message
    );

    // Update feedback with AI results
    await this.prisma.feedback.update({
      where: { id: feedback.id },
      data: {
        sentiment: analysis.sentiment,
        sentimentScore: analysis.sentimentScore,
        category: analysis.category,
        tags: analysis.tags,
        aiSummary: analysis.summary,
        priority: analysis.priority,
      },
    });

    // Auto-create ticket for HIGH/CRITICAL priority
    if (analysis.priority === 'HIGH' || analysis.priority === 'CRITICAL') {
      await this.prisma.ticket.create({
        data: {
          feedbackId: feedback.id,
          status: 'OPEN',
        },
      });

      logger.info('Auto-created ticket for high-priority feedback', {
        feedbackId: feedback.id,
        priority: analysis.priority,
      });
    }

    // Fetch user info for email template
    const user = await this.prisma.user.findUnique({
      where: { id: feedback.userId },
      select: { name: true, email: true },
    });

    // Dispatch notification
    const router = NotificationRouter.getInstance();
    await router.route({
      eventKey: 'feedback.submitted',
      title: `New ${feedback.type} Feedback: ${feedback.subject}`,
      message: analysis.summary || feedback.message.slice(0, 200),
      type: 'feedback',
      priority: analysis.priority === 'CRITICAL' ? 'urgent' : 'normal',
      metadata: {
        feedbackId: feedback.id,
        userId: feedback.userId,
        type: feedback.type,
        priority: analysis.priority,
        sentiment: analysis.sentiment,
      },
      emailOverride: {
        subject: `[${analysis.priority}] New Feedback: ${feedback.subject}`,
        html: feedbackSubmittedEmail({
          feedbackId: feedback.id,
          userName: user?.name || 'Unknown User',
          userEmail: user?.email || '',
          type: feedback.type,
          subject: feedback.subject,
          message: feedback.message,
          sentiment: analysis.sentiment,
          category: analysis.category,
          priority: analysis.priority,
          ...(analysis.summary ? { aiSummary: analysis.summary } : {}),
          ...(feedback.screenshotUrl ? { screenshotUrl: feedback.screenshotUrl } : {}),
        }),
      },
    });
  }
}
