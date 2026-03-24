/**
 * Ticket Service
 *
 * WHAT: Business logic for ticket management (status updates, replies, assignment)
 * WHY: Separates ticket lifecycle from feedback creation
 * HOW: Prisma CRUD + notification dispatch on status changes
 *
 * Alignment:
 * - Layered: controller → service → Prisma
 * - Service Factory: Registered as 'ticket' in factory
 */

import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { NotificationRouter } from '../../services/notification-router.service';
import { ticketStatusEmail } from '../../services/email-templates';
import type {
  TicketWithReplies,
  TicketListQuery,
  PaginatedResponse,
  TicketRecord,
  CreateTicketReplyInput,
  UpdateTicketInput,
  TicketReplyRecord,
} from './types';

export class TicketService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || getPrisma();
  }

  /**
   * Get ticket by ID with replies and linked feedback
   */
  async getById(ticketId: string): Promise<TicketWithReplies | null> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        Replies: { orderBy: { createdAt: 'asc' } },
        Feedback: true,
      },
    });

    return ticket as TicketWithReplies | null;
  }

  /**
   * List tickets with pagination and filters (admin view)
   */
  async list(
    query: TicketListQuery
  ): Promise<PaginatedResponse<TicketRecord>> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.assignee) where.assignee = query.assignee;

    const orderBy: any = {};
    const sortBy = query.sortBy || 'createdAt';
    orderBy[sortBy] = query.sortOrder || 'desc';

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: { Feedback: { select: { subject: true, type: true, priority: true } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: data as TicketRecord[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Update ticket status, assignee, resolution, etc.
   */
  async update(
    ticketId: string,
    input: UpdateTicketInput
  ): Promise<TicketRecord | null> {
    const data: any = {};

    if (input.status !== undefined) {
      data.status = input.status;

      if (input.status === 'RESOLVED') {
        data.resolvedAt = new Date();
      } else if (input.status === 'CLOSED') {
        data.closedAt = new Date();
      }
    }

    if (input.assignee !== undefined) data.assignee = input.assignee;
    if (input.resolution !== undefined) data.resolution = input.resolution;
    if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: { Feedback: { select: { subject: true, userId: true } } },
    });

    // Notify on status change
    if (input.status) {
      this.notifyStatusChange(ticket as any).catch((error) => {
        logger.error('Ticket status notification failed', error as Error, {
          ticketId,
        });
      });
    }

    return ticket as TicketRecord;
  }

  /**
   * Add a reply to a ticket
   */
  async addReply(
    ticketId: string,
    authorType: string,
    authorId: string,
    authorName: string,
    input: CreateTicketReplyInput
  ): Promise<TicketReplyRecord> {
    const reply = await this.prisma.ticketReply.create({
      data: {
        ticketId,
        authorType,
        authorId,
        authorName,
        message: input.message,
        isInternal: input.isInternal || false,
      },
    });

    // Update ticket's updatedAt timestamp
    await this.prisma.ticket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return reply as TicketReplyRecord;
  }

  /**
   * Create a ticket manually (admin-initiated)
   */
  async createManual(feedbackId?: string): Promise<TicketRecord> {
    // If feedbackId provided, check if a ticket already exists (unique constraint)
    if (feedbackId) {
      const existing = await this.prisma.ticket.findUnique({
        where: { feedbackId },
      });
      if (existing) {
        return existing as TicketRecord;
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        feedbackId: feedbackId || null,
        status: 'OPEN',
      },
    });

    logger.info('Manual ticket created', {
      ticketId: ticket.id,
      feedbackId,
    });

    return ticket as TicketRecord;
  }

  // ---- Internal ----

  private async notifyStatusChange(ticket: any): Promise<void> {
    const feedback = ticket.Feedback;
    if (!feedback) return;

    const router = NotificationRouter.getInstance();
    await router.route({
      eventKey: 'ticket.status_changed',
      title: `Ticket ${ticket.status}: ${feedback.subject || 'Untitled'}`,
      message: `Ticket status changed to ${ticket.status}`,
      type: 'ticket',
      priority: ticket.status === 'RESOLVED' ? 'normal' : 'low',
      metadata: {
        ticketId: ticket.id,
        status: ticket.status,
        feedbackId: ticket.feedbackId,
      },
      emailOverride: {
        subject: `Ticket Update: ${feedback.subject || 'Support Ticket'}`,
        html: ticketStatusEmail({
          ticketId: ticket.id,
          status: ticket.status,
          subject: feedback.subject || 'Support Ticket',
          resolution: ticket.resolution || undefined,
          assignee: ticket.assignee || undefined,
        }),
      },
    });
  }
}
