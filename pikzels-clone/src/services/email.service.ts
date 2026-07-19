/**
 * Email Service
 *
 * WHAT: Centralized email delivery via SMTP (Nodemailer)
 * WHY: Provides reliable, configurable email sending for feedback notifications,
 *      contact form auto-responses, and admin alerts
 * HOW: Singleton pattern with lazy SMTP transport initialization, health checks,
 *      and graceful degradation when SMTP is unavailable
 *
 * Alignment:
 * - Modular Design: Shared service consumed by NotificationRouter and ContactService
 * - Service Factory: Registered in service-factory.ts for centralized access
 * - DRY: Single email transport configuration, templates via email-templates.ts
 */

import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isInitialized = false;
  private initializationError: string | null = null;

  private constructor() {
    // Skip SMTP in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      logger.info('Test environment detected - email service in mock mode');
      return;
    }

    this.initializeTransport();
  }

  static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initializeTransport(): void {
    const host = process.env.EMAIL_HOST;
    const port = parseInt(process.env.EMAIL_PORT || '587', 10);
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASSWORD;

    if (!host || !user || !pass) {
      this.initializationError =
        'Missing SMTP configuration (EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD)';
      logger.warn('Email service not configured - emails will be logged only', {
        hasHost: !!host,
        hasUser: !!user,
        hasPass: !!pass,
      });
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        rateLimit: 5, // max 5 messages/second
      });

      this.isInitialized = true;
      logger.info('Email service initialized', { host, port });
    } catch (error) {
      this.initializationError =
        error instanceof Error ? error.message : String(error);
      logger.error(
        'Failed to initialize email transport',
        error as Error,
        { host, port }
      );
    }
  }

  /**
   * Send an email. Falls back to logging if SMTP is not configured.
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@thumbnail-maker.com';
    const recipients = Array.isArray(options.to)
      ? options.to.join(', ')
      : options.to;

    // Test/mock mode: log and return success
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      logger.info('Mock email sent', {
        to: recipients,
        subject: options.subject,
      });
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    // No transport: log the email content as fallback
    if (!this.transporter || !this.isInitialized) {
      logger.warn('Email not sent (SMTP not configured), logging instead', {
        to: recipients,
        subject: options.subject,
        error: this.initializationError,
      });
      return {
        success: false,
        error: this.initializationError || 'SMTP transport not available',
      };
    }

    try {
      const result = await this.transporter.sendMail({
        from,
        to: recipients,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
        replyTo: options.replyTo,
      });

      logger.info('Email sent successfully', {
        to: recipients,
        subject: options.subject,
        messageId: result.messageId,
      });

      return { success: true, messageId: result.messageId };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : String(error);

      logger.error('Failed to send email', error as Error, {
        to: recipients,
        subject: options.subject,
      });

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Verify SMTP connection health
   */
  async healthCheck(): Promise<boolean> {
    if (!this.transporter || !this.isInitialized) {
      return false;
    }

    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get service status for monitoring
   */
  getStatus(): {
    initialized: boolean;
    error: string | null;
    host: string | undefined;
  } {
    return {
      initialized: this.isInitialized,
      error: this.initializationError,
      host: process.env.EMAIL_HOST,
    };
  }

  /**
   * Clean up transport connections
   */
  async disconnect(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      this.isInitialized = false;
      logger.info('Email service disconnected');
    }
  }

  /**
   * Strip HTML tags for plain-text fallback
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
