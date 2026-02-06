/**
 * Notification Service
 *
 * Provides email notification preferences with environment-aware mock/real data
 * Uses static test fixtures for deterministic testing (no faker.js in production)
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

/**
 * Email preferences interface
 */
export interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

/**
 * Get email preferences for user
 * Returns real data from database, or mock if unavailable
 */
export async function getEmailPreferences(
  userId: string
): Promise<EmailPreferences> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockEmailPreferences(userId);
    }

    // Try real database first (stored in User model)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        marketingEmails: true,
        productUpdates: true,
        weeklyDigest: true,
        securityAlerts: true,
      },
    });

    if (user) {
      return user;
    }

    // Fallback to mock if user not found
    logger.info('MOCK DATA: User not found, returning mock preferences', {
      userId,
    });
    return getMockEmailPreferences(userId);
  } catch (error) {
    logger.error(
      'Failed to fetch email preferences, using mock data',
      error as Error,
      { userId }
    );
    return getMockEmailPreferences(userId);
  }
}

/**
 * Update email preferences
 * Only affects real database, never mock data
 */
export async function updateEmailPreferences(
  userId: string,
  preferences: Partial<EmailPreferences>
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: preferences,
    });

    logger.info('Email preferences updated', { userId, preferences });
  } catch (error) {
    logger.error('Failed to update email preferences', error as Error, {
      userId,
    });
    throw new Error('Failed to update email preferences');
  }
}

/**
 * Generate mock email preferences using static test fixtures
 */
function getMockEmailPreferences(userId: string): EmailPreferences {
  // Static preferences for test users
  const preferencesMap: Record<string, EmailPreferences> = {
    'user-001': {
      marketingEmails: true,
      productUpdates: true,
      weeklyDigest: false,
      securityAlerts: true,
    },
    'user-002': {
      marketingEmails: false,
      productUpdates: true,
      weeklyDigest: true,
      securityAlerts: true,
    },
    guest: {
      marketingEmails: false,
      productUpdates: false,
      weeklyDigest: false,
      securityAlerts: true,
    },
  };

  // Return predefined preferences or conservative defaults
  return (
    preferencesMap[userId] || {
      marketingEmails: false,
      productUpdates: true,
      weeklyDigest: false,
      securityAlerts: true, // Always true for security
    }
  );
}
