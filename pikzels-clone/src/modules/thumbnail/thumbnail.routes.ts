import { Router } from 'express';
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
  getAvailableEnhancements
} from './thumbnail.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// All routes in this file require authentication
router.use(authenticateToken);

// Thumbnail CRUD operations
router.post('/', createThumbnail);
router.post('/generate', generateThumbnail);
router.get('/', getThumbnails);
router.get('/:id', getThumbnailById);
router.put('/:id', updateThumbnail);
router.delete('/:id', deleteThumbnail);

// Download thumbnail route
router.get('/:id/download', downloadThumbnail);

// Apply edits to thumbnail route
router.post('/:id/edit', applyEdits);

// Thumbnail sharing routes
router.post('/:id/share', generateShareLink);
router.get('/share/:token', accessSharedThumbnail);
router.delete('/:id/share', revokeShareLink);

// Set thumbnail as featured
router.post('/:id/featured', setAsFeatured);

// AI Enhancement routes
router.post('/:id/style-transfer', applyStyleTransfer);
router.post('/:id/image-enhancement', applyImageEnhancement);
router.get('/ai/styles', getAvailableStyles);
router.get('/ai/enhancements', getAvailableEnhancements);

export default router;