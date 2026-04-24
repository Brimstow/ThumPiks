// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => {
  const store: any = (global as any).__creditMockPrisma || {};
  (global as any).__creditMockPrisma = store;
  return { getPrisma: jest.fn(() => store) };
});

jest.mock('../../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock the billing provider
const mockBillingProvider = {
  providerName: 'demo',
  createCreditPackCheckout: jest.fn(),
};
jest.mock('../../billing', () => ({
  getBillingProvider: jest.fn(() => mockBillingProvider),
}));

// Mock the service factory (used for notifications)
jest.mock('../../../utils/service-factory', () => ({
  getService: jest.fn(() => ({
    routeToUser: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Mock user-notification service (used in deductCredits low-credits check)
jest.mock('../../user-notification/user-notification.service', () => ({
  getUserNotificationService: jest.fn(() => ({
    hasDuplicate: jest.fn().mockResolvedValue(true),
  })),
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
import { getBillingProvider } from '../../billing';

// ── Accessors ────────────────────────────────────────────────────────

function mp() {
  return (global as any).__creditMockPrisma as any;
}

function mbp() {
  return mockBillingProvider;
}

// ── Test Fixtures ────────────────────────────────────────────────────

const mockSubscription = {
  id: 'sub-1',
  userId: 'user-123',
  creditsBalance: 100,
  addonCreditsBalance: 0,
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
    // Support interactive transactions: callback receives the same mock as `tx`
    p.$transaction = jest.fn(async (fn: (tx: any) => Promise<any>) => fn(p));
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

  // ── createCreditPackCheckout ────────────────────────────────────

  describe('createCreditPackCheckout', () => {
    it('throws for invalid pack ID', async () => {
      await expect(
        createCreditPackCheckout('user-123', 'test@test.com', 'pack_invalid')
      ).rejects.toThrow('Invalid credit pack ID');
    });

    it('calls billing provider with correct pack data', async () => {
      mbp().createCreditPackCheckout.mockResolvedValue(
        'https://checkout.example.com/sess_1'
      );

      // starter_pack: 50 credits, $9
      await createCreditPackCheckout('user-123', 'test@test.com', 'starter_pack');

      expect(mbp().createCreditPackCheckout).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          email: 'test@test.com',
          packId: 'starter_pack',
          packName: 'Starter Pack',
          credits: 50,
          price: 9,
        })
      );
    });

    it('returns checkout URL from billing provider', async () => {
      mbp().createCreditPackCheckout.mockResolvedValue(
        'https://checkout.example.com/sess_1'
      );

      const result = await createCreditPackCheckout(
        'user-123',
        'test@test.com',
        'starter_pack'
      );
      expect(result).toBe('https://checkout.example.com/sess_1');
    });

    it('throws on billing provider error', async () => {
      mbp().createCreditPackCheckout.mockRejectedValue(
        new Error('Provider down')
      );

      await expect(
        createCreditPackCheckout('user-123', 'test@test.com', 'starter_pack')
      ).rejects.toThrow('Provider down');
      expect(logger.error).toHaveBeenCalled();
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
        addPurchasedCredits('user-123', 'starter_pack', 'sess_1')
      ).rejects.toThrow('No subscription found');
    });

    it('increments creditsBalance and creates purchase transaction (stripe)', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await addPurchasedCredits('user-123', 'starter_pack', 'sess_1', 'stripe');

      // starter_pack = Starter Pack, 50 credits
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

    it('uses polarOrderId for polar provider', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({});
      mp().creditTransaction.create.mockResolvedValue({});

      await addPurchasedCredits('user-123', 'starter_pack', 'order_polar_1', 'polar');

      expect(mp().creditTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          polarOrderId: 'order_polar_1',
        }),
      });
    });

    it('throws on Prisma error', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockRejectedValue(new Error('DB error'));

      await expect(
        addPurchasedCredits('user-123', 'starter_pack', 'sess_1')
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
      mp().subscription.update.mockResolvedValue({ creditsBalance: 90 });
      mp().creditTransaction.create.mockResolvedValue({});

      const result = await deductCredits('user-123', 10, 'AI generation');

      expect(result).toBe(true);
      // mockSubscription has creditsBalance:100, addonCreditsBalance:0 (undefined→0)
      // So 10 deducted from plan, 0 from addon
      expect(mp().subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          creditsBalance: { decrement: 10 },
          creditsUsed: { increment: 10 },
          addonCreditsBalance: { decrement: 0 },
          addonCreditsUsed: { increment: 0 },
        },
      });
    });

    it('creates negative transaction record with balance tracking', async () => {
      mp().subscription.findFirst.mockResolvedValue(mockSubscription);
      mp().subscription.update.mockResolvedValue({ creditsBalance: 90 });
      mp().creditTransaction.create.mockResolvedValue({});

      await deductCredits('user-123', 10, 'AI generation');

      // creditsBalance:100 + addonCreditsBalance:0 = totalAvailable:100
      expect(mp().creditTransaction.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          type: 'usage',
          amount: -10,
          description: 'AI generation',
          balanceBefore: 100,
          balanceAfter: 90,
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
