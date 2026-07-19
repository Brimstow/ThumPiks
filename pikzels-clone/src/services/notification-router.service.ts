/**
 * Notification Router Service
 *
 * WHAT: Routes notifications to configured channels (admin panel + email)
 * WHY: Decouples notification logic from business logic; feedback/contact services
 *      just emit events, this service decides WHERE to deliver
 * HOW: Reads NotificationConfig from DB, dispatches to AdminNotification + EmailService
 *
 * Alignment:
 * - Event-Driven: Subscribes to feedback/contact events
 * - Service Factory: Registered as 'notificationRouter' in factory
 * - Modular Design: Shared service under src/services/
 */

import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../utils/prisma-factory';
import { Prisma } from '@prisma/client';
import { EmailService, EmailOptions } from './email.service';
import { logger } from '../utils/logger';
import { getUserNotificationService } from '../modules/user-notification/user-notification.service';
import { getService } from '../utils/service-factory';

type NotificationChannel = 'admin_panel' | 'email';

interface NotificationPayload {
  /** Dot-separated event key, e.g. "feedback.submitted" */
  eventKey: string;
  title: string;
  message: string;
  type: string;
  priority?: string;
  metadata?: Record<string, unknown>;
  /** Override email options (recipients, subject, html) */
  emailOverride?: Partial<EmailOptions>;
}

interface ChannelConfig {
  channels: NotificationChannel[];
  emails: string[];
  enabled: boolean;
}

export class NotificationRouter {
  private static instance: NotificationRouter;
  private configCache = new Map<string, { config: ChannelConfig; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

  private constructor() {}

  static getInstance(): NotificationRouter {
    if (!NotificationRouter.instance) {
      NotificationRouter.instance = new NotificationRouter();
    }
    return NotificationRouter.instance;
  }

  /**
   * Route a notification to all configured channels for the given event key.
   * Fire-and-forget: errors on individual channels do not block others.
   */
  async route(payload: NotificationPayload): Promise<void> {
    const config = await this.getConfig(payload.eventKey);

    if (!config.enabled) {
      logger.info('Notification skipped (disabled)', { eventKey: payload.eventKey });
      return;
    }

    const results = await Promise.allSettled(
      config.channels.map((channel) =>
        this.dispatchToChannel(channel, payload, config)
      )
    );

    // Log any channel failures
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        logger.error(
          `Notification channel ${config.channels[idx]} failed`,
          result.reason instanceof Error
            ? result.reason
            : new Error(String(result.reason)),
          { eventKey: payload.eventKey }
        );
      }
    });
  }

  /**
   * Route a notification directly to a specific user.
   * Persists via UserNotificationService and signals via SSE.
   * Fire-and-forget with error logging — callers should not await or catch.
   */
  async routeToUser(userId: string, payload: {
    type: string;
    title: string;
    message: string;
    priority?: string;
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const userNotificationService = getUserNotificationService();
      await userNotificationService.create({
        userId,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        priority: payload.priority,
        actionUrl: payload.actionUrl,
        metadata: payload.metadata,
      });

      // Signal the user's SSE connections to refetch
      const sse = getService('sse');
      sse.invalidateUser(userId);
    } catch (error) {
      logger.error('Failed to route notification to user', error as Error, {
        userId,
        type: payload.type,
      });
    }
  }

  // ---- Channel Dispatchers ----

  private async dispatchToChannel(
    channel: NotificationChannel,
    payload: NotificationPayload,
    config: ChannelConfig
  ): Promise<void> {
    switch (channel) {
      case 'admin_panel':
        return this.sendToAdminPanel(payload);
      case 'email':
        return this.sendToEmail(payload, config.emails);
      default:
        logger.warn(`Unknown notification channel: ${channel}`);
    }
  }

  private async sendToAdminPanel(payload: NotificationPayload): Promise<void> {
    const prisma = getPrisma();

    await prisma.adminNotification.create({
      data: {
        id: uuidv4(),
        title: payload.title,
        message: payload.message,
        type: payload.type,
        priority: payload.priority || 'normal',
        metadata: payload.metadata as Prisma.InputJsonValue,
      },
    });

    // Signal all admin SSE connections to refetch
    try {
      const sse = getService('sse');
      sse.invalidateAdmins();
    } catch (error) {
      logger.error('Failed to send SSE invalidation to admins', error as Error);
    }

    logger.info('Admin panel notification created', {
      eventKey: payload.eventKey,
      type: payload.type,
    });
  }

  private async sendToEmail(
    payload: NotificationPayload,
    recipients: string[]
  ): Promise<void> {
    if (recipients.length === 0) {
      logger.info('No email recipients configured', {
        eventKey: payload.eventKey,
      });
      return;
    }

    const email = EmailService.getInstance();
    const options: EmailOptions = {
      to: recipients,
      subject: payload.emailOverride?.subject || payload.title,
      html: payload.emailOverride?.html || this.defaultHtml(payload),
      ...(payload.emailOverride?.replyTo && {
        replyTo: payload.emailOverride.replyTo,
      }),
    };

    const result = await email.send(options);

    if (!result.success) {
      throw new Error(`Email delivery failed: ${result.error}`);
    }
  }

  private defaultHtml(payload: NotificationPayload): string {
    return `<h2>${this.escapeHtml(payload.title)}</h2><p>${this.escapeHtml(payload.message)}</p>`;
  }

  // ---- Configuration ----

  /**
   * Resolve channel configuration for an event key.
   * Falls back to sensible defaults when no DB row exists.
   */
  private async getConfig(eventKey: string): Promise<ChannelConfig> {
    // Check memory cache first
    const cached = this.configCache.get(eventKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.config;
    }

    try {
      const prisma = getPrisma();
      const row = await prisma.notificationConfig.findUnique({
        where: { key: eventKey },
      });

      if (row) {
        const config: ChannelConfig = {
          channels: (row.channels as NotificationChannel[]) || ['admin_panel'],
          emails: (row.emails as string[]) || [],
          enabled: row.enabled,
        };
        this.configCache.set(eventKey, {
          config,
          expiresAt: Date.now() + NotificationRouter.CACHE_TTL_MS,
        });
        return config;
      }
    } catch (error) {
      logger.error(
        'Failed to load notification config, using defaults',
        error as Error,
        { eventKey }
      );
    }

    // Default: admin panel + email to ADMIN_EMAIL env
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
    const defaultConfig: ChannelConfig = {
      channels: ['admin_panel', 'email'],
      emails: adminEmail ? [adminEmail] : [],
      enabled: true,
    };

    this.configCache.set(eventKey, {
      config: defaultConfig,
      expiresAt: Date.now() + NotificationRouter.CACHE_TTL_MS,
    });

    return defaultConfig;
  }

  /**
   * Invalidate cached config (call after admin updates config)
   */
  clearConfigCache(eventKey?: string): void {
    if (eventKey) {
      this.configCache.delete(eventKey);
    } else {
      this.configCache.clear();
    }
  }

  /**
   * Health check: verify DB access and email service
   */
  async healthCheck(): Promise<{ adminPanel: boolean; email: boolean }> {
    let adminPanel = false;
    let emailHealthy = false;

    try {
      const prisma = getPrisma();
      await prisma.notificationConfig.count();
      adminPanel = true;
    } catch {
      // DB access failed
    }

    try {
      emailHealthy = await EmailService.getInstance().healthCheck();
    } catch {
      // Email health check failed
    }

    return { adminPanel, email: emailHealthy };
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
}
