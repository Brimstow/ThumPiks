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
import { cacheMiddleware } from '../../middleware/cache.middleware';

const router = Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Thumbnail CRUD operations
router.post('/', (req, res) => createThumbnail(req as AuthRequest, res));
router.post('/generate', (req, res) => generateThumbnail(req as AuthRequest, res));
router.get('/', cacheMiddleware({ ttl: 300 }), (req, res) => getThumbnails(req as AuthRequest, res));
router.get('/:id', cacheMiddleware({ ttl: 600 }), (req, res) => getThumbnailById(req as AuthRequest, res));
router.put('/:id', (req, res) => updateThumbnail(req as unknown as AuthRequest, res));
router.delete('/:id', (req, res) => deleteThumbnail(req as unknown as AuthRequest, res));

// Download thumbnail route
router.get('/:id/download', (req, res) => downloadThumbnail(req as unknown as AuthRequest, res));

// Apply edits to thumbnail route
router.post('/:id/edit', (req, res) => applyEdits(req as unknown as AuthRequest, res));

// Thumbnail sharing routes
router.post('/:id/share', (req, res) => generateShareLink(req as unknown as AuthRequest, res));
router.get('/share/:token', (req, res) => accessSharedThumbnail(req as unknown as AuthRequest, res));
router.delete('/:id/share', (req, res) => revokeShareLink(req as unknown as AuthRequest, res));

// Set thumbnail as featured
router.post('/:id/featured', (req, res) => setAsFeatured(req as unknown as AuthRequest, res));

// AI Enhancement routes with caching for static data
router.post('/:id/style-transfer', (req, res) => applyStyleTransfer(req as unknown as AuthRequest, res));
router.post('/:id/image-enhancement', (req, res) => applyImageEnhancement(req as unknown as AuthRequest, res));
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

// Inpaint - Edit specific areas of an image
// Body: { image: base64, mask?: base64, prompt: string }
router.post('/ai/inpaint', (req, res) => aiInpaint(req as AuthRequest, res));

// Face Swap - Replace face in target with face from source
// Body: { sourceImage: base64, targetImage: base64, prompt?: string }
router.post('/ai/face-swap', (req, res) => aiFaceSwap(req as AuthRequest, res));

// Upscale - Increase image resolution
// Body: { image: base64, scale?: '2x' | '4x' }
router.post('/ai/upscale', (req, res) => aiUpscale(req as AuthRequest, res));

// Remove Background - Extract subject from background
// Body: { image: base64, backgroundColor?: string }
router.post('/ai/remove-background', (req, res) => aiRemoveBackground(req as AuthRequest, res));

// Enhance - Improve image quality
// Body: { image: base64, enhancementType?: 'auto' | 'color' | 'sharpen' | 'denoise' | 'hdr' }
router.post('/ai/enhance', (req, res) => aiEnhance(req as AuthRequest, res));

export default router;
