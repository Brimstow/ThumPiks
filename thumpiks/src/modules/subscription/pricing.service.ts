/**
 * Pricing Service — Beta Phase Auto-Switch Logic
 *
 * Determines the current beta phase by querying Polar's discount API for
 * live redemption counts and expiry dates. Supports manual override via
 * the POLAR_ACTIVE_PHASE env var.
 *
 * Cache: Polar discount data is cached for 60 seconds to avoid excessive
 * API calls on every pricing page load.
 */

import { Polar } from '@polar-sh/sdk';
import { logger } from '../../utils/logger';
import {
  BETA_PHASES,
  CREDIT_PACKS,
  PRICING_FAQS,
  getBetaPhaseById,
  getNextBetaPhase,
  applyDiscount,
  getPublicPlans,
  type BetaPhase,
  type BetaPhaseId,
  type PublicSubscriptionPlan,
  type CreditPack,
  type PricingFaq,
} from './subscription.config';

// =========================================================================
// Types
// =========================================================================

export interface PolarDiscountInfo {
  id: string;
  redemptionsCount: number;
  maxRedemptions: number | null;
  endsAt: Date | null;
}

export interface PhaseStatus {
  phase: BetaPhase;
  spotsLeft: number | null;
  spotsTotal: number | null;
  endsAt: string | null;
  discountIdMonthly: string | null;
  discountIdAnnual: string | null;
}

export interface PhasePricingPlan extends PublicSubscriptionPlan {
  /** Original (production) monthly price before discount */
  originalMonthlyPrice: number;
  /** Original (production) annual price before discount */
  originalAnnualPrice: number;
  /** Whether a discount is actively applied */
  hasDiscount: boolean;
}

export interface CurrentPricingResponse {
  phase: {
    id: BetaPhaseId;
    name: string;
    badge: string;
    discountPercentMonthly: number;
    discountPercentAnnual: number;
  };
  spotsLeft: number | null;
  spotsTotal: number | null;
  endsAt: string | null;
  plans: PhasePricingPlan[];
  creditPacks: CreditPack[];
  faqs: PricingFaq[];
}

// =========================================================================
// Polar SDK singleton (reuse the same instance)
// =========================================================================

let polarInstance: Polar | null = null;

function getPolar(): Polar | null {
  if (polarInstance) return polarInstance;
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    logger.warn('POLAR_ACCESS_TOKEN not set — beta phase auto-detection disabled');
    return null;
  }
  polarInstance = new Polar({
    accessToken,
    server: process.env.POLAR_SANDBOX === 'true' ? 'sandbox' : 'production',
  });
  return polarInstance;
}

// =========================================================================
// Discount cache (60s TTL)
// =========================================================================

interface CachedDiscount {
  data: PolarDiscountInfo;
  fetchedAt: number;
}

const CACHE_TTL_MS = 60_000;
const discountCache = new Map<string, CachedDiscount>();

async function fetchPolarDiscount(discountId: string): Promise<PolarDiscountInfo | null> {
  if (!discountId) return null;

  const cached = discountCache.get(discountId);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const polar = getPolar();
  if (!polar) return null;

  try {
    const discount = await polar.discounts.get({ id: discountId });
    const info: PolarDiscountInfo = {
      id: discount.id,
      redemptionsCount: discount.redemptionsCount ?? 0,
      maxRedemptions: discount.maxRedemptions ?? null,
      endsAt: discount.endsAt ? new Date(discount.endsAt) : null,
    };
    discountCache.set(discountId, { data: info, fetchedAt: Date.now() });
    return info;
  } catch (error) {
    logger.error('Failed to fetch Polar discount', error as Error, { discountId });
    // Return stale cache if available rather than failing
    if (cached) return cached.data;
    return null;
  }
}

// =========================================================================
// Phase transition notification (one-shot per phase)
// =========================================================================

const notifiedTransitions = new Set<string>();

