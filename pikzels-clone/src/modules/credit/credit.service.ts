/**
 * Credit Service
 *
 * Handles credit transactions, balance tracking, and credit pack purchases
 */

import Stripe from 'stripe';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

// Initialize Stripe (use same key from subscription module)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-02-25.clover',
    })
  : null;

// Credit pack definitions (matching frontend)
interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number; // in dollars
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack_50',
    name: 'Starter Pack',
    credits: 50,
    price: 9,
  },
  {
    id: 'pack_100',
    name: 'Value Pack',
    credits: 100,
    price: 15,
  },
  {
    id: 'pack_250',
    name: 'Pro Pack',
    credits: 250,
    price: 35,
  },
  {
    id: 'pack_500',
    name: 'Ultra Pack',
    credits: 500,
    price: 60,
  },
];

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
 * Create Stripe checkout session for credit pack purchase
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

  // DEMO MODE: If Stripe not configured, return demo URL
  if (!stripe) {
    const demoUrl =
      `${process.env.VITE_BASE_URL || 'http://localhost:8556'}/demo-checkout?` +
      `userId=${userId}&` +
      `planId=${packId}&` +
      `sessionId=demo_pack_${Date.now()}`;

    logger.info('Demo credit pack checkout created (no Stripe)', {
      userId,
      packId,
    });
    return demoUrl;
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
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create one-time payment checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: pack.name,
              description: `${pack.credits} AI thumbnail generation credits`,
            },
            unit_amount: pack.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_BASE_URL || 'http://localhost:8556'}/dashboard/credits?success=true`,
      cancel_url: `${process.env.VITE_BASE_URL || 'http://localhost:8556'}/dashboard/credits?cancel=true`,
      metadata: {
        userId,
        packId,
        credits: pack.credits.toString(),
        type: 'credit_pack_purchase',
      },
    });

    logger.info('Credit pack checkout session created', {
      userId,
      packId,
      sessionId: session.id,
    });

    return session.url || '';
  } catch (error) {
    logger.error('Failed to create credit pack checkout', error as Error, {
      userId,
      packId,
    });
    throw error;
  }
}

/**
 * Add purchased credits to user's balance
 * Called by webhook after successful payment
 */
export async function addPurchasedCredits(
  userId: string,
  packId: string,
  stripeSessionId: string
): Promise<void> {
  const pack = CREDIT_PACKS.find(p => p.id === packId);

  if (!pack) {
    throw new Error('Invalid credit pack ID');
  }

  try {
    await prisma.$transaction(
      async tx => {
        const subscription = await tx.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
          throw new Error('No subscription found');
        }

        // Add credits and create transaction record (atomic)
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            creditsBalance: { increment: pack.credits },
          },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'purchase',
            amount: pack.credits,
            description: `Purchased ${pack.name}`,
            stripePaymentId: stripeSessionId,
          },
        });
      },
      { maxWait: 5000, timeout: 10000 }
    );

    logger.info('Credits added from pack purchase', {
      userId,
      packId,
      credits: pack.credits,
      stripeSessionId,
    });
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
 * Used when user generates a thumbnail
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  _thumbnailId?: string
): Promise<boolean> {
  try {
    return await prisma.$transaction(
      async tx => {
        const subscription = await tx.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
          throw new Error('No subscription found');
        }

        if (subscription.creditsBalance < amount) {
          return false; // Insufficient credits
        }

        // Decrement first, then verify — atomic within transaction
        const updated = await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            creditsBalance: { decrement: amount },
            creditsUsed: { increment: amount },
          },
        });

        // Safety check: rollback if balance went negative (concurrent race)
        if (updated.creditsBalance < 0) {
          throw new Error('Insufficient credits after concurrent deduction');
        }

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'usage',
            amount: -amount, // Negative for deductions
            description,
          },
        });

        logger.info('Credits deducted', { userId, amount, description });
        return true;
      },
      { maxWait: 5000, timeout: 10000 }
    );
  } catch (error) {
    // Treat concurrent-race rollback as insufficient credits, not a crash
    if (
      error instanceof Error &&
      error.message.includes('Insufficient credits after concurrent')
    ) {
      logger.warn('Credit deduction rolled back due to concurrent race', {
        userId,
        amount,
      });
      return false;
    }
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
    await prisma.$transaction(
      async tx => {
        const subscription = await tx.subscription.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
          throw new Error('Refund failed: no subscription found');
        }

        // Add credits back (atomic)
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            creditsBalance: { increment: amount },
            creditsUsed: { decrement: amount },
          },
        });

        // Log refund transaction
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'refund',
            amount: amount, // Positive for refunds
            description: `Refund: ${reason}`,
          },
        });
      },
      { maxWait: 5000, timeout: 10000 }
    );

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
