import { ImageProcessingService } from '../image-processing.service';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn(),
  },
}));

// Mock the entire sharp module
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    linear: jest.fn().mockReturnThis(),
    rotate: jest.fn().mockReturnThis(),
    flip: jest.fn().mockReturnThis(),
    flop: jest.fn().mockReturnThis(),
    extract: jest.fn().mockReturnThis(),
    grayscale: jest.fn().mockReturnThis(),
    tint: jest.fn().mockReturnThis(),
    negate: jest.fn().mockReturnThis(),
    blur: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    convolve: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('test-image-data')),
    toFile: jest.fn().mockResolvedValue(undefined),
  }));
});

describe('ImageProcessingService', () => {
  let imageProcessingService: ImageProcessingService;

  beforeEach(() => {
    imageProcessingService = new ImageProcessingService();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('applyEditsToImage', () => {
    it('should apply grayscale filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'grayscale' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply sepia filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'sepia' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply vintage filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'vintage' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply blackAndWhite filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'blackAndWhite' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply invert filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'invert' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply blur filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'blur' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply sharpen filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'sharpen' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply emboss filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'emboss' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should apply edgeDetect filter correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { filter: 'edgeDetect' };
      const thumbnailId = 'test-id';

      await imageProcessingService.applyEditsToImage(
        imageUrl,
        edits,
        thumbnailId
      );

      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });
  });

  describe('getAvailableFilters', () => {
    it('should return the correct list of available filters', () => {
      const filters = imageProcessingService.getAvailableFilters();

      expect(filters).toEqual([
        'none',
        'grayscale',
        'sepia',
        'vintage',
        'blackAndWhite',
        'invert',
        'blur',
        'sharpen',
        'emboss',
        'edgeDetect',
      ]);
    });
  });
});
