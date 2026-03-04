import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { getEditorCommandService } from './editor-command.service';

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
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, canvasContext } = req.body;

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
      req.user.id
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    if (error.message === 'Insufficient credits for AI commands') {
      return res.status(402).json({ error: error.message });
    }
    if (error.message?.includes('API key not configured')) {
      console.error('Editor command config error:', error.message);
      return res.status(503).json({ error: 'AI service not configured' });
    }
    console.error('Error in editor command:', error.message || error);
    return res.status(500).json({
      error: error.message || 'Failed to parse command',
    });
  }
};
