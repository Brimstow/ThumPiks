import { Router, RequestHandler } from 'express';
import {
  createCheckout,
  getCurrent,
  cancel,
  webhook,
  deduct,
  demoComplete,
  getPlans,
  getPricing,
  useWatermarkFreeExport,
} from './subscription.controller';
import { validateRequest } from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/subscription/plans
 * Retrieve all public pricing plans, credit packs, and FAQs
 * Public — no authentication required
 */
router.get('/plans', getPlans);

/**
 * GET /api/subscription/pricing
 * Phase-aware pricing: returns discounted prices, spots left, and time remaining.
 * Public — no authentication required
 */
router.get('/pricing', getPricing);

/**
 * POST /api/subscription/create-checkout
 * Create Stripe Checkout Session for subscription upgrade
 * Requires authentication
 */
router.post(
  '/create-checkout',
  authenticate,
  validateRequest({
    body: [
      {
        field: 'planId',
        required: true,
        type: 'string',
        whitelist: ['free', 'starter', 'pro', 'ultra_pro'],
      },
      {
        field: 'billingCycle',
        required: true,
        type: 'string',
        whitelist: ['monthly', 'annual'],
      },
    ],
  }),
  createCheckout as unknown as RequestHandler
);

/**
 * GET /api/subscription/current
 * Get current user's subscription details
 * Requires authentication
 */
router.get('/current', authenticate, getCurrent as unknown as RequestHandler);

/**
 * POST /api/subscription/cancel
 * Cancel current subscription (at period end)
 * Requires authentication
 */
router.post('/cancel', authenticate, cancel as unknown as RequestHandler);

/**
 * POST /api/subscription/deduct-credits
 * Deduct credits after thumbnail generation
 * Requires authentication
 */
router.post(
  '/deduct-credits',
  authenticate,
  validateRequest({
    body: [
      {
        field: 'amount',
        required: true,
        type: 'number',
        min: 1,
      },
      {
        field: 'thumbnailId',
        required: false,
        type: 'string',
      },
    ],
  }),
  deduct as unknown as RequestHandler
);

/**
 * POST /api/subscription/use-watermark-free-export
 * Consume one watermark-free export for the current month
 * Requires authentication
 */
router.post('/use-watermark-free-export', authenticate, useWatermarkFreeExport as unknown as RequestHandler);

/**
 * POST /api/subscription/webhook
 * Stripe webhook handler (no authentication, verified via Stripe signature)
 */
router.post('/webhook', webhook);

/**
 * POST /api/subscription/demo-complete
 * Complete demo checkout (dev environment only)
 * Requires authentication
 */
router.post(
  '/demo-complete',
  authenticate,
  validateRequest({
    body: [
      {
        field: 'session',
        required: true,
        type: 'string',
      },
      {
        field: 'plan',
        required: true,
        type: 'string',
        whitelist: ['free', 'starter', 'pro', 'ultra_pro'],
      },
      {
        field: 'cycle',
        required: true,
        type: 'string',
        whitelist: ['monthly', 'annual'],
      },
    ],
  }),
  demoComplete as unknown as RequestHandler
);

export default router;
