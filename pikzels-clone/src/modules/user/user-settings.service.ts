import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
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
    const updateData: any = {};

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
