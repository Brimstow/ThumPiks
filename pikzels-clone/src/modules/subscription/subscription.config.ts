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
  /** Display thumbnail count shown on pricing page (lower than raw credits for UX clarity) */
  displayThumbnails: number;
  /** Mark this plan as the most popular/recommended option */
  popular: boolean;
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
    /** Frame extraction limits — -1 means unlimited */
    frameExtractionsPerDay: number;
    frameRegeneratesPerUrl: number;
    /** Watermark-free exports per month — 1 for free, -1 for paid (unlimited/no watermark) */
    watermarkFreeExports: number;
  };
  /** Provider-specific product/price IDs — never exposed in public API responses */
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
    displayThumbnails: 5,
    popular: false,
    features: {
      aiThumbnails: 150,
      resolution: '720p',
      watermark: true,
      faceSwap: 3,
      abTesting: false,
      analytics: false,
      support: 'Community',
      frameExtractionsPerDay: 5,
      frameRegeneratesPerUrl: 1,
      watermarkFreeExports: 1,
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
    displayThumbnails: 50,
    popular: false,
    features: {
      aiThumbnails: 750,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 20,
      abTesting: 2,
      analytics: true,
      support: 'Email',
      frameExtractionsPerDay: 20,
      frameRegeneratesPerUrl: 3,
      watermarkFreeExports: -1,
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
    displayThumbnails: 200,
    popular: true,
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
      frameExtractionsPerDay: -1,
      frameRegeneratesPerUrl: -1,
      watermarkFreeExports: -1,
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
    displayThumbnails: 600,
    popular: false,
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
      frameExtractionsPerDay: -1,
      frameRegeneratesPerUrl: -1,
      watermarkFreeExports: -1,
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
// Credit Packs
// =========================================================================

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number;
  /** Optional savings label, e.g. "Save $3" */
  savings?: string;
  /**
   * Polar product ID (UUID) - set this after creating the product in Polar dashboard.
   * This is the ID Polar uses internally, not the custom ID.
   */
  polarProductId?: string | undefined;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter_pack',
    name: 'Starter Pack',
    credits: 50,
    price: 9,
    polarProductId: process.env.POLAR_PRODUCT_STARTER_PACK,
  },
  {
    id: 'value_pack',
    name: 'Value Pack',
    credits: 100,
    price: 15,
    savings: 'Save $3',
    polarProductId: process.env.POLAR_PRODUCT_VALUE_PACK,
  },
  {
    id: 'pro_pack',
    name: 'Pro Pack',
    credits: 250,
    price: 35,
    savings: 'Save $10',
    polarProductId: process.env.POLAR_PRODUCT_PRO_PACK,
  },
  {
    id: 'ultra_pack',
    name: 'Ultra Pack',
    credits: 500,
    price: 60,
    savings: 'Save $30',
    polarProductId: process.env.POLAR_PRODUCT_ULTRA_PACK,
  },
];

// =========================================================================
// Pricing FAQs
// =========================================================================

export interface PricingFaq {
  question: string;
  answer: string;
}

export const PRICING_FAQS: PricingFaq[] = [
  {
    question: 'What happens when I run out of thumbnails?',
    answer:
      "You can purchase additional credit packs or upgrade your plan anytime. Your unused credits don't roll over to the next month.",
  },
  {
    question: 'Do monthly thumbnails roll over?',
    answer:
      "No, thumbnail credits reset each month on your billing date. Unused credits don't carry over.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "Yes! You can cancel your subscription at any time. You'll continue to have access until the end of your billing period.",
  },
  {
    question: 'Do you offer refunds?',
    answer:
      'We offer a 7-day money-back guarantee for annual plans. Monthly plans can be cancelled anytime but are non-refundable.',
  },
  {
    question: 'Can I change my plan?',
    answer:
      'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, debit cards, and PayPal through our secure payment processor.',
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Our Free plan gives you 150 AI thumbnail credits per month plus 1 watermark-free export — no credit card required. All paid plans include a 7-day free trial.',
  },
  {
    question: 'What\'s the difference between monthly and annual billing?',
    answer:
      "Annual billing saves you up to 20% compared to monthly billing. You're billed once per year.",
  },
  {
    question: 'How do credit packs work?',
    answer:
      "Credit packs are one-time purchases that add extra credits to your account. They don't expire and can be used anytime.",
  },
  {
    question: 'What AI tools are included?',
    answer:
      'All plans include access to our core AI thumbnail generation tools. Higher tiers unlock advanced features like face swap, A/B testing, and analytics.',
  },
  {
    question: 'Do you offer team or enterprise plans?',
    answer:
      "We're working on team plans! Contact us at support@thumpiks.com for enterprise inquiries.",
  },
];

