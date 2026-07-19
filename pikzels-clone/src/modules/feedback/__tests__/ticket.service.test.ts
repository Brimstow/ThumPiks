// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../../../services/notification-router.service', () => ({
  NotificationRouter: {
    getInstance: jest.fn(() => ({
      route: jest.fn().mockResolvedValue(undefined),
    })),
  },
}));

jest.mock('../../../services/email-templates', () => ({
  ticketStatusEmail: jest.fn(() => '<html>status</html>'),
}));

// ── Imports ──────────────────────────────────────────────────────────

import { TicketService } from '../ticket.service';

// ── Mock Prisma ──────────────────────────────────────────────────────

function createMockPrisma() {
  return {
    ticket: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    ticketReply: {
      create: jest.fn(),
    },
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('TicketService', () => {
  let service: TicketService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new TicketService(mockPrisma as any);
  });

  describe('getById', () => {
    it('returns ticket with replies and feedback when found', async () => {
      const mockTicket = {
        id: 'tk-1',
        feedbackId: 'fb-1',
        status: 'OPEN',
        Replies: [{ id: 'r-1', message: 'Hello' }],
        Feedback: { subject: 'Bug report' },
      };
      mockPrisma.ticket.findUnique.mockResolvedValue(mockTicket);

      const result = await service.getById('tk-1');

      expect(result).toEqual(mockTicket);
      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        include: {
          Replies: { orderBy: { createdAt: 'asc' } },
          Feedback: true,
        },
      });
    });

    it('returns null when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      const result = await service.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('returns paginated tickets with defaults', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      const result = await service.list({});

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      });
    });

    it('applies status filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.list({ status: 'OPEN' });

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'OPEN' },
        })
      );
    });

    it('applies assignee filter', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.list({ assignee: 'admin-1' });

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { assignee: 'admin-1' },
        })
      );
    });

    it('includes feedback subject in results', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.list({});

      expect(mockPrisma.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { Feedback: { select: { subject: true, type: true, priority: true } } },
        })
      );
    });
  });

  describe('update', () => {
    const baseTicket = {
      id: 'tk-1',
      feedbackId: 'fb-1',
      status: 'IN_PROGRESS',
      assignee: null,
      resolution: null,
      Feedback: { subject: 'Bug', userId: 'u-1' },
    };

    it('updates status and returns ticket', async () => {
      mockPrisma.ticket.update.mockResolvedValue(baseTicket);

      const result = await service.update('tk-1', { status: 'IN_PROGRESS' });

      expect(result).toEqual(baseTicket);
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
        include: { Feedback: { select: { subject: true, userId: true } } },
      });
    });

    it('sets resolvedAt when status is RESOLVED', async () => {
      mockPrisma.ticket.update.mockResolvedValue({ ...baseTicket, status: 'RESOLVED' });

      await service.update('tk-1', { status: 'RESOLVED' });

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolvedAt: expect.any(Date),
        }),
        include: expect.anything(),
      });
    });

    it('sets closedAt when status is CLOSED', async () => {
      mockPrisma.ticket.update.mockResolvedValue({ ...baseTicket, status: 'CLOSED' });

      await service.update('tk-1', { status: 'CLOSED' });

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({
          status: 'CLOSED',
          closedAt: expect.any(Date),
        }),
        include: expect.anything(),
      });
    });

    it('updates assignee and resolution', async () => {
      mockPrisma.ticket.update.mockResolvedValue(baseTicket);

      await service.update('tk-1', { assignee: 'admin-2', resolution: 'Fixed in v2' });

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: expect.objectContaining({
          assignee: 'admin-2',
          resolution: 'Fixed in v2',
        }),
        include: expect.anything(),
      });
    });
  });

  describe('addReply', () => {
    it('creates reply and touches ticket updatedAt', async () => {
      const mockReply = {
        id: 'r-1',
        ticketId: 'tk-1',
        authorType: 'ADMIN',
        authorId: 'admin-1',
        authorName: 'Admin',
        message: 'Looking into this',
        isInternal: false,
        createdAt: new Date(),
      };
      mockPrisma.ticketReply.create.mockResolvedValue(mockReply);
      mockPrisma.ticket.update.mockResolvedValue({});

      const result = await service.addReply(
        'tk-1', 'ADMIN', 'admin-1', 'Admin',
        { message: 'Looking into this' }
      );

      expect(result).toEqual(mockReply);
      expect(mockPrisma.ticketReply.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: 'tk-1',
          authorType: 'ADMIN',
          authorId: 'admin-1',
          authorName: 'Admin',
          message: 'Looking into this',
          isInternal: false,
        }),
      });
      // Should also touch the ticket's updatedAt
      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'tk-1' },
        data: { updatedAt: expect.any(Date) },
      });
    });

    it('respects isInternal flag', async () => {
      mockPrisma.ticketReply.create.mockResolvedValue({ id: 'r-2' });
      mockPrisma.ticket.update.mockResolvedValue({});

      await service.addReply(
        'tk-1', 'ADMIN', 'admin-1', 'Admin',
        { message: 'Internal note', isInternal: true }
      );

      expect(mockPrisma.ticketReply.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ isInternal: true }),
      });
    });
  });

  describe('createManual', () => {
    it('creates ticket with OPEN status', async () => {
      const mockTicket = { id: 'tk-new', status: 'OPEN', feedbackId: null };
      mockPrisma.ticket.create.mockResolvedValue(mockTicket);

      const result = await service.createManual();

      expect(result).toEqual(mockTicket);
      expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
        data: { feedbackId: null, status: 'OPEN' },
      });
    });

    it('links to feedback when feedbackId provided', async () => {
      mockPrisma.ticket.create.mockResolvedValue({ id: 'tk-new', feedbackId: 'fb-1' });

      await service.createManual('fb-1');

      expect(mockPrisma.ticket.create).toHaveBeenCalledWith({
        data: { feedbackId: 'fb-1', status: 'OPEN' },
      });
    });
  });
});
