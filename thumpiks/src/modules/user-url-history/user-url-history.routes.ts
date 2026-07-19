import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import {
  getUrlHistory,
  saveUrl,
  clearAllHistory,
  togglePinEntry,
  bulkDeleteEntries,
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

// PATCH /api/url-history/:id/pin — toggle pin/save
router.patch('/:id/pin', (req, res) =>
  togglePinEntry(req as unknown as AuthRequest, res)
);

// POST /api/url-history/bulk-delete — delete multiple entries
router.post('/bulk-delete', (req, res) =>
  bulkDeleteEntries(req as AuthRequest, res)
);

// DELETE /api/url-history/all — clear all history (must be before /:id)
router.delete('/all', (req, res) => clearAllHistory(req as AuthRequest, res));

// DELETE /api/url-history/:id — delete a history entry
router.delete('/:id', (req, res) =>
  deleteUrlEntry(req as unknown as AuthRequest, res)
);

export default router;
