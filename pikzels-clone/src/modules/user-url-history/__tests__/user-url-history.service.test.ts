// Mock prisma-factory — inline to avoid jest.mock hoisting issue
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),
}));

// Mock uuid
jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid-url-1') }));

import { UserUrlHistoryService, getUserUrlHistoryService } from '../user-url-history.service';

// Injected via constructor to avoid module-level getPrisma() issue
const mockPrisma: any = {
  userUrlHistory: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const baseEntry = {
  id: 'mock-uuid-url-1',
  userId: 'user-abc',
  url: 'https://youtube.com/watch?v=abc123',
  title: 'My Video',
  platform: 'youtube',
  thumbnailUrl: null,
  selectedFrameTime: null,
  createdAt: new Date('2025-01-01'),
};

describe('UserUrlHistoryService', () => {
  let service: UserUrlHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module-level singleton
    const mod = require('../user-url-history.service');
    (mod as any).instance = null;

    service = new UserUrlHistoryService(mockPrisma);
  });

  describe('upsertUrl', () => {
    describe('when URL already exists for user', () => {
      it('updates existing entry and bumps createdAt', async () => {
        mockPrisma.userUrlHistory.findUnique.mockResolvedValue(baseEntry);
        const updated = { ...baseEntry, title: 'Updated Title', createdAt: new Date() };
        mockPrisma.userUrlHistory.update.mockResolvedValue(updated);

        const result = await service.upsertUrl({
          userId: 'user-abc',
          url: 'https://youtube.com/watch?v=abc123',
          title: 'Updated Title',
        });

        expect(mockPrisma.userUrlHistory.findUnique).toHaveBeenCalledWith({
          where: { userId_url: { userId: 'user-abc', url: 'https://youtube.com/watch?v=abc123' } },
        });
        expect(mockPrisma.userUrlHistory.update).toHaveBeenCalledWith({
          where: { id: baseEntry.id },
          data: expect.objectContaining({ title: 'Updated Title' }),
        });
        expect(result).toEqual(updated);
      });

      it('keeps existing values when update fields are undefined', async () => {
        mockPrisma.userUrlHistory.findUnique.mockResolvedValue(baseEntry);
        mockPrisma.userUrlHistory.update.mockResolvedValue(baseEntry);

        await service.upsertUrl({ userId: 'user-abc', url: 'https://youtube.com/watch?v=abc123' });

        expect(mockPrisma.userUrlHistory.update).toHaveBeenCalledWith({
          where: { id: baseEntry.id },
          data: expect.objectContaining({
            title: baseEntry.title,
            platform: baseEntry.platform,
          }),
        });
      });
    });

    describe('when URL is new', () => {
      beforeEach(() => {
        mockPrisma.userUrlHistory.findUnique.mockResolvedValue(null);
        mockPrisma.userUrlHistory.create.mockResolvedValue(baseEntry);
      });

      it('creates a new entry when under the limit', async () => {
        mockPrisma.userUrlHistory.count.mockResolvedValue(5);

        const result = await service.upsertUrl({
          userId: 'user-abc',
          url: 'https://youtube.com/watch?v=abc123',
          title: 'My Video',
          platform: 'youtube',
        });

        expect(mockPrisma.userUrlHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            id: 'mock-uuid-url-1',
            userId: 'user-abc',
            url: 'https://youtube.com/watch?v=abc123',
            title: 'My Video',
            platform: 'youtube',
          }),
        });
        expect(result).toEqual(baseEntry);
      });

      it('evicts oldest entry when at limit (20)', async () => {
        mockPrisma.userUrlHistory.count.mockResolvedValue(20);
        const oldestEntry = { id: 'oldest-id' };
        mockPrisma.userUrlHistory.findFirst.mockResolvedValue(oldestEntry);

        await service.upsertUrl({ userId: 'user-abc', url: 'https://new-url.com' });

        expect(mockPrisma.userUrlHistory.findFirst).toHaveBeenCalledWith({
          where: { userId: 'user-abc' },
          orderBy: { createdAt: 'asc' },
        });
        expect(mockPrisma.userUrlHistory.delete).toHaveBeenCalledWith({
          where: { id: 'oldest-id' },
        });
        expect(mockPrisma.userUrlHistory.create).toHaveBeenCalled();
      });

      it('handles null optional fields gracefully', async () => {
        mockPrisma.userUrlHistory.count.mockResolvedValue(0);

        await service.upsertUrl({ userId: 'user-abc', url: 'https://example.com' });

        expect(mockPrisma.userUrlHistory.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: null,
            platform: null,
            thumbnailUrl: null,
            selectedFrameTime: null,
          }),
        });
      });
    });
  });

  describe('getHistory', () => {
    it('returns recent entries ordered by date desc', async () => {
      mockPrisma.userUrlHistory.findMany.mockResolvedValue([baseEntry]);

      const result = await service.getHistory('user-abc');

      expect(mockPrisma.userUrlHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-abc' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(result).toEqual([baseEntry]);
    });

    it('respects custom limit', async () => {
      mockPrisma.userUrlHistory.findMany.mockResolvedValue([]);
      await service.getHistory('user-abc', 5);
      expect(mockPrisma.userUrlHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('deleteEntry', () => {
    it('deletes the entry', async () => {
      mockPrisma.userUrlHistory.findUnique.mockResolvedValue(baseEntry);

      const result = await service.deleteEntry('mock-uuid-url-1', 'user-abc');

      expect(mockPrisma.userUrlHistory.delete).toHaveBeenCalledWith({
        where: { id: 'mock-uuid-url-1' },
      });
      expect(result).toEqual({ success: true });
    });

    it('throws when entry not found', async () => {
      mockPrisma.userUrlHistory.findUnique.mockResolvedValue(null);
      await expect(service.deleteEntry('bad-id', 'user-abc')).rejects.toThrow('Entry not found');
    });

    it('throws when user does not own entry', async () => {
      mockPrisma.userUrlHistory.findUnique.mockResolvedValue({ ...baseEntry, userId: 'other-user' });
      await expect(service.deleteEntry('mock-uuid-url-1', 'user-abc')).rejects.toThrow('Forbidden');
    });
  });

  describe('getUserUrlHistoryService singleton', () => {
    it('returns same instance on repeated calls', () => {
      const a = getUserUrlHistoryService();
      const b = getUserUrlHistoryService();
      expect(a).toBe(b);
    });
  });
});
