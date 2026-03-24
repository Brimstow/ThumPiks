// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

jest.mock('../feedback.ai', () => ({
  analyzeFeedback: jest.fn().mockResolvedValue({
    sentiment: 'NEUTRAL', sentimentScore: 0.5, category: 'other',
    tags: [], summary: '', priority: 'MEDIUM',
  }),
}));

jest.mock('../../../services/notification-router.service', () => ({
  NotificationRouter: {
    getInstance: jest.fn(() => ({ route: jest.fn().mockResolvedValue(undefined) })),
  },
}));

jest.mock('../../../services/email-templates', () => ({
  feedbackSubmittedEmail: jest.fn(() => '<html>mock</html>'),
  ticketStatusEmail: jest.fn(() => '<html>status</html>'),
}));

// ── Imports ──────────────────────────────────────────────────────────

import {
  submitFeedback,
  listFeedback,
  getFeedback,
  deleteFeedback,
  initializeServices,
} from '../feedback.controller';

// ── Helpers ──────────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    feedback: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    ticket: { create: jest.fn() },
    user: { findUnique: jest.fn() },
  };
}

function mockReq(overrides: Record<string, any> = {}) {
  return {
    user: { id: 'user-1', email: 'test@test.com', name: 'Tester' },
    body: {},
    params: {},
    query: {},
    ...overrides,
  } as any;
}

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Feedback Controller', () => {
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma = createMockPrisma();
    initializeServices(prisma as any);
  });

  describe('submitFeedback', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = mockReq({ user: undefined });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 400 when required fields are missing', async () => {
      const req = mockReq({ body: { type: 'BUG' } });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('required') })
      );
    });

    it('returns 400 for invalid feedback type', async () => {
      const req = mockReq({
        body: { type: 'INVALID', subject: 'test', message: 'test' },
      });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.stringContaining('type must be') })
      );
    });

    it('returns 400 when subject exceeds 200 characters', async () => {
      const req = mockReq({
        body: { type: 'BUG', subject: 'x'.repeat(201), message: 'test' },
      });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when message exceeds 5000 characters', async () => {
      const req = mockReq({
        body: { type: 'BUG', subject: 'test', message: 'x'.repeat(5001) },
      });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 201 with feedback on success', async () => {
      const mockFeedback = { id: 'fb-1', type: 'BUG', subject: 'test' };
      prisma.feedback.create.mockResolvedValue(mockFeedback);

      const req = mockReq({
        body: { type: 'BUG', subject: 'Test bug', message: 'It is broken' },
      });
      const res = mockRes();

      await submitFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockFeedback);
    });

    it('accepts all three valid feedback types', async () => {
      prisma.feedback.create.mockResolvedValue({ id: 'fb-1' });

      for (const type of ['BUG', 'FEATURE_REQUEST', 'GENERAL']) {
        const req = mockReq({
          body: { type, subject: 'Test', message: 'Content' },
        });
        const res = mockRes();

        await submitFeedback(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
      }
    });
  });

  describe('listFeedback', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = mockReq({ user: undefined });
      const res = mockRes();

      await listFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns paginated results', async () => {
      prisma.feedback.findMany.mockResolvedValue([]);
      prisma.feedback.count.mockResolvedValue(0);

      const req = mockReq({ query: { page: '1', pageSize: '10' } });
      const res = mockRes();

      await listFeedback(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ data: [], total: 0 })
      );
    });
  });

  describe('getFeedback', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = mockReq({ user: undefined, params: { id: 'fb-1' } });
      const res = mockRes();

      await getFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 when feedback not found', async () => {
      prisma.feedback.findFirst.mockResolvedValue(null);

      const req = mockReq({ params: { id: 'nonexistent' } });
      const res = mockRes();

      await getFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns feedback when found', async () => {
      const mockFb = { id: 'fb-1', tags: [] };
      prisma.feedback.findFirst.mockResolvedValue(mockFb);

      const req = mockReq({ params: { id: 'fb-1' } });
      const res = mockRes();

      await getFeedback(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'fb-1' }));
    });
  });

  describe('deleteFeedback', () => {
    it('returns 401 when user is not authenticated', async () => {
      const req = mockReq({ user: undefined, params: { id: 'fb-1' } });
      const res = mockRes();

      await deleteFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 when feedback not found', async () => {
      prisma.feedback.deleteMany.mockResolvedValue({ count: 0 });

      const req = mockReq({ params: { id: 'fb-1' } });
      const res = mockRes();

      await deleteFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 204 on successful delete', async () => {
      prisma.feedback.deleteMany.mockResolvedValue({ count: 1 });

      const req = mockReq({ params: { id: 'fb-1' } });
      const res = mockRes();

      await deleteFeedback(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });
  });
});
