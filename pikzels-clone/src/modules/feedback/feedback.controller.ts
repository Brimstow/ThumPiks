/**
 * Feedback Controller
 *
 * WHAT: Thin HTTP layer for feedback + ticket endpoints
 * WHY: Keeps request/response handling separate from business logic
 * HOW: Validates input, delegates to FeedbackService/TicketService, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Service Factory: Uses lazy-init pattern (like vision.controller.ts)
 */

import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { FeedbackService } from './feedback.service';
import { TicketService } from './ticket.service';
import { logger } from '../../utils/logger';
import type {
  CreateFeedbackInput,
  FeedbackType,
  FeedbackListQuery,
  TicketListQuery,
  UpdateTicketInput,
  CreateTicketReplyInput,
} from './types';

// ============================================
// LAZY SERVICE INITIALIZATION
// ============================================

let feedbackService: FeedbackService;
let ticketService: TicketService;

export const initializeServices = (prismaClient?: PrismaClient) => {
  const prisma = prismaClient || getPrisma();
  feedbackService = new FeedbackService(prisma);
  ticketService = new TicketService(prisma);
};

if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

const getFeedbackService = (): FeedbackService => {
  if (!feedbackService) initializeServices();
  return feedbackService;
};

const getTicketService = (): TicketService => {
  if (!ticketService) initializeServices();
  return ticketService;
};

// ============================================
// FEEDBACK ENDPOINTS
// ============================================

const VALID_TYPES: FeedbackType[] = ['BUG', 'FEATURE_REQUEST', 'GENERAL'];
const MAX_SUBJECT_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * POST /api/feedback - Submit new feedback
 */
export const submitFeedback = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, subject, message, screenshotUrl, screenshotPublicId } =
      req.body;

    // Validate required fields
    if (!type || !subject || !message) {
      return res
        .status(400)
        .json({ error: 'type, subject, and message are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        error: `type must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }

    if (subject.length > MAX_SUBJECT_LENGTH) {
      return res.status(400).json({
        error: `subject must be ${MAX_SUBJECT_LENGTH} characters or less`,
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        error: `message must be ${MAX_MESSAGE_LENGTH} characters or less`,
      });
    }

    const input: CreateFeedbackInput = {
      type,
      subject: subject.trim(),
      message: message.trim(),
      screenshotUrl: screenshotUrl || undefined,
      screenshotPublicId: screenshotPublicId || undefined,
    };

    const feedback = await getFeedbackService().create(req.user.id, input);

    return res.status(201).json(feedback);
  } catch (error: any) {
    logger.error('Failed to submit feedback', error, {
      userId: req.user?.id || '',
    });
    return res.status(500).json({ error: 'Failed to submit feedback' });
  }
};

/**
 * GET /api/feedback - List user's feedback
 */
export const listFeedback = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query: FeedbackListQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      type: req.query.type as any,
      priority: req.query.priority as any,
      sentiment: req.query.sentiment as any,
      category: req.query.category as string,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await getFeedbackService().list(query, req.user.id);

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to list feedback', error, {
      userId: req.user?.id || '',
    });
    return res.status(500).json({ error: 'Failed to list feedback' });
  }
};

/**
 * GET /api/feedback/:id - Get single feedback
 */
export const getFeedback = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;

    const feedback = await getFeedbackService().getById(id, req.user.id);

    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    return res.json(feedback);
  } catch (error: any) {
    logger.error('Failed to get feedback', error, {
      feedbackId: String(req.params.id),
    });
    return res.status(500).json({ error: 'Failed to get feedback' });
  }
};

/**
 * DELETE /api/feedback/:id - Delete user's own feedback
 */
export const deleteFeedback = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;

    const deleted = await getFeedbackService().delete(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    return res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete feedback', error, {
      feedbackId: String(req.params.id),
    });
    return res.status(500).json({ error: 'Failed to delete feedback' });
  }
};

// ============================================
// ADMIN TICKET ENDPOINTS
// ============================================

/**
 * GET /api/admin/tickets - List all tickets (admin)
 */
export const listTickets = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const query: TicketListQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      status: req.query.status as any,
      assignee: req.query.assignee as string,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await getTicketService().list(query);

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to list tickets', error);
    return res.status(500).json({ error: 'Failed to list tickets' });
  }
};

/**
 * GET /api/admin/tickets/:id - Get single ticket with replies (admin)
 */
export const getTicket = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const id = req.params.id as string;
    const ticket = await getTicketService().getById(id);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json(ticket);
  } catch (error: any) {
    logger.error('Failed to get ticket', error, {
      ticketId: String(req.params.id),
    });
    return res.status(500).json({ error: 'Failed to get ticket' });
  }
};

/**
 * PATCH /api/admin/tickets/:id - Update ticket (admin)
 */
export const updateTicket = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const id = req.params.id as string;
    const { status, assignee, resolution, internalNotes } = req.body;

    const input: UpdateTicketInput = {};
    if (status !== undefined) input.status = status;
    if (assignee !== undefined) input.assignee = assignee;
    if (resolution !== undefined) input.resolution = resolution;
    if (internalNotes !== undefined) input.internalNotes = internalNotes;

    const ticket = await getTicketService().update(id, input);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    return res.json(ticket);
  } catch (error: any) {
    logger.error('Failed to update ticket', error, {
      ticketId: String(req.params.id),
    });
    return res.status(500).json({ error: 'Failed to update ticket' });
  }
};

/**
 * POST /api/admin/tickets/:id/replies - Add reply to ticket (admin)
 */
export const addTicketReply = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    const { message, isInternal } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const input: CreateTicketReplyInput = {
      message: message.trim(),
      isInternal: isInternal || false,
    };

    const reply = await getTicketService().addReply(
      id,
      'ADMIN',
      req.user.id,
      req.user.name || req.user.email,
      input
    );

    return res.status(201).json(reply);
  } catch (error: any) {
    logger.error('Failed to add ticket reply', error, {
      ticketId: String(req.params.id),
    });
    return res.status(500).json({ error: 'Failed to add ticket reply' });
  }
};

/**
 * POST /api/admin/tickets/create - Create manual ticket (admin)
 */
export const createManualTicket = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const { feedbackId } = req.body;

    const ticket = await getTicketService().createManual(feedbackId);

    return res.status(201).json(ticket);
  } catch (error: any) {
    logger.error('Failed to create manual ticket', error);
    return res.status(500).json({ error: 'Failed to create ticket' });
  }
};

/**
 * GET /api/admin/feedback - List ALL feedback (admin, no user scope)
 */
export const listAllFeedback = async (
  req: AuthRequest,
  res: Response
): Promise<any> => {
  try {
    const query: FeedbackListQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      type: req.query.type as any,
      priority: req.query.priority as any,
      sentiment: req.query.sentiment as any,
      category: req.query.category as string,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    // No userId = admin sees all
    const result = await getFeedbackService().list(query);

    return res.json(result);
  } catch (error: any) {
    logger.error('Failed to list all feedback', error);
    return res.status(500).json({ error: 'Failed to list feedback' });
  }
};
