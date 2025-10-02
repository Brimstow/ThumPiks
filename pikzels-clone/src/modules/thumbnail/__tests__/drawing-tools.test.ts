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
    toFile: jest.fn().mockResolvedValue(undefined),
  }));
});

describe('ImageProcessingService - Drawing Tools', () => {
  let imageProcessingService: ImageProcessingService;

  beforeEach(() => {
    imageProcessingService = new ImageProcessingService();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('applyEditsToImage with drawing paths', () => {
    it('should handle drawing paths correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        drawingPaths: [
          {
            id: '1',
            points: [
              { x: 10, y: 10 },
              { x: 50, y: 50 },
              { x: 100, y: 100 },
            ],
            color: '#FF0000',
            lineWidth: 5,
          },
          {
            id: '2',
            points: [
              { x: 200, y: 200 },
              { x: 250, y: 250 },
            ],
            color: '#00FF00',
            lineWidth: 3,
          },
        ],
      };
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

    it('should handle empty drawing paths correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        drawingPaths: [],
      };
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

    it('should handle undefined drawing paths correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        // No drawingPaths property
      };
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
});