// =========================================================================
// Beta Phase Definitions
// =========================================================================

export type BetaPhaseId = 'super_early_bird' | 'early_bird' | 'production';

export interface BetaPhase {
  id: BetaPhaseId;
  name: string;
  /** Display label shown on pricing cards (e.g. "Super Early Bird") */
  badge: string;
  /** Discount percentage for monthly billing (0–100). 0 = full price. */
  discountPercentMonthly: number;
  /** Discount percentage for annual billing (0–100). Higher than monthly as a tier sweetener. */
  discountPercentAnnual: number;
  /** Max spots before auto-advancing. null = unlimited (production). */
  maxSpots: number | null;
  /** Duration in days from phase start. null = no time limit. */
  durationDays: number | null;
  /** Env var holding the Polar discount ID for monthly billing. */
  polarDiscountIdMonthlyEnvVar: string;
  /** Env var holding the Polar discount ID for annual billing. */
  polarDiscountIdAnnualEnvVar: string;
  /** Order for auto-advancement: lower = earlier. */
  order: number;
}

/**
 * Beta phases in advancement order.
 * Auto-switch triggers when spots OR time limit is hit (whichever first).
 * POLAR_ACTIVE_PHASE env var overrides auto-detection when set to a phase id.
 */
export const BETA_PHASES: BetaPhase[] = [
  {
    id: 'super_early_bird',
    name: 'Super Early Bird',
    badge: '🔥 Super Early Bird',
    discountPercentMonthly: 35,
    discountPercentAnnual: 40,
    maxSpots: 50,
    durationDays: 21, // 3 weeks
    polarDiscountIdMonthlyEnvVar: 'POLAR_DISCOUNT_ID_SUPER_EARLY_BIRD_MONTHLY',
    polarDiscountIdAnnualEnvVar: 'POLAR_DISCOUNT_ID_SUPER_EARLY_BIRD_ANNUAL',
    order: 0,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    badge: '🐦 Early Bird',
    discountPercentMonthly: 30,
    discountPercentAnnual: 35,
    maxSpots: 100,
    durationDays: 42, // 6 weeks
    polarDiscountIdMonthlyEnvVar: 'POLAR_DISCOUNT_ID_EARLY_BIRD_MONTHLY',
    polarDiscountIdAnnualEnvVar: 'POLAR_DISCOUNT_ID_EARLY_BIRD_ANNUAL',
    order: 1,
  },
  {
    id: 'production',
    name: 'Production',
    badge: '',
    discountPercentMonthly: 0,
    discountPercentAnnual: 0,
    maxSpots: null,
    durationDays: null,
    polarDiscountIdMonthlyEnvVar: '',
    polarDiscountIdAnnualEnvVar: '',
    order: 2,
  },
];

/**
 * Look up a beta phase by ID.
 */
export function getBetaPhaseById(phaseId: BetaPhaseId): BetaPhase | undefined {
  return BETA_PHASES.find((p) => p.id === phaseId);
}

/**
 * Get the next phase after the given one, or null if already at production.
 */
export function getNextBetaPhase(currentPhaseId: BetaPhaseId): BetaPhase | null {
  const current = getBetaPhaseById(currentPhaseId);
  if (!current) return null;
  return BETA_PHASES.find((p) => p.order === current.order + 1) ?? null;
}

/**
 * Apply a discount percentage to a price. Returns the discounted price
 * rounded to 2 decimal places.
 */
export function applyDiscount(price: number, discountPercent: number): number {
  if (discountPercent <= 0) return price;
  return Math.round(price * (1 - discountPercent / 100) * 100) / 100;
}

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
 * Public plan shape — strips provider IDs so they are never sent to clients.
 */
export interface PublicSubscriptionPlan
  extends Omit<SubscriptionPlan, 'stripe' | 'polar'> {
  /** Calculated annual savings percentage (0 for free plans) */
  annualSavings: number;
}

/**
 * Format all plans for the public API response.
 * Omits Stripe and Polar IDs; computes annualSavings for each plan.
 */
export function getPublicPlans(): PublicSubscriptionPlan[] {
  return Object.values(SUBSCRIPTION_PLANS).map((plan) => {
    const { stripe, polar, ...publicFields } = plan;
    void stripe; void polar;
    return {
      ...publicFields,
      annualSavings: getAnnualSavings(plan.id),
    };
  });
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
