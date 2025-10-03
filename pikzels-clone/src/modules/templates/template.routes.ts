import { Router } from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
} from './template.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();

// Public routes
router.get('/', (req, res) => getTemplates(req as unknown as AuthRequest, res));
router.get('/:id', (req, res) => getTemplateById(req as unknown as AuthRequest, res));

// Protected routes  
router.post('/', authenticateToken, (req, res) => createTemplate(req as unknown as AuthRequest, res));
router.put('/:id', authenticateToken, (req, res) => updateTemplate(req as unknown as AuthRequest, res));
router.delete('/:id', authenticateToken, (req, res) => deleteTemplate(req as unknown as AuthRequest, res));

export default router;