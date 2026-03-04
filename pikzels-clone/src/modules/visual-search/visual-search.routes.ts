import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  searchByImage,
  searchByText,
  indexThumbnail,
  indexBatch,
  healthCheck,
  resolveUrl,
} from './visual-search.controller';

const router = Router();

// All visual search routes require authentication
router.use(authenticateToken);

// Search endpoints
router.post('/by-image', (req, res) => searchByImage(req as unknown as AuthRequest, res));
router.post('/by-text', (req, res) => searchByText(req as unknown as AuthRequest, res));

// Indexing endpoints
router.post('/index/:thumbnailId', (req, res) =>
  indexThumbnail(req as unknown as AuthRequest, res)
);
router.post('/index-batch', (req, res) =>
  indexBatch(req as unknown as AuthRequest, res)
);

// URL resolution (for TikTok oEmbed)
router.post('/resolve-url', (req, res) => resolveUrl(req as unknown as AuthRequest, res));

// Health check
router.get('/health', (req, res) => healthCheck(req as unknown as AuthRequest, res));

export default router;
