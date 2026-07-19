import { Request, Response, Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';
import { streamEditorChat } from './editor-chat.controller';

const router = Router();

// All editor chat routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// POST /api/editor-chat/stream - Stream a multi-turn chat as SSE
router.post('/stream', (req: Request, res: Response) =>
  streamEditorChat(req as AuthRequest, res)
);

export default router;
