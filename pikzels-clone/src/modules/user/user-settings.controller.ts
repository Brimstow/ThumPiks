import { Response } from 'express';
import * as userSettingsService from './user-settings.service';
import * as profileService from './profile.service';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../../types/auth';

/**
 * Get user settings (email preferences, etc.)
 */
export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
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
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
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
export async function getStorage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
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
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
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
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
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

/**
 * Change user password
 */
export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }

    await profileService.changePassword(userId, currentPassword, newPassword);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to change password', error as Error);
    const message = (error as Error).message;
    res.status(400).json({ error: message || 'Failed to change password' });
  }
}

/**
 * Delete user account
 */
export async function deleteAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await profileService.deleteUserAccount(userId);
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Failed to delete account', error as Error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
}
