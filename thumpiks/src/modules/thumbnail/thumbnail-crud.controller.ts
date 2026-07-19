import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { isZodError } from '../../utils/json-validation';
import { logger } from '../../utils/logger';
import { cleanupExpiredOriginals } from './watermark.service';
import { getThumbnailService } from './thumbnail.shared';
import type { Request } from 'express';

export const createThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { title, imageUrl, prompt, parameters, projectId, originalImageUrl, originalPublicId } = req.body;

    // Validate required fields — prompt is optional for non-AI flows
    if (!title || !projectId) {
      return res.status(400).json({
        error: 'Title and projectId are required',
      });
    }

    const thumbnail = await getThumbnailService().createThumbnail({
      title,
      imageUrl: imageUrl || '',
      prompt: prompt || '',
      parameters: parameters || {},
      projectId,
      userId: user.id,
      ...(originalImageUrl && { originalImageUrl }),
      ...(originalPublicId && { originalPublicId }),
    });

    return res.status(201).json({ thumbnail });
  } catch (error) {
    if (isZodError(error)) {
      return res.status(400).json({
        error: 'Invalid thumbnail parameters',
        details: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    logger.error('Error creating thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getThumbnails = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    // Extract query parameters for filtering and sorting
    const {
      search,
      projectId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      style,
      dateFrom,
      dateTo,
    } = req.query;

    // Build filter object conditionally to handle exactOptionalPropertyTypes
    const filters: Record<string, unknown> = {};
    if (search) filters.search = String(search);
    if (projectId) filters.projectId = String(projectId);
    if (sortBy) filters.sortBy = String(sortBy);
    if (sortOrder === 'asc' || sortOrder === 'desc')
      filters.sortOrder = sortOrder;
    if (style) filters.style = String(style);
    if (dateFrom) filters.dateFrom = new Date(String(dateFrom));
    if (dateTo) filters.dateTo = new Date(String(dateTo));

    const thumbnails = await getThumbnailService().getThumbnailsByUser(
      user.id,
      filters
    );

    return res.status(200).json({ thumbnails });
  } catch (error) {
    logger.error('Error fetching thumbnails', error instanceof Error ? error : new Error(String(error)), {
      message: error instanceof Error ? error.message : String(error),
      userId: req.user?.id || '',
    });
    return res.status(500).json({
      error: 'Internal server error',
      debug: process.env.NODE_ENV === 'test' ? String(error) : undefined,
    });
  }
};

export const getThumbnailById = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json({ thumbnail });
  } catch (error) {
    logger.error('Error fetching thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const { title, imageUrl, prompt, parameters, projectId } = req.body;

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // If moving to a new project, validate the target project belongs to this user
    if (projectId && projectId !== (thumbnail as Record<string, unknown>).projectId) {
      const { ProjectService } = await import('../project/project.service');
      const projectService = new ProjectService();
      const targetProject = await projectService.getProjectById(projectId);
      if (!targetProject || targetProject.userId !== user.id) {
        return res
          .status(403)
          .json({ error: 'Target project not found or not owned by you' });
      }
    }

    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      title,
      imageUrl,
      prompt,
      parameters,
      projectId,
    });

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    if (isZodError(error)) {
      return res.status(400).json({
        error: 'Invalid thumbnail parameters',
        details: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    logger.error('Error updating thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await getThumbnailService().deleteThumbnail(id);
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkMoveThumbnails = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { thumbnailIds, targetProjectId } = req.body;

    if (!Array.isArray(thumbnailIds) || thumbnailIds.length === 0) {
      return res.status(400).json({ error: 'thumbnailIds array is required' });
    }
    if (!targetProjectId) {
      return res.status(400).json({ error: 'targetProjectId is required' });
    }

    // Validate target project belongs to user
    const { ProjectService } = await import('../project/project.service');
    const projectService = new ProjectService();
    const targetProject = await projectService.getProjectById(targetProjectId);
    if (!targetProject || targetProject.userId !== user.id) {
      return res
        .status(403)
        .json({ error: 'Target project not found or not owned by you' });
    }

    const result = await getThumbnailService().bulkMoveThumbnails(
      thumbnailIds,
      targetProjectId,
      user.id
    );

    return res.status(200).json(result);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'No valid thumbnails found') {
      return res.status(404).json({ error: errMsg });
    }
    logger.error('Error bulk moving thumbnails', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// =============================================================================
// TRASH / RESTORE ENDPOINTS - Soft-delete lifecycle management
// =============================================================================

/**
 * Get user's deleted (trashed) thumbnails
 */
export const getDeletedThumbnails = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const thumbnails = await getThumbnailService().getDeletedThumbnails(
      user.id
    );

    return res.status(200).json({
      message: 'Deleted thumbnails retrieved',
      thumbnails,
      count: thumbnails.length,
    });
  } catch (error) {
    logger.error('Error fetching deleted thumbnails', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Restore a soft-deleted thumbnail
 */
export const restoreThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    // Fetch including deleted
    const thumbnail = await getThumbnailService().getThumbnailById(id, true);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    if (thumbnail.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!thumbnail.deletedAt) {
      return res.status(400).json({ error: 'Thumbnail is not deleted' });
    }

    const restored = await getThumbnailService().restoreThumbnail(id);

    return res.status(200).json({
      message: 'Thumbnail restored successfully',
      thumbnail: restored,
    });
  } catch (error) {
    logger.error('Error restoring thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Permanently delete a soft-deleted thumbnail (hard delete)
 */
export const hardDeleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id, true);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    if (thumbnail.userId !== user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await getThumbnailService().hardDeleteThumbnail(id);

    return res.status(200).json({
      message: 'Thumbnail permanently deleted',
      thumbnail: deleted,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Thumbnail must be soft-deleted first') {
      return res.status(400).json({ error: error.message });
    }
    logger.error('Error hard-deleting thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Admin: cleanup expired clean originals (45-day TTL)
export const cleanupExpiredOriginalsHandler = async (_req: Request, res: Response) => {
  try {
    const cleaned = await cleanupExpiredOriginals();
    return res.status(200).json({
      success: true,
      cleaned,
    });
  } catch (error) {
    logger.error('Error cleaning up expired originals', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
