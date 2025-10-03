import { Request, Response } from 'express';
import { TemplateService } from './template.service';
import { AuthRequest } from '../../types/auth';

const templateService = new TemplateService();

/**
 * Create a new template
 */
export const createTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, content } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Create template logic here
    const template = { id: '1', name, content };
    
    return res.status(201).json({ template });
  } catch (error) {
    console.error('Error creating template:', error);
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

    const filters: any = {};

    if (search) filters.search = search as string;
    if (tags) filters.tags = (tags as string).split(',');
    if (isPublic !== undefined) filters.isPublic = isPublic === 'true';
    if (creatorId) filters.creatorId = creatorId as string;
    if (sortBy) filters.sortBy = sortBy as string;
    if (sortOrder) filters.sortOrder = sortOrder as 'asc' | 'desc';
    if (page) filters.page = parseInt(page as string);
    if (limit) filters.limit = parseInt(limit as string);

    const templates = await templateService.getTemplates(filters);

    res.status(200).json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to fetch templates' });
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Get template logic here
    const template = { id, name: 'Sample Template' };
    
    return res.status(200).json({ template });
  } catch (error) {
    console.error('Error getting template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update template
 */
export const updateTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const { name, content } = req.body;
    
    // Update template logic here
    const template = { id, name, content };
    
    return res.status(200).json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    // Delete template logic here
    
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const downloadTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await templateService.incrementDownloads(id);
    return res.status(200).json({ template });
  } catch (error) {
    console.error('Error downloading template:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleLikeTemplate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await templateService.toggleLike(id);
    return res.status(200).json({ template });
  } catch (error) {
    console.error('Error toggling like:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
