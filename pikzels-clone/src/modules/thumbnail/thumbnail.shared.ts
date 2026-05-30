import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ThumbnailService } from './thumbnail.service';
import { ImageProcessingService } from './image-processing.service';
import { OpenRouterAIService } from './openrouter-ai.service';
import { ReplicateAIService } from './replicate-ai.service';
import { CometAIService } from './comet-ai.service';
import { ZenmuxAIService } from './zenmux-ai.service';
import { PrismaClient } from '@prisma/client';
import { getPrisma as getPrismaFactory } from '../../utils/prisma-factory';
import { getStorageService } from '../storage';
import { emitThumbnailCreated, emitAnalyticsEvent } from '../../events';
import { logger } from '../../utils/logger';
import { CacheService } from '../../services/cache.service';

// Re-export types used by sub-controllers
export type { Request, Response };
export type { AuthRequest };

// Single source of truth for valid thumbnail styles
export const VALID_STYLES = [
  'bold',
  'minimalist',
  'dramatic',
  'cinematic',
  'professional',
  'creative',
  'gaming',
  'vibrant',
  'retro',
  'neon',
  'natural',
] as const;

// Create shared instances that can be overridden for testing
let sharedPrisma: PrismaClient;
let sharedThumbnailService: ThumbnailService;
let sharedImageProcessingService: ImageProcessingService;

// Initialize services (can be overridden in tests)
export const initializeServices = (
  prismaClient?: PrismaClient,
  cacheService?: CacheService,
  eventDependencies?: {
    emitThumbnailCreated?: typeof emitThumbnailCreated;
    emitAnalyticsEvent?: typeof emitAnalyticsEvent;
  }
) => {
  sharedPrisma = prismaClient || getPrismaFactory();
  sharedThumbnailService = new ThumbnailService({
    prisma: sharedPrisma,
    ...(cacheService !== undefined && { cache: cacheService }),
    ...eventDependencies,
  } as ConstructorParameters<typeof ThumbnailService>[0]);
  sharedImageProcessingService = new ImageProcessingService();
};

// Initialize with default instances for production
if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

// Getter functions to access services
export const getThumbnailService = () => {
  if (!sharedThumbnailService) {
    initializeServices();
  }
  return sharedThumbnailService;
};

export const getPrisma = () => {
  if (!sharedPrisma) {
    initializeServices();
  }
  return sharedPrisma;
};

export const getImageProcessingService = () => {
  if (!sharedImageProcessingService) {
    initializeServices();
  }
  return sharedImageProcessingService;
};

// Initialize AI service instances (singletons)
export const openRouterService = new OpenRouterAIService();
export const replicateService = new ReplicateAIService();
export const cometService = new CometAIService();
export const zenmuxService = new ZenmuxAIService();

/**
 * Ensure an image value is a base64 data URL.
 * If it's already a data URL, return as-is.
 * If it's an HTTP(S) URL, fetch and convert to base64.
 * This prevents sending raw URLs to AI providers that expect base64.
 */
export async function ensureBase64(image: string): Promise<string> {
  if (image.startsWith('data:')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) {
    try {
      const resp = await fetch(image);
      if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status})`);
      const buffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      logger.error(
        '[ensureBase64] Failed to convert URL to base64',
        err instanceof Error ? err : new Error(String(err))
      );
      throw new Error(
        'Could not fetch the image URL. Please try with a different image.'
      );
    }
  }
  // Assume raw base64 string
  return `data:image/png;base64,${image}`;
}

/**
 * Ensure an image value is an HTTP(S) URL.
 * If it's already a URL, return as-is.
 * If it's a base64 data URL or raw base64, upload to Cloudinary via storage service
 * and return the resulting URL.
 */
export async function ensureUrl(image: string): Promise<string> {
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }
  // Convert base64 -> Cloudinary ephemeral URL
  const base64 = image.startsWith('data:')
    ? image
    : `data:image/png;base64,${image}`;
  const storage = getStorageService();
  const result = await storage.uploadEphemeral(base64, {
    folder: 'thumpiks/face-swap-inputs',
    tags: ['face-swap', 'ephemeral'],
  });
  return result.secureUrl;
}

// AI service wrapper with proper interface
export const aiService = {
  isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  generateThumbnails: async (options: {
    userId?: string;
    prompt: string;
    style?: string;
    count?: number;
    model?: string;
  }) => {
    try {
      logger.info('[AI Service] Generating with model', {
        model: options.model || 'default',
      });
      const images = await openRouterService.generateImages(
        options.prompt,
        options.model || undefined,
        options.style || 'thumbnail'
      );
      logger.info('[AI Service] Generated images', { count: images.length });
      if (images.length === 0) {
        logger.warn('[AI Service] OpenRouter returned 0 images!');
      }
      return images;
    } catch (error) {
      logger.error(
        '[AI Service] Thumbnail generation error',
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  },
};
