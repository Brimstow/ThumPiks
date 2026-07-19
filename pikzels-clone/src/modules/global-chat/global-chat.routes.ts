import { Request, Response, Router } from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';
import {
  streamGlobalChat,
  createSession,
  listSessions,
  getSession,
  escalateSession,
  archiveSession,
} from './global-chat.controller';

const router = Router();

// All global chat routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// POST /api/global-chat/stream - Stream a multi-turn chat as SSE
router.post('/stream', (req: Request, res: Response) =>
  streamGlobalChat(req as AuthRequest, res)
);

// POST /api/global-chat/sessions - Create a new session
router.post('/sessions', (req: Request, res: Response) =>
  createSession(req as AuthRequest, res)
);

// GET /api/global-chat/sessions - List user's sessions
router.get('/sessions', (req: Request, res: Response) =>
  listSessions(req as AuthRequest, res)
);

// GET /api/global-chat/sessions/:id - Get session with messages
router.get('/sessions/:id', (req: Request, res: Response) =>
  getSession(req as AuthRequest, res)
);

// POST /api/global-chat/sessions/:id/escalate - Escalate to ticket
router.post('/sessions/:id/escalate', (req: Request, res: Response) =>
  escalateSession(req as AuthRequest, res)
);

// PATCH /api/global-chat/sessions/:id/archive - Archive session
router.patch('/sessions/:id/archive', (req: Request, res: Response) =>
  archiveSession(req as AuthRequest, res)
);

export default router;
