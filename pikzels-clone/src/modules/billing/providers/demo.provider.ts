/**
 * Demo Billing Provider
 *
 * Simulates billing operations for development without real payment keys.
 * Returns mock data and generates demo checkout URLs.
 */

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

export class DemoBillingProvider implements BillingProvider {
  readonly providerName: BillingProviderName = 'demo';
  private static instance: DemoBillingProvider | null = null;

  static getInstance(): DemoBillingProvider {
    if (!DemoBillingProvider.instance) {
      DemoBillingProvider.instance = new DemoBillingProvider();
    }
    return DemoBillingProvider.instance;
  }

  async createOrGetCustomer(userId: string, _email: string): Promise<string> {
    const demoCustomerId = `demo_cus_${userId}`;

    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: demoCustomerId },
    });

    return demoCustomerId;
  }

  async createCheckoutSession(params: CheckoutParams): Promise<CheckoutResult> {
    const { userId, planId, billingCycle } = params;

    const demoSessionId = `demo_session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    logger.info('DEMO MODE: Creating simulated checkout session', {
      userId,
      planId,
      billingCycle,
    });

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
    const demoUrl = `${clientUrl}/demo-checkout?session=${demoSessionId}&user=${userId}&plan=${planId}&cycle=${billingCycle}`;

    return {
      sessionId: demoSessionId,
      url: demoUrl,
    };
  }

  async createCreditPackCheckout(
    params: CreditPackCheckoutParams
  ): Promise<string> {
    const { userId, packId } = params;

    const clientUrl =
      process.env.CLIENT_URL ||
      process.env.VITE_BASE_URL ||
      'http://localhost:8556';
    const demoUrl =
      `${clientUrl}/demo-checkout?` +
      `userId=${userId}&` +
      `planId=${packId}&` +
      `sessionId=demo_pack_${Date.now()}`;

    logger.info('DEMO MODE: Credit pack checkout created', { userId, packId });
    return demoUrl;
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    logger.info('DEMO MODE: Subscription cancellation simulated');
  }

  async createPortalSession(
    _customerId: string,
    _returnUrl: string
  ): Promise<PortalSessionResult> {
    return { url: '/dashboard/account/billing?demo=true' };
  }

  async getInvoices(_customerId: string, _limit: number): Promise<Invoice[]> {
    return [
      {
        id: 'INV-001',
        date: '2025-01-27',
        description: 'Professional Plan - Monthly',
        amount: 2900,
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

  async getPaymentMethods(_customerId: string): Promise<PaymentMethod[]> {
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
}
