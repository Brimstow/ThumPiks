import { ProjectService } from './project.service';

// Mock the entire @prisma/client module
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    thumbnail: {
      findUnique: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('ProjectService', () => {
  let projectService: ProjectService;
  let mockPrisma: any;

  beforeEach(() => {
    // Get the mock prisma client instance
    const PrismaClient = require('@prisma/client').PrismaClient;
    mockPrisma = new PrismaClient();

    projectService = new ProjectService();
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('setFeaturedThumbnail', () => {
    it('should set a thumbnail as featured for a project', async () => {
      // Arrange
      const projectId = 'project-1';
      const thumbnailId = 'thumbnail-1';

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
      const result = await projectService.setFeaturedThumbnail(
        projectId,
        thumbnailId
      );

      // Assert
      expect(mockPrisma.thumbnail.findUnique).toHaveBeenCalledWith({
        where: { id: thumbnailId },
      });

      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: { featuredThumbnailId: thumbnailId },
      });

      expect(result).toEqual({
        id: projectId,
        featuredThumbnailId: thumbnailId,
      });
    });

    it('should throw an error if thumbnail does not belong to the project', async () => {
      // Arrange
      const projectId = 'project-1';
      const thumbnailId = 'thumbnail-1';

      // Mock the thumbnail findUnique to return a thumbnail with different projectId
      mockPrisma.thumbnail.findUnique.mockResolvedValue({
        id: thumbnailId,
        projectId: 'different-project',
      });

      // Act & Assert
      await expect(
        projectService.setFeaturedThumbnail(projectId, thumbnailId)
      ).rejects.toThrow('Thumbnail does not belong to this project');

      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });

    it('should throw an error if thumbnail does not exist', async () => {
      // Arrange
      const projectId = 'project-1';
      const thumbnailId = 'non-existent-thumbnail';

      // Mock the thumbnail findUnique to return null
      mockPrisma.thumbnail.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        projectService.setFeaturedThumbnail(projectId, thumbnailId)
      ).rejects.toThrow('Thumbnail does not belong to this project');

      // Ensure project.update was not called
      expect(mockPrisma.project.update).not.toHaveBeenCalled();
    });
  });
});
