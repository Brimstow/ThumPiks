/**
 * Storage Module
 * 
 * Hybrid storage system supporting:
 * - Cloudinary: CDN, transformations, ephemeral uploads
 * - Storacha: Decentralized permanent storage (future)
 */

export * from './storage.types';
export * from './storage.service';
export { CloudinaryProvider, getCloudinaryProvider } from './cloudinary.provider';
