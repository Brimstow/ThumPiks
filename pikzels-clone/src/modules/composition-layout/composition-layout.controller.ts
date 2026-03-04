import { Request, Response } from 'express';
import { CompositionLayoutService } from './composition-layout.service';
import { AuthRequest } from '../../types/auth';

const layoutService = new CompositionLayoutService();

/**
 * Get composition layouts with filtering
 * Public route — returns all public layouts (built-in + community)
 */
export const getCompositionLayouts = async (req: Request, res: Response) => {
  try {
    const {
      category,
      search,
      tags,
      builtIn,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const filters: any = {
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

    const layouts = await layoutService.getLayouts(filters);
    return res.status(200).json(layouts);
  } catch (error) {
    console.error('Error fetching composition layouts:', error);
    return res.status(500).json({ error: 'Failed to fetch composition layouts' });
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

    const layout = await layoutService.getLayoutById(id);
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    return res.status(200).json(layout);
  } catch (error) {
    console.error('Error fetching composition layout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new user-made composition layout
 */
export const createCompositionLayout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, description, category, tags, wireframeSvg, slots, textSlots, fallbackBackground, previewUrl, isPublic, canvasWidth, canvasHeight } = req.body;

    if (!name || !wireframeSvg || !slots || !Array.isArray(slots)) {
      return res.status(400).json({
        error: 'name, wireframeSvg, and slots (array) are required',
      });
    }

    const layout = await layoutService.createLayout(req.user.id, {
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
    console.error('Error creating composition layout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a composition layout
 */
export const updateCompositionLayout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.updateLayout(id, req.user.id, req.body);
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found or not editable' });
    }

    return res.status(200).json(layout);
  } catch (error) {
    console.error('Error updating composition layout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a composition layout
 */
export const deleteCompositionLayout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const deleted = await layoutService.deleteLayout(id, req.user.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Layout not found or not deletable' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting composition layout:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Increment download count for a layout
 */
export const downloadCompositionLayout = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.incrementDownloads(id);
    return res.status(200).json(layout);
  } catch (error) {
    console.error('Error recording layout download:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Toggle like on a layout
 */
export const likeCompositionLayout = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { like } = req.body; // true = like, false = unlike

    if (!id) {
      return res.status(400).json({ error: 'Layout ID is required' });
    }

    const layout = await layoutService.toggleLike(id, like !== false);
    return res.status(200).json(layout);
  } catch (error) {
    console.error('Error toggling layout like:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
