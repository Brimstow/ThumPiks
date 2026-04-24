import { Request, Response } from 'express';
import * as creditService from './credit.service';
import { logger } from '../../utils/logger';
import { BillingError } from '../billing/billing-provider.interface';

/**
 * Get credit transaction history
 */
export async function getTransactions(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const transactions = await creditService.getTransactions(userId);
    res.status(200).json({ transactions });
  } catch (error) {
    logger.error('Failed to fetch credit transactions', error as Error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

/**
 * Get current credit balance
 */
export async function getBalance(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const balance = await creditService.getBalance(userId);
    res.status(200).json({ balance });
  } catch (error) {
    logger.error('Failed to fetch credit balance', error as Error);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

/**
 * Purchase credit pack (create Stripe checkout session)
 */
export async function purchaseCreditPack(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const userEmail = (req as any).user?.email;

    if (!userId || !userEmail) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { packId } = req.body;

    if (!packId) {
      res.status(400).json({ error: 'Pack ID is required' });
      return;
    }

    const checkoutUrl = await creditService.createCreditPackCheckout(
      userId,
      userEmail,
      packId
    );

    res.status(200).json({ url: checkoutUrl });
  } catch (error) {
    // Log full error details for debugging
    logger.error('Failed to create credit pack checkout', error as Error);

    // Return user-friendly message if it's a BillingError, otherwise generic
    if (error instanceof BillingError) {
      res.status(500).json({ error: error.userMessage || error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to create checkout session' });
  }
}
