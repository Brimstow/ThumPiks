import { Response } from 'express';
import * as billingService from './billing.service';
import { logger } from '../../utils/logger';
import { AuthRequest } from '../../types/auth';

/**
 * Get payment methods for authenticated user
 */
export async function getPaymentMethods(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const paymentMethods = await billingService.getPaymentMethods(userId);
    res.status(200).json({ paymentMethods });
  } catch (error) {
    logger.error('Failed to fetch payment methods', error as Error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
}

/**
 * Get billing history (invoices + credit purchases)
 */
export async function getBillingHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const history = await billingService.getBillingHistory(userId);
    res.status(200).json({ history });
  } catch (error) {
    logger.error('Failed to fetch billing history', error as Error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
}

/**
 * Create Stripe Billing Portal session
 */
export async function createBillingPortal(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { returnUrl } = req.body;

    if (!returnUrl) {
      res.status(400).json({ error: 'Return URL is required' });
      return;
    }

    const result = await billingService.createBillingPortalSession(
      userId,
      returnUrl
    );
    res.status(200).json(result);
  } catch (error) {
    logger.error('Failed to create billing portal session', error as Error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
}
