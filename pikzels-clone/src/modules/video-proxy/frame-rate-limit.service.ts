/**
 * Frame Extraction Rate Limit Service
 *
 * Enforces per-user daily extraction limits and per-URL regenerate limits
 * based on the user's subscription plan.
 *
 * Uses the existing CacheService (Redis + in-memory fallback) for counters.
 * Reads plan limits from subscription.config.ts (single source of truth, DRY).
 */

import { CacheService, CacheTTL } from '../../services/cache.service';
import { getCurrentSubscription } from '../subscription/subscription.service';
import {
  getPlanById,
  SUBSCRIPTION_PLANS,
} from '../subscription/subscription.config';
import { logger } from '../../utils/logger';

// ============================================
// TYPES
// ============================================

export interface FrameRateLimitResult {
  allowed: boolean;
  reason?: string;
  /** Current daily extraction count */
  dailyUsed: number;
  /** Daily limit (-1 = unlimited) */
  dailyLimit: number;
  /** Per-URL regenerate count for this video */
  urlRegenerateUsed: number;
  /** Per-URL regenerate limit (-1 = unlimited) */
  urlRegenerateLimit: number;
  /** User's plan type */
  planType: string;
}

// ============================================
// CACHE KEY HELPERS
// ============================================

function dailyKey(userId: string): string {
  // Key includes today's date so it auto-resets daily
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return `ratelimit:frames:daily:${userId}:${today}`;
}

function urlRegenerateKey(userId: string, videoId: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `ratelimit:frames:regen:${userId}:${videoId}:${today}`;
}

// ============================================
// DEFAULT LIMITS (for users without a subscription)
// ============================================

const DEFAULT_PLAN_TYPE = 'free';

function getDefaultLimits() {
  const freePlan = SUBSCRIPTION_PLANS[DEFAULT_PLAN_TYPE];
  return {
    frameExtractionsPerDay: freePlan?.features.frameExtractionsPerDay ?? 5,
    frameRegeneratesPerUrl: freePlan?.features.frameRegeneratesPerUrl ?? 1,
  };
}

// ============================================
// SERVICE
// ============================================

const cache = CacheService.getInstance();

/**
 * Check if a user can perform a frame extraction.
 *
 * @param userId      The authenticated user's ID
 * @param videoId     The video being extracted
 * @param isRegenerate Whether this is a regeneration (vs first extraction)
 */
export async function checkFrameRateLimit(
  userId: string,
  videoId: string,
  isRegenerate: boolean
): Promise<FrameRateLimitResult> {
  // 1. Get user's plan limits
  let planType = DEFAULT_PLAN_TYPE;
  let dailyLimit: number;
  let urlRegenerateLimit: number;

  try {
    const subscription = await getCurrentSubscription(userId);
    if (subscription) {
      planType = subscription.planType;
      const plan = getPlanById(planType);
      if (plan) {
        dailyLimit = plan.features.frameExtractionsPerDay;
        urlRegenerateLimit = plan.features.frameRegeneratesPerUrl;
      } else {
        const defaults = getDefaultLimits();
        dailyLimit = defaults.frameExtractionsPerDay;
        urlRegenerateLimit = defaults.frameRegeneratesPerUrl;
      }
    } else {
      const defaults = getDefaultLimits();
      dailyLimit = defaults.frameExtractionsPerDay;
      urlRegenerateLimit = defaults.frameRegeneratesPerUrl;
    }
  } catch (error) {
    logger.warn(
      'Failed to fetch subscription for rate limit, using free defaults',
      { userId }
    );
    const defaults = getDefaultLimits();
    dailyLimit = defaults.frameExtractionsPerDay;
    urlRegenerateLimit = defaults.frameRegeneratesPerUrl;
  }

  // 2. Get current counters (don't increment yet — just peek)
  const dKey = dailyKey(userId);
  const dailyUsed = (await cache.get<number>(dKey)) ?? 0;

  const rKey = urlRegenerateKey(userId, videoId);
  const urlRegenerateUsed = (await cache.get<number>(rKey)) ?? 0;

  // 3. Check daily limit (unlimited = -1)
  if (dailyLimit !== -1 && dailyUsed >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily extraction limit reached (${dailyLimit}/day). Upgrade your plan for more.`,
      dailyUsed,
      dailyLimit,
      urlRegenerateUsed,
      urlRegenerateLimit,
      planType,
    };
  }

  // 4. Check per-URL regenerate limit (only applies when regenerating)
  if (
    isRegenerate &&
    urlRegenerateLimit !== -1 &&
    urlRegenerateUsed >= urlRegenerateLimit
  ) {
    return {
      allowed: false,
      reason: `Regeneration limit reached for this video (${urlRegenerateLimit}/video/day). Upgrade your plan for more.`,
      dailyUsed,
      dailyLimit,
      urlRegenerateUsed,
      urlRegenerateLimit,
      planType,
    };
  }

  return {
    allowed: true,
    dailyUsed,
    dailyLimit,
    urlRegenerateUsed,
    urlRegenerateLimit,
    planType,
  };
}

/**
 * Increment rate limit counters after a successful extraction.
 * Call this AFTER the extraction completes (not before).
 */
export async function recordFrameExtraction(
  userId: string,
  videoId: string,
  isRegenerate: boolean
): Promise<void> {
  // Increment daily counter (TTL = 24h, auto-expires)
  await cache.increment(dailyKey(userId), CacheTTL.DAILY);

  // Increment per-URL regenerate counter if this was a regeneration
  if (isRegenerate) {
    await cache.increment(urlRegenerateKey(userId, videoId), CacheTTL.DAILY);
  }
}
