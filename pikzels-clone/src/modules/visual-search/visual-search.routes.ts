import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import {
  searchByImage,
  searchByText,
  indexThumbnail,
  indexBatch,
  healthCheck,
} from './visual-search.controller';

const router = Router();

// All visual search routes require authentication
router.use(authenticateToken);

// Search endpoints
router.post('/by-image', (req, res) => searchByImage(req as AuthRequest, res));
router.post('/by-text', (req, res) => searchByText(req as AuthRequest, res));

// Indexing endpoints
router.post('/index/:thumbnailId', (req, res) =>
  indexThumbnail(req as AuthRequest, res)
);
router.post('/index-batch', (req, res) =>
  indexBatch(req as AuthRequest, res)
);

// Health check
router.get('/health', (req, res) => healthCheck(req as AuthRequest, res));

export default router;
