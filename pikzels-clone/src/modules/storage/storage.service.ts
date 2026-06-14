import {
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  HybridStorageConfig,
  DEFAULT_HYBRID_CONFIG,
  ImageTransformation,
} from './storage.types';
import { CloudinaryProvider, getCloudinaryProvider } from './cloudinary.provider';
import { logger } from '../../utils/logger';

/**
 * Hybrid Storage Service
 * 
 * Orchestrates uploads between multiple storage providers:
 * - Cloudinary: Primary for now, ephemeral visual search uploads
 * - Storacha: Future permanent decentralized storage
 * - Local: Development fallback
 * 
 * Usage:
 * ```typescript
 * const storage = StorageService.getInstance();
 * 
 * // Permanent thumbnail upload
 * const result = await storage.uploadThumbnail(buffer, { folder: 'thumbnails' });
 * 
 * // Temporary visual search upload (auto-deletes after TTL)
 * const tempResult = await storage.uploadEphemeral(imageUrl, { folder: 'visual-search' });
 * ```
 */
export class StorageService {
  private static instance: StorageService;
  private config: HybridStorageConfig;
  private cloudinary: CloudinaryProvider;

  private constructor(config?: Partial<HybridStorageConfig>) {
    this.config = { ...DEFAULT_HYBRID_CONFIG, ...config };
    this.cloudinary = getCloudinaryProvider();
  }

  static getInstance(config?: Partial<HybridStorageConfig>): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService(config);
    }
    return StorageService.instance;
  }

  /**
   * Upload a thumbnail for permanent storage.
   * Currently uses Cloudinary; will switch to Storacha when configured.
   */
  async uploadThumbnail(
    source: string | Buffer,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    const uploadOptions: StorageUploadOptions = {
      folder: 'thumpiks/thumbnails',
      tags: ['thumbnail', 'permanent'],
      ...options,
    };

    return this.uploadWithFallback(source, uploadOptions);
  }

  /**
   * Upload for ephemeral use (visual search, temp previews).
   * Uses Cloudinary with auto-delete TTL.
   */
  async uploadEphemeral(
    source: string | Buffer,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    const uploadOptions: StorageUploadOptions = {
      folder: 'thumpiks/ephemeral',
      tags: ['ephemeral', 'visual-search'],
      expiresIn: this.config.ephemeralTtl,
      ...options,
    };

    // Ephemeral always goes to Cloudinary for TTL support
    return this.uploadToCloudinary(source, uploadOptions);
  }

  /**
   * Upload a clean (un-watermarked) original for free-tier users.
   * Stored permanently in Cloudinary; logical 45-day TTL enforced at read time.
   * Cleaned up by `cleanupExpiredOriginals()` in watermark.service.ts.
   */
  async uploadCleanOriginal(
    source: Buffer,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    const uploadOptions: StorageUploadOptions = {
      folder: 'thumpiks/originals',
      tags: ['clean-original', 'wm-free'],
      ...options,
    };

    return this.uploadWithFallback(source, uploadOptions);
  }

  /**
   * Upload a processed/edited image.
   */
  async uploadProcessedImage(
    source: string | Buffer,
    thumbnailId: string,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    const uploadOptions: StorageUploadOptions = {
      folder: 'thumpiks/processed',
      publicId: `processed_${thumbnailId}_${Date.now()}`,
      tags: ['processed', 'edited'],
      ...options,
    };

    return this.uploadWithFallback(source, uploadOptions);
  }

  /**
   * Upload with automatic fallback if primary fails.
   */
  private async uploadWithFallback(
    source: string | Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    // Storacha will be added as primary storage when credentials are configured.
    // Currently Cloudinary is the only storage provider.
    try {
      return await this.uploadToCloudinary(source, options);
    } catch (error) {
      logger.error('Primary upload failed, attempting fallback', error instanceof Error ? error : undefined);
      // For now, rethrow since Cloudinary is both primary and fallback
      throw error;
    }
  }

  /**
   * Upload to Cloudinary provider.
   */
  private async uploadToCloudinary(
    source: string | Buffer,
    options: StorageUploadOptions
  ): Promise<StorageUploadResult> {
    if (typeof source === 'string') {
      // Check if it's a file path or URL
      if (source.startsWith('http://') || source.startsWith('https://')) {
        return this.cloudinary.uploadFromUrl(source, options);
      } else {
        return this.cloudinary.uploadFromPath(source, options);
      }
    } else {
      return this.cloudinary.uploadFromBuffer(source, options);
    }
  }

  /**
   * Delete an asset from storage.
   */
  async delete(publicId: string): Promise<StorageDeleteResult> {
    // Currently only Cloudinary
    return this.cloudinary.delete(publicId);
  }

  /**
   * Get a transformed URL for an image.
   */
  getTransformedUrl(publicId: string, transformation: ImageTransformation): string {
    return this.cloudinary.getTransformedUrl(publicId, transformation);
  }

  /**
   * Generate optimized thumbnail URL with common transformations.
   */
  getOptimizedThumbnailUrl(
    publicId: string,
    size: 'small' | 'medium' | 'large' = 'medium'
  ): string {
    const sizes = {
      small: { width: 320, height: 180 },
      medium: { width: 640, height: 360 },
      large: { width: 1280, height: 720 },
    };

    return this.cloudinary.getTransformedUrl(publicId, {
      ...sizes[size],
      crop: 'fill',
      quality: 'auto',
      format: 'auto',
    });
  }

  /**
   * Health check for all configured providers.
   */
  async healthCheck(): Promise<{
    cloudinary: { healthy: boolean; latency?: number; error?: string };
    storacha: { healthy: boolean; error?: string };
  }> {
    const cloudinaryHealth = await this.cloudinary.healthCheck();

    return {
      cloudinary: cloudinaryHealth,
      storacha: { healthy: false, error: 'Not configured yet' },
    };
  }

  /**
   * Check if storage is available.
   */
  async isAvailable(): Promise<boolean> {
    return this.cloudinary.isAvailable();
  }
}

// Export singleton getter
export function getStorageService(): StorageService {
  return StorageService.getInstance();
}
