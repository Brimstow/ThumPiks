import { Router } from 'express';
import { AuthRequest } from '../../types/auth';
import {
  getAssets,
  uploadAsset,
  deleteAsset,
  getStorageUsage,
} from './user-asset.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/user-assets — list user's assets (optional ?type=face|background|logo|other)
router.get('/', (req, res) => getAssets(req as AuthRequest, res));

// POST /api/user-assets — upload a new asset (base64 imageData or imageUrl)
router.post('/', (req, res) => uploadAsset(req as AuthRequest, res));

// DELETE /api/user-assets/:id — delete an asset
router.delete('/:id', (req, res) => deleteAsset(req as unknown as AuthRequest, res));

// GET /api/user-assets/usage — get storage usage stats
router.get('/usage', (req, res) => getStorageUsage(req as AuthRequest, res));

export default router;
