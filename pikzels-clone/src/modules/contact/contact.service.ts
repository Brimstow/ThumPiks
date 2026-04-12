/**
 * Contact Service
 *
 * WHAT: Business logic for contact form submissions with spam protection
 * WHY: Separate business logic from HTTP handling; provide spam detection, validation, and database logging
 * HOW: Validates input, runs spam checks, creates ContactSubmission record, optionally sends notifications
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Service Factory: Registered in service-factory.ts for centralized access
 * - Modular Design: Shared service under src/modules/contact/
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { contactAutoResponseEmail } from '../../services/email-templates';
import {
  ContactFormInput,
  ContactValidationResult,
  SpamCheckResult,
  ContactSubmissionResponse,
  ContactSubmissionRecord,
  ContactListQuery,
  ContactListResponse,
  ContactSubmissionStatus,
  CONTACT_VALIDATION,
  SPAM_PROTECTION,
} from './types';

// ============================================
// VALIDATION HELPERS
// ============================================

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const countUrls = (text: string): number => {
  const urlRegex = /(https?:\/\/[^\s]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? matches.length : 0;
};

// ============================================
// SPAM DETECTION
// ============================================

/**
 * Check if honeypot field was filled (indicates bot)
 */
const checkHoneypot = (honeypot?: string): SpamCheckResult => {
  if (honeypot && honeypot.trim().length > 0) {
    logger.warn('Contact form honeypot triggered', { honeypot });
    return {
      isSpam: true,
      reason: 'Honeypot field filled',
      score: 1.0,
    };
  }
  return { isSpam: false, score: 0 };
};

/**
 * Check if form was filled too quickly (indicates bot)
 */
const checkFormFillTime = (formLoadTime?: number): SpamCheckResult => {
  if (!formLoadTime) {
    // No timestamp provided - slight suspicion but not definitive
    return { isSpam: false, score: 0.1 };
  }

  const now = Date.now();
  const elapsed = now - formLoadTime;

  if (elapsed < SPAM_PROTECTION.minFormFillTime) {
    logger.warn('Contact form filled too quickly', {
      elapsed,
      threshold: SPAM_PROTECTION.minFormFillTime,
    });
    return {
      isSpam: true,
      reason: `Form filled in ${elapsed}ms (minimum: ${SPAM_PROTECTION.minFormFillTime}ms)`,
      score: 0.9,
    };
  }

  // Suspicious if filled very quickly but not instant
  if (elapsed < 5000) {
    return { isSpam: false, score: 0.3 };
  }

  return { isSpam: false, score: 0 };
};

/**
 * Check message content for spam keywords and patterns
 */
const checkContent = (input: ContactFormInput): SpamCheckResult => {
  let score = 0;
  const reasons: string[] = [];

  const { message, name, email } = input;
  const combinedText = `${name} ${email} ${message}`.toLowerCase();

  // Check for spam keywords
  const keywordMatches = SPAM_PROTECTION.spamKeywords.filter(keyword =>
    combinedText.includes(keyword.toLowerCase())
  );

  if (keywordMatches.length > 0) {
    score += keywordMatches.length * 0.2;
    reasons.push(`Spam keywords detected: ${keywordMatches.join(', ')}`);
  }

  // Check for excessive URLs
  const urlCount = countUrls(message);
  if (urlCount > 2) {
    score += 0.3;
    reasons.push(`Excessive URLs in message: ${urlCount}`);
  } else if (urlCount > 0) {
    score += 0.1;
    reasons.push(`URLs in message: ${urlCount}`);
  }

  // Check for very short messages (often spam)
  if (message.trim().length < 20) {
    score += 0.1;
    reasons.push('Very short message');
  }

  // Check for ALL CAPS (common in spam)
  const upperRatio =
    (message.match(/[A-Z]/g) || []).length / Math.max(message.length, 1);
  if (upperRatio > 0.7 && message.length > 20) {
    score += 0.2;
    reasons.push('Excessive capitalization');
  }

  // Check for repeated characters (e.g., "!!!!!" or "?????")
  if (/(.)\1{4,}/.test(message)) {
    score += 0.1;
    reasons.push('Repeated characters detected');
  }

  // Normalize score to 0-1 range
  const normalizedScore = Math.min(score, 1);

  return {
    isSpam: normalizedScore >= 0.7,
    ...(reasons.length > 0 ? { reason: reasons.join('; ') } : {}),
    score: normalizedScore,
  };
};

/**
 * Run all spam checks and return combined result
 */
const runSpamChecks = (input: ContactFormInput): SpamCheckResult => {
  const checks = [
    checkHoneypot(input.honeypot),
    checkFormFillTime(input.formLoadTime),
    checkContent(input),
  ];

  // If any check flags as spam with high confidence, return immediately
  for (const check of checks) {
    if (check.isSpam && check.score >= 0.9) {
      return check;
    }
  }

  // Otherwise, combine scores
  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const avgScore = totalScore / checks.length;

  // Find the highest-scoring check
  const worstCheck = checks.reduce((worst, check) =>
    check.score > worst.score ? check : worst
  );

  return {
    isSpam: avgScore >= 0.6,
    ...(worstCheck.reason ? { reason: worstCheck.reason } : {}),
    score: avgScore,
  };
};

