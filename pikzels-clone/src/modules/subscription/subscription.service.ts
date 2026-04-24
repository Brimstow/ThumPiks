/**
 * Subscription Service
 *
 * Handles subscription operations and database synchronization.
 * Uses the BillingProvider abstraction to support Stripe, Polar, and Demo modes.
 */

import Stripe from 'stripe';
import { getProviderProductId, getPlanById } from './subscription.config';
import { getActiveDiscountId } from './pricing.service';
import { getBillingProvider, getBillingProviderByName } from '../billing';
import type { BillingProviderName } from '../billing';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { getService } from '../../utils/service-factory';

const prisma = getPrisma();

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
  addonCreditsBalance: number;
  addonCreditsUsed: number;
  periodStart: Date;
  periodEnd: Date;
  status: 'active' | 'cancelled' | 'expired';
  stripeSubscriptionId?: string | undefined;
  polarSubscriptionId?: string | undefined;
  billingProvider: string;
}

/**
 * Create checkout session for new subscription.
 * Uses the active billing provider (Stripe, Polar, or Demo).
 */
export async function createCheckoutSession(
  params: CreateCheckoutSessionParams
): Promise<{ sessionId: string; url: string }> {
  const { userId, planId, billingCycle, email } = params;
  const provider = getBillingProvider();

  const productId = getProviderProductId(
    planId,
    billingCycle,
    provider.providerName
  );

  if (!productId && provider.providerName !== 'demo') {
    throw new Error(
      `No ${provider.providerName} product ID configured for plan "${planId}" (${billingCycle})`
    );
  }

  const clientUrl = process.env.CLIENT_URL ?? 'http://localhost:8556';

  // Fetch active beta discount (if any) to auto-apply at checkout
  const discountId =
    provider.providerName === 'polar'
      ? ((await getActiveDiscountId(billingCycle)) ?? undefined)
      : undefined;

  return provider.createCheckoutSession({
    userId,
    email,
    planId,
    billingCycle,
    productId,
    successUrl: `${clientUrl}/dashboard?subscription=success`,
    cancelUrl: `${clientUrl}/pricing?subscription=cancelled`,
    discountId,
    allowDiscountCodes: provider.providerName === 'polar',
  });
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
      addonCreditsBalance: subscription.addonCreditsBalance,
      addonCreditsUsed: subscription.addonCreditsUsed,
      periodStart: subscription.periodStart,
      periodEnd: subscription.periodEnd,
      status: isActive ? 'active' : 'expired',
      stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
      polarSubscriptionId: subscription.polarSubscriptionId || undefined,
      billingProvider: subscription.billingProvider,
    };
  } catch (error) {
    logger.error('Failed to get subscription', error as Error, { userId });
    throw error;
  }
}

/**
 * Cancel subscription (at period end).
 * Uses the provider that originally created the subscription.
 */
export async function cancelSubscription(userId: string): Promise<void> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const providerName = subscription.billingProvider as BillingProviderName;
    const provider = getBillingProviderByName(providerName);

    // Determine the provider-specific subscription ID
    const providerSubId =
      providerName === 'polar'
        ? subscription.polarSubscriptionId
        : subscription.stripeSubscriptionId;

    if (!providerSubId) {
      throw new Error(`No ${providerName} subscription ID found`);
    }

    await provider.cancelSubscription(providerSubId);

    logger.info('Subscription cancelled', {
      userId,
      subscriptionId: subscription.id,
      provider: providerName,
    });
  } catch (error) {
    logger.error('Failed to cancel subscription', error as Error, { userId });
    throw error;
  }
}

// ---------------------------------------------------------------------------
// deductCredits — re-exported from credit.service.ts (single source of truth)
//
// The canonical implementation lives in ../credit/credit.service.ts and supports:
//   • Dual credit pools (plan credits consumed first, then addon credits)
//   • Full transaction logging (creditTransaction table with balanceBefore/After)
//   • Low-credit and depleted-credit user notifications
//
// This re-export exists so that any code importing from subscription.service
// still gets the correct, production-grade implementation.
// ---------------------------------------------------------------------------
export { deductCredits } from '../credit/credit.service';

// =========================================================================
// Webhook Handlers (called by subscription.controller.ts)
// =========================================================================

/**
 * Handle successful Stripe checkout (called by webhook)
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
    const existingSub = await prisma.subscription.findFirst({
      where: { userId, planType: planId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          creditsBalance: plan.credits,
          periodStart,
          periodEnd,
          stripeSubscriptionId: session.subscription as string,
          billingProvider: 'stripe',
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
          billingProvider: 'stripe',
        },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { stripeSubscriptionId: session.subscription as string },
    });

    logger.info('Subscription created/updated from Stripe checkout', {
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
 * Handle Stripe subscription renewal (called by webhook)
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
        watermarkFreeUsed: 0,
        watermarkFreeResetDate: periodStart,
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
 * Handle Stripe subscription cancellation (called by webhook)
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

    logger.info('Subscription will expire at period end', {
      subscriptionId: subscription.id,
      periodEnd: subscription.periodEnd,
    });
  } catch (error) {
    logger.error('Failed to handle subscription cancellation', error as Error);
    throw error;
  }
}

// =========================================================================
// Polar Webhook Handlers
// =========================================================================

/**
 * Handle Polar subscription created/activated
 */
