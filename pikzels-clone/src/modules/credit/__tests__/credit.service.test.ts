// Ensure STRIPE_SECRET_KEY is set BEFORE module-level Stripe init
process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';

// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => {
  // Reuse existing store so jest.resetModules / isolateModules
  // doesn't break the reference held by the original import
  const store: any = (global as any).__creditMockPrisma || {};
  (global as any).__creditMockPrisma = store;
  return { getPrisma: jest.fn(() => store) };
});

jest.mock('stripe', () => {
  const instance = {
    customers: { create: jest.fn() },
    checkout: { sessions: { create: jest.fn() } },
  };
  (global as any).__creditMockStripe = instance;
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
  getTransactions,
  getBalance,
  createCreditPackCheckout,
  addPurchasedCredits,
  deductCredits,
  refundCredits,
} from '../credit.service';
import { logger } from '../../../utils/logger';

// ── Accessors ────────────────────────────────────────────────────────

function mp() {
  return (global as any).__creditMockPrisma as any;
}

function ms() {
  return (global as any).__creditMockStripe as any;
}

// ── Test Fixtures ────────────────────────────────────────────────────

const mockSubscription = {
  id: 'sub-1',
  userId: 'user-123',
  creditsBalance: 100,
  creditsUsed: 50,
  createdAt: new Date(),
};

const mockTransactions = [
  {
    id: 'tx-1',
    userId: 'user-123',
    type: 'usage',
    amount: -5,
    createdAt: new Date(),
  },
  {
    id: 'tx-2',
    userId: 'user-123',
    type: 'purchase',
    amount: 50,
    createdAt: new Date(),
  },
];

// ── Tests ────────────────────────────────────────────────────────────

describe('CreditService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Populate Prisma mock models each test
    const p = mp();
    p.creditTransaction = {
      findMany: jest.fn(),
      create: jest.fn(),
    };
    p.subscription = {
      findFirst: jest.fn(),
      update: jest.fn(),
    };
    p.user = {
      findUnique: jest.fn(),
      update: jest.fn(),
    };
  });

  // ── getTransactions ──────────────────────────────────────────────

  describe('getTransactions', () => {
    it('returns transactions ordered by createdAt desc', async () => {
      mp().creditTransaction.findMany.mockResolvedValue(mockTransactions);

      const result = await getTransactions('user-123');

      expect(mp().creditTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      expect(result).toEqual(mockTransactions);
    });

    it('throws on Prisma error', async () => {
      mp().creditTransaction.findMany.mockRejectedValue(new Error('DB error'));

      await expect(getTransactions('user-123')).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── getBalance ───────────────────────────────────────────────────

  describe('getBalance', () => {
    it('returns creditsBalance from latest subscription', async () => {
      mp().subscription.findFirst.mockResolvedValue({ creditsBalance: 150 });

      const result = await getBalance('user-123');

      expect(mp().subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
        select: { creditsBalance: true },
      });
      expect(result).toBe(150);
    });

    it('returns 0 when no subscription exists', async () => {
      mp().subscription.findFirst.mockResolvedValue(null);

      const result = await getBalance('user-123');
      expect(result).toBe(0);
    });

    it('throws on Prisma error', async () => {
      mp().subscription.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(getBalance('user-123')).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── createCreditPackCheckout (Stripe mode) ───────────────────────

  describe('createCreditPackCheckout', () => {
    describe('with Stripe configured', () => {
      it('throws for invalid pack ID', async () => {
        await expect(
          createCreditPackCheckout('user-123', 'test@test.com', 'pack_invalid')
        ).rejects.toThrow('Invalid credit pack ID');
      });

      it('creates Stripe customer if user has no stripeCustomerId', async () => {
        mp().user.findUnique.mockResolvedValue({ stripeCustomerId: null });
        ms().customers.create.mockResolvedValue({ id: 'cus_new' });
        mp().user.update.mockResolvedValue({});
        ms().checkout.sessions.create.mockResolvedValue({
          id: 'sess_1',
          url: 'https://checkout.stripe.com/sess_1',
        });

        await createCreditPackCheckout('user-123', 'test@test.com', 'pack_50');

        expect(ms().customers.create).toHaveBeenCalledWith({
          email: 'test@test.com',
          metadata: { userId: 'user-123' },
        });
        expect(mp().user.update).toHaveBeenCalledWith({
          where: { id: 'user-123' },
          data: { stripeCustomerId: 'cus_new' },
        });
      });

      it('uses existing stripeCustomerId without creating a new customer', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
        });
        ms().checkout.sessions.create.mockResolvedValue({
          id: 'sess_1',
          url: 'https://checkout.stripe.com/sess_1',
        });

        await createCreditPackCheckout('user-123', 'test@test.com', 'pack_50');

        expect(ms().customers.create).not.toHaveBeenCalled();
      });

      it('creates checkout session with correct line_items in cents', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
        });
        ms().checkout.sessions.create.mockResolvedValue({
          id: 'sess_1',
          url: 'https://checkout.stripe.com/sess_1',
        });

        // pack_250 = Pro Pack, 250 credits, $35
        await createCreditPackCheckout('user-123', 'test@test.com', 'pack_250');

        expect(ms().checkout.sessions.create).toHaveBeenCalledWith(
          expect.objectContaining({
            customer: 'cus_existing',
            mode: 'payment',
            line_items: [
              expect.objectContaining({
                price_data: expect.objectContaining({
                  currency: 'usd',
                  unit_amount: 3500, // $35 * 100
                  product_data: expect.objectContaining({
                    name: 'Pro Pack',
                  }),
                }),
                quantity: 1,
              }),
            ],
            metadata: expect.objectContaining({
              userId: 'user-123',
              packId: 'pack_250',
              credits: '250',
              type: 'credit_pack_purchase',
            }),
          })
        );
      });

      it('returns session URL', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
        });
        ms().checkout.sessions.create.mockResolvedValue({
          id: 'sess_1',
          url: 'https://checkout.stripe.com/sess_1',
        });

        const result = await createCreditPackCheckout(
          'user-123',
          'test@test.com',
          'pack_50'
        );
        expect(result).toBe('https://checkout.stripe.com/sess_1');
      });

      it('returns empty string when session.url is null', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
        });
        ms().checkout.sessions.create.mockResolvedValue({
          id: 'sess_1',
          url: null,
        });

        const result = await createCreditPackCheckout(
          'user-123',
          'test@test.com',
          'pack_50'
        );
        expect(result).toBe('');
      });

      it('throws on Stripe error', async () => {
        mp().user.findUnique.mockResolvedValue({
          stripeCustomerId: 'cus_existing',
        });
        ms().checkout.sessions.create.mockRejectedValue(
          new Error('Stripe down')
        );

        await expect(
          createCreditPackCheckout('user-123', 'test@test.com', 'pack_50')
        ).rejects.toThrow('Stripe down');
        expect(logger.error).toHaveBeenCalled();
      });
    });

    describe('demo mode (no Stripe)', () => {
      it('returns demo URL when Stripe is not configured', async () => {
        const savedKey = process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_SECRET_KEY;

        let demoModule: any;
        jest.isolateModules(() => {
          demoModule = require('../credit.service');
        });

        const result = await demoModule.createCreditPackCheckout(
          'user-123',
          'test@test.com',
          'pack_50'
        );

        // Restore env so subsequent tests are unaffected
        process.env.STRIPE_SECRET_KEY = savedKey;

        expect(result).toContain('demo-checkout');
        expect(result).toContain('userId=user-123');
        expect(result).toContain('planId=pack_50');
      });
    });
  });

  // ── addPurchasedCredits ──────────────────────────────────────────

  describe('addPurchasedCredits', () => {
    it('throws for invalid pack ID', async () => {
      await expect(
        addPurchasedCredits('user-123', 'pack_invalid', 'sess_1')
      ).rejects.toThrow('Invalid credit pack ID');
    });

    it('throws when no subscription found', async () => {
      mp().subscription.findFirst.mockResolvedValue(null);

      await expect(
        addPurchasedCredits('user-123', 'pack_50', 'sess_1')
      ).rejects.toThrow('No subscription found');
    });

    it('increments creditsBalance and creates purchase transaction', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await addPurchasedCredits('user-123', 'pack_50', 'sess_1');

      // pack_50 = Starter Pack, 50 credits
      expect(mp().subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { creditsBalance: { increment: 50 } },
      });

      expect(mp().creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'purchase',
          amount: 50,
          description: 'Purchased Starter Pack',
          stripePaymentId: 'sess_1',
        },
      });
    });

    it('throws on Prisma error', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockRejectedValue(new Error('DB error'));

      await expect(
        addPurchasedCredits('user-123', 'pack_50', 'sess_1')
      ).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── deductCredits ────────────────────────────────────────────────

  describe('deductCredits', () => {
    it('returns false when insufficient credits', async () => {
      mp().subscription.findFirst.mockResolvedValue({
        ...mockSubscription,
        creditsBalance: 5,
      });

      const result = await deductCredits('user-123', 10, 'AI generation');

      expect(result).toBe(false);
      expect(mp().subscription.update).not.toHaveBeenCalled();
      expect(mp().creditTransaction.create).not.toHaveBeenCalled();
    });

    it('returns true and decrements balance on success', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      const result = await deductCredits('user-123', 10, 'AI generation');

      expect(result).toBe(true);
      expect(mp().subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          creditsBalance: { decrement: 10 },
          creditsUsed: { increment: 10 },
        },
      });
    });

    it('creates negative transaction record', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await deductCredits('user-123', 10, 'AI generation');

      expect(mp().creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'usage',
          amount: -10,
          description: 'AI generation',
        },
      });
    });

    it('throws when no subscription found', async () => {
      mp().subscription.findFirst.mockResolvedValue(null);

      await expect(
        deductCredits('user-123', 10, 'AI generation')
      ).rejects.toThrow('No subscription found');
    });

    it('throws on Prisma error', async () => {
      mp().subscription.findFirst.mockRejectedValue(new Error('DB error'));

      await expect(
        deductCredits('user-123', 10, 'AI generation')
      ).rejects.toThrow('DB error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  // ── refundCredits ────────────────────────────────────────────────

  describe('refundCredits', () => {
    it('returns false when no subscription found (does not throw)', async () => {
      mp().subscription.findFirst.mockResolvedValue(null);

      const result = await refundCredits('user-123', 10, 'AI failed');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Refund failed: no subscription found',
        expect.any(Error),
        expect.objectContaining({ userId: 'user-123', amount: 10 })
      );
    });

    it('increments balance back and decrements creditsUsed', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      const result = await refundCredits('user-123', 10, 'AI failed');

      expect(result).toBe(true);
      expect(mp().subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          creditsBalance: { increment: 10 },
          creditsUsed: { decrement: 10 },
        },
      });
    });

    it('creates refund transaction with positive amount and Refund: prefix', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await refundCredits('user-123', 10, 'AI failed');

      expect(mp().creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'refund',
          amount: 10,
          description: 'Refund: AI failed',
        },
      });
    });

    it('returns false on database error (catches, does not throw)', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockRejectedValue(new Error('DB error'));

      const result = await refundCredits('user-123', 10, 'AI failed');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refund credits',
        expect.any(Error),
        expect.objectContaining({ userId: 'user-123', amount: 10 })
      );
    });

    it('logs info on successful refund', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await refundCredits('user-123', 10, 'AI failed');

      expect(logger.info).toHaveBeenCalledWith(
        'Credits refunded',
        expect.objectContaining({
          userId: 'user-123',
          amount: 10,
          reason: 'AI failed',
        })
      );
    });
  });
});
