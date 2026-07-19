/**
 * Storage Provider Types
 * 
 * Unified interface for multiple storage backends:
 * - Cloudinary (ephemeral + transformations)
 * - Storacha (permanent, decentralized) - future
 */

export interface StorageUploadOptions {
  /** Folder path in storage provider */
  folder?: string;
  /** Custom public ID (filename without extension) */
  publicId?: string;
  /** Auto-delete after N seconds (Cloudinary only) */
  expiresIn?: number;
  /** Resource type: image, video, raw, auto */
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
  /** Image transformation options */
  transformation?: ImageTransformation;
  /** Tags for organization */
  tags?: string[];
  /** Additional metadata */
  metadata?: Record<string, string>;
}

export interface ImageTransformation {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'pad';
  quality?: number | 'auto';
  format?: 'auto' | 'webp' | 'png' | 'jpg';
  gravity?: 'auto' | 'face' | 'center';
}

export interface StorageUploadResult {
  /** Public URL to access the asset */
  url: string;
  /** Secure HTTPS URL */
  secureUrl: string;
  /** Unique identifier in storage provider */
  publicId: string;
  /** Asset format (png, jpg, webp, etc.) */
  format: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** File size in bytes */
  bytes: number;
  /** Storage provider used */
  provider: 'cloudinary' | 'storacha' | 'local';
  /** Content ID (CID) for decentralized storage */
  cid?: string;
  /** Timestamp of upload */
  createdAt: Date;
  /** Expiration timestamp if temporary */
  expiresAt?: Date;
  /** Original response from provider */
  rawResponse?: unknown;
}

export interface StorageDeleteResult {
  success: boolean;
  publicId: string;
  provider: 'cloudinary' | 'storacha' | 'local';
}

export interface StorageProvider {
  /** Provider name */
  name: 'cloudinary' | 'storacha' | 'local';
  
  /** Check if provider is configured and available */
  isAvailable(): Promise<boolean>;
  
  /** Upload from URL */
  uploadFromUrl(url: string, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  
  /** Upload from Buffer */
  uploadFromBuffer(buffer: Buffer, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  
  /** Upload from local file path */
  uploadFromPath(filePath: string, options?: StorageUploadOptions): Promise<StorageUploadResult>;
  
  /** Delete an asset by public ID */
  delete(publicId: string): Promise<StorageDeleteResult>;
  
  /** Get a transformed URL (Cloudinary only) */
  getTransformedUrl?(publicId: string, transformation: ImageTransformation): string;
  
  /** Health check */
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

export interface HybridStorageConfig {
  /** Primary storage for permanent content */
  primary: 'storacha' | 'cloudinary';
  /** Fallback if primary fails */
  fallback: 'cloudinary' | 'local';
  /** Storage for temporary/ephemeral content (visual search) */
  ephemeral: 'cloudinary';
  /** Auto-delete TTL for ephemeral uploads (seconds) */
  ephemeralTtl: number;
}

export const DEFAULT_HYBRID_CONFIG: HybridStorageConfig = {
  primary: 'cloudinary', // Until Storacha is configured
  fallback: 'cloudinary',
  ephemeral: 'cloudinary',
  ephemeralTtl: 3600, // 1 hour for visual search uploads
};
