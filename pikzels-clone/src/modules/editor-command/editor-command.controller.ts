import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { getEditorCommandService } from './editor-command.service';
import { logger } from '../../utils/logger';

/**
 * POST /api/editor-command
 * Parse a natural language command into structured editor actions.
 *
 * Body: {
 *   prompt: string,          // The user's natural language command
 *   canvasContext: {          // Current editor state
 *     width: number,
 *     height: number,
 *     layers: Array<{
 *       id: string,
 *       type: 'image' | 'text' | 'shape' | 'drawing',
 *       name: string,
 *       visible: boolean,
 *       locked: boolean,
 *       selected: boolean,
 *       text?: string,
 *       font?: string,
 *       fontSize?: number,
 *       color?: string,
 *     }>
 *   }
 * }
 */
export const parseEditorCommand = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { prompt, canvasContext, canvasScreenshot } = req.body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length > 500) {
      return res.status(400).json({ error: 'Prompt must be under 500 characters' });
    }

    if (!canvasContext || typeof canvasContext !== 'object') {
      return res.status(400).json({ error: 'Canvas context is required' });
    }

    // Provide sensible defaults for canvas dimensions
    const ctx = {
      width: canvasContext.width || 1280,
      height: canvasContext.height || 720,
      layers: Array.isArray(canvasContext.layers) ? canvasContext.layers : [],
    };

    const result = await getEditorCommandService().parseCommand(
      prompt.trim(),
      ctx,
      canvasScreenshot,
      user.id
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg === 'Insufficient credits for AI commands') {
      return res.status(402).json({ error: msg });
    }
    if (msg?.includes('API key not configured')) {
      logger.error('Editor command config error', error instanceof Error ? error : undefined);
      return res.status(503).json({ error: 'AI service not configured' });
    }
    logger.error('Error in editor command', error instanceof Error ? error : undefined);
    return res.status(500).json({
      error: msg || 'Failed to parse command',
    });
  }
};
