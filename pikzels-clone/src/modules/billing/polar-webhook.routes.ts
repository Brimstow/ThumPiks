/**
 * Polar Webhook Routes
 *
 * Handles incoming Polar webhook events for subscription and order lifecycle.
 * Uses the @polar-sh/sdk validateEvent() for signature verification.
 *
 * POST /api/polar/webhook
 */

import { Router, Request, Response } from 'express';
// Use require() because moduleResolution: "node" can't resolve @polar-sh/sdk subpath exports
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  validateEvent,
  WebhookVerificationError,
} = require('@polar-sh/sdk/webhooks');
import {
  handlePolarSubscriptionActive,
  handlePolarSubscriptionCancelled,
  handlePolarSubscriptionRenewed,
} from '../subscription/subscription.service';
import { addPurchasedCredits } from '../credit/credit.service';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/polar/webhook
 *
 * Polar sends standard-webhook headers:
 *   webhook-id, webhook-timestamp, webhook-signature
 *
 * The raw body is already captured by the JSON parser (req.rawBody).
 */
router.post('/webhook', async (req: Request, res: Response) => {
  const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('POLAR_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Polar uses standard-webhook headers for signature verification
  const headers: Record<string, string> = {
    'webhook-id': (req.headers['webhook-id'] as string) || '',
    'webhook-timestamp': (req.headers['webhook-timestamp'] as string) || '',
    'webhook-signature': (req.headers['webhook-signature'] as string) || '',
  };

  // Use raw body for signature verification
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    logger.error('Raw body not available for Polar webhook verification');
    return res.status(400).json({ error: 'Raw body not available' });
  }

  let event: any;

  try {
    event = validateEvent(rawBody.toString('utf-8'), headers, webhookSecret);
  } catch (err: unknown) {
    if (err instanceof WebhookVerificationError) {
      logger.error('Polar webhook signature verification failed', err as Error);
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    logger.error('Polar webhook parsing failed', err as Error);
    return res.status(400).json({ error: 'Invalid webhook payload' });
  }

  try {
    switch (event.type) {
      // ── Checkout Events ─────────────────────────────────────────
      case 'checkout.created':
      case 'checkout.updated': {
        const checkout = (event as any).data;

        // Only act on successful checkouts
        if (checkout.status !== 'succeeded') {
          logger.info('Polar checkout event (non-succeeded)', {
            status: checkout.status,
            checkoutId: checkout.id,
          });
          break;
        }

        const metadata = checkout.metadata || {};
        const userId = metadata.userId || '';
        const planId = metadata.planId || '';
        const billingCycle =
          (metadata.billingCycle as 'monthly' | 'annual') || 'monthly';
        const customerId =
          checkout.customer_id || checkout.customerId || '';
        // subscription_id may be null on checkout.updated; subscription.active fills it later
        const subscriptionId =
          checkout.subscription_id || checkout.subscriptionId || '';

        if (!userId || !planId) {
          logger.error('Polar checkout.succeeded missing metadata', undefined, {
            checkoutId: checkout.id,
            userId,
            planId,
          });
          break;
        }

        await handlePolarSubscriptionActive({
          subscriptionId,
          customerId,
          userId,
          planId,
          billingCycle,
        });

        logger.info('Polar checkout.succeeded handled — subscription activated', {
          checkoutId: checkout.id,
          userId,
          planId,
          billingCycle,
          customerId,
          subscriptionId: subscriptionId || '(pending)',
        });
        break;
      }

      // ── Subscription Events ──────────────────────────────────────
      case 'subscription.active': {
        const sub = (event as any).data;
        const metadata = sub.metadata || {};

        // If metadata exists, do full activation (fallback if checkout event missed)
        if (metadata.userId && metadata.planId) {
          await handlePolarSubscriptionActive({
            subscriptionId: sub.id,
            customerId: sub.customerId || sub.customer_id || '',
            userId: metadata.userId,
            planId: metadata.planId,
            billingCycle:
              (metadata.billingCycle as 'monthly' | 'annual') || 'monthly',
          });
        } else {
          // No metadata — just store the subscription ID on an existing record
          await handlePolarSubscriptionRenewed(sub.id);
        }

        logger.info('Polar subscription.active handled', {
          subscriptionId: sub.id,
          userId: metadata.userId || '(no metadata)',
        });
        break;
      }

      case 'subscription.canceled': {
        const sub = (event as any).data;
        await handlePolarSubscriptionCancelled(sub.id);

        logger.info('Polar subscription.canceled handled', {
          subscriptionId: sub.id,
        });
        break;
      }

      case 'subscription.revoked': {
        const sub = (event as any).data;
        await handlePolarSubscriptionCancelled(sub.id);

        logger.info('Polar subscription.revoked handled', {
          subscriptionId: sub.id,
        });
        break;
      }

      case 'subscription.updated': {
        const sub = (event as any).data;
        // subscription.updated fires on renewals and plan changes
        if (sub.status === 'active') {
          await handlePolarSubscriptionRenewed(sub.id);

          logger.info('Polar subscription.updated (renewed) handled', {
            subscriptionId: sub.id,
          });
        }
        break;
      }

      // ── Order Events (Credit Pack Purchases) ────────────────────
      case 'order.paid': {
        const order = (event as any).data;
        const metadata = order.metadata || {};

        if (
          metadata.type === 'credit_pack_purchase' &&
          metadata.userId &&
          metadata.packId
        ) {
          await addPurchasedCredits(
            metadata.userId,
            metadata.packId,
            order.id,
            'polar'
          );

          logger.info('Polar credit pack purchase completed', {
            orderId: order.id,
            userId: metadata.userId,
            packId: metadata.packId,
          });
        }
        break;
      }

      default:
        logger.info('Unhandled Polar webhook event type', { type: event.type });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Polar webhook processing failed', error as Error, {
      eventType: event.type,
    });
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
