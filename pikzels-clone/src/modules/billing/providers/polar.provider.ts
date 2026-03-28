/**
 * Polar Billing Provider
 *
 * Implements BillingProvider using the Polar SDK.
 * Polar is a Merchant of Record -- it handles tax compliance (VAT, GST, Sales Tax).
 */

import { Polar } from '@polar-sh/sdk';
import { getPrisma } from '../../../utils/prisma-factory';
import { logger } from '../../../utils/logger';
import {
  BillingError,
  type BillingErrorCode,
  type BillingProvider,
  type BillingProviderName,
  type CheckoutParams,
  type CheckoutResult,
  type CreditPackCheckoutParams,
  type PortalSessionResult,
  type Invoice,
  type PaymentMethod,
} from '../billing-provider.interface';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { HTTPValidationError } = require('@polar-sh/sdk/models/errors/httpvalidationerror.js') as {
  HTTPValidationError: new (...args: unknown[]) => Error & { detail?: Array<{ loc: Array<string | number>; msg: string; type: string }> };
};

const prisma = getPrisma();

export class PolarBillingProvider implements BillingProvider {
  readonly providerName: BillingProviderName = 'polar';
  private polar: Polar;
  private static instance: PolarBillingProvider | null = null;

  private constructor(accessToken: string) {
    this.polar = new Polar({
      accessToken,
      server: process.env.POLAR_SANDBOX === 'true' ? 'sandbox' : 'production',
    });
  }

  static getInstance(): PolarBillingProvider {
    if (!PolarBillingProvider.instance) {
      const accessToken = process.env.POLAR_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('POLAR_ACCESS_TOKEN is required for Polar provider');
      }
      PolarBillingProvider.instance = new PolarBillingProvider(accessToken);
    }
    return PolarBillingProvider.instance;
  }

  async createOrGetCustomer(userId: string, email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { polarCustomerId: true },
    });

    if (user?.polarCustomerId) {
      return user.polarCustomerId;
    }

    // Create the customer via Polar API
    try {
      const customer = await this.polar.customers.create({
        email,
        metadata: { userId },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { polarCustomerId: customer.id },
      });

      logger.info('Polar customer created', {
        userId,
        polarCustomerId: customer.id,
      });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Polar customer', error as Error, {
        userId,
        email,
      });
      throw error;
    }
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const {
      userId, email, planId, billingCycle, productId, successUrl,
      discountId, allowDiscountCodes,
    } = params;

    try {
      const checkoutParams: Record<string, unknown> = {
        products: [productId],
        successUrl,
        customerEmail: email,
        allowDiscountCodes: false,
        requireBillingAddress: false,
        isBusinessCustomer: false,
        metadata: {
          userId,
          planId,
          billingCycle,
        },
      };

      // Auto-apply beta discount if provided
      if (discountId) {
        checkoutParams.discountId = discountId;
      }

      // Allow user-entered promo codes (e.g. LAUNCH15)
      if (allowDiscountCodes) {
        checkoutParams.allowDiscountCodes = true;
      }

      const checkout = await this.polar.checkouts.create(
        checkoutParams as Parameters<typeof this.polar.checkouts.create>[0]
      );

      logger.info('Polar checkout session created', {
        userId,
        planId,
        checkoutId: checkout.id,
      });

      return {
        sessionId: checkout.id,
        url: checkout.url,
      };
    } catch (error) {
      throw parsePolarError(error, { userId, planId, email });
    }
  }

  async createCreditPackCheckout(
    params: CreditPackCheckoutParams
  ): Promise<string> {
    const { userId, email, packId, packName, credits, successUrl } = params;

    try {
      // Credit packs must be created as one-time products in the Polar dashboard.
      // The price is set on the product itself -- do NOT pass amount here.
      const checkout = await this.polar.checkouts.create({
        products: [packId],
        successUrl,
        customerEmail: email,
        metadata: {
          userId,
          packId,
          credits: credits.toString(),
          type: 'credit_pack_purchase',
          packName,
        },
      });

      logger.info('Polar credit pack checkout created', {
        userId,
        packId,
        checkoutId: checkout.id,
      });

      return checkout.url;
    } catch (error) {
      logger.error(
        'Failed to create Polar credit pack checkout',
        error as Error,
        { userId, packId }
      );
      throw error;
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    try {
      await this.polar.subscriptions.update({
        id: providerSubscriptionId,
        subscriptionUpdate: {
          cancelAtPeriodEnd: true,
        },
      });

      logger.info('Polar subscription cancelled at period end', {
        subscriptionId: providerSubscriptionId,
      });
    } catch (error) {
      logger.error('Failed to cancel Polar subscription', error as Error, {
        subscriptionId: providerSubscriptionId,
      });
      throw error;
    }
  }

  async createPortalSession(
    customerId: string,
    _returnUrl: string
  ): Promise<PortalSessionResult> {
    // Use Polar's customer sessions API to get an authenticated portal URL.
    try {
      const session = await this.polar.customerSessions.create({
        customerId,
      });

      return {
        url: session.customerPortalUrl,
      };
    } catch (error) {
      logger.error(
        'Failed to create Polar customer portal session',
        error as Error,
        {
          customerId,
        }
      );
      throw error;
    }
  }

  async getInvoices(customerId: string, limit: number): Promise<Invoice[]> {
    // Hybrid approach: fetch orders via Core API for in-app billing history.
    // Users can also access full invoices/receipts via the Polar customer portal
    // (createPortalSession).
    try {
      const result = await this.polar.orders.list({
        customerId,
        limit,
        sorting: ['-created_at'],
      });

      const invoices: Invoice[] = [];

      for await (const page of result) {
        for (const order of page.result.items) {
          const isSubscription =
            order.billingReason === 'subscription_create' ||
            order.billingReason === 'subscription_cycle' ||
            order.billingReason === 'subscription_update';
          invoices.push({
            id: order.id,
            date: order.createdAt.toISOString(),
            description: order.product?.name ?? 'Polar order',
            amount: order.netAmount,
            status: order.status,
            type: isSubscription ? 'subscription' : 'credit_pack',
            invoiceUrl: null,
            pdfUrl: null,
          });
        }
        // Only need the first page up to limit
        break;
      }

      return invoices;
    } catch (error) {
      logger.error('Failed to fetch Polar orders', error as Error, {
        customerId,
      });
      return [];
    }
  }

  async getPaymentMethods(_customerId: string): Promise<PaymentMethod[]> {
    // Polar manages payment methods in their hosted checkout/portal.
    // No API to list saved payment methods.
    return [];
  }
}

