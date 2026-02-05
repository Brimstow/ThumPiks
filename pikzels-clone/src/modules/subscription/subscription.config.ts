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
    teamMembers?: number;
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
      faceSwap: false,
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
    monthlyPrice: 9,
    annualPrice: 90, // $7.50/month when billed annually
    credits: 30,
    features: {
      aiThumbnails: 30,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 1,
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
    monthlyPrice: 24,
    annualPrice: 228, // $19/month when billed annually
    credits: 120,
    features: {
      aiThumbnails: 120,
      resolution: '1080p HD',
      watermark: false,
      faceSwap: 5,
      abTesting: true,
      analytics: true,
      support: 'Priority',
      customTemplates: true,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    description: 'For agencies and teams',
    monthlyPriceId: process.env.STRIPE_PRICE_ID_BUSINESS_MONTHLY || '',
    annualPriceId: process.env.STRIPE_PRICE_ID_BUSINESS_ANNUAL || '',
    monthlyPrice: 79,
    annualPrice: 790, // ~$65.83/month when billed annually
    credits: 500,
    features: {
      aiThumbnails: 500,
      resolution: '4K Ultra HD',
      watermark: false,
      faceSwap: 20,
      abTesting: true,
      analytics: true,
      support: 'Dedicated',
      teamMembers: 10,
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
