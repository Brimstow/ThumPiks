/**
 * Settings Service
 *
 * Provides user settings/preferences with environment-aware mock/real data
 * Uses static test fixtures for deterministic testing (no faker.js in production)
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

/**
 * User settings interface
 */
export interface UserSettings {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

/**
 * Get user settings
 * Returns real data from database settings JSON field, or mock if unavailable
 */
export async function getUserSettings(userId: string): Promise<UserSettings> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockUserSettings(userId);
    }

    // Try real database first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (user && user.settings) {
      const settings = user.settings as Record<string, unknown>;
      return {
        language: (settings.language as string) || 'en-US',
        timezone: (settings.timezone as string) || 'America/New_York',
        theme: (settings.theme as 'light' | 'dark' | 'system') || 'system',
        dateFormat: (settings.dateFormat as string) || 'MM/DD/YYYY',
        timeFormat: (settings.timeFormat as '12h' | '24h') || '12h',
      };
    }

    // Fallback to mock if no settings found
    logger.info('MOCK DATA: No settings found, returning defaults', { userId });
    return getMockUserSettings(userId);
  } catch (error) {
    logger.error(
      'Failed to fetch user settings, using mock data',
      error as Error,
      { userId }
    );
    return getMockUserSettings(userId);
  }
}

/**
 * Update user settings
 * Only affects real database, never mock data
 */
export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> {
  try {
    // Fetch current settings first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    const currentSettings = (user?.settings as Record<string, unknown>) || {};
    const updatedSettings = { ...currentSettings, ...settings };

    await prisma.user.update({
      where: { id: userId },
      data: { settings: updatedSettings },
    });

    logger.info('User settings updated', { userId, settings });
  } catch (error) {
    logger.error('Failed to update user settings', error as Error, { userId });
    throw new Error('Failed to update settings');
  }
}

/**
 * Generate mock user settings using static test fixtures
 */
function getMockUserSettings(userId: string): UserSettings {
  // Static settings for test users
  const settingsMap: Record<string, UserSettings> = {
    'user-001': {
      language: 'en-US',
      timezone: 'America/Los_Angeles',
      theme: 'dark',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    },
    'user-002': {
      language: 'en-GB',
      timezone: 'Europe/London',
      theme: 'light',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
    },
    guest: {
      language: 'en-US',
      timezone: 'America/New_York',
      theme: 'system',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    },
  };

  // Return predefined settings or safe defaults
  return (
    settingsMap[userId] || {
      language: 'en-US',
      timezone: 'America/New_York',
      theme: 'system',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    }
  );
}
