import { Router } from 'express';
import {
  getCompositionLayouts,
  getCompositionLayoutById,
  createCompositionLayout,
  updateCompositionLayout,
  deleteCompositionLayout,
  downloadCompositionLayout,
  likeCompositionLayout,
} from './composition-layout.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();

// Public routes
router.get('/', (req, res) => getCompositionLayouts(req, res));
router.get('/:id', (req, res) => getCompositionLayoutById(req, res));

// Protected routes
router.post('/', authenticateToken, userApiRateLimit, (req, res) =>
  createCompositionLayout(req as unknown as AuthRequest, res)
);
router.put('/:id', authenticateToken, userApiRateLimit, (req, res) =>
  updateCompositionLayout(req as unknown as AuthRequest, res)
);
router.delete('/:id', authenticateToken, userApiRateLimit, (req, res) =>
  deleteCompositionLayout(req as unknown as AuthRequest, res)
);
router.post('/:id/download', (req, res) => downloadCompositionLayout(req, res));
router.post('/:id/like', authenticateToken, userApiRateLimit, (req, res) =>
  likeCompositionLayout(req as unknown as AuthRequest, res)
);

export default router;
