import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import {
  StorageProvider,
  StorageUploadOptions,
  StorageUploadResult,
  StorageDeleteResult,
  ImageTransformation,
} from './storage.types';
import { logger } from '../../utils/logger';

/**
 * Cloudinary Storage Provider
 *
 * Handles image uploads to Cloudinary CDN with support for:
 * - Permanent thumbnail storage
 * - Temporary visual search uploads (with TTL)
 * - Image transformations
 * - CDN delivery
 */
export class CloudinaryProvider implements StorageProvider {
  name = 'cloudinary' as const;
  private configured = false;

  constructor() {
    this.configure();
  }

  private configure(): void {
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if (cloudinaryUrl) {
      // CLOUDINARY_URL format: cloudinary://api_key:api_secret@cloud_name
      // Parse and configure explicitly for reliability
      const match = cloudinaryUrl.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
      if (match?.[1] && match[2] && match[3]) {
        cloudinary.config({
          api_key: match[1],
          api_secret: match[2],
          cloud_name: match[3],
          secure: true,
        });
        this.configured = true;
      }
    } else {
      // Try individual env vars
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });
        this.configured = true;
      }
    }

    if (this.configured) {
      logger.info('Cloudinary provider configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    if (!this.configured) return false;

    try {
      await cloudinary.api.ping();
      return true;
    } catch {
      return false;
    }
  }

  async uploadFromUrl(
    url: string,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary not configured');
    }

    const uploadOptions = this.buildUploadOptions(options);

    const result = await cloudinary.uploader.upload(url, uploadOptions);
    return this.mapUploadResult(result, options.expiresIn);
  }

  async uploadFromBuffer(
    buffer: Buffer,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary not configured');
    }

    const uploadOptions = this.buildUploadOptions(options);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve(this.mapUploadResult(result, options.expiresIn));
          } else {
            reject(new Error('No result from Cloudinary'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  }

  async uploadFromPath(
    filePath: string,
    options: StorageUploadOptions = {}
  ): Promise<StorageUploadResult> {
    if (!this.configured) {
      throw new Error('Cloudinary not configured');
    }

    const uploadOptions = this.buildUploadOptions(options);

    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    return this.mapUploadResult(result, options.expiresIn);
  }

  async delete(publicId: string): Promise<StorageDeleteResult> {
    if (!this.configured) {
      throw new Error('Cloudinary not configured');
    }

    try {
      await cloudinary.uploader.destroy(publicId);
      return {
        success: true,
        publicId,
        provider: 'cloudinary',
      };
    } catch (error) {
      logger.error('Cloudinary delete error', error instanceof Error ? error : undefined);
      return {
        success: false,
        publicId,
        provider: 'cloudinary',
      };
    }
  }

  getTransformedUrl(
    publicId: string,
    transformation: ImageTransformation
  ): string {
    const transformOptions: Record<string, unknown> = {};

    if (transformation.width) transformOptions.width = transformation.width;
    if (transformation.height) transformOptions.height = transformation.height;
    if (transformation.crop) transformOptions.crop = transformation.crop;
    if (transformation.quality)
      transformOptions.quality = transformation.quality;
    if (transformation.format)
      transformOptions.fetch_format = transformation.format;
    if (transformation.gravity)
      transformOptions.gravity = transformation.gravity;

    return cloudinary.url(publicId, {
      secure: true,
      transformation: [transformOptions],
    });
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    if (!this.configured) {
      return { healthy: false, error: 'Not configured' };
    }

    const start = Date.now();
    try {
      await cloudinary.api.ping();
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error: unknown) {
      return {
        healthy: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Ping failed',
      };
    }
  }

  private buildUploadOptions(options: StorageUploadOptions): Record<string, unknown> {
    const uploadOptions: Record<string, unknown> = {
      resource_type: options.resourceType || 'image',
      unique_filename: true,
      overwrite: false,
    };

    if (options.folder) {
      uploadOptions.folder = options.folder;
    }

    if (options.publicId) {
      uploadOptions.public_id = options.publicId;
    }

    if (options.tags?.length) {
      uploadOptions.tags = options.tags;
    }

    if (options.metadata) {
      uploadOptions.context = options.metadata;
    }

    // Apply eager transformations if specified
    if (options.transformation) {
      uploadOptions.eager = [this.buildTransformation(options.transformation)];
      uploadOptions.eager_async = true;
    }

    // Set invalidate for CDN cache when replacing
    uploadOptions.invalidate = true;

    return uploadOptions;
  }

  private buildTransformation(t: ImageTransformation): Record<string, unknown> {
    const transform: Record<string, unknown> = {};
    if (t.width) transform.width = t.width;
    if (t.height) transform.height = t.height;
    if (t.crop) transform.crop = t.crop;
    if (t.quality) transform.quality = t.quality;
    if (t.format) transform.fetch_format = t.format;
    if (t.gravity) transform.gravity = t.gravity;
    return transform;
  }

  private mapUploadResult(
    result: UploadApiResponse,
    expiresIn?: number
  ): StorageUploadResult {
    const uploadResult: StorageUploadResult = {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      provider: 'cloudinary',
      createdAt: new Date(result.created_at),
      rawResponse: result,
    };

    if (expiresIn) {
      uploadResult.expiresAt = new Date(Date.now() + expiresIn * 1000);
    }

    return uploadResult;
  }
}

// Singleton instance
let cloudinaryProvider: CloudinaryProvider | null = null;

export function getCloudinaryProvider(): CloudinaryProvider {
  if (!cloudinaryProvider) {
    cloudinaryProvider = new CloudinaryProvider();
  }
  return cloudinaryProvider;
}
