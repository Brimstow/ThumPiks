/**
 * GlobalChatService Tests
 *
 * Tests session management, escalation logic, and message persistence.
 * Streaming is tested at the integration/SSE level, not here (requires fetch mock).
 */

// ── Hoisted mocks ──

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──

import { GlobalChatService } from '../global-chat.service';

// ── Mock Factory ──

function createMockPrisma() {
  return {
    chatSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
    },
    feedback: {
      create: jest.fn(),
    },
    ticket: {
      create: jest.fn(),
    },
  };
}

// ── Helpers ──

const NOW = new Date('2025-06-15T12:00:00Z');

function mockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: 'user-1',
    scope: 'product',
    status: 'active',
    title: 'Test session',
    messageCount: 0,
    lastMessageAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    escalatedToTicketId: null,
    metadata: null,
    ...overrides,
  };
}

function mockMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-1',
    sessionId: 'session-1',
    role: 'user',
    content: 'Hello',
    imageUrl: null,
    metadata: null,
    createdAt: NOW,
    ...overrides,
  };
}

// ── Test Suite ──

describe('GlobalChatService', () => {
  let service: GlobalChatService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new GlobalChatService(mockPrisma as any);
  });

  // ────────────────────────────────────────────────────────
  describe('createSession', () => {
    it('creates a session with the given scope', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(mockSession());

      const result = await service.createSession('user-1', 'product');

      expect(result.id).toBe('session-1');
      expect(result.scope).toBe('product');
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', scope: 'product' },
      });
    });

    it('defaults to general scope when none provided', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(
        mockSession({ scope: 'general' })
      );

      const result = await service.createSession('user-1');

      expect(result.scope).toBe('general');
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', scope: 'general' },
      });
    });

    it('returns formatted response with ISO date strings', async () => {
      mockPrisma.chatSession.create.mockResolvedValue(mockSession());

      const result = await service.createSession('user-1', 'billing');

      expect(result.createdAt).toBe(NOW.toISOString());
      expect(result.lastMessageAt).toBe(NOW.toISOString());
    });
  });

  // ────────────────────────────────────────────────────────
  describe('getSession', () => {
    it('returns null when session not found', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      const result = await service.getSession('no-exist', 'user-1');

      expect(result).toBeNull();
    });

    it('returns session with messages when found', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue({
        ...mockSession(),
        messages: [
          mockMessage({ id: 'msg-1', role: 'user', content: 'Hello' }),
          mockMessage({ id: 'msg-2', role: 'assistant', content: 'Hi!' }),
        ],
      });

      const result = await service.getSession('session-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.messages).toHaveLength(2);
      expect(result!.messages[0]!.role).toBe('user');
      expect(result!.messages[1]!.role).toBe('assistant');
    });

    it('verifies session belongs to the user (scoped query)', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      await service.getSession('session-1', 'user-1');

      expect(mockPrisma.chatSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', userId: 'user-1' },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('listSessions', () => {
    it('returns empty list when user has no sessions', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);
      mockPrisma.chatSession.count.mockResolvedValue(0);

      const result = await service.listSessions('user-1');

      expect(result.sessions).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns paginated sessions with correct total', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([
        mockSession({ id: 'sess-1' }),
        mockSession({ id: 'sess-2' }),
      ]);
      mockPrisma.chatSession.count.mockResolvedValue(5);

      const result = await service.listSessions('user-1', 2, 0);

      expect(result.sessions).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('caps limit at 50', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);
      mockPrisma.chatSession.count.mockResolvedValue(0);

      await service.listSessions('user-1', 100, 0);

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 })
      );
    });

    it('scopes to the user', async () => {
      mockPrisma.chatSession.findMany.mockResolvedValue([]);
      mockPrisma.chatSession.count.mockResolvedValue(0);

      await service.listSessions('user-99');

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-99' },
        })
      );
      expect(mockPrisma.chatSession.count).toHaveBeenCalledWith({
        where: { userId: 'user-99' },
      });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('archiveSession', () => {
    it('returns false when session not found', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      const result = await service.archiveSession('no-exist', 'user-1');

      expect(result).toBe(false);
      expect(mockPrisma.chatSession.update).not.toHaveBeenCalled();
    });

    it('sets status to archived', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(mockSession());
      mockPrisma.chatSession.update.mockResolvedValue(
        mockSession({ status: 'archived' })
      );

      const result = await service.archiveSession('session-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { status: 'archived' },
      });
    });

    it('verifies session belongs to user before archiving', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      await service.archiveSession('session-1', 'other-user');

      expect(mockPrisma.chatSession.findFirst).toHaveBeenCalledWith({
        where: { id: 'session-1', userId: 'other-user' },
      });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('escalateToTicket', () => {
    it('returns null when session not found', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      const result = await service.escalateToTicket('no-exist', 'user-1');

      expect(result).toBeNull();
    });

    it('returns null when session already escalated', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue({
        ...mockSession({ status: 'escalated' }),
        messages: [],
      });

      const result = await service.escalateToTicket('session-1', 'user-1');

      expect(result).toBeNull();
      expect(mockPrisma.feedback.create).not.toHaveBeenCalled();
    });

    it('creates feedback + ticket and updates session status', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue({
        ...mockSession({ title: 'Help with editor' }),
        messages: [
          mockMessage({ role: 'user', content: 'I need help' }),
          mockMessage({ role: 'assistant', content: 'How can I help?' }),
        ],
      });
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-1' });
      mockPrisma.ticket.create.mockResolvedValue({ id: 'tkt-1' });
      mockPrisma.chatSession.update.mockResolvedValue({});

      const result = await service.escalateToTicket('session-1', 'user-1');

      expect(result).toEqual({ ticketId: 'tkt-1', feedbackId: 'fb-1' });

      // Feedback record created
      expect(mockPrisma.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          subject: '[Chat Escalation] Help with editor',
          type: 'GENERAL',
          category: 'chat_escalation',
          tags: ['product'],
          priority: 'MEDIUM',
        }),
      });

      // Ticket linked to feedback
      expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          feedbackId: 'fb-1',
          status: 'OPEN',
        }),
      });

      // Session marked as escalated
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'escalated',
          escalatedToTicketId: 'tkt-1',
        },
      });
    });

    it('builds transcript from messages', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue({
        ...mockSession(),
        messages: [
          mockMessage({ role: 'user', content: 'Bug report' }),
          mockMessage({ role: 'assistant', content: 'Thanks for reporting' }),
        ],
      });
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-1' });
      mockPrisma.ticket.create.mockResolvedValue({ id: 'tkt-1' });
      mockPrisma.chatSession.update.mockResolvedValue({});

      await service.escalateToTicket('session-1', 'user-1');

      const feedbackCall = mockPrisma.feedback.create.mock.calls[0]![0];
      expect(feedbackCall.data.message).toContain('**User**: Bug report');
      expect(feedbackCall.data.message).toContain('**Pik**: Thanks for reporting');
    });

    it('uses first user message as subject when no title', async () => {
      mockPrisma.chatSession.findFirst.mockResolvedValue({
        ...mockSession({ title: null }),
        messages: [
          mockMessage({ role: 'user', content: 'The export button is broken' }),
        ],
      });
      mockPrisma.feedback.create.mockResolvedValue({ id: 'fb-1' });
      mockPrisma.ticket.create.mockResolvedValue({ id: 'tkt-1' });
      mockPrisma.chatSession.update.mockResolvedValue({});

      await service.escalateToTicket('session-1', 'user-1');

      const feedbackCall = mockPrisma.feedback.create.mock.calls[0]![0];
      expect(feedbackCall.data.subject).toBe(
        '[Chat Escalation] The export button is broken'
      );
    });
  });

  // ────────────────────────────────────────────────────────
  describe('streamChat', () => {
    it('sends error when API key is not configured', async () => {
      // Service created without OPENROUTER_API_KEY
      const sendFn = jest.fn();
      const isAborted = () => false;

      await service.streamChat(
        'session-1',
        'user-1',
        [{ role: 'user', content: 'Hello' }],
        'general',
        undefined,
        sendFn,
        isAborted
      );

      expect(sendFn).toHaveBeenCalledWith('error', {
        message: 'AI service not configured',
      });
    });

    it('sends error when session not found', async () => {
      // Set API key so it doesn't fail at the key check
      process.env.OPENROUTER_API_KEY = 'test-key';
      service = new GlobalChatService(mockPrisma as any);
      mockPrisma.chatSession.findFirst.mockResolvedValue(null);

      const sendFn = jest.fn();
      const isAborted = () => false;

      await service.streamChat(
        'no-session',
        'user-1',
        [{ role: 'user', content: 'Hello' }],
        'general',
        undefined,
        sendFn,
        isAborted
      );

      expect(sendFn).toHaveBeenCalledWith('error', {
        message: 'Session not found',
      });
      delete process.env.OPENROUTER_API_KEY;
    });

    it('sends error when session is already escalated', async () => {
      process.env.OPENROUTER_API_KEY = 'test-key';
      service = new GlobalChatService(mockPrisma as any);
      mockPrisma.chatSession.findFirst.mockResolvedValue(
        mockSession({ status: 'escalated' })
      );

      const sendFn = jest.fn();
      const isAborted = () => false;

      await service.streamChat(
        'session-1',
        'user-1',
        [{ role: 'user', content: 'Hello' }],
        'general',
        undefined,
        sendFn,
        isAborted
      );

      expect(sendFn).toHaveBeenCalledWith('error', {
        message: 'This session has been escalated to a support ticket',
      });
      delete process.env.OPENROUTER_API_KEY;
    });
  });
});
