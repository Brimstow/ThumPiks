// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../feedback.ai', () => ({
  analyzeFeedback: jest.fn(),
}));

jest.mock('../../../services/notification-router.service', () => ({
  NotificationRouter: {
    getInstance: jest.fn(() => ({
      route: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../services/email-templates', () => ({
  feedbackSubmittedEmail: jest.fn(() => '<html>mock</html>'),
}));

// ── Imports ──────────────────────────────────────────────────────────

import { FeedbackService } from '../feedback.service';
import { analyzeFeedback } from '../feedback.ai';

// ── Mock Prisma ──────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    feedback: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('FeedbackService', () => {
  let service: FeedbackService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new FeedbackService(mockPrisma as any);

    // Default AI mock
    (analyzeFeedback as jest.Mock).mockResolvedValue({
      sentiment: 'NEUTRAL',
      sentimentScore: 0.5,
      category: 'other',
      tags: [],
      summary: 'Test summary',
      priority: 'MEDIUM',
    });
  });

  describe('create', () => {
    const input = {
      type: 'BUG' as const,
      subject: 'Button broken',
      message: 'The save button does not work',
    };

    const mockFeedback = {
      id: 'fb-1',
      userId: 'user-1',
      type: 'BUG',
      subject: 'Button broken',
      message: 'The save button does not work',
      screenshotUrl: null,
      screenshotPublicId: null,
      sentiment: null,
      sentimentScore: null,
      category: null,
      tags: [],
      aiSummary: null,
      priority: 'MEDIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('creates feedback row and returns it immediately', async () => {
      mockPrisma.feedback.create.mockResolvedValue(mockFeedback);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Test', email: 'test@test.com' });

      const result = await service.create('user-1', input);

      expect(result).toEqual(mockFeedback);
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: 'BUG',
          subject: 'Button broken',
          message: 'The save button does not work',
          priority: 'MEDIUM',
        }),
      });
    });

    it('stores null for optional screenshotUrl when not provided', async () => {
      mockPrisma.feedback.create.mockResolvedValue(mockFeedback);

      await service.create('user-1', input);

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          screenshotUrl: null,
          screenshotPublicId: null,
        }),
      });
    });

    it('stores screenshotUrl when provided', async () => {
      mockPrisma.feedback.create.mockResolvedValue({ ...mockFeedback, screenshotUrl: 'https://img.test/1.png' });

      await service.create('user-1', { ...input, screenshotUrl: 'https://img.test/1.png' });

      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          screenshotUrl: 'https://img.test/1.png',
        }),
      });
    });
  });

  describe('getById', () => {
    it('returns feedback with ticket when found', async () => {
      const mockResult = {
        id: 'fb-1',
        userId: 'user-1',
        tags: ['ui', 'bug'],
        Ticket: { id: 'tk-1', status: 'OPEN' },
      };
      mockPrisma.feedback.findFirst.mockResolvedValue(mockResult);

      const result = await service.getById('fb-1', 'user-1');

      expect(result).toBeTruthy();
      expect(mockPrisma.feedback.findFirst).toHaveBeenCalledWith({
        where: { id: 'fb-1', userId: 'user-1' },
        include: { Ticket: true },
      });
    });

    it('returns null when feedback not found', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });

    it('queries without userId filter for admin access', async () => {
      mockPrisma.feedback.findFirst.mockResolvedValue(null);

      await service.getById('fb-1');

      expect(mockPrisma.feedback.findFirst).toHaveBeenCalledWith({
        where: { id: 'fb-1' },
        include: { Ticket: true },
      });
    });
  });

  describe('list', () => {
    it('returns paginated results with defaults', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);
      mockPrisma.feedback.count.mockResolvedValue(0);

      const result = await service.list({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });

    it('applies type and priority filters', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);
      mockPrisma.feedback.count.mockResolvedValue(0);

      await service.list({ type: 'BUG', priority: 'HIGH' }, 'user-1');

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1', type: 'BUG', priority: 'HIGH' },
        })
      );
    });

    it('clamps pageSize between 1 and 100', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);
      mockPrisma.feedback.count.mockResolvedValue(0);

      await service.list({ pageSize: 500 });

      expect(mockPrisma.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('calculates totalPages correctly', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([]);
      mockPrisma.feedback.count.mockResolvedValue(45);

      const result = await service.list({ pageSize: 10 });

      expect(result.totalPages).toBe(5);
    });
  });

  describe('delete', () => {
    it('returns true when feedback is deleted', async () => {
      mockPrisma.feedback.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.delete('fb-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrisma.feedback.deleteMany).toHaveBeenCalledWith({
        where: { id: 'fb-1', userId: 'user-1' },
      });
    });

    it('returns false when feedback not found for user', async () => {
      mockPrisma.feedback.deleteMany.mockResolvedValue({ count: 0 });

      const result = await service.delete('fb-1', 'wrong-user');

      expect(result).toBe(false);
    });
  });
});
