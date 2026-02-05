/**
 * Subscription Service
 *
 * Handles Stripe subscription operations and database synchronization
 */

import Stripe from 'stripe';
import {
  STRIPE_CONFIG,
  getStripePriceId,
  getPlanById,
} from './subscription.config';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

// Initialize Stripe only if secret key is provided
const stripe = STRIPE_CONFIG.secretKey
  ? new Stripe(STRIPE_CONFIG.secretKey, {
      apiVersion: '2026-01-28.clover',
    })
  : null;

export interface CreateCheckoutSessionParams {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  email: string;
}

export interface SubscriptionData {
  id: string;
  planType: string;
  creditsBalance: number;
  creditsUsed: number;
  periodStart: Date;
  periodEnd: Date;
  status: 'active' | 'cancelled' | 'expired';
  stripeSubscriptionId?: string | undefined;
}

/**
 * Create Stripe checkout session for new subscription
 * In dev mode (no Stripe keys), simulates successful checkout
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const { userId, planId, billingCycle, email } = params;

  // DEMO MODE: If Stripe not configured, simulate checkout
  if (!stripe) {
    return createDemoCheckoutSession(params);
  }

  try {
    // Get or create Stripe customer
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    let customerId = user?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save Stripe customer ID
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Get price ID
    const priceId = getStripePriceId(planId, billingCycle);
    if (!priceId) {
      throw new Error(`Invalid plan or price ID not configured: ${planId}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: STRIPE_CONFIG.successUrl,
      cancel_url: STRIPE_CONFIG.cancelUrl,
      metadata: {
        userId,
        planId,
        billingCycle,
      },
    });

    logger.info('Checkout session created', {
      userId,
      planId,
      sessionId: session.id,
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    logger.error('Failed to create checkout session', error as Error, {
      userId,
      planId,
    });
    throw error;
  }
}

/**
 * Get user's current subscription
 */
export async function getCurrentSubscription(
  userId: string
): Promise<SubscriptionData | null> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const isActive = subscription.periodEnd > now;

    return {
      id: subscription.id,
      planType: subscription.planType,
      creditsBalance: subscription.creditsBalance,
      creditsUsed: subscription.creditsUsed,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      status: isActive ? 'active' : 'expired',
      stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
    };
  } catch (error) {
    logger.error('Failed to get subscription', error as Error, { userId });
    throw error;
  }
}

/**
 * Cancel subscription (at period end)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  if (!stripe) {
    throw new Error(
      'Stripe is not configured. Please add STRIPE_SECRET_KEY to your .env file.'
    );
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active Stripe subscription found');
    }

    // Cancel at period end (user keeps access until then)
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    logger.info('Subscription cancelled', {
      userId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', error as Error, { userId });
    throw error;
  }
}

/**
 * Deduct credits from user's subscription
 */
export async function deductCredits(
  userId: string,
  amount: number = 1
): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    if (subscription.creditsBalance < amount) {
      return false; // Insufficient credits
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: { decrement: amount },
        creditsUsed: { increment: amount },
      },
    });

    logger.info('Credits deducted', {
      userId,
      amount,
      remaining: subscription.creditsBalance - amount,
    });
    return true;
  } catch (error) {
    logger.error('Failed to deduct credits', error as Error, {
      userId,
      amount,
    });
    throw error;
  }
}

/**
 * Handle successful checkout (called by webhook)
 */
export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId;
  const billingCycle = session.metadata?.billingCycle as 'monthly' | 'annual';

  if (!userId || !planId) {
    logger.error('Missing metadata in checkout session', undefined, {
      sessionId: session.id,
    });
    return;
  }

  const plan = getPlanById(planId);
  if (!plan) {
    logger.error('Invalid plan ID', undefined, { planId });
    return;
  }

  const periodStart = new Date();
  const periodEnd = new Date();
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  try {
    // Create or update subscription
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId,
        planType: planId,
      },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          creditsBalance: plan.credits,
          periodStart,
          periodEnd,
          stripeSubscriptionId: session.subscription as string,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          id: `sub_${Date.now()}`,
          userId,
          planType: planId,
          creditsBalance: plan.credits,
          creditsUsed: 0,
          periodStart,
          periodEnd,
          stripeSubscriptionId: session.subscription as string,
        },
      });
    }

    // Update user's Stripe subscription ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeSubscriptionId: session.subscription as string },
    });

    logger.info('Subscription created/updated from checkout', {
      userId,
      planId,
    });
  } catch (error) {
    logger.error('Failed to handle checkout complete', error as Error, {
      userId,
      planId,
    });
    throw error;
  }
}

