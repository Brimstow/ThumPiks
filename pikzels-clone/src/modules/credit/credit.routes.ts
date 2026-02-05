import { Router } from 'express';
import * as creditController from './credit.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/credits/transactions
 * @desc    Get credit transaction history for authenticated user
 * @access  Private
 */
router.get('/transactions', authenticate, creditController.getTransactions);

/**
 * @route   GET /api/credits/balance
 * @desc    Get current credit balance
 * @access  Private
 */
router.get('/balance', authenticate, creditController.getBalance);

/**
 * @route   POST /api/credits/purchase
 * @desc    Purchase credit pack (create Stripe checkout session)
 * @access  Private
 */
router.post('/purchase', authenticate, creditController.purchaseCreditPack);

export default router;