export async function handlePolarSubscriptionActive(data: {
  subscriptionId: string;
  customerId: string;
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
}): Promise<void> {
  const { subscriptionId, customerId, userId, planId, billingCycle } = data;

  const plan = getPlanById(planId);
  if (!plan) {
    logger.error('Invalid plan ID from Polar webhook', undefined, { planId });
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
    // Store Polar customer ID
    await prisma.user.update({
      where: { id: userId },
      data: { polarCustomerId: customerId },
    });

    const existingSub = await prisma.subscription.findFirst({
      where: { userId, planType: planId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          creditsBalance: plan.credits,
          periodStart,
          periodEnd,
          polarSubscriptionId: subscriptionId,
          billingProvider: 'polar',
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
          polarSubscriptionId: subscriptionId,
          billingProvider: 'polar',
        },
      });
    }

    logger.info('Subscription created/updated from Polar webhook', {
      userId,
      planId,
      polarSubscriptionId: subscriptionId,
    });

    // Notify user of subscription activation (fire-and-forget)
    const router = getService('notificationRouter');
    router
      .routeToUser(userId, {
        type: 'subscription_activated',
        title: 'Subscription Activated',
        message: `Your ${plan.name} plan is now active with ${plan.credits} credits.`,
        priority: 'normal',
        actionUrl: '/dashboard/credits',
        metadata: { planId, credits: plan.credits, billingCycle },
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Failed to handle Polar subscription', error as Error, {
      userId,
      planId,
    });
    throw error;
  }
}

/**
 * Handle Polar subscription cancellation
 */
export async function handlePolarSubscriptionCancelled(
  polarSubscriptionId: string
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { polarSubscriptionId },
    });

    if (!subscription) {
      logger.error('Polar subscription not found for cancellation', undefined, {
        polarSubscriptionId,
      });
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: true,
        status: 'cancelling',
      },
    });

    logger.info('Polar subscription marked for cancellation at period end', {
      subscriptionId: subscription.id,
      periodEnd: subscription.periodEnd,
    });

    // Notify user of cancellation (fire-and-forget)
    const router = getService('notificationRouter');
    router
      .routeToUser(subscription.userId, {
        type: 'subscription_cancelled',
        title: 'Subscription Cancelled',
        message: `Your subscription will end on ${subscription.periodEnd?.toLocaleDateString() || 'your current period end'}. You can continue using your remaining credits until then.`,
        priority: 'high',
        actionUrl: '/dashboard/credits',
      })
      .catch(() => {});
  } catch (error) {
    logger.error(
      'Failed to handle Polar subscription cancellation',
      error as Error
    );
    throw error;
  }
}

/**
 * Handle Polar subscription renewal / update (subscription.updated webhook).
 * Resets credits for the new billing period.
 */
export async function handlePolarSubscriptionRenewed(
  polarSubscriptionId: string
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { polarSubscriptionId },
    });

    if (!subscription) {
      logger.error('Polar subscription not found for renewal', undefined, {
        polarSubscriptionId,
      });
      return;
    }

    const plan = getPlanById(subscription.planType);
    if (!plan) {
      logger.error('Invalid plan type for Polar renewal', undefined, {
        planType: subscription.planType,
      });
      return;
    }

    const periodStart = new Date();
    const periodEnd = new Date();
    if (subscription.billingCycle === 'annual') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: plan.credits,
        creditsUsed: 0,
        watermarkFreeUsed: 0,
        watermarkFreeResetDate: periodStart,
        periodStart,
        periodEnd,
        cancelAtPeriodEnd: false,
        status: 'active',
      },
    });

    logger.info('Polar subscription renewed', {
      subscriptionId: subscription.id,
      polarSubscriptionId,
    });

    // Notify user of subscription renewal (fire-and-forget)
    const renewRouter = getService('notificationRouter');
    renewRouter
      .routeToUser(subscription.userId, {
        type: 'subscription_renewed',
        title: 'Subscription Renewed',
        message: `Your subscription has been renewed. ${plan.credits} credits are now available.`,
        priority: 'normal',
        actionUrl: '/dashboard/credits',
        metadata: { credits: plan.credits },
      })
      .catch(() => {});
  } catch (error) {
    logger.error('Failed to handle Polar subscription renewal', error as Error);
    throw error;
  }
}

// =========================================================================
// Demo Mode Checkout Completion
// =========================================================================

/**
 * Complete simulated subscription after demo checkout
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
    const existingSub = await prisma.subscription.findFirst({
      where: { userId, planType: planId },
    });

    if (existingSub) {
      await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          creditsBalance: plan.credits,
          periodStart,
          periodEnd,
          stripeSubscriptionId: demoSubscriptionId,
          billingProvider: 'demo',
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
          billingProvider: 'demo',
        },
      });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { stripeSubscriptionId: demoSubscriptionId },
    });

    logger.info('DEMO MODE: Subscription created successfully', {
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
