import { StorageService, getStorageService } from '../storage.service';

// Mock the cloudinary provider
jest.mock('../cloudinary.provider', () => ({
  getCloudinaryProvider: jest.fn(() => mockCloudinary),
}));

const mockCloudinary = {
  uploadFromUrl: jest.fn(),
  uploadFromPath: jest.fn(),
  uploadFromBuffer: jest.fn(),
  delete: jest.fn(),
  getTransformedUrl: jest.fn(),
  healthCheck: jest.fn(),
  isAvailable: jest.fn(),
};

const mockUploadResult = {
  publicId: 'thumpiks/thumbnails/test-123',
  secureUrl: 'https://res.cloudinary.com/test/image/upload/test-123.jpg',
  url: 'http://res.cloudinary.com/test/image/upload/test-123.jpg',
  width: 1280,
  height: 720,
  bytes: 204800,
  format: 'jpg',
};

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton so each test gets a fresh instance
    (StorageService as any).instance = undefined;
    mockCloudinary.uploadFromUrl.mockResolvedValue(mockUploadResult);
    mockCloudinary.uploadFromPath.mockResolvedValue(mockUploadResult);
    mockCloudinary.uploadFromBuffer.mockResolvedValue(mockUploadResult);
    mockCloudinary.delete.mockResolvedValue({ success: true, publicId: 'test' });
    mockCloudinary.getTransformedUrl.mockReturnValue('https://res.cloudinary.com/test/image/upload/w_640,h_360/test.jpg');
    mockCloudinary.healthCheck.mockResolvedValue({ healthy: true, latency: 42 });
    mockCloudinary.isAvailable.mockResolvedValue(true);
  });

  describe('getInstance', () => {
    it('returns a singleton', () => {
      const a = StorageService.getInstance();
      const b = StorageService.getInstance();
      expect(a).toBe(b);
    });

    it('getStorageService helper returns the same singleton', () => {
      const a = StorageService.getInstance();
      const b = getStorageService();
      expect(a).toBe(b);
    });
  });

  describe('uploadThumbnail', () => {
    it('uploads from URL using correct folder and tags', async () => {
      const storage = StorageService.getInstance();
      const result = await storage.uploadThumbnail('https://example.com/img.jpg');

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/img.jpg',
        expect.objectContaining({
          folder: 'thumpiks/thumbnails',
          tags: expect.arrayContaining(['thumbnail', 'permanent']),
        })
      );
      expect(result).toEqual(mockUploadResult);
    });

    it('uploads from Buffer', async () => {
      const storage = StorageService.getInstance();
      const buf = Buffer.from('fake-image-data');
      const result = await storage.uploadThumbnail(buf);

      expect(mockCloudinary.uploadFromBuffer).toHaveBeenCalledWith(
        buf,
        expect.objectContaining({ folder: 'thumpiks/thumbnails' })
      );
      expect(result).toEqual(mockUploadResult);
    });

    it('allows custom options to override defaults', async () => {
      const storage = StorageService.getInstance();
      await storage.uploadThumbnail('https://example.com/img.jpg', {
        folder: 'custom-folder',
        publicId: 'custom-id',
      });

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/img.jpg',
        expect.objectContaining({ folder: 'custom-folder', publicId: 'custom-id' })
      );
    });

    it('propagates upload errors', async () => {
      mockCloudinary.uploadFromUrl.mockRejectedValue(new Error('Network error'));
      const storage = StorageService.getInstance();

      await expect(storage.uploadThumbnail('https://example.com/img.jpg'))
        .rejects.toThrow('Network error');
    });
  });

  describe('uploadEphemeral', () => {
    it('uploads to ephemeral folder with correct tags', async () => {
      const storage = StorageService.getInstance();
      await storage.uploadEphemeral('https://example.com/img.jpg');

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/img.jpg',
        expect.objectContaining({
          folder: 'thumpiks/ephemeral',
          tags: expect.arrayContaining(['ephemeral', 'visual-search']),
        })
      );
    });

    it('uploads from file path', async () => {
      const storage = StorageService.getInstance();
      await storage.uploadEphemeral('/tmp/image.png');

      expect(mockCloudinary.uploadFromPath).toHaveBeenCalledWith(
        '/tmp/image.png',
        expect.objectContaining({ folder: 'thumpiks/ephemeral' })
      );
    });
  });

  describe('uploadProcessedImage', () => {
    it('uploads with processed folder and generated publicId', async () => {
      const storage = StorageService.getInstance();
      await storage.uploadProcessedImage('https://example.com/img.jpg', 'thumb-abc');

      expect(mockCloudinary.uploadFromUrl).toHaveBeenCalledWith(
        'https://example.com/img.jpg',
        expect.objectContaining({
          folder: 'thumpiks/processed',
          publicId: expect.stringContaining('processed_thumb-abc'),
          tags: expect.arrayContaining(['processed', 'edited']),
        })
      );
    });
  });

  describe('delete', () => {
    it('delegates to cloudinary.delete', async () => {
      const storage = StorageService.getInstance();
      const result = await storage.delete('public-id-123');

      expect(mockCloudinary.delete).toHaveBeenCalledWith('public-id-123');
      expect(result).toEqual({ success: true, publicId: 'test' });
    });
  });

  describe('getTransformedUrl', () => {
    it('delegates to cloudinary.getTransformedUrl', () => {
      const storage = StorageService.getInstance();
      const url = storage.getTransformedUrl('test-id', { width: 640, height: 360 });

      expect(mockCloudinary.getTransformedUrl).toHaveBeenCalledWith('test-id', { width: 640, height: 360 });
      expect(url).toContain('cloudinary.com');
    });
  });

  describe('getOptimizedThumbnailUrl', () => {
    it('uses small preset (320x180)', () => {
      const storage = StorageService.getInstance();
      storage.getOptimizedThumbnailUrl('test-id', 'small');

      expect(mockCloudinary.getTransformedUrl).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({ width: 320, height: 180 })
      );
    });

    it('uses medium preset (640x360) by default', () => {
      const storage = StorageService.getInstance();
      storage.getOptimizedThumbnailUrl('test-id');

      expect(mockCloudinary.getTransformedUrl).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({ width: 640, height: 360 })
      );
    });

    it('uses large preset (1280x720)', () => {
      const storage = StorageService.getInstance();
      storage.getOptimizedThumbnailUrl('test-id', 'large');

      expect(mockCloudinary.getTransformedUrl).toHaveBeenCalledWith(
        'test-id',
        expect.objectContaining({ width: 1280, height: 720 })
      );
    });
  });

  describe('healthCheck', () => {
    it('returns cloudinary health and storacha placeholder', async () => {
      const storage = StorageService.getInstance();
      const result = await storage.healthCheck();

      expect(result.cloudinary).toEqual({ healthy: true, latency: 42 });
      expect(result.storacha).toEqual({ healthy: false, error: 'Not configured yet' });
    });
  });

  describe('isAvailable', () => {
    it('returns true when cloudinary is available', async () => {
      const storage = StorageService.getInstance();
      const result = await storage.isAvailable();
      expect(result).toBe(true);
    });

    it('returns false when cloudinary is unavailable', async () => {
      mockCloudinary.isAvailable.mockResolvedValue(false);
      const storage = StorageService.getInstance();
      const result = await storage.isAvailable();
      expect(result).toBe(false);
    });
  });
});
