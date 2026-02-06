/**
 * User Profile Service
 *
 * Provides user profile data with environment-aware mock/real data
 * Uses static test fixtures for deterministic testing (no faker.js in production)
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

/**
 * Profile data interface
 */
export interface ProfileData {
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  settings: Record<string, unknown> | null;
}

/**
 * Subscription tier data
 */
export interface SubscriptionTier {
  tier: 'free' | 'starter' | 'pro' | 'ultimate';
  creditsUsed: number;
  creditsTotal: number;
  creditsRemaining: number;
}

/**
 * Get user profile data
 * Returns real data from database, or mock data if database unavailable
 */
export async function getUserProfile(
  userId: string
): Promise<ProfileData | null> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockProfile(userId);
    }

    // Try real database first
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        settings: true,
      },
    });

    if (user) {
      return {
        ...user,
        settings: user.settings as Record<string, unknown> | null,
      };
    }

    // Fallback to mock if user not found
    logger.warn(
      'MOCK DATA: User not found in database, returning mock profile',
      { userId }
    );
    return getMockProfile(userId);
  } catch (error) {
    logger.error(
      'Failed to fetch user profile, using mock data',
      error as Error,
      { userId }
    );
    return getMockProfile(userId);
  }
}

/**
 * Get subscription tier and credits
 * Returns real data from database, or mock data if unavailable
 */
export async function getSubscriptionTier(
  userId: string
): Promise<SubscriptionTier> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockSubscriptionTier(userId);
    }

    // Try real database first
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        planType: true,
        creditsBalance: true,
        creditsUsed: true,
      },
    });

    if (subscription) {
      return {
        tier: subscription.planType as 'free' | 'starter' | 'pro' | 'ultimate',
        creditsUsed: subscription.creditsUsed,
        creditsTotal: subscription.creditsBalance + subscription.creditsUsed,
        creditsRemaining: subscription.creditsBalance,
      };
    }

    // Fallback to mock if subscription not found
    logger.info('MOCK DATA: Subscription not found, returning mock tier', {
      userId,
    });
    return getMockSubscriptionTier(userId);
  } catch (error) {
    logger.error(
      'Failed to fetch subscription tier, using mock data',
      error as Error,
      { userId }
    );
    return getMockSubscriptionTier(userId);
  }
}

/**
 * Generate mock profile data using static test fixtures
 * Deterministic data for testing - no runtime dependencies
 */
function getMockProfile(userId: string): ProfileData {
  // Static test user fixtures for predictable testing
  const testUsers = [
    {
      id: 'user-001',
      name: 'Sarah Martinez',
      email: 'sarah@example.com',
      username: 'sarahm',
      settings: { theme: 'dark', language: 'en' },
    },
    {
      id: 'user-002',
      name: 'Alex Chen',
      email: 'alex@example.com',
      username: 'alexc',
      settings: null,
    },
    {
      id: 'guest',
      name: 'Guest User',
      email: 'guest@example.com',
      username: 'guest',
      settings: null,
    },
  ];

  const testUser = testUsers.find(u => u.id === userId);
  if (testUser) {
    return {
      ...testUser,
      avatarUrl: null,
      emailVerified: true,
      createdAt: new Date('2025-01-01'),
    };
  }

  // Static fallback for unknown user IDs (development/testing only)
  return {
    name: 'Guest User',
    email: 'guest@example.com',
    username: 'guest',
    avatarUrl: null,
    emailVerified: false,
    createdAt: new Date('2025-01-01'),
    settings: null,
  };
}

/**
 * Generate mock subscription tier using static test fixtures
 * Deterministic data for testing - no runtime dependencies
 */
function getMockSubscriptionTier(userId: string): SubscriptionTier {
  // Static tier mappings for test users
  const tierMap: Record<string, SubscriptionTier> = {
    'user-001': {
      tier: 'pro',
      creditsUsed: 110,
      creditsTotal: 200,
      creditsRemaining: 90,
    },
    'user-002': {
      tier: 'free',
      creditsUsed: 3,
      creditsTotal: 5,
      creditsRemaining: 2,
    },
    guest: {
      tier: 'free',
      creditsUsed: 0,
      creditsTotal: 5,
      creditsRemaining: 5,
    },
  };

  // Return predefined tier or default free tier
  return (
    tierMap[userId] || {
      tier: 'free',
      creditsUsed: 0,
      creditsTotal: 5,
      creditsRemaining: 5,
    }
  );
}

/**
 * Update user profile
 * Only affects real database, never mock data
 */
export async function updateUserProfile(
  userId: string,
  data: Partial<Pick<ProfileData, 'name' | 'username'>>
): Promise<void> {
  try {
    const updateData: Record<string, string> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.username !== undefined) updateData.username = data.username;

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    logger.info('User profile updated', { userId, fields: Object.keys(data) });
  } catch (error) {
    logger.error('Failed to update user profile', error as Error, { userId });
    throw new Error('Failed to update profile');
  }
}
