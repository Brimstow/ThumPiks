import { Request, Response } from 'express';
import { CompositionLayoutService } from './composition-layout.service';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

const layoutService = new CompositionLayoutService();

/**
 * Get composition layouts with filtering
 * Public route — returns all public layouts (built-in + community)
 */
export const getCompositionLayouts = async (req: Request, res: Response) => {
  try {
    const { category, search, tags, builtIn, sortBy, sortOrder, page, limit } =
      req.query;

    const filters: {
      isPublic: boolean;
      category?: string;
      search?: string;
      tags?: string[];
      builtIn?: boolean;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {
      isPublic: true,
    };

    if (category) filters.category = category as string;
    if (search) filters.search = search as string;
    if (tags) filters.tags = (tags as string).split(',');
    if (builtIn !== undefined) filters.builtIn = builtIn === 'true';
    if (sortBy) filters.sortBy = sortBy as string;
    if (sortOrder) filters.sortOrder = sortOrder as 'asc' | 'desc';
    if (page) filters.page = parseInt(page as string);
    if (limit) filters.limit = parseInt(limit as string);

    const layouts = await layoutService.getLayouts(
      filters as import('./composition-layout.service').CompositionLayoutFilters
    );
    return res.status(200).json(layouts);
  } catch (error) {
    logger.error(
      'Error fetching composition layouts',
      error instanceof Error ? error : undefined
    );
    return res
      .status(500)
      .json({ error: 'Failed to fetch composition layouts' });
  }
};

/**
 * Get a single composition layout by ID
 */
export const getCompositionLayoutById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.getLayoutById(String(id));
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    return res.status(200).json(layout);
  } catch (error) {
    logger.error(
      'Error fetching composition layout',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new user-made composition layout
 */
export const createCompositionLayout = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      name,
      description,
      category,
      tags,
      wireframeSvg,
      slots,
      textSlots,
      fallbackBackground,
      previewUrl,
      isPublic,
      canvasWidth,
      canvasHeight,
    } = req.body;

    if (!name || !wireframeSvg || !slots || !Array.isArray(slots)) {
      return res.status(400).json({
        error: 'name, wireframeSvg, and slots (array) are required',
      });
    }

    const layout = await layoutService.createLayout(user.id, {
      name,
      description,
      category: category || 'custom',
      tags: tags || [],
      canvasWidth,
      canvasHeight,
      wireframeSvg,
      slots,
      textSlots,
      fallbackBackground,
      previewUrl,
      isPublic,
    });

    return res.status(201).json(layout);
  } catch (error) {
    logger.error(
      'Error creating composition layout',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a composition layout
 */
export const updateCompositionLayout = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.updateLayout(
      String(id),
      user.id,
      req.body
    );
    if (!layout) {
      return res
        .status(404)
        .json({ error: 'Layout not found or not editable' });
    }

    return res.status(200).json(layout);
  } catch (error) {
    logger.error(
      'Error updating composition layout',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a composition layout
 */
export const deleteCompositionLayout = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const deleted = await layoutService.deleteLayout(String(id), user.id);
    if (!deleted) {
      return res
        .status(404)
        .json({ error: 'Layout not found or not deletable' });
    }

    return res.status(204).send();
  } catch (error) {
    logger.error(
      'Error deleting composition layout',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Increment download count for a layout
 */
export const downloadCompositionLayout = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.incrementDownloads(String(id));
    return res.status(200).json(layout);
  } catch (error) {
    logger.error(
      'Error recording layout download',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Toggle like on a layout
 */
export const likeCompositionLayout = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { like } = req.body; // true = like, false = unlike

    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.toggleLike(String(id), like !== false);
    return res.status(200).json(layout);
  } catch (error) {
    logger.error(
      'Error toggling layout like',
      error instanceof Error ? error : undefined
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};
