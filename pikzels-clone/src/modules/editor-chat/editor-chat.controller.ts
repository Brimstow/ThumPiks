import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { deductCredits } from '../credit/credit.service';
import { getEditorChatService } from './editor-chat.service';
import type { ChatStreamRequest } from './types';

/**
 * POST /api/editor-chat/stream
 * Stream a multi-turn chat completion as SSE events.
 *
 * Body: ChatStreamRequest
 * Response: text/event-stream with events: token, actions, done, error
 */
export const streamEditorChat = async (
  req: AuthRequest,
  res: Response
): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { messages, canvasContext, platformPreset } =
      req.body as ChatStreamRequest;

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

    if (lastMessage.content.length > 2000) {
      return res
        .status(400)
        .json({ error: 'Message must be under 2000 characters' });
    }

    // Validate canvas context
    if (!canvasContext || typeof canvasContext !== 'object') {
      return res.status(400).json({ error: 'Canvas context is required' });
    }

    const ctx = {
      width: canvasContext.width || 1280,
      height: canvasContext.height || 720,
      layers: Array.isArray(canvasContext.layers) ? canvasContext.layers : [],
    };

    // Deduct 1 credit for chat turn
    const creditDeducted = await deductCredits(
      req.user.id,
      1,
      'AI editor chat turn'
    );
    if (!creditDeducted) {
      return res.status(402).json({ error: 'Insufficient credits' });
    }

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

    const service = getEditorChatService();
    await service.streamChat(
      messages,
      ctx,
      platformPreset,
      send,
      () => aborted
    );

    if (!res.writableEnded) {
      res.end();
    }
  } catch (error: any) {
    if (error.message === 'Insufficient credits') {
      if (!res.headersSent) {
        return res.status(402).json({ error: error.message });
      }
    }
    if (
      error.message?.includes('API key not configured') ||
      error.message?.includes('not configured')
    ) {
      if (!res.headersSent) {
        return res.status(503).json({ error: 'AI service not configured' });
      }
    }

    console.error('Error in editor chat stream:', error.message || error);

    // If headers already sent (SSE started), send error as event
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
