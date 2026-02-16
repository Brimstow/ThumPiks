import { Request, Response } from 'express';
import * as userSettingsService from './user-settings.service';
import { logger } from '../../utils/logger';

/**
 * Get user settings (email preferences, etc.)
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const settings = await userSettingsService.getUserSettings(userId);
    res.status(200).json(settings);
  } catch (error) {
    logger.error('Failed to fetch user settings', error as Error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
}

/**
 * Update email preferences
 */
export async function updateEmailPreferences(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { marketingEmails, productUpdates, weeklyDigest, securityAlerts } =
      req.body;

    const result = await userSettingsService.updateEmailPreferences(userId, {
      marketingEmails,
      productUpdates,
      weeklyDigest,
      securityAlerts,
    });

    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to update email preferences', error as Error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
}

/**
 * Get user storage information
 */
export async function getStorage(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const storage = await userSettingsService.getUserStorage(userId);
    res.status(200).json(storage);
  } catch (error) {
    logger.error('Failed to fetch user storage', error as Error);
    res.status(500).json({ error: 'Failed to fetch storage information' });
  }
}

/**
 * Update auto-save setting
 */
export async function updateAutoSave(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Invalid request: enabled must be boolean' });
      return;
    }

    const result = await userSettingsService.updateAutoSave(userId, enabled);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to update auto-save', error as Error);
    res.status(500).json({ error: 'Failed to update auto-save setting' });
  }
}

/**
 * Update auto-import setting
 */
export async function updateAutoImport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'Invalid request: enabled must be boolean' });
      return;
    }

    const result = await userSettingsService.updateAutoImport(userId, enabled);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to update auto-import', error as Error);
    res.status(500).json({ error: 'Failed to update auto-import setting' });
  }
}
