import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import {
  createThumbnail,
  getThumbnails,
  getThumbnailById,
  updateThumbnail,
  deleteThumbnail,
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
  aiInpaint,
  aiFaceSwap,
  aiUpscale,
  aiRemoveBackground,
  aiEnhance,
  getAIToolModels,
} from './thumbnail.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { cacheMiddleware, invalidateCacheMiddleware } from '../../middleware/cache.middleware';
import { CacheKeys } from '../../services/cache.service';

const router = Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Thumbnail CRUD operations
// POST - invalidate thumbnails cache after creating new thumbnail
router.post('/', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  CacheKeys.userThumbnails('*'),
]), (req, res) => createThumbnail(req as AuthRequest, res));

router.post('/generate', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  CacheKeys.userThumbnails('*'),
]), (req, res) => generateThumbnail(req as AuthRequest, res));

router.get('/', cacheMiddleware({ ttl: 300 }), (req, res) => getThumbnails(req as AuthRequest, res));
router.get('/:id', cacheMiddleware({ ttl: 600 }), (req, res) => getThumbnailById(req as AuthRequest, res));

// PUT - invalidate cache after updating thumbnail
router.put('/:id', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
  CacheKeys.userThumbnails('*'),
]), (req, res) => updateThumbnail(req as unknown as AuthRequest, res));

// DELETE - invalidate cache after deleting thumbnail
router.delete('/:id', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
  CacheKeys.userThumbnails('*'),
]), (req, res) => deleteThumbnail(req as unknown as AuthRequest, res));

// Download thumbnail route
router.get('/:id/download', (req, res) => downloadThumbnail(req as unknown as AuthRequest, res));

// Apply edits to thumbnail route - invalidate cache after edits
router.post('/:id/edit', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
  CacheKeys.userThumbnails('*'),
]), (req, res) => applyEdits(req as unknown as AuthRequest, res));

// Thumbnail sharing routes
router.post('/:id/share', invalidateCacheMiddleware([
  `social:*`,
  CacheKeys.socialShares('*'),
]), (req, res) => generateShareLink(req as unknown as AuthRequest, res));
router.get('/share/:token', (req, res) => accessSharedThumbnail(req as unknown as AuthRequest, res));
router.delete('/:id/share', invalidateCacheMiddleware([
  `social:*`,
  CacheKeys.socialShares('*'),
]), (req, res) => revokeShareLink(req as unknown as AuthRequest, res));

// Set thumbnail as featured
router.post('/:id/featured', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => setAsFeatured(req as unknown as AuthRequest, res));

// AI Enhancement routes with caching for static data
router.post('/:id/style-transfer', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => applyStyleTransfer(req as unknown as AuthRequest, res));
router.post('/:id/image-enhancement', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => applyImageEnhancement(req as unknown as AuthRequest, res));
router.get('/ai/styles', cacheMiddleware({ ttl: 3600 }), (req, res) => getAvailableStyles(req as AuthRequest, res));
router.get('/ai/enhancements', cacheMiddleware({ ttl: 3600 }), (req, res) => getAvailableEnhancements(req as AuthRequest, res));

// =============================================================================
// AI TOOL ROUTES - OpenRouter with tool-specific models
// =============================================================================
// These routes use dedicated AI models for each operation:
// - Inpaint: google/gemini-3-pro-image-preview (contextual editing)
// - Face Swap: bytedance-seed/seedream-4.5 (portrait optimization)
// - Upscale: black-forest-labs/flux.2-max (detail preservation)
// - Remove Background: google/gemini-3-pro-image-preview
// - Enhance: google/gemini-3-pro-image-preview
// =============================================================================

// Get AI tool model configurations (which model is used for each tool)
router.get('/ai/models', cacheMiddleware({ ttl: 3600 }), (req, res) => getAIToolModels(req as AuthRequest, res));

// Inpaint - Edit specific areas of an image (invalidates thumbnail cache)
// Body: { image: base64, mask?: base64, prompt: string }
router.post('/ai/inpaint', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => aiInpaint(req as AuthRequest, res));

// Face Swap - Replace face in target with face from source (invalidates thumbnail cache)
// Body: { sourceImage: base64, targetImage: base64, prompt?: string }
router.post('/ai/face-swap', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => aiFaceSwap(req as AuthRequest, res));

// Upscale - Increase image resolution (invalidates thumbnail cache)
// Body: { image: base64, scale?: '2x' | '4x' }
router.post('/ai/upscale', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => aiUpscale(req as AuthRequest, res));

// Remove Background - Extract subject from background (invalidates thumbnail cache)
// Body: { image: base64, backgroundColor?: string }
router.post('/ai/remove-background', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => aiRemoveBackground(req as AuthRequest, res));

// Enhance - Improve image quality (invalidates thumbnail cache)
// Body: { image: base64, enhancementType?: 'auto' | 'color' | 'sharpen' | 'denoise' | 'hdr' }
router.post('/ai/enhance', invalidateCacheMiddleware([
  `api:*:/thumbnails:*`,
  `thumbnail:*`,
]), (req, res) => aiEnhance(req as AuthRequest, res));

export default router;
