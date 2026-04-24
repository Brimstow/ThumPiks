/**
 * Notification Config Controller
 *
 * WHAT: Thin HTTP handlers for notification config CRUD
 * WHY: Admin panel needs to manage notification routing per event type
 * HOW: Validates request, delegates to service, returns JSON
 *
 * Alignment:
 * - Layered: routes -> controller -> service -> Prisma
 * - Thin controllers: validation + delegation only
 */

import { Request, Response } from 'express';
import { getNotificationConfigService } from './notification-config.service';
import type { UpsertConfigInput } from './types';
import { logger } from '../../utils/logger';

/** GET /api/admin/notifications/config — List all configs */
export async function listConfigs(_req: Request, res: Response): Promise<void> {
  try {
    const service = getNotificationConfigService();
    const configs = await service.listAll();
    res.json({ configs });
  } catch (err: any) {
    logger.error(`Failed to list notification configs: ${err.message}`);
    res.status(500).json({ error: 'Failed to load notification configs' });
  }
}

/** GET /api/admin/notifications/config/:key — Get single config */
export async function getConfig(req: Request, res: Response): Promise<void> {
  try {
    const key = req.params.key!;
    const service = getNotificationConfigService();
    const config = await service.getByKey(key);

    if (!config) {
      res.status(404).json({ error: `Config not found for key: ${key}` });
      return;
    }

    res.json({ config });
  } catch (err: any) {
    logger.error(`Failed to get notification config: ${err.message}`);
    res.status(500).json({ error: 'Failed to load notification config' });
  }
}

/** PUT /api/admin/notifications/config — Upsert a config */
export async function upsertConfig(req: Request, res: Response): Promise<void> {
  try {
    const { key, channels, emails, enabled } = req.body as UpsertConfigInput;

    if (!key) {
      res.status(400).json({ error: 'Event key is required' });
      return;
    }

    const service = getNotificationConfigService();
    const config = await service.upsert({
      key,
      channels: channels || [],
      emails: emails || [],
      enabled: enabled !== false,
    });

    res.json({ config });
  } catch (err: any) {
    if (err.message.includes('required') || err.message.includes('Invalid')) {
      res.status(400).json({ error: err.message });
      return;
    }
    logger.error(`Failed to upsert notification config: ${err.message}`);
    res.status(500).json({ error: 'Failed to save notification config' });
  }
}

/** PATCH /api/admin/notifications/config/:key/toggle — Toggle enabled */
export async function toggleConfig(req: Request, res: Response): Promise<void> {
  try {
    const key = req.params.key!;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled must be a boolean' });
      return;
    }

    const service = getNotificationConfigService();
    const config = await service.toggleEnabled(key, enabled);
    res.json({ config });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    logger.error(`Failed to toggle notification config: ${err.message}`);
    res.status(500).json({ error: 'Failed to update notification config' });
  }
}

/** DELETE /api/admin/notifications/config/:key — Delete a config */
export async function deleteConfig(req: Request, res: Response): Promise<void> {
  try {
    const key = req.params.key!;
    const service = getNotificationConfigService();
    await service.deleteByKey(key);
    res.json({ success: true });
  } catch (err: any) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    logger.error(`Failed to delete notification config: ${err.message}`);
    res.status(500).json({ error: 'Failed to delete notification config' });
  }
}
