import { CompositionLayoutService } from '../composition-layout.service';

// Shared mock storage — use 'var' to avoid TDZ since jest.mock factories are hoisted
// eslint-disable-next-line no-var
declare var _prismaStore: any;

jest.mock('@prisma/client', () => {
  const store = {
    compositionLayout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  };
  // Attach to global so tests can access it without hoisting issues
  (global as any).__compositionLayoutMock = store;
  const mockPrismaClient = jest.fn().mockImplementation(() => store);
  return { PrismaClient: mockPrismaClient };
});

function getMockPrisma() { return (global as any).__compositionLayoutMock; }

const mockLayout = {
  id: 'layout-123',
  name: 'Gaming Overlay',
  description: 'Bold gaming layout',
  category: 'gaming',
  tags: ['bold', 'gaming'],
  canvasWidth: 1920,
  canvasHeight: 1080,
  wireframeSvg: '<svg/>',
  slots: [],
  textSlots: [],
  fallbackBackground: null,
  previewUrl: null,
  isPublic: true,
  builtIn: false,
  creatorId: 'user-creator',
  popularity: 100,
  downloads: 10,
  likes: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  User: { id: 'user-creator', name: 'Creator', avatarUrl: null },
};

describe('CompositionLayoutService', () => {
  let service: CompositionLayoutService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CompositionLayoutService();
    getMockPrisma().compositionLayout.findMany.mockResolvedValue([mockLayout]);
    getMockPrisma().compositionLayout.findUnique.mockResolvedValue(mockLayout);
    getMockPrisma().compositionLayout.create.mockResolvedValue(mockLayout);
    getMockPrisma().compositionLayout.update.mockResolvedValue(mockLayout);
    getMockPrisma().compositionLayout.delete.mockResolvedValue(mockLayout);
    getMockPrisma().compositionLayout.upsert.mockResolvedValue(mockLayout);
  });

  describe('getLayouts', () => {
    it('returns layouts with default filters', async () => {
      const result = await service.getLayouts();
      expect(getMockPrisma().compositionLayout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isPublic: true }),
          orderBy: { popularity: 'desc' },
          skip: 0,
          take: 50,
        })
      );
      expect(result).toEqual([mockLayout]);
    });

    it('filters by category', async () => {
      await service.getLayouts({ category: 'gaming' });
      expect(getMockPrisma().compositionLayout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ category: 'gaming' }) })
      );
    });

    it('ignores category filter when set to "all"', async () => {
      await service.getLayouts({ category: 'all' });
      const call = getMockPrisma().compositionLayout.findMany.mock.calls[0]![0];
      expect(call.where.category).toBeUndefined();
    });

    it('applies search filter with OR conditions', async () => {
      await service.getLayouts({ search: 'epic' });
      const call = getMockPrisma().compositionLayout.findMany.mock.calls[0]![0];
      expect(call.where.OR).toEqual([
        { name: { contains: 'epic', mode: 'insensitive' } },
        { description: { contains: 'epic', mode: 'insensitive' } },
      ]);
    });

    it('paginates correctly', async () => {
      await service.getLayouts({ page: 3, limit: 10 });
      const call = getMockPrisma().compositionLayout.findMany.mock.calls[0]![0];
      expect(call.skip).toBe(20);
      expect(call.take).toBe(10);
    });

    it('filters by creatorId', async () => {
      await service.getLayouts({ creatorId: 'user-abc' });
      const call = getMockPrisma().compositionLayout.findMany.mock.calls[0]![0];
      expect(call.where.creatorId).toBe('user-abc');
    });

    it('applies custom sortBy and sortOrder', async () => {
      await service.getLayouts({ sortBy: 'downloads', sortOrder: 'asc' });
      const call = getMockPrisma().compositionLayout.findMany.mock.calls[0]![0];
      expect(call.orderBy).toEqual({ downloads: 'asc' });
    });
  });

  describe('getLayoutById', () => {
    it('returns layout by id', async () => {
      const result = await service.getLayoutById('layout-123');
      expect(getMockPrisma().compositionLayout.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'layout-123' } })
      );
      expect(result).toEqual(mockLayout);
    });

    it('returns null when not found', async () => {
      getMockPrisma().compositionLayout.findUnique.mockResolvedValue(null);
      const result = await service.getLayoutById('bad-id');
      expect(result).toBeNull();
    });
  });

  describe('createLayout', () => {
    const input = {
      name: 'New Layout',
      category: 'gaming',
      tags: ['cool'],
      wireframeSvg: '<svg/>',
      slots: [{ x: 0, y: 0 }],
    };

    it('creates layout with creator', async () => {
      const result = await service.createLayout('user-creator', input);
      expect(getMockPrisma().compositionLayout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'New Layout',
            category: 'gaming',
            creatorId: 'user-creator',
            builtIn: false,
            canvasWidth: 1920,
            canvasHeight: 1080,
          }),
        })
      );
      expect(result).toEqual(mockLayout);
    });

    it('uses provided canvas dimensions', async () => {
      await service.createLayout('user-creator', { ...input, canvasWidth: 1280, canvasHeight: 720 });
      const call = getMockPrisma().compositionLayout.create.mock.calls[0]![0];
      expect(call.data.canvasWidth).toBe(1280);
      expect(call.data.canvasHeight).toBe(720);
    });

    it('defaults isPublic to true', async () => {
      await service.createLayout('user-creator', input);
      const call = getMockPrisma().compositionLayout.create.mock.calls[0]![0];
      expect(call.data.isPublic).toBe(true);
    });
  });

  describe('updateLayout', () => {
    it('updates layout when creator matches', async () => {
      const result = await service.updateLayout('layout-123', 'user-creator', { name: 'Renamed' });
      expect(getMockPrisma().compositionLayout.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'layout-123' }, data: { name: 'Renamed' } })
      );
      expect(result).toEqual(mockLayout);
    });

    it('returns null when layout not found', async () => {
      getMockPrisma().compositionLayout.findUnique.mockResolvedValue(null);
      const result = await service.updateLayout('bad-id', 'user-creator', {});
      expect(result).toBeNull();
    });

    it('returns null when not creator', async () => {
      const result = await service.updateLayout('layout-123', 'other-user', { name: 'Hack' });
      expect(result).toBeNull();
    });

    it('returns null when layout is built-in', async () => {
      getMockPrisma().compositionLayout.findUnique.mockResolvedValue({ ...mockLayout, builtIn: true });
      const result = await service.updateLayout('layout-123', 'user-creator', {});
      expect(result).toBeNull();
    });
  });

  describe('deleteLayout', () => {
    it('deletes layout and returns true when creator matches', async () => {
      const result = await service.deleteLayout('layout-123', 'user-creator');
      expect(getMockPrisma().compositionLayout.delete).toHaveBeenCalledWith({
        where: { id: 'layout-123' },
      });
      expect(result).toBe(true);
    });

    it('returns false when layout not found', async () => {
      getMockPrisma().compositionLayout.findUnique.mockResolvedValue(null);
      const result = await service.deleteLayout('bad-id', 'user-creator');
      expect(result).toBe(false);
    });

    it('returns false when not creator', async () => {
      const result = await service.deleteLayout('layout-123', 'other-user');
      expect(result).toBe(false);
    });

    it('returns false for built-in layouts', async () => {
      getMockPrisma().compositionLayout.findUnique.mockResolvedValue({ ...mockLayout, builtIn: true });
      const result = await service.deleteLayout('layout-123', 'user-creator');
      expect(result).toBe(false);
    });
  });

  describe('incrementDownloads', () => {
    it('increments downloads by 1', async () => {
      await service.incrementDownloads('layout-123');
      expect(getMockPrisma().compositionLayout.update).toHaveBeenCalledWith({
        where: { id: 'layout-123' },
        data: { downloads: { increment: 1 } },
      });
    });
  });

  describe('toggleLike', () => {
    it('increments likes when increment=true', async () => {
      await service.toggleLike('layout-123', true);
      expect(getMockPrisma().compositionLayout.update).toHaveBeenCalledWith({
        where: { id: 'layout-123' },
        data: { likes: { increment: 1 } },
      });
    });

    it('decrements likes when increment=false', async () => {
      await service.toggleLike('layout-123', false);
      expect(getMockPrisma().compositionLayout.update).toHaveBeenCalledWith({
        where: { id: 'layout-123' },
        data: { likes: { increment: -1 } },
      });
    });
  });

  describe('upsertBuiltIn', () => {
    const builtInData = {
      id: 'builtin-1',
      name: 'Built-in Layout',
      description: 'Default layout',
      category: 'general',
      tags: ['default'],
      canvasWidth: 1920,
      canvasHeight: 1080,
      wireframeSvg: '<svg/>',
      slots: [],
      textSlots: [],
      popularity: 500,
    };

    it('upserts built-in layout', async () => {
      const result = await service.upsertBuiltIn(builtInData);
      expect(getMockPrisma().compositionLayout.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'builtin-1' },
          create: expect.objectContaining({ builtIn: true, isPublic: true, creatorId: null }),
          update: expect.objectContaining({ name: 'Built-in Layout' }),
        })
      );
      expect(result).toEqual(mockLayout);
    });
  });
});
