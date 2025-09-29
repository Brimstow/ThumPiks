import express from 'express';
import {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  incrementTemplateDownloads,
  toggleTemplateLike
} from './template.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = express.Router();

// Public routes
router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.post('/:id/download', incrementTemplateDownloads);
router.post('/:id/like', toggleTemplateLike);

// Protected routes
router.post('/', authenticateToken, createTemplate);
router.put('/:id', authenticateToken, updateTemplate);
router.delete('/:id', authenticateToken, deleteTemplate);

export default router;