import { ThumbnailService } from './thumbnail.service';

// Mock the entire @prisma/client module
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    thumbnail: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    project: {
      update: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('ThumbnailService', () => {
  let thumbnailService: ThumbnailService;
  let mockPrisma: any;

  beforeEach(() => {
    // Get the mock prisma client instance
    const PrismaClient = require('@prisma/client').PrismaClient;
    mockPrisma = new PrismaClient();
    
    thumbnailService = new ThumbnailService();
    // Clear all mocks before each test
    jest.clearAllMocks();
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
      });
      
      // Mock the project update to return the updated project
      mockPrisma.project.update.mockResolvedValue({
        id: projectId,
        featuredThumbnailId: thumbnailId,
      });

      // Act
      const result = await thumbnailService.setThumbnailAsFeatured(thumbnailId, projectId);

      // Assert
      expect(mockPrisma.thumbnail.findUnique).toHaveBeenCalledWith({
        where: { id: thumbnailId },
      });
      
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { featuredThumbnailId: thumbnailId },
      });
      
      expect(result).toEqual({
        id: thumbnailId,
        projectId: projectId,
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
      });

      // Act & Assert
      await expect(thumbnailService.setThumbnailAsFeatured(thumbnailId, projectId))
        .rejects
        .toThrow('Thumbnail does not belong to this project');
        
      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });

    it('should throw an error if thumbnail does not exist', async () => {
      // Arrange
      const thumbnailId = 'non-existent-thumbnail';
      const projectId = 'project-1';
      
      // Mock the thumbnail findUnique to return null
      mockPrisma.thumbnail.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(thumbnailService.setThumbnailAsFeatured(thumbnailId, projectId))
        .rejects
        .toThrow('Thumbnail does not belong to this project');
        
      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });
  });
});