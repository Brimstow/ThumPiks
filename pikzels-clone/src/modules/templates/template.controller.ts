import { Request, Response } from 'express';
import { TemplateService } from './template.service';
import { authenticateToken } from '../../middleware/auth';

const templateService = new TemplateService();

/**
 * Create a new template
 */
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { 
      name, 
      description, 
      thumbnailId, 
      parameters, 
      tags, 
      isPublic 
    } = req.body;
    
    const userId = (req as any).user.id;
    
    // Validate required fields
    if (!name || !thumbnailId || !parameters) {
      return res.status(400).json({ 
        error: 'Name, thumbnailId, and parameters are required' 
      });
    }
    
    const template = await templateService.createTemplate({
      name,
      description,
      thumbnailId,
      creatorId: userId,
      parameters,
      tags: tags || [],
      isPublic
    });
    
    res.status(201).json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: error.message || 'Failed to create template' });
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
      limit
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
    res.status(500).json({ error: error.message || 'Failed to fetch templates' });
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await templateService.getTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch template' });
  }
};

/**
 * Update template
 */
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    // Check if template exists and belongs to user
    const existingTemplate = await templateService.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (existingTemplate.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this template' });
    }
    
    const template = await templateService.updateTemplate(id, req.body);
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: error.message || 'Failed to update template' });
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    // Check if template exists and belongs to user
    const existingTemplate = await templateService.getTemplateById(id);
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (existingTemplate.creatorId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this template' });
    }
    
    await templateService.deleteTemplate(id);
    
    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
};

/**
 * Increment template download count
 */
export const incrementTemplateDownloads = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await templateService.incrementDownloads(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error incrementing template downloads:', error);
    res.status(500).json({ error: error.message || 'Failed to increment downloads' });
  }
};

/**
 * Toggle template like
 */
export const toggleTemplateLike = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const template = await templateService.toggleLike(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.status(200).json(template);
  } catch (error: any) {
    console.error('Error toggling template like:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle like' });
  }
};