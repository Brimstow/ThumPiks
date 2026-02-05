import { Router } from 'express';
import * as billingController from './billing.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/billing/payment-methods
 * @desc    Get payment methods for authenticated user
 * @access  Private
 */
router.get(
  '/payment-methods',
  authenticate,
  billingController.getPaymentMethods
);

/**
 * @route   GET /api/billing/history
 * @desc    Get billing history (invoices + credit purchases)
 * @access  Private
 */
router.get('/history', authenticate, billingController.getBillingHistory);

/**
 * @route   POST /api/billing/portal
 * @desc    Create Stripe Billing Portal session
 * @access  Private
 */
router.post('/portal', authenticate, billingController.createBillingPortal);

export default router;
