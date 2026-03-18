// Ensure STRIPE_SECRET_KEY is set BEFORE module-level Stripe init
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';

// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => {
  const store: any = (global as any).__billingMockPrisma || {};
  (global as any).__billingMockPrisma = store;
  return { getPrisma: jest.fn(() => store) };
});

jest.mock('stripe', () => {
  const instance = {
    paymentMethods: { list: jest.fn() },
    customers: { create: jest.fn(), retrieve: jest.fn() },
    invoices: { list: jest.fn() },
    billingPortal: { sessions: { create: jest.fn() } },
  };
  (global as any).__billingMockStripe = instance;
  return { __esModule: true, default: jest.fn(() => instance) };
});

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// ── Imports (after mocks) ────────────────────────────────────────────

import {
  getPaymentMethods,
  getBillingHistory,
  createBillingPortalSession,
} from '../billing.service';
import { logger } from '../../../utils/logger';

// ── Accessors ────────────────────────────────────────────────────────

function mp() {
  return (global as any).__billingMockPrisma as any;
}

function ms() {
  return (global as any).__billingMockStripe as any;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('BillingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Populate Prisma mock models each test
    const p = mp();
    p.user = {
      findUnique: jest.fn(),
      update: jest.fn(),
    };
    p.subscription = {
      findFirst: jest.fn().mockResolvedValue(null), // defaults to 'stripe' provider
    };
    p.creditTransaction = {
      findMany: jest.fn().mockResolvedValue([]),
    };
  });

  // ── getPaymentMethods ──────────────────────────────────────────────

  describe('getPaymentMethods', () => {
    it('returns mock data when user has no stripeCustomerId', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        polarCustomerId: null,
      });

      const result = await getPaymentMethods('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'pm_mock_1',
          type: 'card',
          isDefault: true,
          card: expect.objectContaining({ brand: 'visa', last4: '4242' }),
        })
      );
    });

    it('returns mock data when user is not found', async () => {
      mp().user.findUnique.mockResolvedValue(null);

      const result = await getPaymentMethods('user-123');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('pm_mock_1');
    });

    it('fetches real payment methods from Stripe when customer exists', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: 'pm_real_1',
            type: 'card',
            card: {
              brand: 'mastercard',
              last4: '5555',
              exp_month: 6,
              exp_year: 2027,
            },
          },
        ],
      });
      ms().customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: { default_payment_method: 'pm_real_1' },
      });

      const result = await getPaymentMethods('user-123');

      expect(ms().paymentMethods.list).toHaveBeenCalledWith({
        customer: 'cus_abc',
        type: 'card',
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'pm_real_1',
        type: 'card',
        card: {
          brand: 'mastercard',
          last4: '5555',
          expMonth: 6,
          expYear: 2027,
        },
        isDefault: true,
      });
    });

    it('marks non-default payment methods correctly', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().paymentMethods.list.mockResolvedValue({
        data: [
          {
            id: 'pm_1',
            type: 'card',
            card: {
              brand: 'visa',
              last4: '1111',
              exp_month: 1,
              exp_year: 2028,
            },
          },
        ],
      });
      ms().customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: { default_payment_method: 'pm_other' },
      });

      const result = await getPaymentMethods('user-123');

      expect(result[0]!.isDefault).toBe(false);
    });

    it('handles deleted Stripe customer gracefully', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().paymentMethods.list.mockResolvedValue({ data: [] });
      ms().customers.retrieve.mockResolvedValue({ deleted: true });

      const result = await getPaymentMethods('user-123');

      expect(result).toHaveLength(0);
    });

    it('handles missing card data with defaults', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().paymentMethods.list.mockResolvedValue({
        data: [{ id: 'pm_1', type: 'card', card: null }],
      });
      ms().customers.retrieve.mockResolvedValue({
        deleted: false,
        invoice_settings: { default_payment_method: null },
      });

      const result = await getPaymentMethods('user-123');

      expect(result[0]!.card).toEqual({
        brand: 'unknown',
        last4: '0000',
        expMonth: 0,
        expYear: 0,
      });
    });

    it('throws on Prisma error', async () => {
      mp().user.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(getPaymentMethods('user-123')).rejects.toThrow(
        'Failed to fetch payment methods'
      );
      expect(logger.error).toHaveBeenCalled();
    });

    it('throws on Stripe API error', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });
      ms().paymentMethods.list.mockRejectedValue(new Error('Stripe down'));

      await expect(getPaymentMethods('user-123')).rejects.toThrow(
        'Failed to fetch payment methods'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── getBillingHistory ──────────────────────────────────────────────

  describe('getBillingHistory', () => {
    it('returns mock invoices when no stripeCustomerId', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        polarCustomerId: null,
      });

      const result = await getBillingHistory('user-123');

      // Should have 2 mock invoices (no credit purchases since mock returns [])
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'INV-001',
          type: 'subscription',
          status: 'paid',
        })
      );
    });

    it('fetches real invoices from Stripe when customer exists', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().invoices.list.mockResolvedValue({
        data: [
          {
            id: 'inv_stripe_1',
            created: Math.floor(new Date('2025-02-15').getTime() / 1000),
            lines: { data: [{ description: 'Pro Plan Monthly' }] },
            amount_paid: 2900,
            status: 'paid',
            hosted_invoice_url: 'https://stripe.com/inv/1',
            invoice_pdf: 'https://stripe.com/inv/1.pdf',
          },
        ],
      });

      const result = await getBillingHistory('user-123');

      expect(ms().invoices.list).toHaveBeenCalledWith({
        customer: 'cus_abc',
        limit: 50,
      });
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'inv_stripe_1',
            description: 'Pro Plan Monthly',
            amount: 2900,
            status: 'paid',
            type: 'subscription',
            invoiceUrl: 'https://stripe.com/inv/1',
            pdfUrl: 'https://stripe.com/inv/1.pdf',
          }),
        ])
      );
    });

    it('combines Stripe invoices with credit pack purchases sorted by date', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().invoices.list.mockResolvedValue({
        data: [
          {
            id: 'inv_1',
            created: Math.floor(new Date('2025-01-01').getTime() / 1000),
            lines: { data: [{ description: 'Plan' }] },
            amount_paid: 2900,
            status: 'paid',
            hosted_invoice_url: null,
            invoice_pdf: null,
          },
        ],
      });

      mp().creditTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          createdAt: new Date('2025-02-01'),
          description: 'Purchased Boost Pack',
          type: 'purchase',
        },
      ]);

      const result = await getBillingHistory('user-123');

      expect(result).toHaveLength(2);
      // Credit purchase (Feb) should come before invoice (Jan) since sorted desc
      expect(result[0]!.id).toBe('tx-1');
      expect(result[0]!.type).toBe('credit_pack');
      expect(result[1]!.id).toBe('inv_1');
    });

    it('maps credit pack description to amount correctly', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        polarCustomerId: null,
      });

      mp().creditTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          createdAt: new Date('2025-03-01'),
          description: 'Purchased Boost Pack',
          type: 'purchase',
        },
        {
          id: 'tx-2',
          createdAt: new Date('2025-02-01'),
          description: 'Purchased Power Pack',
          type: 'purchase',
        },
      ]);

      const result = await getBillingHistory('user-123');

      const creditItems = result.filter((r: any) => r.type === 'credit_pack');
      // Amounts derived from CREDIT_PACKS single source of truth (dollars * 100 -> cents)
      expect(creditItems.find((c: any) => c.id === 'tx-1')!.amount).toBe(1200); // Boost Pack: $12
      expect(creditItems.find((c: any) => c.id === 'tx-2')!.amount).toBe(3900); // Power Pack: $39
    });

    it('returns 0 for unknown pack descriptions', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        polarCustomerId: null,
      });

      mp().creditTransaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          createdAt: new Date('2025-03-01'),
          description: 'Purchased Unknown Pack',
          type: 'purchase',
        },
      ]);

      const result = await getBillingHistory('user-123');

      const credit = result.find((r: any) => r.type === 'credit_pack');
      expect(credit!.amount).toBe(0);
    });

    it('handles creditTransaction.findMany failure gracefully (returns [])', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: null,
        polarCustomerId: null,
      });
      mp().creditTransaction.findMany.mockRejectedValue(new Error('DB error'));

      // Should still succeed with just Stripe/mock invoices
      const result = await getBillingHistory('user-123');

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((r: any) => r.type === 'subscription')).toBe(true);
    });

    it('handles invoice with missing line items', async () => {
      mp().user.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_abc',
        polarCustomerId: null,
      });

      ms().invoices.list.mockResolvedValue({
        data: [
          {
            id: 'inv_1',
            created: Math.floor(Date.now() / 1000),
            lines: { data: [] },
            amount_paid: 0,
            status: 'draft',
            hosted_invoice_url: null,
            invoice_pdf: null,
          },
        ],
      });

      const result = await getBillingHistory('user-123');

      const inv = result.find((r: any) => r.id === 'inv_1');
      expect(inv!.description).toBe('Subscription');
      expect(inv!.status).toBe('pending');
    });

    it('throws on Prisma user lookup error', async () => {
      mp().user.findUnique.mockRejectedValue(new Error('DB error'));

      await expect(getBillingHistory('user-123')).rejects.toThrow(
        'Failed to fetch billing history'
      );
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── createBillingPortalSession ─────────────────────────────────────

  describe('createBillingPortalSession', () => {
    describe('demo mode (no Stripe)', () => {
      it('returns demo URL when Stripe is not configured', async () => {
        const savedKey = process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_SECRET_KEY;

        // With no STRIPE_SECRET_KEY, getBillingProviderByName('stripe') falls back to demo
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: null,
          polarCustomerId: null,
          email: 'test@test.com',
        });
        mp().user.update.mockResolvedValue({});

        const result = await createBillingPortalSession(
          'user-123',
          'https://app.test/billing'
        );

        process.env.STRIPE_SECRET_KEY = savedKey;

        expect(result).toEqual({
          url: '/dashboard/account/billing?demo=true',
        });
      });
    });

    describe('with Stripe configured', () => {
      it('throws when user is not found', async () => {
        mp().user.findUnique.mockResolvedValue(null);

        await expect(
          createBillingPortalSession('user-123', 'https://app.test/billing')
        ).rejects.toThrow('Failed to create billing portal session');
      });

      it('creates Stripe customer if user has no stripeCustomerId', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: null,
          polarCustomerId: null,
          email: 'test@test.com',
        });
        ms().customers.create.mockResolvedValue({ id: 'cus_new' });
        mp().user.update.mockResolvedValue({});
        ms().billingPortal.sessions.create.mockResolvedValue({
          url: 'https://billing.stripe.com/session',
        });

        await createBillingPortalSession(
          'user-123',
          'https://app.test/billing'
        );

        expect(ms().customers.create).toHaveBeenCalledWith({
          email: 'test@test.com',
          metadata: { userId: 'user-123' },
        });
        expect(mp().user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { stripeCustomerId: 'cus_new' },
        });
      });

      it('uses existing stripeCustomerId without creating customer', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
          polarCustomerId: null,
          email: 'test@test.com',
        });
        ms().billingPortal.sessions.create.mockResolvedValue({
          url: 'https://billing.stripe.com/session',
        });

        await createBillingPortalSession(
          'user-123',
          'https://app.test/billing'
        );

        expect(ms().customers.create).not.toHaveBeenCalled();
      });

      it('creates billing portal session with correct params', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
          polarCustomerId: null,
          email: 'test@test.com',
        });
        ms().billingPortal.sessions.create.mockResolvedValue({
          url: 'https://billing.stripe.com/session',
        });

        await createBillingPortalSession(
          'user-123',
          'https://app.test/billing'
        );

        expect(ms().billingPortal.sessions.create).toHaveBeenCalledWith({
          customer: 'cus_existing',
          return_url: 'https://app.test/billing',
        });
      });

      it('returns session URL', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
          polarCustomerId: null,
          email: 'test@test.com',
        });
        ms().billingPortal.sessions.create.mockResolvedValue({
          url: 'https://billing.stripe.com/session',
        });

        const result = await createBillingPortalSession(
          'user-123',
          'https://app.test/billing'
        );

        expect(result).toEqual({ url: 'https://billing.stripe.com/session' });
      });

      it('throws on Stripe error', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
          polarCustomerId: null,
          email: 'test@test.com',
        });
        ms().billingPortal.sessions.create.mockRejectedValue(
          new Error('Stripe down')
        );

        await expect(
          createBillingPortalSession('user-123', 'https://app.test/billing')
        ).rejects.toThrow('Failed to create billing portal session');
        expect(logger.error).toHaveBeenCalled();
      });
    });
  });
});