/**
 * Handle subscription renewal (called by webhook)
 */
export async function handleSubscriptionRenewed(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const userId = stripeSubscription.metadata?.userId;

  if (!userId) {
    logger.error('Missing userId in subscription metadata', undefined, {
      subscriptionId: stripeSubscription.id,
    });
    return;
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      logger.error('Subscription not found in database', undefined, {
        stripeSubscriptionId: stripeSubscription.id,
      });
      return;
    }

    const plan = getPlanById(subscription.planType);
    if (!plan) {
      logger.error('Invalid plan type', undefined, {
        planType: subscription.planType,
      });
      return;
    }

    // Refresh credits and extend period
    const periodStart = new Date(
      (stripeSubscription as any).current_period_start * 1000
    );
    const periodEnd = new Date(
      (stripeSubscription as any).current_period_end * 1000
    );

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: plan.credits,
        creditsUsed: 0,
        periodStart,
        periodEnd,
      },
    });

    logger.info('Subscription renewed', {
      userId,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    logger.error('Failed to handle subscription renewal', error as Error, {
      userId,
    });
    throw error;
  }
}

/**
 * Handle subscription cancellation (called by webhook)
 */
export async function handleSubscriptionCancelled(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      logger.error('Subscription not found for cancellation', undefined, {
        stripeSubscriptionId: stripeSubscription.id,
      });
      return;
    }

    // Keep subscription active until period end
    // Don't delete - just let it expire naturally
    logger.info('Subscription will expire at period end', {
      subscriptionId: subscription.id,
      periodEnd: subscription.periodEnd,
    });
  } catch (error) {
    logger.error('Failed to handle subscription cancellation', error as Error);
    throw error;
  }
}

/**
 * DEMO MODE: Simulate checkout session without Stripe
 * Used in development when STRIPE_SECRET_KEY is not configured
 */
async function createDemoCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const { userId, planId, billingCycle } = params;

  const demoSessionId = `demo_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const demoCustomerId = `demo_cus_${userId}`;

  logger.info('🎭 DEMO MODE: Creating simulated checkout session', {
    userId,
    planId,
    billingCycle,
  });

  // Save demo customer ID to user
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: demoCustomerId },
  });

  // Build demo checkout URL that will auto-complete
  // Use localhost:8556 for development frontend
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
  const demoUrl = `${clientUrl}/demo-checkout?session=${demoSessionId}&user=${userId}&plan=${planId}&cycle=${billingCycle}`;

  return {
    sessionId: demoSessionId,
    url: demoUrl,
  };
}

/**
 * DEMO MODE: Complete simulated subscription after demo checkout
 */
export async function completeDemoCheckout(
  userId: string,
  planId: string,
  billingCycle: 'monthly' | 'annual',
  sessionId: string
): Promise<void> {
  const plan = getPlanById(planId);
  if (!plan) {
    throw new Error(`Invalid plan ID: ${planId}`);
  }

  const periodStart = new Date();
  const periodEnd = new Date();
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const demoSubscriptionId = `demo_sub_${Date.now()}`;

  try {
    // Create subscription in database
    const existingSub = await prisma.subscription.findFirst({
      where: {
        userId,
        planType: planId,
      },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          creditsBalance: plan.credits,
          periodStart,
          periodEnd,
          stripeSubscriptionId: demoSubscriptionId,
        },
      });
    } else {
      await prisma.subscription.create({
        data: {
          id: `sub_${Date.now()}`,
          userId,
          planType: planId,
          creditsBalance: plan.credits,
          creditsUsed: 0,
          periodStart,
          periodEnd,
          stripeSubscriptionId: demoSubscriptionId,
        },
      });
    }

    // Update user's subscription ID
    await prisma.user.update({
      where: { id: userId },
      data: { stripeSubscriptionId: demoSubscriptionId },
    });

    logger.info('🎭 DEMO MODE: Subscription created successfully', {
      userId,
      planId,
      credits: plan.credits,
      sessionId,
    });
  } catch (error) {
    logger.error('Failed to complete demo checkout', error as Error, {
      userId,
      planId,
    });
    throw error;
  }
}

export { stripe };
