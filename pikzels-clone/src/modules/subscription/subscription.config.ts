/**
 * Subscription Configuration
 *
 * Manages pricing plans with per-provider product IDs and subscription settings.
 * Supports Stripe, Polar, and Demo billing providers.
 */

import type { BillingProviderName } from '../billing/billing-provider.interface';

// =========================================================================
// Types
// =========================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: number;
  features: {
    aiThumbnails: number;
    resolution: string;
    watermark: boolean;
    faceSwap: boolean | number;
    abTesting: boolean | number;
    analytics: boolean;
    support: string;
    privateModeDefault?: boolean;
    earlyAccess?: boolean;
    customTemplates?: boolean;
  };
  /** Provider-specific product/price IDs */
  stripe: {
    monthlyPriceId: string;
    annualPriceId: string;
  };
  polar: {
    monthlyProductId: string;
    annualProductId: string;
  };
}

// =========================================================================
// Plan Definitions
// =========================================================================

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try before you subscribe',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 150,
    features: {
      aiThumbnails: 150,
      resolution: '720p',
      watermark: true,
      faceSwap: 3,
      abTesting: false,
      analytics: false,
      support: 'Community',
    },
    stripe: { monthlyPriceId: '', annualPriceId: '' },
    polar: { monthlyProductId: '', annualProductId: '' },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for new creators',
    monthlyPrice: 19,
    annualPrice: 182,
    credits: 750,
    features: {
      aiThumbnails: 750,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 20,
      abTesting: 2,
      analytics: true,
      support: 'Email',
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '',
      annualPriceId: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || '',
    },
    polar: {
      monthlyProductId: process.env.POLAR_PRODUCT_ID_STARTER_MONTHLY || '',
      annualProductId: process.env.POLAR_PRODUCT_ID_STARTER_ANNUAL || '',
    },
  },
  pro: {
    id: 'pro',
    name: 'Creator Pro',
    description: 'For serious YouTubers',
    monthlyPrice: 39,
    annualPrice: 374,
    credits: 3000,
    features: {
      aiThumbnails: 3000,
      resolution: '4K Ultra HD',
      watermark: false,
      faceSwap: 100,
      abTesting: true,
      analytics: true,
      support: 'Priority',
      customTemplates: true,
      earlyAccess: true,
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
      annualPriceId: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '',
    },
    polar: {
      monthlyProductId: process.env.POLAR_PRODUCT_ID_PRO_MONTHLY || '',
      annualProductId: process.env.POLAR_PRODUCT_ID_PRO_ANNUAL || '',
    },
  },
  ultra_pro: {
    id: 'ultra_pro',
    name: 'Ultra Pro',
    description: 'For power creators',
    monthlyPrice: 79,
    annualPrice: 758,
    credits: 9000,
    features: {
      aiThumbnails: 9000,
      resolution: '4K Ultra HD',
      watermark: false,
      faceSwap: -1,
      abTesting: true,
      analytics: true,
      support: 'Dedicated',
      privateModeDefault: true,
      earlyAccess: true,
      customTemplates: true,
    },
    stripe: {
      monthlyPriceId: process.env.STRIPE_PRICE_ID_ULTRA_PRO_MONTHLY || '',
      annualPriceId: process.env.STRIPE_PRICE_ID_ULTRA_PRO_ANNUAL || '',
    },
    polar: {
      monthlyProductId: process.env.POLAR_PRODUCT_ID_ULTRA_PRO_MONTHLY || '',
      annualProductId: process.env.POLAR_PRODUCT_ID_ULTRA_PRO_ANNUAL || '',
    },
  },
};

// =========================================================================
// Stripe Config (kept for backward compatibility with webhook handler)
// =========================================================================

export const STRIPE_CONFIG = {
  publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: process.env.CLIENT_URL + '/dashboard?subscription=success',
  cancelUrl: process.env.CLIENT_URL + '/pricing?subscription=cancelled',
};

// =========================================================================
// Helper Functions
// =========================================================================

/**
 * Get plan details by plan ID
 */
export function getPlanById(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Get provider-specific product/price ID for a plan and billing cycle.
 * Single function that resolves IDs for any provider (DRY-compliant).
 */
export function getProviderProductId(
  planId: string,
  billingCycle: 'monthly' | 'annual',
  provider: BillingProviderName
): string {
  const plan = getPlanById(planId);
  if (!plan) return '';

  switch (provider) {
    case 'stripe':
      return billingCycle === 'monthly'
        ? plan.stripe.monthlyPriceId
        : plan.stripe.annualPriceId;
    case 'polar':
      return billingCycle === 'monthly'
        ? plan.polar.monthlyProductId
        : plan.polar.annualProductId;
    case 'demo':
      return `demo_${planId}_${billingCycle}`;
    default:
      return '';
  }
}

/**
 * Get Stripe price ID based on plan and billing cycle.
 * Convenience wrapper for backward compatibility.
 */
export function getStripePriceId(
  planId: string,
  billingCycle: 'monthly' | 'annual'
): string {
  return getProviderProductId(planId, billingCycle, 'stripe');
}

/**
 * Calculate savings percentage for annual billing
 */
export function getAnnualSavings(planId: string): number {
  const plan = getPlanById(planId);
  if (!plan) return 0;
  const monthlyTotal = plan.monthlyPrice * 12;
  const annualTotal = plan.annualPrice;
  return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
}

/**
 * Validate if user can perform action based on subscription
 */
export function canPerformAction(
  subscription: { planType: string; creditsBalance: number },
  requiredCredits: number = 1
): { allowed: boolean; reason?: string } {
  const plan = getPlanById(subscription.planType);

  if (!plan) {
    return { allowed: false, reason: 'Invalid subscription plan' };
  }

  if (subscription.creditsBalance < requiredCredits) {
    return { allowed: false, reason: 'Insufficient credits' };
  }

  return { allowed: true };
}
