/**
 * Billing Service
 *
 * Handles payment methods, billing history, and billing portal.
 * Uses the BillingProvider abstraction to support Stripe, Polar, and Demo modes.
 */

import { getBillingProviderByName } from '.';
import type { BillingProviderName } from '.';
import { CREDIT_PACKS } from '../credit/credit.service';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

/**
 * Get payment methods for a user.
 * Uses the provider that the user's subscription is associated with.
 */
export async function getPaymentMethods(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, polarCustomerId: true },
    });

    // Determine which provider has the customer record
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { billingProvider: true },
    });

    const providerName = (subscription?.billingProvider ||
      'stripe') as BillingProviderName;
    const provider = getBillingProviderByName(providerName);

    const customerId =
      providerName === 'polar' ? user?.polarCustomerId : user?.stripeCustomerId;

    if (!customerId) {
      // No customer record -- return mock data via demo provider
      const demo = getBillingProviderByName('demo');
      return demo.getPaymentMethods('');
    }

    return await provider.getPaymentMethods(customerId);
  } catch (error) {
    logger.error('Failed to fetch payment methods', error as Error);
    throw new Error('Failed to fetch payment methods');
  }
}

/**
 * Get billing history (invoices from provider + credit transactions from DB).
 * Returns combined billing history sorted by date.
 */
export async function getBillingHistory(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, polarCustomerId: true },
    });

    // Get provider invoices
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { billingProvider: true },
    });

    const providerName = (subscription?.billingProvider ||
      'stripe') as BillingProviderName;
    const provider = getBillingProviderByName(providerName);

    const customerId =
      providerName === 'polar' ? user?.polarCustomerId : user?.stripeCustomerId;

    let providerInvoices = [];
    if (customerId) {
      providerInvoices = await provider.getInvoices(customerId, 50);
    } else {
      // Demo mode fallback
      const demo = getBillingProviderByName('demo');
      providerInvoices = await demo.getInvoices('', 50);
    }

    // Get credit pack purchases from database
    const creditTransactions = await prisma.creditTransaction
      .findMany({
        where: { userId, type: 'purchase' },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      .catch(() => []);

    const creditPurchases = creditTransactions.map(
      (tx: Record<string, unknown>) => {
        const createdAt = tx.createdAt as Date;
        return {
          id: tx.id,
          date: createdAt.toISOString().split('T')[0],
          description: tx.description,
          amount: getAmountFromDescription(tx.description as string),
          status: 'paid',
          type: 'credit_pack',
          invoiceUrl: null,
          pdfUrl: null,
        };
      }
    );

    // Combine and sort by date
    const allHistory = [...providerInvoices, ...creditPurchases].sort(
      (a, b) =>
        new Date(b.date as string).getTime() -
        new Date(a.date as string).getTime()
    );

    return allHistory;
  } catch (error) {
    logger.error('Failed to fetch billing history', error as Error);
    throw new Error('Failed to fetch billing history');
  }
}

/**
 * Helper to estimate amount from credit pack description.
 * Uses centralized CREDIT_PACKS as the single source of truth.
 */
function getAmountFromDescription(description: string): number {
  for (const pack of CREDIT_PACKS) {
    if (description.includes(pack.name)) {
      return pack.price * 100; // Convert dollars to cents
    }
  }

  return 0;
}

/**
 * Create billing portal session.
 * Uses the provider associated with the user's subscription.
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, polarCustomerId: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Determine which provider to use for the portal
    const subscription = await prisma.subscription.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { billingProvider: true },
    });

    const providerName = (subscription?.billingProvider ||
      'stripe') as BillingProviderName;
    const provider = getBillingProviderByName(providerName);

    const customerId =
      providerName === 'polar' ? user.polarCustomerId : user.stripeCustomerId;

    if (!customerId) {
      // Create customer if needed
      const newCustomerId = await provider.createOrGetCustomer(
        userId,
        user.email
      );
      return await provider.createPortalSession(newCustomerId, returnUrl);
    }

    return await provider.createPortalSession(customerId, returnUrl);
  } catch (error) {
    logger.error('Failed to create billing portal session', error as Error);
    throw new Error('Failed to create billing portal session');
  }
}
