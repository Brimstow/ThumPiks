import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import {
  createThumbnail,
  getThumbnails,
  getThumbnailById,
  updateThumbnail,
  deleteThumbnail,
  bulkMoveThumbnails,
  generateThumbnail,
  downloadThumbnail,
  applyEdits,
  generateShareLink,
  accessSharedThumbnail,
  revokeShareLink,
  setAsFeatured,
  applyStyleTransfer,
  applyImageEnhancement,
  getAvailableStyles,
  getAvailableEnhancements,
  // AI Tool endpoints (OpenRouter with tool-specific models)
  aiGenerate,
  aiGenerateText,
  aiInpaint,
  aiFaceSwap,
  aiUpscale,
  aiRemoveBackground,
  aiEnhance,
  aiSegment,
  aiDecompose,
  aiExpand,
  getAIToolModels,
  // Trash / Restore endpoints
  getDeletedThumbnails,
  restoreThumbnail,
  hardDeleteThumbnail,
  cleanupExpiredOriginalsHandler,
} from './thumbnail.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { authenticateAdmin } from '../admin/admin-auth.middleware';
import {
  cacheMiddleware,
  invalidateCacheMiddleware,
} from '../../middleware/cache.middleware';
import {
  userApiRateLimit,
  userAiRateLimit,
  creditGenerationRateLimit,
} from '../../middleware/security.middleware';
import { CacheKeys } from '../../services/cache.service';
import { getReplicateQueue } from './replicate-queue.service';

const router = Router();

// All routes in this file require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// Thumbnail CRUD operations
// POST - invalidate thumbnails cache after creating new thumbnail
router.post(
  '/',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => createThumbnail(req as AuthRequest, res)
);

router.post(
  '/generate',
  creditGenerationRateLimit, // Strict per-user limit: 10/min (credit-deducting endpoint)
  userAiRateLimit,           // Broader AI limit: 30/15min per user
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => generateThumbnail(req as AuthRequest, res)
);

router.get('/', cacheMiddleware({ ttl: 300 }), (req, res) =>
  getThumbnails(req as AuthRequest, res)
);

// Bulk move thumbnails between projects
router.post(
  '/bulk-move',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => bulkMoveThumbnails(req as AuthRequest, res)
);

router.get('/:id', cacheMiddleware({ ttl: 600 }), (req, res) =>
  getThumbnailById(req as AuthRequest, res)
);

// PUT - invalidate cache after updating thumbnail
router.put(
  '/:id',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => updateThumbnail(req as unknown as AuthRequest, res)
);

// DELETE - invalidate cache after deleting thumbnail
router.delete(
  '/:id',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => deleteThumbnail(req as unknown as AuthRequest, res)
);

// Download thumbnail route
router.get('/:id/download', (req, res) =>
  downloadThumbnail(req as unknown as AuthRequest, res)
);

// Trash / Restore routes
router.get('/trash', (req, res) =>
  getDeletedThumbnails(req as unknown as AuthRequest, res)
);
router.post(
  '/:id/restore',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => restoreThumbnail(req as unknown as AuthRequest, res)
);
router.delete(
  '/:id/permanent',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => hardDeleteThumbnail(req as unknown as AuthRequest, res)
);

// Apply edits to thumbnail route - invalidate cache after edits
router.post(
  '/:id/edit',
  invalidateCacheMiddleware([
    `api:*:/thumbnails:*`,
    `thumbnail:*`,
    CacheKeys.userThumbnails('*'),
  ]),
  (req, res) => applyEdits(req as unknown as AuthRequest, res)
);

// Thumbnail sharing routes
router.post(
  '/:id/share',
  invalidateCacheMiddleware([`social:*`, CacheKeys.socialShares('*')]),
  (req, res) => generateShareLink(req as unknown as AuthRequest, res)
);
router.get('/share/:token', (req, res) =>
  accessSharedThumbnail(req as unknown as AuthRequest, res)
);
router.delete(
  '/:id/share',
  invalidateCacheMiddleware([`social:*`, CacheKeys.socialShares('*')]),
  (req, res) => revokeShareLink(req as unknown as AuthRequest, res)
);

// Set thumbnail as featured
router.post(
  '/:id/featured',
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => setAsFeatured(req as unknown as AuthRequest, res)
);

