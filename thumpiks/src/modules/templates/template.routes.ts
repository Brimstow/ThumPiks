import { Router } from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from './template.controller';
import {
  authenticateToken,
  requireFeature,
} from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();

// Public routes
router.get('/', (req, res) => getTemplates(req as unknown as AuthRequest, res));
router.get('/:id', (req, res) =>
  getTemplateById(req as unknown as AuthRequest, res)
);

// Protected routes - require auth + customTemplates feature (pro+ plans)
router.post(
  '/',
  authenticateToken,
  userApiRateLimit,
  requireFeature('customTemplates'),
  (req, res) => createTemplate(req as unknown as AuthRequest, res)
);
router.put(
  '/:id',
  authenticateToken,
  userApiRateLimit,
  requireFeature('customTemplates'),
  (req, res) => updateTemplate(req as unknown as AuthRequest, res)
);
router.delete(
  '/:id',
  authenticateToken,
  userApiRateLimit,
  requireFeature('customTemplates'),
  (req, res) => deleteTemplate(req as unknown as AuthRequest, res)
);

export default router;
