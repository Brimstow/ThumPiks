import { Request, Response } from 'express';
import { TemplateService } from './template.service';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';

const templateService = new TemplateService();

/**
 * Create a new template
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { name, content } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Create template logic here
    const template = { id: '1', name, content };

    return res.status(201).json({ template });
  } catch (error) {
    logger.error(
      'Error creating template',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get templates with filtering
 */
export const getTemplates = async (req: Request, res: Response) => {
  try {
    const {
      search,
      tags,
      isPublic,
      creatorId,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query;

    const filters: {
      search?: string;
      tags?: string[];
      isPublic?: boolean;
      creatorId?: string;
      sortBy?: 'createdAt' | 'downloads' | 'likes';
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {};

    if (search) filters.search = search as string;
    if (tags) filters.tags = (tags as string).split(',');
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (creatorId) filters.creatorId = creatorId as string;
    if (sortBy) filters.sortBy = sortBy as 'createdAt' | 'downloads' | 'likes';
    if (sortOrder) filters.sortOrder = sortOrder as 'asc' | 'desc';
    if (page) filters.page = parseInt(page as string);
    if (limit) filters.limit = parseInt(limit as string);

    const templates = await templateService.getTemplates(filters);

    res.status(200).json(templates);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(
      'Error fetching templates',
      error instanceof Error ? error : new Error(String(error))
    );
    res.status(500).json({ error: msg || 'Failed to fetch templates' });
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Get template logic here
    const template = { id, name: 'Sample Template' };

    return res.status(200).json({ template });
  } catch (error) {
    logger.error(
      'Error getting template',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update template
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const { name, content } = req.body;

    // Update template logic here
    const template = { id, name, content };

    return res.status(200).json({ template });
  } catch (error) {
    logger.error(
      'Error updating template',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Delete template logic here

    return res.status(204).send();
  } catch (error) {
    logger.error(
      'Error deleting template',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await templateService.incrementDownloads(id);
    return res.status(200).json({ template });
  } catch (error) {
    logger.error(
      'Error downloading template',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleLikeTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await templateService.toggleLike(id);
    return res.status(200).json({ template });
  } catch (error) {
    logger.error(
      'Error toggling like',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({ error: 'Internal server error' });
  }
};
