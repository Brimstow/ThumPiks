// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../../../services/email.service', () => ({
  EmailService: {
    getInstance: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-1' }),
    })),
  },
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────

import { DigestService } from '../digest.service';

// ── Mock Prisma ──────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    feedback: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ticket: {
      count: jest.fn().mockResolvedValue(0),
    },
    notificationConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('DigestService', () => {
  let service: DigestService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ADMIN_EMAIL: 'admin@test.com' };
    mockPrisma = createMockPrisma();
    service = new DigestService(mockPrisma as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('gatherStats', () => {
    it('returns empty stats when no feedback exists', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      const stats = await service.gatherStats('daily');

      expect(stats.period).toBe('daily');
      expect(stats.feedback.total).toBe(0);
      expect(stats.feedback.byType).toEqual({});
      expect(stats.feedback.byPriority).toEqual({});
      expect(stats.tickets.opened).toBe(0);
      expect(stats.highlights.criticalItems).toEqual([]);
      expect(stats.highlights.avgSentimentScore).toBeNull();
    });

    it('aggregates feedback by type and priority', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        { id: '1', type: 'BUG', priority: 'HIGH', sentiment: 'NEGATIVE', sentimentScore: 0.2, category: 'ui', subject: 'Bug 1' },
        { id: '2', type: 'BUG', priority: 'CRITICAL', sentiment: 'NEGATIVE', sentimentScore: 0.1, category: 'ui', subject: 'Bug 2' },
        { id: '3', type: 'FEATURE_REQUEST', priority: 'MEDIUM', sentiment: 'POSITIVE', sentimentScore: 0.8, category: 'feature', subject: 'Feature' },
      ]);

      const stats = await service.gatherStats('weekly');

      expect(stats.feedback.total).toBe(3);
      expect(stats.feedback.byType).toEqual({ BUG: 2, FEATURE_REQUEST: 1 });
      expect(stats.feedback.byPriority).toEqual({ HIGH: 1, CRITICAL: 1, MEDIUM: 1 });
      expect(stats.feedback.bySentiment).toEqual({ NEGATIVE: 2, POSITIVE: 1 });
    });

    it('identifies critical and high priority items', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        { id: '1', type: 'BUG', priority: 'CRITICAL', sentiment: null, sentimentScore: null, category: null, subject: 'Critical bug' },
        { id: '2', type: 'BUG', priority: 'HIGH', sentiment: null, sentimentScore: null, category: null, subject: 'High bug' },
        { id: '3', type: 'GENERAL', priority: 'LOW', sentiment: null, sentimentScore: null, category: null, subject: 'Low item' },
      ]);

      const stats = await service.gatherStats('daily');

      expect(stats.highlights.criticalItems).toHaveLength(2);
      expect(stats.highlights.criticalItems[0].subject).toBe('Critical bug');
      expect(stats.highlights.criticalItems[1].subject).toBe('High bug');
    });

    it('calculates average sentiment score', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        { id: '1', type: 'BUG', priority: 'MEDIUM', sentiment: 'NEUTRAL', sentimentScore: 0.4, category: null, subject: 'A' },
        { id: '2', type: 'BUG', priority: 'MEDIUM', sentiment: 'POSITIVE', sentimentScore: 0.8, category: null, subject: 'B' },
      ]);

      const stats = await service.gatherStats('daily');

      expect(stats.highlights.avgSentimentScore).toBeCloseTo(0.6);
    });

    it('returns top 5 categories sorted by count', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([
        { id: '1', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'ui', subject: '' },
        { id: '2', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'ui', subject: '' },
        { id: '3', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'billing', subject: '' },
        { id: '4', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'performance', subject: '' },
        { id: '5', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'docs', subject: '' },
        { id: '6', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'onboarding', subject: '' },
        { id: '7', type: 'BUG', priority: 'LOW', sentiment: null, sentimentScore: null, category: 'other', subject: '' },
      ]);

      const stats = await service.gatherStats('daily');

      expect(stats.feedback.topCategories.length).toBeLessThanOrEqual(5);
      expect(stats.feedback.topCategories[0].category).toBe('ui');
      expect(stats.feedback.topCategories[0].count).toBe(2);
    });

    it('uses correct date range for daily digest', async () => {
      const stats = await service.gatherStats('daily');

      const diff = stats.endDate.getTime() - stats.startDate.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      expect(diff).toBe(oneDayMs);
    });

    it('uses correct date range for weekly digest', async () => {
      const stats = await service.gatherStats('weekly');

      const diff = stats.endDate.getTime() - stats.startDate.getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(diff).toBe(sevenDaysMs);
    });
  });

  describe('sendDigest', () => {
    it('returns false when no recipients configured and no env fallback', async () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.EMAIL_FROM;
      mockPrisma.notificationConfig.findUnique.mockResolvedValue(null);

      const result = await service.sendDigest('daily');

      expect(result).toBe(false);
    });

    it('uses ADMIN_EMAIL env as fallback recipient', async () => {
      mockPrisma.notificationConfig.findUnique.mockResolvedValue(null);

      const result = await service.sendDigest('daily');

      // Should attempt to send (EmailService mock returns success)
      expect(result).toBe(true);
    });

    it('uses recipients from NotificationConfig when available', async () => {
      mockPrisma.notificationConfig.findUnique.mockResolvedValue({
        key: 'digest.daily',
        enabled: true,
        emails: ['admin1@test.com', 'admin2@test.com'],
      });

      const result = await service.sendDigest('daily');

      expect(result).toBe(true);
    });

    it('returns false when config exists but is disabled', async () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.EMAIL_FROM;
      mockPrisma.notificationConfig.findUnique.mockResolvedValue({
        key: 'digest.daily',
        enabled: false,
        emails: ['admin@test.com'],
      });

      const result = await service.sendDigest('daily');

      // Config disabled = no recipients returned = false
      expect(result).toBe(false);
    });
  });
});
