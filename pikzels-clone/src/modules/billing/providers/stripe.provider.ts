/**
 * Stripe Billing Provider
 *
 * Implements BillingProvider using the Stripe SDK.
 * All Stripe-specific API calls are encapsulated here.
 */

import Stripe from 'stripe';
import { getPrisma } from '../../../utils/prisma-factory';
import { logger } from '../../../utils/logger';
import type {
  BillingProvider,
  BillingProviderName,
  CheckoutParams,
  CheckoutResult,
  CreditPackCheckoutParams,
  PortalSessionResult,
  Invoice,
  PaymentMethod,
} from '../billing-provider.interface';

const prisma = getPrisma();

export class StripeBillingProvider implements BillingProvider {
  readonly providerName: BillingProviderName = 'stripe';
  private stripe: Stripe;
  private static instance: StripeBillingProvider | null = null;

  private constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2026-02-25.clover',
    });
  }

  static getInstance(): StripeBillingProvider {
    if (!StripeBillingProvider.instance) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is required for Stripe provider');
      }
      StripeBillingProvider.instance = new StripeBillingProvider(secretKey);
    }
    return StripeBillingProvider.instance;
  }

  /** Expose the raw Stripe instance for webhook verification in controllers */
  getStripeInstance(): Stripe {
    return this.stripe;
  }

  async createOrGetCustomer(userId: string, email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    });

    if (user?.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripe.customers.create({
      email,
      metadata: { userId },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customer.id },
    });

    return customer.id;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const {
      userId,
      email,
      planId,
      billingCycle,
      productId,
      successUrl,
      cancelUrl,
    } = params;

    const customerId = await this.createOrGetCustomer(userId, email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: productId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planId, billingCycle },
    });

    logger.info('Stripe checkout session created', {
      userId,
      planId,
      sessionId: session.id,
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  }

  async createCreditPackCheckout(
    params: CreditPackCheckoutParams
  ): Promise<string> {
    const {
      userId,
      email,
      packId,
      packName,
      credits,
      price,
      successUrl,
      cancelUrl,
    } = params;

    const customerId = await this.createOrGetCustomer(userId, email);

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: packName,
              description: `${credits} AI thumbnail generation credits`,
            },
            unit_amount: price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        packId,
        credits: credits.toString(),
        type: 'credit_pack_purchase',
      },
    });

    logger.info('Stripe credit pack checkout created', {
      userId,
      packId,
      sessionId: session.id,
    });

    return session.url || '';
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.update(providerSubscriptionId, {
      cancel_at_period_end: true,
    });
    logger.info('Stripe subscription cancelled at period end', {
      subscriptionId: providerSubscriptionId,
    });
  }

  async createPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<PortalSessionResult> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return { url: session.url };
  }

  async getInvoices(customerId: string, limit: number): Promise<Invoice[]> {
    const invoices = await this.stripe.invoices.list({
      customer: customerId,
      limit,
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      date: new Date((invoice.created ?? Date.now() / 1000) * 1000)
        .toISOString()
        .slice(0, 10),
      description: invoice.lines.data[0]?.description || 'Subscription',
      amount: invoice.amount_paid,
      status: invoice.status === 'paid' ? 'paid' : 'pending',
      type: 'subscription',
      invoiceUrl: invoice.hosted_invoice_url ?? null,
      pdfUrl: invoice.invoice_pdf ?? null,
    }));
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    const paymentMethods = await this.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    const customer = await this.stripe.customers.retrieve(customerId);
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
  }
}