async function sendSlackNotification(message: string, fromPhase: BetaPhase, toPhase: BetaPhase, reason: string): Promise<void> {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) return;
  try {
    await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        blocks: [{
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Beta Phase Transition*\n${fromPhase.name} → ${toPhase.name}\nReason: ${reason === 'spots_exhausted' ? 'All spots filled' : 'Time limit reached'}`,
          },
        }],
      }),
    });
  } catch (err) {
    logger.error('Failed to send Slack notification for phase transition', err as Error);
  }
}

async function sendEmailNotification(message: string, toPhase: BetaPhase): Promise<void> {
  const notifyEmail = process.env.BETA_NOTIFY_EMAIL;
  const notifyEmailWebhook = process.env.BETA_NOTIFY_EMAIL_WEBHOOK;
  if (!notifyEmail || !notifyEmailWebhook) return;
  try {
    await fetch(notifyEmailWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: notifyEmail,
        subject: `[ThumPiks] Beta phase → ${toPhase.name}`,
        body: message,
      }),
    });
  } catch (err) {
    logger.error('Failed to send email notification for phase transition', err as Error);
  }
}

async function notifyPhaseTransition(
  fromPhase: BetaPhase,
  toPhase: BetaPhase,
  reason: 'spots_exhausted' | 'time_expired'
): Promise<void> {
  const key = `${fromPhase.id}->${toPhase.id}`;
  if (notifiedTransitions.has(key)) return;
  notifiedTransitions.add(key);

  const message = `🚀 Beta phase transition: ${fromPhase.name} → ${toPhase.name} (reason: ${reason})`;
  logger.info(message, { fromPhase: fromPhase.id, toPhase: toPhase.id, reason });

  await Promise.all([
    sendSlackNotification(message, fromPhase, toPhase, reason),
    sendEmailNotification(message, toPhase),
  ]);
}

// =========================================================================
// Core: Determine current phase
// =========================================================================

/**
 * Check whether a phase's limits have been hit.
 * Returns true if the phase is still active (not exhausted).
 */
function isPhaseActive(phase: BetaPhase, discount: PolarDiscountInfo | null): boolean {
  // Production phase is always active
  if (phase.id === 'production') return true;

  // If no Polar discount data available, assume active (graceful degradation)
  if (!discount) return true;

  // Check spots
  if (discount.maxRedemptions !== null && discount.redemptionsCount >= discount.maxRedemptions) {
    return false;
  }

  // Check time
  if (discount.endsAt && new Date() > discount.endsAt) {
    return false;
  }

  return true;
}

/**
 * Resolve the currently active beta phase.
 *
 * Priority:
 * 1. POLAR_ACTIVE_PHASE env var (manual override) — unless set to "auto"
 * 2. Auto-detect by walking phases in order and checking Polar discount status
 * 3. Fallback to production if all else fails
 */
function calcSpotsLeft(discount: PolarDiscountInfo | null, fallback: number | null): number | null {
  if (discount && discount.maxRedemptions !== null) {
    return Math.max(0, discount.maxRedemptions - discount.redemptionsCount);
  }
  return fallback;
}

function buildPhaseStatus(
  phase: BetaPhase,
  discount: PolarDiscountInfo | null,
  discountIdMonthly: string | null,
  discountIdAnnual: string | null
): PhaseStatus {
  return {
    phase,
    spotsLeft: calcSpotsLeft(discount, phase.maxSpots),
    spotsTotal: discount?.maxRedemptions ?? phase.maxSpots,
    endsAt: discount?.endsAt?.toISOString() ?? null,
    discountIdMonthly,
    discountIdAnnual,
  };
}

const PRODUCTION_STATUS: PhaseStatus = {
  phase: getBetaPhaseById('production')!,
  spotsLeft: null,
  spotsTotal: null,
  endsAt: null,
  discountIdMonthly: null,
  discountIdAnnual: null,
};

async function resolveManualOverride(envPhase: string): Promise<PhaseStatus | null> {
  const phase = getBetaPhaseById(envPhase as BetaPhaseId);
  if (!phase) {
    logger.warn('Invalid POLAR_ACTIVE_PHASE value, falling back to auto', { envPhase });
    return null;
  }
  const discountIdMonthly = process.env[phase.polarDiscountIdMonthlyEnvVar] ?? null;
  const discountIdAnnual = process.env[phase.polarDiscountIdAnnualEnvVar] ?? null;
  // Use monthly discount for spots tracking (both share the same phase limits)
  const discount = discountIdMonthly ? await fetchPolarDiscount(discountIdMonthly) : null;
  return buildPhaseStatus(phase, discount, discountIdMonthly, discountIdAnnual);
}

async function resolveAutoPhase(): Promise<PhaseStatus> {
  for (const phase of BETA_PHASES) {
    if (phase.id === 'production') return PRODUCTION_STATUS;

    const discountIdMonthly = process.env[phase.polarDiscountIdMonthlyEnvVar] ?? null;
    const discountIdAnnual = process.env[phase.polarDiscountIdAnnualEnvVar] ?? null;

    // No Polar discount configured → use static config (beta still active)
    if (!discountIdMonthly) {
      return buildPhaseStatus(phase, null, null, null);
    }

    // Use monthly discount for spots/time tracking
    const discount = await fetchPolarDiscount(discountIdMonthly);
    if (isPhaseActive(phase, discount)) {
      return buildPhaseStatus(phase, discount, discountIdMonthly, discountIdAnnual);
    }

    // Phase exhausted — fire notification and check next
    const nextPhase = getNextBetaPhase(phase.id);
    if (nextPhase) {
      const spotsExhausted = discount?.maxRedemptions !== null &&
        (discount?.redemptionsCount ?? 0) >= (discount?.maxRedemptions ?? 0);
      notifyPhaseTransition(phase, nextPhase, spotsExhausted ? 'spots_exhausted' : 'time_expired').catch(() => {});
    }
  }
  return PRODUCTION_STATUS;
}

/**
 * Resolve the currently active beta phase.
 *
 * Priority:
 * 1. POLAR_ACTIVE_PHASE env var (manual override) — unless set to "auto"
 * 2. Auto-detect by walking phases in order and checking Polar discount status
 * 3. Fallback to production if all else fails
 */
export async function resolveCurrentPhase(): Promise<PhaseStatus> {
  const envPhase = process.env.POLAR_ACTIVE_PHASE?.trim().toLowerCase();

  if (envPhase && envPhase !== 'auto') {
    const overrideResult = await resolveManualOverride(envPhase);
    if (overrideResult) return overrideResult;
  }

  return resolveAutoPhase();
}

// =========================================================================
// Public API: Get current pricing with phase-aware discounts
// =========================================================================

export async function getCurrentPricing(): Promise<CurrentPricingResponse> {
  const status = await resolveCurrentPhase();
  const { phase } = status;
  const basePlans = getPublicPlans();

  const plans: PhasePricingPlan[] = basePlans.map((plan) => ({
    ...plan,
    originalMonthlyPrice: plan.monthlyPrice,
    originalAnnualPrice: plan.annualPrice,
    hasDiscount: phase.discountPercentMonthly > 0 && plan.monthlyPrice > 0,
    monthlyPrice: plan.monthlyPrice > 0
      ? applyDiscount(plan.monthlyPrice, phase.discountPercentMonthly)
      : 0,
    annualPrice: plan.annualPrice > 0
      ? applyDiscount(plan.annualPrice, phase.discountPercentAnnual)
      : 0,
  }));

  return {
    phase: {
      id: phase.id,
      name: phase.name,
      badge: phase.badge,
      discountPercentMonthly: phase.discountPercentMonthly,
      discountPercentAnnual: phase.discountPercentAnnual,
    },
    spotsLeft: status.spotsLeft,
    spotsTotal: status.spotsTotal,
    endsAt: status.endsAt,
    plans,
    creditPacks: CREDIT_PACKS,
    faqs: PRICING_FAQS,
  };
}

/**
 * Get the Polar discount ID for the currently active phase and billing cycle.
 * Used by the checkout flow to auto-apply the beta discount.
 */
export async function getActiveDiscountId(billingCycle: 'monthly' | 'annual'): Promise<string | null> {
  const status = await resolveCurrentPhase();
  return billingCycle === 'annual' ? status.discountIdAnnual : status.discountIdMonthly;
}
