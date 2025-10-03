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

export default router;
