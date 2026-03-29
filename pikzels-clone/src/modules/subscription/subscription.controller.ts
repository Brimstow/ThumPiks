import { Request, Response } from 'express';
import {
  createCheckoutSession,
  getCurrentSubscription,
  cancelSubscription,
  deductCredits,
  handleCheckoutComplete,
  handleSubscriptionRenewed,
  handleSubscriptionCancelled,
  completeDemoCheckout,
} from './subscription.service';
import { getPublicPlans, CREDIT_PACKS, PRICING_FAQS } from './subscription.config';
import { getCurrentPricing } from './pricing.service';
import { addPurchasedCredits } from '../credit/credit.service';
import { logger } from '../../utils/logger';
import { getWatermarkFreeStatus, consumeWatermarkFreeExport } from '../thumbnail/watermark.service';
import { BillingError } from '../billing/billing-provider.interface';
import { ValidationError } from '../../utils/errors';

/**
 * Get public pricing plans, credit packs, and FAQs
 * GET /api/subscription/plans
 * Public — no authentication required
 */
export const getPlans = async (_req: Request, res: Response) => {
  try {
    const plans = getPublicPlans();

    return res.status(200).json({
      plans,
      creditPacks: CREDIT_PACKS,
      faqs: PRICING_FAQS,
    });
  } catch (error: any) {
    logger.error('Failed to retrieve pricing plans', error);

    return res.status(500).json({
      error: 'Failed to retrieve pricing plans',
    });
  }
};

/**
 * Create Stripe Checkout Session for subscription upgrade
 * POST /api/subscription/create-checkout
 * Body: { planId, billingCycle }
 * Requires authentication
 */
export const createCheckout = async (req: Request, res: Response) => {
  try {
    const { planId, billingCycle } = req.body;
    const userId = (req as any).user?.id;
    const email = (req as any).user?.email;

    if (!userId || !email) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!planId || !billingCycle) {
      return res.status(400).json({
        error: 'Plan ID and billing cycle are required',
      });
    }

    if (!['monthly', 'annual'].includes(billingCycle)) {
      return res.status(400).json({
        error: 'Billing cycle must be "monthly" or "annual"',
      });
    }

    const result = await createCheckoutSession({
      userId,
      planId,
      billingCycle: billingCycle as 'monthly' | 'annual',
      email,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Checkout session creation failed', error, {
      userId: (req as any).user?.id,
      planId: req.body.planId,
    });

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
      });
    }

    if (error instanceof BillingError) {
      return res.status(422).json({
        error: error.userMessage,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: 'Failed to create checkout session',
    });
  }
};

/**
 * Get current user's subscription details
 * GET /api/subscription/current
 * Requires authentication
 */
export const getCurrent = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const subscription = await getCurrentSubscription(userId);

    if (!subscription) {
      return res.status(404).json({
        error: 'No active subscription found',
      });
    }

    // Enrich with watermark-free export status
    const wmStatus = await getWatermarkFreeStatus(userId);

    return res.status(200).json({
      ...subscription,
      watermarkFreeRemaining: wmStatus.remaining,
      watermarkFreeTotal: wmStatus.total,
    });
  } catch (error: any) {
    logger.error('Failed to get current subscription', error, {
      userId: (req as any).user?.id,
    });

    return res.status(500).json({
      error: 'Failed to retrieve subscription',
    });
  }
};

/**
 * Use one watermark-free export
 * POST /api/subscription/use-watermark-free-export
 * Requires authentication
 */
export const useWatermarkFreeExport = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const result = await consumeWatermarkFreeExport(userId);

    if (!result.success) {
      return res.status(403).json({
        error: 'No watermark-free exports remaining this month',
        remaining: result.remaining,
      });
    }

    return res.status(200).json({
      success: true,
      remaining: result.remaining,
    });
  } catch (error: any) {
    logger.error('Failed to use watermark-free export', error, {
      userId: (req as any).user?.id,
    });

    return res.status(500).json({
      error: 'Failed to process watermark-free export',
    });
  }
};

/**
 * Cancel current subscription
 * POST /api/subscription/cancel
 * Requires authentication
 */
export const cancel = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    const result = await cancelSubscription(userId);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Subscription cancellation failed', error, {
      userId: (req as any).user?.id,
    });

    if (error.message.includes('No active subscription')) {
      return res.status(404).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to cancel subscription',
    });
  }
};

/**
 * Stripe webhook handler
 * POST /api/subscription/webhook
 * Handles: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted
 */
export const webhook = async (req: Request, res: Response) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({
        error: 'Missing Stripe signature',
      });
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      logger.error('Webhook signature verification failed', err);
      return res.status(400).json({
        error: `Webhook Error: ${err.message}`,
      });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        // Check if this is a credit pack purchase or subscription
        if (session.metadata?.type === 'credit_pack_purchase') {
          // Handle credit pack purchase
          await addPurchasedCredits(
            session.metadata.userId,
            session.metadata.packId,
            session.id
          );
          logger.info('Credit pack purchase completed', {
            userId: session.metadata.userId,
            packId: session.metadata.packId,
            credits: session.metadata.credits,
          });
        } else {
          // Handle subscription checkout
          await handleCheckoutComplete(session);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionRenewed(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionCancelled(subscription);
        break;
      }

      default:
        logger.info('Unhandled webhook event type', { type: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    logger.error('Webhook processing failed', error, {
      eventType: req.body?.type,
    });

    return res.status(500).json({
      error: 'Webhook processing failed',
    });
  }
};

/**
 * Deduct credits from user's subscription
 * POST /api/subscription/deduct-credits
 * Body: { amount, thumbnailId }
 * Requires authentication
 */
export const deduct = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Valid credit amount is required',
      });
    }

    const result = await deductCredits(userId, amount);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Credit deduction failed', error, {
      userId: (req as any).user?.id,
      amount: req.body.amount,
    });

    if (error.message.includes('Insufficient credits')) {
      return res.status(402).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to deduct credits',
    });
  }
};

/**
 * Get phase-aware pricing (beta discounts, spots left, time remaining)
 * GET /api/pricing/current
 * Public — no authentication required
 */
export const getPricing = async (_req: Request, res: Response) => {
  try {
    const pricing = await getCurrentPricing();
    return res.status(200).json(pricing);
  } catch (error: any) {
    logger.error('Failed to retrieve current pricing', error);
    return res.status(500).json({
      error: 'Failed to retrieve pricing data',
    });
  }
};

/**
 * Complete demo checkout (dev environment only)
 * POST /api/subscription/demo-complete
 * Body: { session, plan, cycle }
 * Requires authentication
 */
export const demoComplete = async (req: Request, res: Response) => {
  try {
    const { session, plan, cycle } = req.body;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!session || !plan || !cycle) {
      return res.status(400).json({
        error: 'Session, plan, and cycle are required',
      });
    }

    await completeDemoCheckout(userId, plan, cycle, session);

    return res.status(200).json({
      success: true,
      message: 'Demo subscription created successfully',
    });
  } catch (error: any) {
    logger.error('Demo checkout completion failed', error, {
      userId: (req as any).user?.id,
      plan: req.body.plan,
    });

    return res.status(500).json({
      error: error.message || 'Failed to complete demo checkout',
    });
  }
};
