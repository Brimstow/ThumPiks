/**
 * Stripe Subscription Configuration
 *
 * Manages pricing plans, Stripe price IDs, and subscription settings
 */

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPriceId: string;
  annualPriceId: string;
  monthlyPrice: number;
  annualPrice: number;
  credits: number;
  features: {
    aiThumbnails: number;
    resolution: string;
    watermark: boolean;
    faceSwap: boolean | number;
    abTesting: boolean;
    analytics: boolean;
    support: string;
    privateModeDefault?: boolean;
    earlyAccess?: boolean;
    customTemplates?: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Try before you subscribe',
    monthlyPriceId: '', // No Stripe price for free plan
    annualPriceId: '',
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 5,
    features: {
      aiThumbnails: 5,
      resolution: '720p',
      watermark: true,
      faceSwap: 3,
      abTesting: false,
      analytics: false,
      support: 'Community',
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for new creators',
    monthlyPriceId: process.env.STRIPE_PRICE_ID_STARTER_MONTHLY || '',
    annualPriceId: process.env.STRIPE_PRICE_ID_STARTER_ANNUAL || '',
    monthlyPrice: 19,
    annualPrice: 180, // $15/month when billed annually
    credits: 50,
    features: {
      aiThumbnails: 50,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 10,
      abTesting: false,
      analytics: false,
      support: 'Email',
    },
  },
  pro: {
    id: 'pro',
    name: 'Creator Pro',
    description: 'For serious YouTubers',
    monthlyPriceId: process.env.STRIPE_PRICE_ID_PRO_MONTHLY || '',
    annualPriceId: process.env.STRIPE_PRICE_ID_PRO_ANNUAL || '',
    monthlyPrice: 39,
    annualPrice: 348, // $29/month when billed annually
    credits: 200,
    features: {
      aiThumbnails: 200,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 50,
      abTesting: true,
      analytics: true,
      support: 'Priority',
      customTemplates: true,
    },
  },
  ultra_pro: {
    id: 'ultra_pro',
    name: 'Ultra Pro',
    description: 'For power creators',
    monthlyPriceId: process.env.STRIPE_PRICE_ID_ULTRA_PRO_MONTHLY || '',
    annualPriceId: process.env.STRIPE_PRICE_ID_ULTRA_PRO_ANNUAL || '',
    monthlyPrice: 79,
    annualPrice: 708, // $59/month when billed annually
    credits: 600,
    features: {
      aiThumbnails: 600,
      resolution: '4K Ultra HD',
      watermark: false,
      faceSwap: -1, // Unlimited
      abTesting: true,
      analytics: true,
      support: 'Dedicated',
      privateModeDefault: true,
      earlyAccess: true,
      customTemplates: true,
    },
  },
};

export const STRIPE_CONFIG = {
  publicKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  successUrl: process.env.CLIENT_URL + '/dashboard?subscription=success',
  cancelUrl: process.env.CLIENT_URL + '/pricing?subscription=cancelled',
};

/**
 * Get plan details by plan ID
 */
export function getPlanById(planId: string): SubscriptionPlan | null {
  return SUBSCRIPTION_PLANS[planId] || null;
}

/**
 * Get Stripe price ID based on plan and billing cycle
 */
export function getStripePriceId(
  planId: string,
  billingCycle: 'monthly' | 'annual'
): string {
  const plan = getPlanById(planId);
  if (!plan) return '';
  return billingCycle === 'monthly' ? plan.monthlyPriceId : plan.annualPriceId;
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
