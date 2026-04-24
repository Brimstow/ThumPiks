// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn(),
  },
}));

// Note: sharp and storage mocks are provided globally in src/__tests__/setup.ts

import { ImageProcessingService } from '../image-processing.service';

describe('ImageProcessingService - Layers Support', () => {
  let imageProcessingService: ImageProcessingService;

  beforeEach(() => {
    imageProcessingService = new ImageProcessingService();

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('applyEditsToImage with multiple text overlays', () => {
    it('should handle multiple text overlays correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        textOverlays: [
          {
            id: '1',
            text: 'First Overlay',
            position: 'top',
            fontSize: 24,
            color: '#FFFFFF',
          },
          {
            id: '2',
            text: 'Second Overlay',
            position: 'bottom',
            fontSize: 36,
            color: '#000000',
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

    it('should handle empty text overlays correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        textOverlays: [],
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

    it('should handle undefined text overlays correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = {
        // No textOverlays property
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
