import { ThumbnailService } from './thumbnail.service';
import { 
  createMockPrismaClient, 
  createMockCacheService, 
  createMockEventEmitter, 
  createMockEventFunctions,
  setupServiceTest
} from '../../__tests__/test-utils';

// No global mocks - everything handled through dependency injection

describe('ThumbnailService', () => {
  let thumbnailService: ThumbnailService;
  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockCache: ReturnType<typeof createMockCacheService>;
  let mockEventEmitter: ReturnType<typeof createMockEventEmitter>;
  let mockEventFunctions: ReturnType<typeof createMockEventFunctions>;

  beforeEach(() => {
    setupServiceTest();
    
    // Create fresh mocks for each test
    mockPrisma = createMockPrismaClient();
    mockCache = createMockCacheService();
    mockEventEmitter = createMockEventEmitter();
    mockEventFunctions = createMockEventFunctions();
    
    // Create service with injected dependencies
    thumbnailService = new ThumbnailService({
      prisma: mockPrisma as any,
      cache: mockCache.getInstance() as any,
      eventEmitter: mockEventEmitter as any,
      emitThumbnailCreated: mockEventFunctions.emitThumbnailCreated,
      emitAnalyticsEvent: mockEventFunctions.emitAnalyticsEvent,
    });
  });

  describe('setThumbnailAsFeatured', () => {
    it('should set a thumbnail as featured for a project', async () => {
      // Arrange
      const thumbnailId = 'thumbnail-1';
      const projectId = 'project-1';

      // Mock the thumbnail findUnique to return a valid thumbnail
      mockPrisma.thumbnail.findUnique.mockResolvedValue({
        id: thumbnailId,
        projectId: projectId,
        userId: 'user-1',
      });

      // Mock the project update to return the updated project
      mockPrisma.project.update.mockResolvedValue({
        id: projectId,
        featuredThumbnailId: thumbnailId,
      });

      // Act
      const result = await thumbnailService.setThumbnailAsFeatured(
        thumbnailId,
        projectId
      );

      // Assert
      expect(mockPrisma.thumbnail.findUnique).toHaveBeenCalledWith({
        where: { id: thumbnailId },
        select: { id: true, projectId: true, userId: true }
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { featuredThumbnailId: thumbnailId },
      });

      expect(mockEventFunctions.emitAnalyticsEvent).toHaveBeenCalledWith(
        'user-1',
        'thumbnail_featured',
        'thumbnail',
        thumbnailId,
        { projectId: projectId }
      );

      expect(result).toEqual({
        id: thumbnailId,
        projectId: projectId,
        userId: 'user-1',
      });
    });

    it('should throw an error if thumbnail does not belong to the project', async () => {
      // Arrange
      const thumbnailId = 'thumbnail-1';
      const projectId = 'project-1';

      // Mock the thumbnail findUnique to return a thumbnail with different projectId
      mockPrisma.thumbnail.findUnique.mockResolvedValue({
        id: thumbnailId,
        projectId: 'different-project',
        userId: 'user-1',
      });

      // Act & Assert
      await expect(
        thumbnailService.setThumbnailAsFeatured(thumbnailId, projectId)
      ).rejects.toThrow('Thumbnail does not belong to this project');

      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
      expect(mockEventFunctions.emitAnalyticsEvent).not.toHaveBeenCalled();
    });

    it('should throw an error if thumbnail does not exist', async () => {
      // Arrange
      const thumbnailId = 'non-existent-thumbnail';
      const projectId = 'project-1';

      // Mock the thumbnail findUnique to return null
      mockPrisma.thumbnail.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        thumbnailService.setThumbnailAsFeatured(thumbnailId, projectId)
      ).rejects.toThrow('Thumbnail does not belong to this project');

      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
      expect(mockEventFunctions.emitAnalyticsEvent).not.toHaveBeenCalled();
    });
  });
});
