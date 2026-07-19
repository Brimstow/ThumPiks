/**
 * Contact Controller
 *
 * WHAT: Thin HTTP layer for contact form endpoints
 * WHY: Keeps request/response handling separate from business logic
 * HOW: Validates input, delegates to ContactService, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Service Factory: Uses lazy-init pattern
 * - Public API: No authentication required for form submission
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { ContactService } from './contact.service';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../../types/auth';
import type { ContactFormInput, ContactSubject, ContactListQuery, ContactSubmissionStatus } from './types';

// ============================================
// LAZY SERVICE INITIALIZATION
// ============================================

let contactService: ContactService;

export const initializeContactService = (prismaClient?: PrismaClient) => {
  const prisma = prismaClient || getPrisma();
  contactService = new ContactService(prisma);
};

if (process.env.NODE_ENV !== 'test') {
  initializeContactService();
}

const getContactService = (): ContactService => {
  if (!contactService) initializeContactService();
  return contactService;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extract client IP address from request
 * Handles proxies, load balancers, and various hosting environments
 */
const getClientIp = (req: Request): string | undefined => {
  // Check common proxy headers first
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list; take the first (original client)
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (ips) {
      const firstIp = ips.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
  }

  // Check other common headers
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to connection remote address
  return req.ip || req.socket.remoteAddress || undefined;
};

// ============================================
// PUBLIC ENDPOINTS (No Authentication)
// ============================================

/**
 * POST /api/contact - Submit contact form (public)
 *
 * This is the main endpoint for the public contact form.
 * No authentication required - anyone can submit.
 * Includes spam protection via honeypot and time-based analysis.
 */
export const submitContactForm = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { name, email, subject, message, honeypot, formLoadTime } = req.body;

    // Build input object
    const input: ContactFormInput = {
      name: name || '',
      email: email || '',
      subject: subject || '',
      message: message || '',
      honeypot: honeypot || undefined,
      ...(formLoadTime ? { formLoadTime: Number(formLoadTime) } : {}),
    };

    // Get client IP for rate limiting and logging
    const ipAddress = getClientIp(req);

    // Get user ID if authenticated (optional - contact form works without auth)
    const userId = (req as AuthRequest).user?.id;

    // Submit to service
    const result = await getContactService().submit(input, ipAddress, userId);

    // Log submission attempt
    logger.info('Contact form submission processed', {
      success: result.success,
      email: input.email,
      subject: input.subject,
      ipAddress,
      submissionId: result.submissionId,
    });

    // Return response
    const statusCode = result.success ? 201 : 400;
    res.status(statusCode).json(result);
  } catch (error: unknown) {
    logger.error('Contact form submission error', error instanceof Error ? error : new Error(String(error)), {
      body: req.body,
    });
    res.status(500).json({
      success: false,
      message: 'An error occurred processing your request. Please try again later.',
    });
  }
};

// ============================================
// ADMIN ENDPOINTS (Authentication Required)
// ============================================

/**
 * GET /api/contact - List all contact submissions (admin only)
 */
export const listContactSubmissions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const query: ContactListQuery = {
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20,
      ...(req.query.status && { status: req.query.status as ContactSubmissionStatus }),
      ...(req.query.subject && { subject: req.query.subject as ContactSubject }),
      sortBy: (req.query.sortBy as ContactListQuery['sortBy']) || 'createdAt',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
      ...(req.query.search && { search: req.query.search as string }),
    };

    const result = await getContactService().list(query);
    res.json(result);
  } catch (error: unknown) {
    logger.error('Failed to list contact submissions', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to list contact submissions' });
  }
};

/**
 * GET /api/contact/:id - Get single contact submission (admin only)
 */
export const getContactSubmission = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const submission = await getContactService().getById(id);

    if (!submission) {
      res.status(404).json({ error: 'Contact submission not found' });
      return;
    }

    res.json(submission);
  } catch (error: unknown) {
    logger.error('Failed to get contact submission', error instanceof Error ? error : new Error(String(error)), {
      id: req.params.id,
    });
    res.status(500).json({ error: 'Failed to get contact submission' });
  }
};

/**
 * PATCH /api/contact/:id/status - Update contact submission status (admin only)
 */
export const updateContactStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, ticketId } = req.body;

    // Validate status
    const validStatuses = ['PENDING', 'TRIAGED', 'AUTO_RESOLVED', 'TICKET_CREATED', 'DISMISSED'];
    if (!status || !validStatuses.includes(status)) {
      res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`,
      });
      return;
    }

    const submission = await getContactService().updateStatus(id, status, ticketId);

    if (!submission) {
      res.status(404).json({ error: 'Contact submission not found' });
      return;
    }

    res.json(submission);
  } catch (error: unknown) {
    logger.error('Failed to update contact submission status', error instanceof Error ? error : new Error(String(error)), {
      id: req.params.id,
    });
    res.status(500).json({ error: 'Failed to update contact submission' });
  }
};

/**
 * GET /api/contact/stats - Get contact submission statistics (admin only)
 */
export const getContactStats = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const stats = await getContactService().getStats();
    res.json(stats);
  } catch (error: unknown) {
    logger.error('Failed to get contact submission stats', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: 'Failed to get contact stats' });
  }
};
