import { AnalyticsService } from '../analytics.service';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    thumbnail: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;
  let mockPrisma: any;

  beforeEach(() => {
    analyticsService = new AnalyticsService();
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('getUserAnalytics', () => {
    const userId = 'user-123';

    it('should return comprehensive user analytics', async () => {
      // Mock thumbnail count
      mockPrisma.thumbnail.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25); // recent (30 days)

      // Mock project count
      mockPrisma.project.count.mockResolvedValue(10);

      // Mock thumbnail trend (last 7 days) - use recent dates
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

      mockPrisma.thumbnail.findMany
        .mockResolvedValueOnce([
          { createdAt: twoDaysAgo },
          { createdAt: twoDaysAgo },
          { createdAt: yesterday },
        ])
        // Mock thumbnails with styles
        .mockResolvedValueOnce([
          { parameters: { style: 'bold' } },
          { parameters: { style: 'minimalist' } },
          { parameters: { style: 'bold' } },
          { parameters: { style: 'dramatic' } },
          { parameters: { style: 'unknown' } },
          { parameters: null },
        ])
        // Mock all thumbnails for hourly/daily distribution
        .mockResolvedValueOnce([
          { createdAt: new Date(today.getTime() - 10 * 60 * 60 * 1000) }, // 10 hours ago
          { createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000) }, // 2 hours ago
          { createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000) }, // 2 hours ago
        ]);

      // Mock project usage
      mockPrisma.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Project A',
          Thumbnail_Thumbnail_projectIdToProject: [
            { id: '1' },
            { id: '2' },
            { id: '3' },
          ],
        },
        {
          id: 'proj-2',
          name: 'Project B',
          Thumbnail_Thumbnail_projectIdToProject: [{ id: '4' }],
        },
      ]);

      const result = await analyticsService.getUserAnalytics(userId);

      // Verify totals
      expect(result.totals).toEqual({
        thumbnails: 100,
        projects: 10,
        recentThumbnails: 25,
      });

      // Verify trends - check that daily data exists and has expected structure
      expect(result.trends.daily).toBeDefined();
      const dailyKeys = Object.keys(result.trends.daily);
      expect(dailyKeys.length).toBeGreaterThanOrEqual(1);
      // Verify total count across all days equals mock data
      const totalInTrend = Object.values(result.trends.daily).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(totalInTrend).toBe(3);

      // Verify style distribution
      expect(result.styles).toEqual({
        bold: 2,
        minimalist: 1,
        dramatic: 1,
        other: 2,
      });

      // Verify top projects
      expect(result.projects).toEqual([
        { id: 'proj-1', name: 'Project A', thumbnailCount: 3 },
        { id: 'proj-2', name: 'Project B', thumbnailCount: 1 },
      ]);

      // Verify hourly distribution exists and has data
      expect(result.hourlyDistribution).toBeDefined();
      const hourlyKeys = Object.keys(result.hourlyDistribution);
      expect(hourlyKeys.length).toBe(24); // All 24 hours should be present

      // Verify total thumbnails across hours equals mock data
      const totalInHours = Object.values(result.hourlyDistribution).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(totalInHours).toBe(3);

      // Verify day of week distribution exists
      expect(result.dayOfWeekDistribution).toBeDefined();
      const totalInDays = Object.values(result.dayOfWeekDistribution).reduce(
        (sum, count) => sum + count,
        0
      );
      expect(totalInDays).toBe(3);
    });

    it('should handle empty data gracefully', async () => {
      mockPrisma.thumbnail.count.mockResolvedValue(0);
      mockPrisma.project.count.mockResolvedValue(0);
      mockPrisma.thumbnail.findMany.mockResolvedValue([]);
      mockPrisma.project.findMany.mockResolvedValue([]);

      const result = await analyticsService.getUserAnalytics(userId);

      expect(result.totals.thumbnails).toBe(0);
      expect(result.totals.projects).toBe(0);
      expect(result.projects).toEqual([]);
      expect(Object.keys(result.trends.daily)).toHaveLength(0);
    });

    it('should handle thumbnails without valid parameters', async () => {
      mockPrisma.thumbnail.count.mockResolvedValue(3);
      mockPrisma.project.count.mockResolvedValue(1);
      mockPrisma.thumbnail.findMany
        .mockResolvedValueOnce([]) // trend
        .mockResolvedValueOnce([
          { parameters: 'invalid-string' },
          { parameters: {} },
          { parameters: { style: null } },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.project.findMany.mockResolvedValue([]);

      const result = await analyticsService.getUserAnalytics(userId);

      expect(result.styles.other).toBe(3);
    });

    it('should limit project results to top 5', async () => {
      mockPrisma.thumbnail.count.mockResolvedValue(0);
      mockPrisma.project.count.mockResolvedValue(10);
      mockPrisma.thumbnail.findMany.mockResolvedValue([]);

      const mockProjects = Array.from({ length: 10 }, (_, i) => ({
        id: `proj-${i}`,
        name: `Project ${i}`,
        Thumbnail_Thumbnail_projectIdToProject: Array(10 - i).fill({
          id: 'thumb',
        }),
      }));

      mockPrisma.project.findMany.mockResolvedValue(mockProjects);

      const result = await analyticsService.getUserAnalytics(userId);

      expect(result.projects).toHaveLength(5);
      expect(result.projects[0]?.thumbnailCount).toBe(10);
      expect(result.projects[4]?.thumbnailCount).toBe(6);
    });
  });

  describe('getThumbnailStats', () => {
    const userId = 'user-456';

    it('should return detailed thumbnail statistics', async () => {
      // Use real dates with realistic difference (10 days apart)
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

      const mockThumbnails = [
        {
          id: 'thumb-1',
          title: 'Thumbnail 1',
          createdAt: now,
          parameters: { style: 'bold', edits: { crop: true, filter: true } },
          Project_Thumbnail_projectIdToProject: { name: 'Project A' },
        },
        {
          id: 'thumb-2',
          title: 'Thumbnail 2',
          createdAt: tenDaysAgo,
          parameters: { style: 'minimalist' },
          Project_Thumbnail_projectIdToProject: { name: 'Project B' },
        },
      ];

      mockPrisma.thumbnail.findMany.mockResolvedValue(mockThumbnails);

      const result = await analyticsService.getThumbnailStats(userId);

      expect(result.total).toBe(2);
      expect(result.mostRecent).toBeDefined();
      expect(result.mostRecent?.id).toBe('thumb-1');
      expect(result.averagePerDay).toBeGreaterThan(0);
      expect(result.byProject).toHaveLength(2);
      expect(result.byStyle).toHaveProperty('bold');
      expect(result.byStyle).toHaveProperty('minimalist');
      expect(result.editingStats).toBeDefined();
      expect(result.editingStats?.totalEdited).toBe(1);
      expect(result.editingStats?.totalEdits).toBe(2);
      expect(result.editingStats?.averageEditsPerThumbnail).toBe(2);
    });

    it('should return empty stats when no thumbnails exist', async () => {
      mockPrisma.thumbnail.findMany.mockResolvedValue([]);

      const result = await analyticsService.getThumbnailStats(userId);

      expect(result).toEqual({
        total: 0,
        averagePerDay: 0,
        mostRecent: null,
        byProject: [],
        byStyle: {},
      });
    });

    it('should handle single thumbnail edge case', async () => {
      // Use date from 5 days ago to ensure averagePerDay > 0
      const fiveDaysAgo = new Date(
        new Date().getTime() - 5 * 24 * 60 * 60 * 1000
      );

      const singleThumbnail = [
        {
          id: 'thumb-1',
          title: 'Only Thumbnail',
          createdAt: fiveDaysAgo,
          parameters: { style: 'bold' },
          Project_Thumbnail_projectIdToProject: { name: 'Project A' },
        },
      ];

      mockPrisma.thumbnail.findMany.mockResolvedValue(singleThumbnail);

      const result = await analyticsService.getThumbnailStats(userId);

      expect(result.total).toBe(1);
      expect(result.averagePerDay).toBeGreaterThan(0);
      expect(result.byProject).toHaveLength(1);
      expect(result.byProject[0]?.name).toBe('Project A');
      expect(result.editingStats?.totalEdited).toBe(0);
    });
  });
});
