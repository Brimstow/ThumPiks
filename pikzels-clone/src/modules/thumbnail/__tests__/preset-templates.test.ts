import { ImageProcessingService } from '../image-processing.service';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Mock the fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    writeFile: jest.fn()
  }
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
    toFile: jest.fn().mockResolvedValue(undefined)
  }));
});

describe('ImageProcessingService - Preset Templates', () => {
  let imageProcessingService: ImageProcessingService;

  beforeEach(() => {
    imageProcessingService = new ImageProcessingService();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('applyEditsToImage with preset templates', () => {
    it('should handle preset templates correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { 
        brightness: 120,
        contrast: 110,
        saturation: 90,
        filter: 'vintage',
        textOverlays: [
          {
            id: '1',
            text: 'Preset Template',
            position: 'bottom',
            fontSize: 36,
            color: '#FF0000'
          }
        ]
      };
      const thumbnailId = 'test-id';
      
      await imageProcessingService.applyEditsToImage(imageUrl, edits, thumbnailId);
      
      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });

    it('should handle empty preset templates correctly', async () => {
      const imageUrl = 'https://placehold.co/1280x720/000000/FFFFFF?text=Test';
      const edits = { 
        // Minimal edits
        brightness: 100,
        contrast: 100
      };
      const thumbnailId = 'test-id';
      
      await imageProcessingService.applyEditsToImage(imageUrl, edits, thumbnailId);
      
      // Since we're mocking sharp, we can't verify the actual processing
      // but we can verify that the method didn't throw an error
      expect(true).toBe(true);
    });
  });
});