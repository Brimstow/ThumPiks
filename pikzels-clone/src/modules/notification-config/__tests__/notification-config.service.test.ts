/**
 * NotificationConfigService Tests
 *
 * Tests CRUD operations, validation, and cache invalidation.
 */

// ── Hoisted mocks (must be before any imports) ──

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

jest.mock('../../../services/notification-router.service', () => {
  const mockClearConfigCache = jest.fn();
  return {
    NotificationRouter: {
      getInstance: jest.fn(() => ({
        clearConfigCache: mockClearConfigCache,
      })),
    },
    __mockClearConfigCache: mockClearConfigCache,
  };
});

jest.mock('../../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──

import { NotificationConfigService } from '../notification-config.service';

// Access the stable mock fn via the module's exported reference
const { __mockClearConfigCache } = jest.requireMock(
  '../../../services/notification-router.service'
) as { __mockClearConfigCache: jest.Mock };

// ── Mock Factory ──

function createMockPrisma() {
  return {
    notificationConfig: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

// ── Test Suite ──

describe('NotificationConfigService', () => {
  let service: NotificationConfigService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = createMockPrisma();
    service = new NotificationConfigService(mockPrisma as any);
  });

  // ────────────────────────────────────────────────────────
  describe('listAll', () => {
    it('returns empty array when no configs exist', async () => {
      mockPrisma.notificationConfig.findMany.mockResolvedValue([]);

      const result = await service.listAll();

      expect(result).toEqual([]);
      expect(mockPrisma.notificationConfig.findMany).toHaveBeenCalledWith({
        orderBy: { key: 'asc' },
      });
    });

    it('returns formatted config rows', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-1',
          key: 'feedback.submitted',
          channels: ['admin_panel', 'email'],
          emails: ['admin@test.com'],
          enabled: true,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'cfg-1',
        key: 'feedback.submitted',
        channels: ['admin_panel', 'email'],
        emails: ['admin@test.com'],
        enabled: true,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });
    });

    it('handles null channels/emails gracefully', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.findMany.mockResolvedValue([
        {
          id: 'cfg-2',
          key: 'ticket.created',
          channels: null,
          emails: null,
          enabled: false,
          metadata: null,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const result = await service.listAll();

      expect(result[0]!.channels).toEqual([]);
      expect(result[0]!.emails).toEqual([]);
    });
  });

  // ────────────────────────────────────────────────────────
  describe('getByKey', () => {
    it('returns null when config not found', async () => {
      mockPrisma.notificationConfig.findUnique.mockResolvedValue(null);

      const result = await service.getByKey('unknown.event');

      expect(result).toBeNull();
      expect(mockPrisma.notificationConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'unknown.event' },
      });
    });

    it('returns formatted config when found', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.findUnique.mockResolvedValue({
        id: 'cfg-1',
        key: 'feedback.submitted',
        channels: ['email'],
        emails: ['dev@test.com'],
        enabled: true,
        metadata: { source: 'widget' },
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.getByKey('feedback.submitted');

      expect(result).not.toBeNull();
      expect(result!.key).toBe('feedback.submitted');
      expect(result!.channels).toEqual(['email']);
      expect(result!.metadata).toEqual({ source: 'widget' });
    });
  });

  // ────────────────────────────────────────────────────────
  describe('upsert', () => {
    it('creates a new config and clears router cache', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.upsert.mockResolvedValue({
        id: 'cfg-new',
        key: 'feedback.submitted',
        channels: ['admin_panel'],
        emails: [],
        enabled: true,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.upsert({
        key: 'feedback.submitted',
        channels: ['admin_panel'],
        emails: [],
        enabled: true,
      });

      expect(result.id).toBe('cfg-new');
      expect(result.key).toBe('feedback.submitted');
      expect(mockPrisma.notificationConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'feedback.submitted' },
        create: {
          key: 'feedback.submitted',
          channels: ['admin_panel'],
          emails: [],
          enabled: true,
        },
        update: {
          channels: ['admin_panel'],
          emails: [],
          enabled: true,
        },
      });

      // Should clear the router cache
      expect(__mockClearConfigCache).toHaveBeenCalledWith('feedback.submitted');
    });

    it('validates that at least one channel is provided', async () => {
      await expect(
        service.upsert({
          key: 'test.event',
          channels: [],
          emails: [],
          enabled: true,
        })
      ).rejects.toThrow('At least one channel is required');
    });

    it('validates empty key is rejected', async () => {
      await expect(
        service.upsert({
          key: '',
          channels: ['admin_panel'],
          emails: [],
          enabled: true,
        })
      ).rejects.toThrow('Event key is required');
    });

    it('validates invalid channel name', async () => {
      await expect(
        service.upsert({
          key: 'test.event',
          channels: ['sms' as any],
          emails: [],
          enabled: true,
        })
      ).rejects.toThrow('Invalid channel: sms');
    });

    it('requires email when email channel is selected', async () => {
      await expect(
        service.upsert({
          key: 'test.event',
          channels: ['email'],
          emails: [],
          enabled: true,
        })
      ).rejects.toThrow('At least one email is required when email channel is enabled');
    });

    it('validates email format', async () => {
      await expect(
        service.upsert({
          key: 'test.event',
          channels: ['email'],
          emails: ['not-an-email'],
          enabled: true,
        })
      ).rejects.toThrow('Invalid email address: not-an-email');
    });

    it('accepts valid email addresses', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.upsert.mockResolvedValue({
        id: 'cfg-x',
        key: 'test.event',
        channels: ['email'],
        emails: ['admin@example.com'],
        enabled: true,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.upsert({
        key: 'test.event',
        channels: ['email'],
        emails: ['admin@example.com'],
        enabled: true,
      });

      expect(result.emails).toEqual(['admin@example.com']);
    });
  });

  // ────────────────────────────────────────────────────────
  describe('deleteByKey', () => {
    it('deletes a config and clears router cache', async () => {
      mockPrisma.notificationConfig.delete.mockResolvedValue({});

      await service.deleteByKey('feedback.submitted');

      expect(mockPrisma.notificationConfig.delete).toHaveBeenCalledWith({
        where: { key: 'feedback.submitted' },
      });
      expect(__mockClearConfigCache).toHaveBeenCalledWith('feedback.submitted');
    });
  });

  // ────────────────────────────────────────────────────────
  describe('toggleEnabled', () => {
    it('toggles the enabled flag and clears cache', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.update.mockResolvedValue({
        id: 'cfg-1',
        key: 'feedback.submitted',
        channels: ['admin_panel'],
        emails: [],
        enabled: false,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.toggleEnabled('feedback.submitted', false);

      expect(result.enabled).toBe(false);
      expect(mockPrisma.notificationConfig.update).toHaveBeenCalledWith({
        where: { key: 'feedback.submitted' },
        data: { enabled: false },
      });
      expect(__mockClearConfigCache).toHaveBeenCalledWith('feedback.submitted');
    });

    it('enables a previously disabled config', async () => {
      const now = new Date();
      mockPrisma.notificationConfig.update.mockResolvedValue({
        id: 'cfg-1',
        key: 'ticket.created',
        channels: ['email'],
        emails: ['admin@test.com'],
        enabled: true,
        metadata: null,
        createdAt: now,
        updatedAt: now,
      });

      const result = await service.toggleEnabled('ticket.created', true);

      expect(result.enabled).toBe(true);
    });
  });
});
