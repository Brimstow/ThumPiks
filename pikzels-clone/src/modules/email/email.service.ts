import { Resend } from 'resend';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { getFrontendUrl } from '../../utils/env';

const prisma = getPrisma();

// Initialize Resend with API key (lazy initialization for tests)
let resend: Resend | null = null;
const getResend = (): Resend => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

// Default from address - should be updated to your verified domain
// FROM_EMAIL is configured via EMAIL_ADDRESSES constant below
const FROM_NAME = process.env.FROM_NAME || 'ThumPiks';

// Email address options for different types of emails
const EMAIL_ADDRESSES = {
  noreply: `noreply@notify.thumpiks.com`,
  welcome: `welcome@notify.thumpiks.com`,
  support: `support@notify.thumpiks.com`,
  billing: `billing@notify.thumpiks.com`,
};

interface EmailOptions {
  from?: string | undefined;
  fromName?: string | undefined;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // in milliseconds
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
};

// Sleep utility for exponential backoff
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Calculate delay with exponential backoff and jitter
const getRetryDelay = (attempt: number, baseDelay: number): number => {
  const exponentialDelay = baseDelay * Math.pow(2, attempt - 1);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 seconds
};

// Determine if an error is retryable
const isRetryableError = (error: unknown): boolean => {
  if (!error) return false;

  // Network errors (no response)
  const errorCode = (error as NodeJS.ErrnoException).code;
  if (
    errorCode === 'ECONNREFUSED' ||
    errorCode === 'ETIMEDOUT' ||
    errorCode === 'ENOTFOUND' ||
    errorCode === 'ECONNRESET'
  ) {
    return true;
  }

  // Resend API errors
  const errorObj = error as Record<string, unknown>;
  const statusCode = (errorObj.statusCode ?? errorObj.status) as
    | number
    | undefined;
  if (statusCode) {
    // 5xx errors are retryable
    if (statusCode >= 500 && statusCode < 600) return true;
    // 429 (rate limit) is retryable
    if (statusCode === 429) return true;
    // 4xx errors are NOT retryable (client errors)
    if (statusCode >= 400 && statusCode < 500) return false;
  }

  // Default: don't retry unknown errors
  return false;
};

// Update email log status
const updateEmailLog = async (
  providerMessageId: string,
  updates: {
    status?: string;
    deliveredAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    errorCode?: string;
    bounceReason?: string | null;
    retryCount?: number;
  }
) => {
  try {
    const data: Record<string, unknown> = { ...updates };
    // Only include bounceReason if it's explicitly provided
    if (updates.bounceReason !== undefined) {
      data.bounceReason = updates.bounceReason;
    }
    await prisma.emailLog.updateMany({
      where: { providerMessageId },
      data,
    });
  } catch (logError) {
    logger.error('Failed to update email log', logError as Error, {
      providerMessageId,
    });
  }
};

// Send email with retry logic
const sendEmailWithRetry = async (
  emailData: {
    from: string;
    to: string[];
    subject: string;
    html: string;
  },
  logData: {
    userId?: string | undefined;
    emailType: string;
    recipientEmail: string;
    fromEmail: string;
    subject: string;
  },
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<{
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
}> => {
  let lastError: unknown;

  // Create initial log entry
  const logEntry = await prisma.emailLog.create({
    data: {
      emailType: logData.emailType,
      recipientEmail: logData.recipientEmail,
      fromEmail: logData.fromEmail,
      subject: logData.subject,
      status: 'pending',
      maxRetries: retryConfig.maxRetries,
      retryCount: 0,
      ...(logData.userId ? { userId: logData.userId } : {}),
    },
  });

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const result = await getResend().emails.send(emailData);

      // Check for Resend API errors
      const resendError = (result as Record<string, unknown>).error as
        | { message?: string }
        | undefined;
      if (resendError) {
        throw new Error(`Resend API error: ${resendError.message}`);
      }

      const messageId = result.data?.id;

      // Update log on success
      await prisma.emailLog.update({
        where: { id: logEntry.id },
        data: {
          status: 'sent',
          providerMessageId: messageId || null,
          sentAt: new Date(),
          retryCount: attempt - 1,
        },
      });

      logger.info(`Email sent successfully on attempt ${attempt}`, {
        emailType: logData.emailType,
        recipientEmail: logData.recipientEmail,
        messageId,
        attempt,
      });

      return { success: true, messageId: messageId || undefined };
    } catch (error: unknown) {
      lastError = error;
      const isRetryable = isRetryableError(error);
      const message = error instanceof Error ? error.message : String(error);

      logger.warn(`Email send attempt ${attempt} failed`, {
        emailType: logData.emailType,
        recipientEmail: logData.recipientEmail,
        error: message,
        isRetryable,
        attempt,
      });

      // Don't retry if it's a permanent error
      if (!isRetryable || attempt === retryConfig.maxRetries) {
        break;
      }

      // Wait before retrying
      const delay = getRetryDelay(attempt, retryConfig.baseDelay);
      await sleep(delay);
    }
  }

  // All retries exhausted - mark as failed
  const errorMessage =
    lastError instanceof Error
      ? lastError.message
      : lastError
        ? String(lastError)
        : 'Unknown error';
  const lastErrorObj = lastError as Record<string, unknown> | null;
  const errorCode = (lastErrorObj?.statusCode ?? lastErrorObj?.code) as
    | number
    | string
    | undefined;

  await prisma.emailLog.update({
    where: { id: logEntry.id },
    data: {
      status: 'failed',
      errorMessage: errorMessage || null,
      errorCode: errorCode?.toString() || null,
      failedAt: new Date(),
      retryCount: retryConfig.maxRetries,
    },
  });

  logger.error(
    `Email failed after ${retryConfig.maxRetries} attempts`,
    lastError instanceof Error ? lastError : new Error(errorMessage),
    {
      emailType: logData.emailType,
      recipientEmail: logData.recipientEmail,
    }
  );

  return { success: false, error: errorMessage };
};

