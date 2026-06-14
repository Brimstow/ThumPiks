import sharp from 'sharp';
import axios from 'axios';
import { WATERMARK_CONFIG } from '../../config/watermark.config';
import { getPlanById } from '../subscription/subscription.config';
import { logger } from '../../utils/logger';

// Lazy imports to avoid pulling Prisma/billing at module parse time
// (prevents test failures in image-processing tests that mock fs)
const lazyGetCurrentSubscription = () =>
  import('../subscription/subscription.service').then((m) => m.getCurrentSubscription);
const lazyGetStorageService = () =>
  import('../storage').then((m) => m.getStorageService);
const lazyGetPrisma = () =>
  import('../../utils/prisma-factory').then((m) => m.getPrisma);

/** TTL in days for clean originals before they are eligible for cleanup. */
const CLEAN_ORIGINAL_TTL_DAYS = 45;

// =========================================================================
// Types
// =========================================================================

export interface WatermarkResult {
  /** URLs to display in the UI (watermarked for free, clean for paid). */
  displayUrls: string[];
  /** Clean original URLs (always un-watermarked). Same as displayUrls for paid users. */
  originalUrls: string[];
  /** Cloudinary public IDs for clean originals (for cleanup). Empty for paid users. */
  originalPublicIds: string[];
}

export interface WatermarkFreeStatus {
  /** How many free clean exports remain this period. -1 = unlimited (paid user). */
  remaining: number;
  /** Total allowance per period. -1 = unlimited (paid user). */
  total: number;
}

export interface ConsumeResult {
  success: boolean;
  remaining: number;
}

// =========================================================================
// Core watermark functions (unchanged API)
// =========================================================================

/**
 * Checks whether a given plan type requires freemium watermarking.
 * Derives the answer from subscription.config.ts (single source of truth).
 */
export function shouldApplyWatermark(planType: string): boolean {
  const plan = getPlanById(planType);
  return plan?.features.watermark === true;
}

/**
 * Apply a diagonal tiled "ThumPiks" text watermark to an image buffer.
 *
 * Uses Sharp SVG composite with a <pattern> element for tiling.
 * Visual parameters are read from the shared WATERMARK_CONFIG.
 */