// =========================================================================
// Polar Error Parsing
// =========================================================================

function parsePolarError(
  error: unknown,
  context: Record<string, unknown>,
): BillingError {
  // Polar SDK validation error (422) — has structured detail array
  if (error instanceof HTTPValidationError) {
    const details = (error as InstanceType<typeof HTTPValidationError>).detail ?? [];
    const messages = details.map((d: { msg: string }) => d.msg);
    const fields = details.map((d: { loc?: Array<string | number> }) => d.loc?.join('.') ?? 'unknown');

    // Classify by field
    const code = classifyPolarValidationError(details);
    const userMessage = buildUserMessage(code, details);

    logger.error('Polar API validation error', error as unknown as Error, {
      ...context,
      billingErrorCode: code,
      validationFields: fields,
      validationMessages: messages,
    });

    return new BillingError({
      code,
      message: `Polar validation error: ${messages[0]}`,
      userMessage,
      providerDetails: { fields, messages },
    });
  }

  // Generic Polar SDK or network error
  const msg = error instanceof Error ? error.message : String(error);

  logger.error('Polar API error', error instanceof Error ? error : new Error(msg), context);

  return new BillingError({
    code: 'UNKNOWN',
    message: `Polar error: ${msg}`,
    userMessage: 'Something went wrong with the payment provider. Please try again.',
    providerDetails: { rawMessage: msg },
  });
}

function classifyPolarValidationError(
  details: Array<{ loc: Array<string | number>; msg: string; type: string }>,
): BillingErrorCode {
  for (const d of details) {
    const field = d.loc?.join('.') ?? '';
    if (field.includes('customer_email') || d.msg.includes('email')) return 'INVALID_EMAIL';
    if (field.includes('product_id') || field.includes('products')) return 'INVALID_PRODUCT';
  }
  return 'PROVIDER_VALIDATION';
}

function buildUserMessage(
  code: BillingErrorCode,
  details: Array<{ msg: string }>,
): string {
  switch (code) {
    case 'INVALID_EMAIL':
      return 'Your account email address is not accepted by our payment provider. Please update your email in Account Settings and try again.';
    case 'INVALID_PRODUCT':
      return 'This plan is temporarily unavailable. Please try again later or contact support.';
    case 'PROVIDER_VALIDATION':
      return `Checkout could not be completed: ${details[0]?.msg ?? 'validation error'}. Please try again or contact support.`;
    default:
      return 'Something went wrong with checkout. Please try again.';
  }
}
