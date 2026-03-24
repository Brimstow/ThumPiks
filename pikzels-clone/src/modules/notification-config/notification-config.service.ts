/**
 * Notification Config Service
 *
 * WHAT: CRUD operations for NotificationConfig rows
 * WHY: Admins need to control which channels receive which event notifications
 * HOW: Thin Prisma wrapper + cache invalidation on the NotificationRouter
 *
 * Alignment:
 * - Layered: controller -> service -> Prisma
 * - Service Factory: Lazy-init singleton via getNotificationConfigService()
 */

import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { NotificationRouter } from '../../services/notification-router.service';
import { logger } from '../../utils/logger';
import type { NotificationChannel, UpsertConfigInput, NotificationConfigRow } from './types';
import { VALID_CHANNELS } from './types';

export class NotificationConfigService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || getPrisma();
  }

  /** List all notification configs, ordered by key */
  async listAll(): Promise<NotificationConfigRow[]> {
    const rows = await this.prisma.notificationConfig.findMany({
      orderBy: { key: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      key: r.key,
      channels: (r.channels as NotificationChannel[]) || [],
      emails: (r.emails as string[]) || [],
      enabled: r.enabled,
      metadata: r.metadata as Record<string, unknown> | null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /** Get a single config by event key */
  async getByKey(key: string): Promise<NotificationConfigRow | null> {
    const row = await this.prisma.notificationConfig.findUnique({
      where: { key },
    });

    if (!row) return null;

    return {
      id: row.id,
      key: row.key,
      channels: (row.channels as NotificationChannel[]) || [],
      emails: (row.emails as string[]) || [],
      enabled: row.enabled,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Create or update a notification config */
  async upsert(input: UpsertConfigInput): Promise<NotificationConfigRow> {
    this.validateInput(input);

    const row = await this.prisma.notificationConfig.upsert({
      where: { key: input.key },
      create: {
        key: input.key,
        channels: input.channels as any,
        emails: input.emails as any,
        enabled: input.enabled,
      },
      update: {
        channels: input.channels as any,
        emails: input.emails as any,
        enabled: input.enabled,
      },
    });

    // Invalidate the router cache so it picks up the new config immediately
    try {
      NotificationRouter.getInstance().clearConfigCache(input.key);
    } catch {
      // Router may not be initialized in tests
    }

    logger.info(`NotificationConfig upserted: ${input.key}`);

    return {
      id: row.id,
      key: row.key,
      channels: (row.channels as NotificationChannel[]) || [],
      emails: (row.emails as string[]) || [],
      enabled: row.enabled,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  /** Delete a config by key */
  async deleteByKey(key: string): Promise<void> {
    await this.prisma.notificationConfig.delete({
      where: { key },
    });

    try {
      NotificationRouter.getInstance().clearConfigCache(key);
    } catch {
      // Router may not be initialized in tests
    }

    logger.info(`NotificationConfig deleted: ${key}`);
  }

  /** Toggle enabled/disabled for a key */
  async toggleEnabled(key: string, enabled: boolean): Promise<NotificationConfigRow> {
    const row = await this.prisma.notificationConfig.update({
      where: { key },
      data: { enabled },
    });

    try {
      NotificationRouter.getInstance().clearConfigCache(key);
    } catch {
      // Router may not be initialized
    }

    return {
      id: row.id,
      key: row.key,
      channels: (row.channels as NotificationChannel[]) || [],
      emails: (row.emails as string[]) || [],
      enabled: row.enabled,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private validateInput(input: UpsertConfigInput): void {
    if (!input.key || typeof input.key !== 'string') {
      throw new Error('Event key is required');
    }

    if (!Array.isArray(input.channels) || input.channels.length === 0) {
      throw new Error('At least one channel is required');
    }

    for (const ch of input.channels) {
      if (!VALID_CHANNELS.includes(ch as NotificationChannel)) {
        throw new Error(`Invalid channel: ${ch}`);
      }
    }

    if (input.channels.includes('email') && (!Array.isArray(input.emails) || input.emails.length === 0)) {
      throw new Error('At least one email is required when email channel is enabled');
    }

    if (input.emails) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const email of input.emails) {
        if (!emailRegex.test(email)) {
          throw new Error(`Invalid email address: ${email}`);
        }
      }
    }
  }
}

// Singleton
let service: NotificationConfigService;

export function getNotificationConfigService(): NotificationConfigService {
  if (!service) {
    service = new NotificationConfigService();
  }
  return service;
}
