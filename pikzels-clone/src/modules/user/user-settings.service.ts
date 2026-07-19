import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { UserSettingsSchema } from './types';
import { Prisma } from '@prisma/client';
import {
  validateJsonColumn,
  safeParseJsonColumn,
} from '../../utils/json-validation';

const prisma = getPrisma();
const isTestEnv = process.env.NODE_ENV === 'test';

interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

interface StorageInfo {
  usedGB: number;
  totalGB: number;
  autoSave: boolean;
  autoImport: boolean;
}

/**
 * Get user settings (including email preferences)
 */
export async function getUserSettings(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailVerified: true,
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
        securityAlerts: true,
        emailUnsubscribedAt: true,
        settings: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return {
      email: {
        verified: user.emailVerified,
        preferences: {
          marketingEmails: user.marketingEmails,
          productUpdates: user.productUpdates,
          weeklyDigest: user.weeklyDigest,
          securityAlerts: user.securityAlerts,
        },
        unsubscribedAt: user.emailUnsubscribedAt,
      },
      other: user.settings || {},
    };
  } catch (error) {
    logger.error('Failed to fetch user settings', error as Error, { userId });
    throw error;
  }
}

/**
 * Update email preferences
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<EmailPreferences>
) {
  try {
    const updateData: Record<string, unknown> = {};

    if (typeof preferences.marketingEmails === 'boolean') {
      updateData.marketingEmails = preferences.marketingEmails;
    }
    if (typeof preferences.productUpdates === 'boolean') {
      updateData.productUpdates = preferences.productUpdates;
    }
    if (typeof preferences.weeklyDigest === 'boolean') {
      updateData.weeklyDigest = preferences.weeklyDigest;
    }
    if (typeof preferences.securityAlerts === 'boolean') {
      updateData.securityAlerts = preferences.securityAlerts;
    }

    // If user unsubscribes from everything, set unsubscribedAt
    const allDisabled =
      preferences.marketingEmails === false &&
      preferences.productUpdates === false &&
      preferences.weeklyDigest === false;

    if (allDisabled) {
      updateData.emailUnsubscribedAt = new Date();
    } else {
      updateData.emailUnsubscribedAt = null;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info('Email preferences updated', { userId, preferences });

    return { success: true };
  } catch (error) {
    logger.error('Failed to update email preferences', error as Error, {
      userId,
    });
    throw error;
  }
}

/**
 * Get user storage information
 */
export async function getUserStorage(userId: string): Promise<StorageInfo> {
  try {
    // Test environment: return mock data
    if (isTestEnv) {
      return getMockStorage();
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        settings: true,
      },
    });

    if (!user) {
      logger.info('User not found for storage info, using defaults', {
        userId,
      });
      return getMockStorage();
    }

    // Parse settings JSON for storage-related data
    const settings =
      safeParseJsonColumn(UserSettingsSchema, user.settings, 'User.settings') ||
      {};

    return {
      usedGB: settings.storageUsedGB || 0,
      totalGB: settings.storageTotalGB || 100,
      autoSave: settings.autoSave ?? true,
      autoImport: settings.autoImport ?? true,
    };
  } catch (error) {
    logger.error('Failed to fetch user storage', error as Error, { userId });
    // Graceful degradation: return mock data
    return getMockStorage();
  }
}

/**
 * Update auto-save setting
 */
export async function updateAutoSave(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const settings =
      safeParseJsonColumn(UserSettingsSchema, user.settings, 'User.settings') ||
      {};
    settings.autoSave = enabled;

    // Validate before writing back
    validateJsonColumn(UserSettingsSchema, settings, 'User.settings');

    await prisma.user.update({
      where: { id: userId },
      data: { settings: settings as Prisma.InputJsonValue },
    });

    logger.info('Auto-save setting updated', { userId, enabled });
    return { success: true };
  } catch (error) {
    logger.error('Failed to update auto-save', error as Error, { userId });
    throw error;
  }
}

/**
 * Update auto-import setting
 */
export async function updateAutoImport(
  userId: string,
  enabled: boolean
): Promise<{ success: boolean }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const settings =
      safeParseJsonColumn(UserSettingsSchema, user.settings, 'User.settings') ||
      {};
    settings.autoImport = enabled;

    // Validate before writing back
    validateJsonColumn(UserSettingsSchema, settings, 'User.settings');

    await prisma.user.update({
      where: { id: userId },
      data: { settings: settings as Prisma.InputJsonValue },
    });

    logger.info('Auto-import setting updated', { userId, enabled });
    return { success: true };
  } catch (error) {
    logger.error('Failed to update auto-import', error as Error, { userId });
    throw error;
  }
}

/**
 * Mock storage data for development/testing
 */
function getMockStorage(): StorageInfo {
  return {
    usedGB: 0,
    totalGB: 100,
    autoSave: true,
    autoImport: true,
  };
}
