import { ABTestingService } from '../ab-testing.service';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock prisma-factory
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => mockPrisma),
}));

// Mock CacheService
jest.mock('../../../services/cache.service', () => ({
  CacheService: {
    getInstance: jest.fn(() => mockCache),
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

const mockPrisma: any = {
  aBTest: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  aBTestVariant: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  aBTestImpression: {
    create: jest.fn(),
  },
};

const mockCache: any = {
  get: jest.fn(),
  set: jest.fn(),
  getOrSet: jest.fn(),
};

describe('ABTestingService', () => {
  let service: ABTestingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ABTestingService({
      prisma: mockPrisma,
      cache: mockCache,
    });
  });

  describe('createTest', () => {
    it('should create a test with variants', async () => {
      const now = new Date('2026-01-15');

      mockPrisma.aBTest.create.mockResolvedValue({
        id: 'test-1',
        name: 'CTR Test',
        description: 'Testing two thumbnails',
        userId: 'user-1',
        status: 'draft',
        startDate: null,
        endDate: null,
        createdAt: now,
        variants: [
          {
            id: 'var-a',
            name: 'Control (A)',
            thumbnailId: 'thumb-1',
            impressions: 0,
            clicks: 0,
            ctr: 0,
            isControl: true,
            Thumbnail: { imageUrl: 'https://example.com/a.jpg' },
          },
          {
            id: 'var-b',
            name: 'Variant B',
            thumbnailId: 'thumb-2',
            impressions: 0,
            clicks: 0,
            ctr: 0,
            isControl: false,
            Thumbnail: { imageUrl: 'https://example.com/b.jpg' },
          },
        ],
      });

      const result = await service.createTest('user-1', {
        name: 'CTR Test',
        description: 'Testing two thumbnails',
        variants: [
          { name: 'Control (A)', thumbnailId: 'thumb-1', isControl: true },
          { name: 'Variant B', thumbnailId: 'thumb-2' },
        ],
      });

      expect(result.id).toBe('test-1');
      expect(result.name).toBe('CTR Test');
      expect(result.status).toBe('draft');
      expect(result.variants).toHaveLength(2);
      expect(result.variants[0]!.isControl).toBe(true);
      expect(result.variants[1]!.thumbnailUrl).toBe('https://example.com/b.jpg');
      expect(result.totalImpressions).toBe(0);
      expect(result.winner).toBeNull();
    });

    it('should reject fewer than 2 variants', async () => {
      await expect(
        service.createTest('user-1', {
          name: 'Bad Test',
          variants: [{ name: 'Only one', thumbnailId: 'thumb-1' }],
        })
      ).rejects.toThrow('At least 2 variants are required');
    });

    it('should reject more than 5 variants', async () => {
      const sixVariants = Array.from({ length: 6 }, (_, i) => ({
        name: `Variant ${i}`,
        thumbnailId: `thumb-${i}`,
      }));

      await expect(
        service.createTest('user-1', {
          name: 'Too Many',
          variants: sixVariants,
        })
      ).rejects.toThrow('Maximum 5 variants allowed');
    });

    it('should auto-assign control if none specified', async () => {
      mockPrisma.aBTest.create.mockResolvedValue({
        id: 'test-2',
        name: 'Auto Control',
        description: null,
        userId: 'user-1',
        status: 'draft',
        startDate: null,
        endDate: null,
        createdAt: new Date(),
        variants: [
          {
            id: 'v1',
            name: 'A',
            thumbnailId: 't1',
            impressions: 0,
            clicks: 0,
            ctr: 0,
            isControl: true,
            Thumbnail: null,
          },
          {
            id: 'v2',
            name: 'B',
            thumbnailId: 't2',
            impressions: 0,
            clicks: 0,
            ctr: 0,
            isControl: false,
            Thumbnail: null,
          },
        ],
      });

      await service.createTest('user-1', {
        name: 'Auto Control',
        variants: [
          { name: 'A', thumbnailId: 't1' },
          { name: 'B', thumbnailId: 't2' },
        ],
      });

      // The first variant should get isControl: true in the create call
      const createCall = mockPrisma.aBTest.create.mock.calls[0][0];
      expect(createCall.data.variants.create[0].isControl).toBe(true);
    });
  });

  describe('startTest', () => {
    it('should start a draft test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'draft',
        userId: 'user-1',
      });

      mockPrisma.aBTest.update.mockResolvedValue({
        id: 'test-1',
        name: 'Test',
        description: null,
        userId: 'user-1',
        status: 'active',
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        variants: [],
      });

      const result = await service.startTest('test-1', 'user-1');
      expect(result.status).toBe('active');
      expect(result.startDate).not.toBeNull();
    });

    it('should reject starting an already active test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'active',
        userId: 'user-1',
      });

      await expect(service.startTest('test-1', 'user-1')).rejects.toThrow(
        'Test is already active'
      );
    });

    it('should reject starting a completed test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'completed',
        userId: 'user-1',
      });

      await expect(service.startTest('test-1', 'user-1')).rejects.toThrow(
        'Cannot restart a completed test'
      );
    });

    it('should throw when test not found', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue(null);

      await expect(service.startTest('nope', 'user-1')).rejects.toThrow(
        'Test not found'
      );
    });
  });

  describe('recordEvent', () => {
    it('should record an impression and update counters', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'active',
      });

      mockPrisma.aBTestImpression.create.mockResolvedValue({});
      mockPrisma.aBTestVariant.update.mockResolvedValue({});
      mockPrisma.aBTestVariant.findUnique.mockResolvedValue({
        id: 'var-a',
        impressions: 10,
        clicks: 2,
      });

      await service.recordEvent('test-1', 'var-a', 'user-1', 'impression');

      expect(mockPrisma.aBTestImpression.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          testId: 'test-1',
          variantId: 'var-a',
          userId: 'user-1',
          action: 'impression',
        }),
      });

      // Should increment impressions
      expect(mockPrisma.aBTestVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-a' },
        data: { impressions: { increment: 1 } },
      });

      // Should recalculate CTR (2/10 = 0.2)
      expect(mockPrisma.aBTestVariant.update).toHaveBeenCalledWith({
        where: { id: 'var-a' },
        data: { ctr: 0.2 },
      });
    });

    it('should reject events for non-active tests', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue(null);

      await expect(
        service.recordEvent('test-1', 'var-a', 'user-1', 'click')
      ).rejects.toThrow('Test not found or not active');
    });
  });

  describe('deleteTest', () => {
    it('should delete a draft test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'draft',
        userId: 'user-1',
      });
      mockPrisma.aBTest.delete.mockResolvedValue({});

      await service.deleteTest('test-1', 'user-1');

      expect(mockPrisma.aBTest.delete).toHaveBeenCalledWith({
        where: { id: 'test-1' },
      });
    });

    it('should reject deleting an active test', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        status: 'active',
        userId: 'user-1',
      });

      await expect(service.deleteTest('test-1', 'user-1')).rejects.toThrow(
        'Cannot delete an active test'
      );
    });
  });

  describe('winner determination', () => {
    it('should determine winner by highest CTR with minimum impressions', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-1',
        name: 'Winner Test',
        description: null,
        userId: 'user-1',
        status: 'completed',
        startDate: new Date(),
        endDate: new Date(),
        createdAt: new Date(),
        variants: [
          {
            id: 'va',
            name: 'A',
            thumbnailId: 't1',
            impressions: 100,
            clicks: 5,
            ctr: 0.05,
            isControl: true,
            Thumbnail: null,
          },
          {
            id: 'vb',
            name: 'B',
            thumbnailId: 't2',
            impressions: 100,
            clicks: 12,
            ctr: 0.12,
            isControl: false,
            Thumbnail: null,
          },
        ],
      });

      const result = await service.getTest('test-1', 'user-1');

      expect(result.winner).not.toBeNull();
      expect(result.winner?.id).toBe('vb');
      expect(result.winner?.ctr).toBe(0.12);
    });

    it('should return null winner when no variant has minimum impressions', async () => {
      mockPrisma.aBTest.findFirst.mockResolvedValue({
        id: 'test-2',
        name: 'Too Early',
        description: null,
        userId: 'user-1',
        status: 'active',
        startDate: new Date(),
        endDate: null,
        createdAt: new Date(),
        variants: [
          {
            id: 'va',
            name: 'A',
            thumbnailId: 't1',
            impressions: 5,
            clicks: 1,
            ctr: 0.2,
            isControl: true,
            Thumbnail: null,
          },
          {
            id: 'vb',
            name: 'B',
            thumbnailId: 't2',
            impressions: 3,
            clicks: 1,
            ctr: 0.33,
            isControl: false,
            Thumbnail: null,
          },
        ],
      });

      const result = await service.getTest('test-2', 'user-1');
      expect(result.winner).toBeNull();
    });
  });
});