// AI Enhancement routes with caching for static data
router.post(
  '/:id/style-transfer',
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => applyStyleTransfer(req as unknown as AuthRequest, res)
);
router.post(
  '/:id/image-enhancement',
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => applyImageEnhancement(req as unknown as AuthRequest, res)
);
router.get('/ai/styles', cacheMiddleware({ ttl: 3600 }), (req, res) =>
  getAvailableStyles(req as AuthRequest, res)
);
router.get('/ai/enhancements', cacheMiddleware({ ttl: 3600 }), (req, res) =>
  getAvailableEnhancements(req as AuthRequest, res)
);

// =============================================================================
// AI TOOL ROUTES - Multi-provider with tool-specific models
// =============================================================================
// Provider routing:
// - Replicate: segment (SAM 2), remove-bg (RMBG 2.0), upscale (Real-ESRGAN)
// - OpenRouter: generate, inpaint (Gemini 3 Pro), face-swap (Seedream 4.5), enhance
// - Fallback: remove-bg and upscale fall back to OpenRouter if Replicate unavailable
// =============================================================================

// Get AI tool model configurations (which model is used for each tool)
router.get('/ai/models', cacheMiddleware({ ttl: 3600 }), (req, res) =>
  getAIToolModels(req as AuthRequest, res)
);

// Generate - Text-to-image generation (invalidates thumbnail cache)
// Body: { prompt: string, style?: string, tier?: string, model?: string, aspectRatio?: string }
router.post(
  '/ai/generate',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiGenerate(req as AuthRequest, res)
);

// Inpaint - Edit specific areas of an image (invalidates thumbnail cache)
// Body: { image: base64, mask?: base64, prompt: string }
router.post(
  '/ai/inpaint',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiInpaint(req as AuthRequest, res)
);

// Face Swap - Replace face in target with face from source (invalidates thumbnail cache)
// Body: { sourceImage: base64, targetImage: base64, prompt?: string }
router.post(
  '/ai/face-swap',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiFaceSwap(req as AuthRequest, res)
);

// Upscale - Increase image resolution (invalidates thumbnail cache)
// Body: { image: base64, scale?: '2x' | '4x' }
router.post(
  '/ai/upscale',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiUpscale(req as AuthRequest, res)
);

// Remove Background - Extract subject from background (invalidates thumbnail cache)
// Body: { image: base64, backgroundColor?: string }
router.post(
  '/ai/remove-background',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiRemoveBackground(req as AuthRequest, res)
);

// Enhance - Improve image quality (invalidates thumbnail cache)
// Body: { image: base64, enhancementType?: 'auto' | 'color' | 'sharpen' | 'denoise' | 'hdr' }
router.post(
  '/ai/enhance',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiEnhance(req as AuthRequest, res)
);

// Generate Text - AI-powered title/text suggestions (no cache invalidation needed)
// Body: { prompt: string, context?: string, tone?: string, count?: number, maxLength?: number, tier?: string, imageUrl?: string, imageBase64?: string }
// When imageUrl/imageBase64 is provided, uses a vision model to analyze the image directly
router.post('/ai/generate-text', userAiRateLimit, (req, res) =>
  aiGenerateText(req as AuthRequest, res)
);

// Segment - SAM 2 object segmentation via Replicate (invalidates thumbnail cache)
// Body: { image: base64, points?: Array<{x, y, label}>, box?: [x1, y1, x2, y2] }
router.post(
  '/ai/segment',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiSegment(req as AuthRequest, res)
);

// Decompose - Auto-decompose image into isolated layers using SAM (invalidates thumbnail cache)
// Body: { image: base64, maxLayers?: number }
router.post(
  '/ai/decompose',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiDecompose(req as AuthRequest, res)
);

// Expand - Outpaint/extend canvas in any direction (invalidates thumbnail cache)
// Body: { image: base64, prompt?: string, direction?: 'left'|'right'|'top'|'bottom'|'all', expandPixels?: number }
router.post(
  '/ai/expand',
  userAiRateLimit,
  invalidateCacheMiddleware([`api:*:/thumbnails:*`, `thumbnail:*`]),
  (req, res) => aiExpand(req as AuthRequest, res)
);

// =============================================================================
// JOB STATUS POLLING — enables async AI operations without blocking HTTP
// Frontend submits job via POST, then polls GET /ai/job/:jobId for result.
// =============================================================================
router.get('/ai/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const queue = getReplicateQueue();

    if (!queue.isReady()) {
      return res.status(503).json({ error: 'Queue service not available' });
    }

    const status = await queue.getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(status);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to get job status' });
  }
});

// Admin: cleanup expired clean originals (45-day TTL)
router.post('/cleanup-expired-originals', authenticateAdmin, cleanupExpiredOriginalsHandler);

export default router;
