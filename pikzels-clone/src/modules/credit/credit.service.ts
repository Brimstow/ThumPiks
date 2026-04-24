/**
 * Credit Service
 *
 * Handles credit transactions, balance tracking, and credit pack purchases
 */

import { getBillingProvider } from '../billing';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { CREDIT_PACKS, type CreditPack } from '../subscription/subscription.config';
import { getService } from '../../utils/service-factory';

const prisma = getPrisma();

// Re-export for backward compatibility
export { CREDIT_PACKS, type CreditPack };

/**
 * Get credit transactions for a user
 */
export async function getTransactions(userId: string) {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return transactions;
  } catch (error) {
    logger.error('Failed to fetch credit transactions', error as Error, {
      userId,
    });
    throw error;
  }
}

/**
 * Get current credit balance
 */
export async function getBalance(userId: string): Promise<number> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { creditsBalance: true },
    });

    return subscription?.creditsBalance || 0;
  } catch (error) {
    logger.error('Failed to fetch credit balance', error as Error, { userId });
    throw error;
  }
}

/**
 * Create checkout session for credit pack purchase.
 * Uses the active billing provider (Stripe, Polar, or Demo).
 */
export async function createCreditPackCheckout(
  userId: string,
  userEmail: string,
  packId: string
): Promise<string> {
  const pack = CREDIT_PACKS.find(p => p.id === packId);

  if (!pack) {
    throw new Error('Invalid credit pack ID');
  }

  const provider = getBillingProvider();
  const clientUrl =
    process.env.CLIENT_URL ||
    process.env.VITE_BASE_URL ||
    'http://localhost:8556';

  try {
    const url = await provider.createCreditPackCheckout({
      userId,
      email: userEmail,
      packId: pack.id,
      packName: pack.name,
      credits: pack.credits,
      price: pack.price,
      successUrl: `${clientUrl}/dashboard/credits?success=true`,
      cancelUrl: `${clientUrl}/dashboard/credits?cancel=true`,
    });

    logger.info('Credit pack checkout session created', {
      userId,
      packId,
      provider: provider.providerName,
    });

    return url;
  } catch (error) {
    logger.error('Failed to create credit pack checkout', error as Error, {
      userId,
      packId,
    });
    throw error;
  }
}

/**
 * Add purchased credits to user's balance.
 * Called by webhook after successful payment from any provider.
 *
 * @param provider - Which billing provider completed the payment ('stripe' | 'polar' | 'demo')
 * @param paymentId - The provider-specific session/order ID
 */
export async function addPurchasedCredits(
  userId: string,
  packId: string,
  paymentId: string,
  provider: 'stripe' | 'polar' | 'demo' = 'stripe'
): Promise<void> {
  const pack = CREDIT_PACKS.find(p => p.id === packId);

  if (!pack) {
    throw new Error('Invalid credit pack ID');
  }

  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Add credits and create transaction record
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: { increment: pack.credits },
      },
    });

    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'purchase',
        amount: pack.credits,
        description: `Purchased ${pack.name}`,
        ...(provider === 'polar'
          ? { polarOrderId: paymentId }
          : { stripePaymentId: paymentId }),
      },
    });

    logger.info('Credits added from pack purchase', {
      userId,
      packId,
      credits: pack.credits,
      provider,
      paymentId,
    });

    // Notify user of successful credit purchase (fire-and-forget)
    const router = getService('notificationRouter');
    router.routeToUser(userId, {
      type: 'credits_purchased',
      title: 'Credits Added',
      message: `${pack.credits} credits from ${pack.name} have been added to your account.`,
      priority: 'normal',
      actionUrl: '/dashboard/credits',
      metadata: { packId, credits: pack.credits },
    }).catch(() => {});
  } catch (error) {
    logger.error('Failed to add purchased credits', error as Error, {
      userId,
      packId,
    });
    throw error;
  }
}

/**
 * Deduct credits with transaction logging
 * Uses plan credits first, then add-on credits
 * Used when user generates a thumbnail
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  _thumbnailId?: string
): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new Error('No subscription found');
    }

    // Calculate available credits
    const planCreditsAvailable = subscription.creditsBalance;
    const addonCreditsAvailable = subscription.addonCreditsBalance;
    const totalAvailable = planCreditsAvailable + addonCreditsAvailable;

    if (totalAvailable < amount) {
      return false; // Insufficient credits
    }

    // Determine how much to deduct from each pool
    // Priority: Plan credits first (they expire), then add-on credits
    let planCreditsToDeduct = Math.min(planCreditsAvailable, amount);
    let addonCreditsToDeduct = amount - planCreditsToDeduct;

    // Update subscription with deductions
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: { decrement: planCreditsToDeduct },
        creditsUsed: { increment: planCreditsToDeduct },
        addonCreditsBalance: { decrement: addonCreditsToDeduct },
        addonCreditsUsed: { increment: addonCreditsToDeduct },
      },
    });

    // Create transaction record
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'usage',
        amount: -amount, // Negative for deductions
        description,
        balanceBefore: totalAvailable,
        balanceAfter: totalAvailable - amount,
      },
    });

    logger.info('Credits deducted', {
      userId,
      amount,
      planCreditsDeducted: planCreditsToDeduct,
      addonCreditsDeducted: addonCreditsToDeduct,
      description,
    });

    // Check for low/depleted credits and notify (fire-and-forget, deduplicated)
    const remaining = totalAvailable - amount;
    if (remaining === 0) {
      const router = getService('notificationRouter');
      router.routeToUser(userId, {
        type: 'credits_depleted',
        title: 'Credits Depleted',
        message: 'You have no credits remaining. Purchase more to continue generating thumbnails.',
        priority: 'high',
        actionUrl: '/dashboard/credits',
      }).catch(() => {});
    } else if (remaining <= 5) {
      const { getUserNotificationService } = await import('../user-notification/user-notification.service');
      const hasDupe = await getUserNotificationService().hasDuplicate(userId, 'credits_low', 24 * 60 * 60 * 1000);
      if (!hasDupe) {
        const router = getService('notificationRouter');
        router.routeToUser(userId, {
          type: 'credits_low',
          title: 'Credits Running Low',
          message: `You have only ${remaining} credit${remaining === 1 ? '' : 's'} remaining.`,
          priority: 'normal',
          actionUrl: '/dashboard/credits',
          metadata: { remaining },
        }).catch(() => {});
      }
    }

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
 * Refund credits when an AI operation fails after deduction.
 * Creates a refund transaction record for audit trail.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string
): Promise<boolean> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      logger.error(
        'Refund failed: no subscription found',
        new Error('No subscription'),
        { userId, amount }
      );
      return false;
    }

    // Add credits back
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        creditsBalance: { increment: amount },
        creditsUsed: { decrement: amount },
      },
    });

    // Log refund transaction
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'refund',
        amount: amount, // Positive for refunds
        description: `Refund: ${reason}`,
      },
    });

    logger.info('Credits refunded', { userId, amount, reason });
    return true;
  } catch (error) {
    logger.error('Failed to refund credits', error as Error, {
      userId,
      amount,
    });
    return false;
  }
}
