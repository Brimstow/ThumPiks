import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';
import { describeImage, searchImages, getHistory } from './vision.controller';

const router = Router();

// All vision routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// POST /api/vision/describe - Analyze an image with AI vision
router.post('/describe', (req, res) => describeImage(req as AuthRequest, res));

// GET /api/vision/search?q=query&count=20 - Search web images via Bing
router.get('/search', (req, res) => searchImages(req as AuthRequest, res));

// GET /api/vision/history?limit=20 - Get user's analysis history
router.get('/history', (req, res) => getHistory(req as AuthRequest, res));

export default router;