/**
 * Check rate limits for the given IP address
 */
const checkRateLimit = async (
  prisma: PrismaClient,
  ipAddress: string | undefined
): Promise<{ allowed: boolean; reason?: string }> => {
  if (!ipAddress) {
    // No IP available - allow but log
    logger.warn('Contact form submission without IP address');
    return { allowed: true };
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    // Check hourly limit
    const hourlyCount = await prisma.contactSubmission.count({
      where: {
        ipAddress,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (hourlyCount >= SPAM_PROTECTION.maxSubmissionsPerHour) {
      logger.warn('Contact form hourly rate limit exceeded', {
        ipAddress,
        count: hourlyCount,
      });
      return {
        allowed: false,
        reason: 'Too many submissions. Please try again later.',
      };
    }

    // Check daily limit
    const dailyCount = await prisma.contactSubmission.count({
      where: {
        ipAddress,
        createdAt: { gte: oneDayAgo },
      },
    });

    if (dailyCount >= SPAM_PROTECTION.maxSubmissionsPerDay) {
      logger.warn('Contact form daily rate limit exceeded', {
        ipAddress,
        count: dailyCount,
      });
      return {
        allowed: false,
        reason: 'Daily submission limit reached. Please try again tomorrow.',
      };
    }

    return { allowed: true };
  } catch (error) {
    logger.error('Rate limit check failed', error as Error, { ipAddress });
    // Fail open - allow submission if rate limit check fails
    return { allowed: true };
  }
};

// ============================================
// CONTACT SERVICE CLASS
// ============================================

export class ContactService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validate contact form input
   */
  validate(input: ContactFormInput): ContactValidationResult {
    const errors: string[] = [];

    // Name validation
    if (!input.name || input.name.trim().length === 0) {
      errors.push('Name is required');
    } else if (input.name.length > CONTACT_VALIDATION.name.maxLength) {
      errors.push(
        `Name must be ${CONTACT_VALIDATION.name.maxLength} characters or less`
      );
    }

    // Email validation
    if (!input.email || input.email.trim().length === 0) {
      errors.push('Email is required');
    } else if (!isValidEmail(input.email)) {
      errors.push('Invalid email address');
    } else if (input.email.length > CONTACT_VALIDATION.email.maxLength) {
      errors.push(
        `Email must be ${CONTACT_VALIDATION.email.maxLength} characters or less`
      );
    }

    // Subject validation
    if (!input.subject) {
      errors.push('Subject is required');
    } else if (
      !CONTACT_VALIDATION.subject.allowedValues.includes(input.subject)
    ) {
      errors.push(
        `Subject must be one of: ${CONTACT_VALIDATION.subject.allowedValues.join(', ')}`
      );
    }

    // Message validation
    if (!input.message || input.message.trim().length === 0) {
      errors.push('Message is required');
    } else if (input.message.length < CONTACT_VALIDATION.message.minLength) {
      errors.push(
        `Message must be at least ${CONTACT_VALIDATION.message.minLength} characters`
      );
    } else if (input.message.length > CONTACT_VALIDATION.message.maxLength) {
      errors.push(
        `Message must be ${CONTACT_VALIDATION.message.maxLength} characters or less`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Submit a new contact form
   */
  async submit(
    input: ContactFormInput,
    ipAddress?: string,
    userId?: string
  ): Promise<ContactSubmissionResponse> {
    try {
      // Step 1: Validate input
      const validation = this.validate(input);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.errors.join(', '),
        };
      }

      // Step 2: Check rate limits
      const rateLimitCheck = await checkRateLimit(this.prisma, ipAddress);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          message: rateLimitCheck.reason || 'Rate limit exceeded',
        };
      }

      // Step 3: Run spam checks
      const spamCheck = runSpamChecks(input);
      if (spamCheck.isSpam) {
        logger.warn('Contact form spam detected', {
          email: input.email,
          reason: spamCheck.reason,
          score: spamCheck.score,
          ipAddress,
        });

        // Still save the submission but mark as dismissed
        const submission = await this.prisma.contactSubmission.create({
          data: {
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            subject: input.subject,
            message: input.message.trim(),
            status: 'DISMISSED',
            ipAddress: ipAddress || null,
            userId: userId || null,
            triageResult: {
              spamScore: spamCheck.score,
              reason: spamCheck.reason,
              autoDismissed: true,
            },
          },
        });

        logger.info('Spam contact submission saved (dismissed)', {
          id: submission.id,
          email: input.email,
        });

        // Return success to user (don't reveal spam detection)
        return {
          success: true,
          message:
            'Thank you for contacting us. We will get back to you within 24 hours.',
          submissionId: submission.id,
        };
      }

      // Step 4: Create submission in database
      const submission = await this.prisma.contactSubmission.create({
        data: {
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          subject: input.subject,
          message: input.message.trim(),
          status: 'PENDING',
          ipAddress: ipAddress || null,
          userId: userId || null,
          triageResult: {
            source: 'contact_form',
            isAuthenticated: !!userId,
            isExternalRequest: !userId,
            spamScore: spamCheck.score,
            reason: spamCheck.reason || null,
            submittedAt: new Date().toISOString(),
          },
        },
      });

      logger.info('Contact form submission created', {
        id: submission.id,
        email: input.email,
        subject: input.subject,
        spamScore: spamCheck.score,
      });

      // Step 5: Send auto-response email to user (fire and forget)
      this.sendAutoResponseEmail(submission).catch(error => {
        logger.error('Failed to send auto-response email', error as Error, {
          submissionId: submission.id,
          email: input.email,
        });
      });

      return {
        success: true,
        message:
          'Thank you for contacting us. We will get back to you within 24 hours.',
        submissionId: submission.id,
      };
    } catch (error) {
      logger.error('Contact form submission failed', error as Error, {
        email: input.email,
      });
      return {
        success: false,
        message: 'An error occurred. Please try again later.',
      };
    }
  }

  /**
   * Get a single contact submission by ID
   */
  async getById(id: string): Promise<ContactSubmissionRecord | null> {
    try {
      const submission = await this.prisma.contactSubmission.findUnique({
        where: { id },
      });

      return submission as ContactSubmissionRecord | null;
    } catch (error) {
      logger.error('Failed to get contact submission', error as Error, { id });
      return null;
    }
  }

  /**
   * List contact submissions with pagination (admin only)
   */
  async list(query: ContactListQuery): Promise<ContactListResponse> {
    try {
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;
      const skip = (page - 1) * pageSize;

      // Build where clause
      const where: any = {};

      if (query.status) {
        where.status = query.status;
      }

      if (query.subject) {
        where.subject = query.subject;
      }

      if (query.search) {
        where.OR = [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { message: { contains: query.search, mode: 'insensitive' } },
        ];
      }

      // Get total count and paginated results
      const [total, data] = await Promise.all([
        this.prisma.contactSubmission.count({ where }),
        this.prisma.contactSubmission.findMany({
          where,
          skip,
          take: pageSize,
          orderBy: {
            [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
          },
        }),
      ]);

      return {
        data: data as ContactSubmissionRecord[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    } catch (error) {
      logger.error('Failed to list contact submissions', error as Error);
      return {
        data: [],
        total: 0,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Update contact submission status (admin only)
   */
  async updateStatus(
    id: string,
    status: ContactSubmissionStatus,
    ticketId?: string
  ): Promise<ContactSubmissionRecord | null> {
    try {
      const updateData: any = { status };

      if (
        status === 'TRIAGED' ||
        status === 'AUTO_RESOLVED' ||
        status === 'DISMISSED'
      ) {
        updateData.resolvedAt = new Date();
      }

      if (ticketId) {
        updateData.ticketId = ticketId;
        updateData.status = 'TICKET_CREATED';
      }

      const submission = await this.prisma.contactSubmission.update({
        where: { id },
        data: updateData,
      });

      logger.info('Contact submission status updated', {
        id,
        status,
        ticketId,
      });

      return submission as ContactSubmissionRecord;
    } catch (error) {
      logger.error(
        'Failed to update contact submission status',
        error as Error,
        {
          id,
          status,
        }
      );
      return null;
    }
  }

  /**
   * Get submission statistics (admin dashboard)
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    triaged: number;
    resolved: number;
    dismissed: number;
  }> {
    try {
      const [total, pending, triaged, resolved, dismissed] = await Promise.all([
        this.prisma.contactSubmission.count(),
        this.prisma.contactSubmission.count({ where: { status: 'PENDING' } }),
        this.prisma.contactSubmission.count({ where: { status: 'TRIAGED' } }),
        this.prisma.contactSubmission.count({
          where: {
            status: { in: ['AUTO_RESOLVED', 'TICKET_CREATED'] },
          },
        }),
        this.prisma.contactSubmission.count({ where: { status: 'DISMISSED' } }),
      ]);

      return { total, pending, triaged, resolved, dismissed };
    } catch (error) {
      logger.error('Failed to get contact submission stats', error as Error);
      return { total: 0, pending: 0, triaged: 0, resolved: 0, dismissed: 0 };
    }
  }

  /**
   * Send auto-response email to user confirming their submission
   */
  private async sendAutoResponseEmail(submission: any): Promise<void> {
    try {
      const html = contactAutoResponseEmail({
        name: submission.name,
        subject: submission.subject,
        originalMessage: submission.message,
        ticketCreated: false,
      });

      // Use Resend API directly for sending
      const resend = new (await import('resend')).Resend(
        process.env.RESEND_API_KEY
      );

      await resend.emails.send({
        from: 'ThumPiks <noreply@notify.thumpiks.com>',
        to: [submission.email],
        subject: `We received your message: "${submission.subject}"`,
        html,
      });

      logger.info('Auto-response email sent to user', {
        submissionId: submission.id,
        email: submission.email,
      });
    } catch (error) {
      // Don't throw - this is fire-and-forget
      logger.error('Failed to send auto-response email', error as Error, {
        submissionId: submission.id,
        email: submission.email,
      });
    }
  }
}
