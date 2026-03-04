import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';
import { parseEditorCommand } from './editor-command.controller';

const router = Router();

// All editor command routes require authentication
router.use(authenticateToken);

// POST /api/editor-command - Parse natural language into editor actions
router.post('/', (req, res) => parseEditorCommand(req as AuthRequest, res));

export default router;