export class EmailService {
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userId?: string | undefined,
    options?: EmailOptions
  ): Promise<{
    success: boolean;
    messageId?: string | undefined;
    error?: string | undefined;
  }> {
    const resetUrl = `${getFrontendUrl()}/reset-password?token=${resetToken}`;
    const fromEmail = options?.from || EMAIL_ADDRESSES.noreply;
    const fromName = options?.fromName || FROM_NAME;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello,</p>
        <p>You have requested to reset your password. Please click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request a password reset, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Thanks,<br>The ${FROM_NAME} Team</p>
      </div>
    `;

    return sendEmailWithRetry(
      {
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: 'Reset Your Password',
        html,
      },
      {
        userId,
        emailType: 'password_reset',
        recipientEmail: email,
        fromEmail,
        subject: 'Reset Your Password',
      }
    );
  }

  static async sendWelcomeEmail(
    email: string,
    name: string,
    userId?: string | undefined,
    options?: EmailOptions
  ): Promise<{
    success: boolean;
    messageId?: string | undefined;
    error?: string | undefined;
  }> {
    const fromEmail = options?.from || EMAIL_ADDRESSES.welcome;
    const fromName = options?.fromName || FROM_NAME;
    const dashboardUrl = `${getFrontendUrl()}/dashboard`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ${FROM_NAME}!</h2>
        <p>Hello ${name || 'there'},</p>
        <p>Welcome to ${FROM_NAME}! We're excited to have you on board.</p>
        <p>Get started by exploring your dashboard:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Thanks,<br>The ${FROM_NAME} Team</p>
      </div>
    `;

    return sendEmailWithRetry(
      {
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: `Welcome to ${FROM_NAME}!`,
        html,
      },
      {
        userId,
        emailType: 'welcome',
        recipientEmail: email,
        fromEmail,
        subject: `Welcome to ${FROM_NAME}!`,
      }
    );
  }

  static async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
    userId?: string | undefined,
    options?: EmailOptions
  ): Promise<{
    success: boolean;
    messageId?: string | undefined;
    error?: string | undefined;
  }> {
    const fromEmail = options?.from || EMAIL_ADDRESSES.noreply;
    const fromName = options?.fromName || FROM_NAME;
    const verificationUrl = `${getFrontendUrl()}/verify-email/${token}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering with ${FROM_NAME}! To complete your registration and unlock all features, please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <p>If you did not create an account, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">Thanks,<br>The ${FROM_NAME} Team</p>
      </div>
    `;

    return sendEmailWithRetry(
      {
        from: `${fromName} <${fromEmail}>`,
        to: [email],
        subject: 'Verify Your Email Address',
        html,
      },
      {
        userId,
        emailType: 'verification',
        recipientEmail: email,
        fromEmail,
        subject: 'Verify Your Email Address',
      }
    );
  }

  // Webhook handler for bounce/delivery notifications
  static async handleWebhook(payload: {
    type: string;
    email: string;
    messageId?: string;
    reason?: string;
    bounceType?: string;
  }): Promise<void> {
    const { type, email, messageId, reason, bounceType } = payload;

    logger.info('Received email webhook', { type, email, messageId });

    if (!messageId) {
      logger.warn('Webhook received without messageId', { type, email });
      return;
    }

    switch (type) {
      case 'email.sent':
        // email_id is available - update log to confirm Resend accepted it
        await updateEmailLog(messageId, {
          status: 'sent',
        });
        break;

      case 'email.delivered':
        await updateEmailLog(messageId, {
          status: 'delivered',
          deliveredAt: new Date(),
        });
        break;

      case 'email.delivery_delayed':
        await updateEmailLog(messageId, {
          status: 'failed',
          errorMessage: 'Delivery delayed',
        });
        break;

      case 'email.bounced': {
        const isHardBounce = bounceType === 'hard';
        await updateEmailLog(messageId, {
          status: isHardBounce ? 'bounced' : 'failed',
          bounceReason: reason || null,
          failedAt: new Date(),
        });

        // For hard bounces, mark user email as invalid
        if (isHardBounce) {
          const emailLog = await prisma.emailLog.findFirst({
            where: { providerMessageId: messageId },
            include: { User: true },
          });

          if (emailLog?.User) {
            logger.warn(`Hard bounce received for user ${emailLog.User.id}`, {
              email,
              reason,
            });
          }
        }
        break;
      }

      case 'email.complained':
        await updateEmailLog(messageId, {
          status: 'failed',
          bounceReason: 'Spam complaint',
          failedAt: new Date(),
        });
        logger.warn(`Spam complaint received for email ${email}`);
        break;

      case 'email.failed':
        await updateEmailLog(messageId, {
          status: 'failed',
          errorMessage: reason || 'Email failed to send',
          failedAt: new Date(),
        });
        break;

      default:
        logger.info(`Unhandled webhook type: ${type}`, { email, messageId });
    }
  }

  // Get email delivery stats
  static async getDeliveryStats(userId?: string): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    bounced: number;
  }> {
    const where = userId ? { userId } : {};

    const [total, sent, delivered, failed, bounced] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.count({ where: { ...where, status: 'sent' } }),
      prisma.emailLog.count({ where: { ...where, status: 'delivered' } }),
      prisma.emailLog.count({ where: { ...where, status: 'failed' } }),
      prisma.emailLog.count({ where: { ...where, status: 'bounced' } }),
    ]);

    return { total, sent, delivered, failed, bounced };
  }
}
