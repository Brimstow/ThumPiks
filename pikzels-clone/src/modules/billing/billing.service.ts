import { PrismaClient } from '@prisma/client';
import Stripe from 'stripe';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-01-28.clover',
    })
  : null;

/**
 * Get payment methods for a user
 * Returns real data from Stripe if configured, otherwise mock data
 */
export async function getPaymentMethods(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId || !stripe) {
      // Return mock data for demo mode
      return [
        {
          id: 'pm_mock_1',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            expMonth: 12,
            expYear: 2026,
          },
          isDefault: true,
        },
      ];
    }

    // Fetch real payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    // Get default payment method
    const customer = await stripe.customers.retrieve(user.stripeCustomerId);
    const defaultPaymentMethodId =
      customer.deleted !== true
        ? customer.invoice_settings?.default_payment_method
        : null;

    return paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card: {
        brand: pm.card?.brand || 'unknown',
        last4: pm.card?.last4 || '0000',
        expMonth: pm.card?.exp_month || 0,
        expYear: pm.card?.exp_year || 0,
      },
      isDefault: pm.id === defaultPaymentMethodId,
    }));
  } catch (error) {
    logger.error('Failed to fetch payment methods', error as Error);
    throw new Error('Failed to fetch payment methods');
  }
}

/**
 * Get billing history (invoices from Stripe + credit transactions)
 * Returns combined billing history sorted by date
 */
export async function getBillingHistory(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    let stripeInvoices = [];

    if (user?.stripeCustomerId && stripe) {
      // Fetch real invoices from Stripe
      const invoices = await stripe.invoices.list({
        customer: user.stripeCustomerId,
        limit: 50,
      });

      stripeInvoices = invoices.data.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000).toISOString().split('T')[0],
        description: invoice.lines.data[0]?.description || 'Subscription',
        amount: invoice.amount_paid, // Amount in cents
        status: invoice.status === 'paid' ? 'paid' : 'pending',
        type: 'subscription',
        invoiceUrl: invoice.hosted_invoice_url,
        pdfUrl: invoice.invoice_pdf,
      }));
    } else {
      // Mock data for demo mode
      stripeInvoices = [
        {
          id: 'INV-001',
          date: '2025-01-27',
          description: 'Professional Plan - Monthly',
          amount: 2900, // 29.00 in cents
          status: 'paid',
          type: 'subscription',
          invoiceUrl: null,
          pdfUrl: null,
        },
        {
          id: 'INV-002',
          date: '2024-12-27',
          description: 'Professional Plan - Monthly',
          amount: 2900,
          status: 'paid',
          type: 'subscription',
          invoiceUrl: null,
          pdfUrl: null,
        },
      ];
    }

    // Get credit pack purchases from database
    const creditTransactions = await prisma.creditTransaction
      .findMany({
        where: {
          userId,
          type: 'purchase',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      })
      .catch(() => []);

    const creditPurchases = creditTransactions.map((tx: any) => ({
      id: tx.id,
      date: tx.createdAt.toISOString().split('T')[0],
      description: tx.description,
      amount: getAmountFromDescription(tx.description), // Estimate amount in cents
      status: 'paid',
      type: 'credit_pack',
      invoiceUrl: null,
      pdfUrl: null,
    }));

    // Combine and sort by date
    const allHistory = [...stripeInvoices, ...creditPurchases].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return allHistory;
  } catch (error) {
    logger.error('Failed to fetch billing history', error as Error);
    throw new Error('Failed to fetch billing history');
  }
}

/**
 * Helper to estimate amount from credit pack description
 * Format: "Purchased [Pack Name]"
 */
function getAmountFromDescription(description: string): number {
  // Parse pack names and return approximate amounts in cents
  const packPrices: Record<string, number> = {
    'Starter Pack': 900, // $9
    'Pro Pack': 2400, // $24
    'Business Pack': 6900, // $69
  };

  for (const [packName, price] of Object.entries(packPrices)) {
    if (description.includes(packName)) {
      return price;
    }
  }

  return 0; // Unknown pack
}

/**
 * Create Stripe Billing Portal session
 * Allows users to manage payment methods, view invoices, cancel subscription
 */
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string
) {
  try {
    if (!stripe) {
      // Demo mode - return mock URL
      return {
        url: `/dashboard/account/billing?demo=true`,
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true, email: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;

      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create billing portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (error) {
    logger.error('Failed to create billing portal session', error as Error);
    throw new Error('Failed to create billing portal session');
  }
}
