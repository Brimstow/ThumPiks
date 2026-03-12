import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import {
  getUrlHistory,
  saveUrl,
  deleteUrlEntry,
} from './user-url-history.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// GET /api/url-history — list user's URL history
router.get('/', (req, res) => getUrlHistory(req as AuthRequest, res));

// POST /api/url-history — save/update a URL entry
router.post('/', (req, res) => saveUrl(req as AuthRequest, res));

// DELETE /api/url-history/:id — delete a history entry
router.delete('/:id', (req, res) =>
  deleteUrlEntry(req as unknown as AuthRequest, res)
);

export default router;