export async function applyFreemiumWatermark(
  imageBuffer: Buffer
): Promise<Buffer> {
  const metadata = await sharp(imageBuffer).metadata();
  const width = metadata.width ?? 1280;
  const height = metadata.height ?? 720;

  const {
    text,
    opacity,
    angleDegrees,
    fontFamily,
    fontWeight,
    color,
    strokeColor,
    strokeWidthRatio,
    fontSizeRatio,
    fontSizeMin,
    spacingXRatio,
    spacingYRatio,
  } = WATERMARK_CONFIG;

  const fontSize = Math.max(Math.round(width * fontSizeRatio), fontSizeMin);
  const spacingX = Math.max(Math.round(width * spacingXRatio), fontSize * 4);
  const spacingY = Math.max(Math.round(height * spacingYRatio), fontSize * 3);
  const strokeWidth = Math.max(fontSize * strokeWidthRatio, 0.5);

  // Escape XML special characters in the watermark text
  const safeText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Build an SVG with a tiled, rotated pattern covering the entire image.
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="wm" width="${spacingX}" height="${spacingY}"
             patternUnits="userSpaceOnUse"
             patternTransform="rotate(${angleDegrees})">
      <text x="${spacingX * 0.1}" y="${spacingY * 0.5}"
            font-family="${fontFamily}" font-weight="${fontWeight}"
            font-size="${fontSize}" fill="${color}" opacity="${opacity}"
            stroke="${strokeColor}" stroke-width="${strokeWidth}"
            paint-order="stroke">${safeText}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#wm)" />
</svg>`;

  const watermarkedBuffer = await sharp(imageBuffer)
    .composite([{ input: Buffer.from(svg), gravity: 'northwest' }])
    .toBuffer();

  return watermarkedBuffer;
}

// =========================================================================
// Watermark + clean original storage
// =========================================================================

/**
 * Watermark an array of image URLs if the user is on a free-tier plan.
 *
 * For paid users the URLs pass through unchanged.
 * For free users each image is:
 *   1. Fetched from the provider URL
 *   2. Clean buffer uploaded to permanent storage (thumpiks/originals/)
 *   3. Watermarked buffer uploaded to permanent storage (thumpiks/thumbnails/)
 *   4. Both URLs returned so the caller can store both
 */
export async function watermarkImageUrls(
  userId: string,
  imageUrls: string[]
): Promise<WatermarkResult> {
  // Determine the user's plan
  const subscription = await (await lazyGetCurrentSubscription())(userId);
  const planType = subscription?.planType || 'free';

  if (!shouldApplyWatermark(planType)) {
    // Paid users — pass through unchanged
    return {
      displayUrls: imageUrls,
      originalUrls: imageUrls,
      originalPublicIds: [],
    };
  }

  const displayUrls: string[] = [];
  const originalUrls: string[] = [];
  const originalPublicIds: string[] = [];

  // Watermark each image in parallel
  await Promise.all(
    imageUrls.map(async (url, index) => {
      try {
        // Fetch the image
        const response = await axios.get<ArrayBuffer>(url, {
          responseType: 'arraybuffer',
          timeout: 15_000,
          headers: { 'User-Agent': 'ThumPiks/1.0' },
        });
        const cleanBuffer = Buffer.from(response.data);

        const storage = (await lazyGetStorageService())();
        const isAvailable = await storage.isAvailable();

        if (isAvailable) {
          // Upload clean original to permanent storage
          const cleanResult = await storage.uploadCleanOriginal(cleanBuffer);
          originalUrls[index] = cleanResult.secureUrl;
          originalPublicIds[index] = cleanResult.publicId;

          // Apply watermark and upload to permanent storage
          const wmBuffer = await applyFreemiumWatermark(cleanBuffer);
          const wmResult = await storage.uploadThumbnail(wmBuffer, {
            tags: ['watermarked', 'freemium'],
          });
          displayUrls[index] = wmResult.secureUrl;
        } else {
          // Fallback: base64 data URLs (no clean original storage)
          const wmBuffer = await applyFreemiumWatermark(cleanBuffer);
          displayUrls[index] = `data:image/png;base64,${wmBuffer.toString('base64')}`;
          originalUrls[index] = `data:image/png;base64,${cleanBuffer.toString('base64')}`;
          originalPublicIds[index] = '';
        }
      } catch (error) {
        logger.warn(
          '[Watermark] Failed to watermark image, returning original',
          { url, error: String(error) }
        );
        // Degrade gracefully — don't break the user flow
        displayUrls[index] = url;
        originalUrls[index] = url;
        originalPublicIds[index] = '';
      }
    })
  );

  return { displayUrls, originalUrls, originalPublicIds };
}

// =========================================================================
// Watermark-free export quota
// =========================================================================

/**
 * Get the current watermark-free export status for a user.
 *
 * Uses a lazy-reset pattern: if the reset date has passed, the counter
 * is reset and the date advanced by 30 days — no cron job needed.
 */
export async function getWatermarkFreeStatus(
  userId: string
): Promise<WatermarkFreeStatus> {
  const prisma = (await lazyGetPrisma())();
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    return { remaining: 0, total: 0 };
  }

  const plan = getPlanById(subscription.planType);
  if (!plan) {
    return { remaining: 0, total: 0 };
  }

  const allowance = plan.features.watermarkFreeExports;

  // Paid users: unlimited (no watermark at all)
  if (allowance === -1) {
    return { remaining: -1, total: -1 };
  }

  // Lazy reset: if the reset date has passed, reset the counter
  const now = new Date();
  if (now >= subscription.watermarkFreeResetDate) {
    const nextReset = new Date(now);
    nextReset.setDate(nextReset.getDate() + 30);

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        watermarkFreeUsed: 0,
        watermarkFreeResetDate: nextReset,
      },
    });

    return { remaining: allowance, total: allowance };
  }

  const remaining = Math.max(0, allowance - subscription.watermarkFreeUsed);
  return { remaining, total: allowance };
}

/**
 * Consume one watermark-free export for the user.
 *
 * Returns `{ success: true }` if consumed, `{ success: false }` if none left.
 * Uses atomic increment to prevent race conditions across tabs.
 */
export async function consumeWatermarkFreeExport(
  userId: string
): Promise<ConsumeResult> {
  const status = await getWatermarkFreeStatus(userId);

  // Paid users don't consume from a counter
  if (status.remaining === -1) {
    return { success: true, remaining: -1 };
  }

  if (status.remaining <= 0) {
    return { success: false, remaining: 0 };
  }

  // Atomic increment
  const prisma = (await lazyGetPrisma())();
  const subscription = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!subscription) {
    return { success: false, remaining: 0 };
  }

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      watermarkFreeUsed: { increment: 1 },
    },
  });

  logger.info('Watermark-free export consumed', {
    userId,
    remaining: status.remaining - 1,
  });

  return { success: true, remaining: status.remaining - 1 };
}

// =========================================================================
// Cleanup expired clean originals
// =========================================================================

/**
 * Delete clean originals older than 45 days from Cloudinary and null out
 * the DB fields. Call via admin endpoint or external cron.
 */
export async function cleanupExpiredOriginals(): Promise<number> {
  const prisma = (await lazyGetPrisma())();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEAN_ORIGINAL_TTL_DAYS);

  const expired = await prisma.thumbnail.findMany({
    where: {
      originalImageUrl: { not: null },
      originalPublicId: { not: null },
      createdAt: { lt: cutoffDate },
    },
    select: { id: true, originalPublicId: true },
  });

  if (expired.length === 0) {
    logger.info('[Cleanup] No expired clean originals found');
    return 0;
  }

  const storage = (await lazyGetStorageService())();
  let cleaned = 0;

  for (const thumbnail of expired) {
    try {
      if (thumbnail.originalPublicId) {
        await storage.delete(thumbnail.originalPublicId);
      }

      await prisma.thumbnail.update({
        where: { id: thumbnail.id },
        data: {
          originalImageUrl: null,
          originalPublicId: null,
        },
      });

      cleaned++;
    } catch (error) {
      logger.error('[Cleanup] Failed to clean up original', error as Error, {
        thumbnailId: thumbnail.id,
      });
      // Continue with next — don't let one failure block the batch
    }
  }

  logger.info(`[Cleanup] Cleaned ${cleaned}/${expired.length} expired originals`);
  return cleaned;
}

/**
 * Check if a thumbnail's clean original has expired (older than 45 days).
 */
export function isCleanOriginalExpired(createdAt: Date): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - CLEAN_ORIGINAL_TTL_DAYS);
  return createdAt < cutoffDate;
}
