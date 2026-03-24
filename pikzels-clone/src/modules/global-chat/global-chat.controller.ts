import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { getGlobalChatService } from './global-chat.service';
import type {
  GlobalChatStreamRequest,
  CreateSessionRequest,
  GlobalChatScope,
} from './types';

// ── Lazy service initialization ─────────────────────────────────────────────

let service: ReturnType<typeof getGlobalChatService> | null = null;

function getService() {
  if (!service) service = getGlobalChatService();
  return service;
}

// ── Handlers ────────────────────────────────────────────────────────────────

/**
 * POST /api/global-chat/stream
 * Stream a multi-turn chat completion as SSE events.
 */
export const streamGlobalChat = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId, messages, scope, imageData } =
      req.body as GlobalChatStreamRequest;

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role !== 'user' || !lastMessage.content?.trim()) {
      return res
        .status(400)
        .json({ error: 'Last message must be a non-empty user message' });
    }

    if (lastMessage.content.length > 4000) {
      return res
        .status(400)
        .json({ error: 'Message must be under 4000 characters' });
    }

    // Validate image size (10MB max for base64)
    if (imageData && imageData.length > 10 * 1024 * 1024 * 1.37) {
      return res.status(400).json({ error: 'Image must be under 10MB' });
    }

    const chatScope: GlobalChatScope = scope || 'general';

    // Create session if none provided
    const svc = getService();
    let resolvedSessionId = sessionId;

    if (!resolvedSessionId) {
      const session = await svc.createSession(req.user.id, chatScope);
      resolvedSessionId = session.id;
    }

    // NO credit deduction — global chat is free

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const send = (event: string, data: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Abort flag
    let aborted = false;
    req.on('close', () => {
      aborted = true;
    });

    await svc.streamChat(
      resolvedSessionId,
      req.user.id,
      messages,
      chatScope,
      imageData,
      send,
      () => aborted
    );

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error: any) {
    console.error('Error in global chat stream:', error.message || error);

    if (res.headersSent && !res.writableEnded) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: error.message || 'Chat failed' })}\n\n`
      );
      res.end();
    } else if (!res.headersSent) {
      return res.status(500).json({ error: error.message || 'Chat failed' });
    }
  }
};

/**
 * POST /api/global-chat/sessions
 * Create a new chat session.
 */
export const createSession = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { scope } = req.body as CreateSessionRequest;
  const session = await getService().createSession(
    req.user.id,
    scope || 'general'
  );

  return res.status(201).json(session);
};

/**
 * GET /api/global-chat/sessions
 * List user's chat sessions.
 */
export const listSessions = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const result = await getService().listSessions(req.user.id, limit, offset);
  return res.json(result);
};

/**
 * GET /api/global-chat/sessions/:id
 * Get a session with its messages.
 */
export const getSession = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const session = await getService().getSession(req.params.id!, req.user.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json(session);
};

/**
 * POST /api/global-chat/sessions/:id/escalate
 * Escalate a chat session to a support ticket.
 */
export const escalateSession = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = await getService().escalateToTicket(
    req.params.id!,
    req.user.id
  );
  if (!result) {
    return res
      .status(400)
      .json({ error: 'Session not found or already escalated' });
  }

  return res.json(result);
};

/**
 * PATCH /api/global-chat/sessions/:id/archive
 * Archive a chat session.
 */
export const archiveSession = async (
  req: AuthRequest,
  res: Response
): Promise<Response> => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const success = await getService().archiveSession(
    req.params.id!,
    req.user.id
  );
  if (!success) {
    return res.status(404).json({ error: 'Session not found' });
  }

  return res.json({ success: true });
};
