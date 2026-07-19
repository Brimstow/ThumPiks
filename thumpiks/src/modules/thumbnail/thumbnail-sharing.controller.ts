import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { isZodError } from '../../utils/json-validation';
import { logger } from '../../utils/logger';
import * as crypto from 'crypto';
import { shouldApplyWatermark, consumeWatermarkFreeExport, isCleanOriginalExpired } from './watermark.service';
import { getCurrentSubscription } from '../subscription/subscription.service';
import { getThumbnailService, getPrisma, getImageProcessingService } from './thumbnail.shared';

// Apply edits to thumbnail endpoint
export const applyEdits = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    const { edits, watermarkFree } = req.body;

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

    // Process the image with the edits
    let processedImageUrl = thumbnail.imageUrl;
    try {
      // Only process if there are actual edits
      if (edits && Object.keys(edits).length > 0) {
        // Check if free-tier watermark should be baked into the processed image
        const subscription = await getCurrentSubscription(user.id);
        const planType = subscription?.planType || 'free';
        let needsWatermark = shouldApplyWatermark(planType);

        // If user requests watermark-free and has quota, skip the watermark
        if (needsWatermark && watermarkFree) {
          const wmResult = await consumeWatermarkFreeExport(user.id);
          if (wmResult.success) {
            needsWatermark = false;
          } else {
            return res.status(403).json({
              error: 'No watermark-free exports remaining this month',
              remaining: wmResult.remaining,
            });
          }
        }

        // Use clean original as source if available and user is getting watermark-free
        const sourceImageUrl = (!needsWatermark && thumbnail.originalImageUrl && !isCleanOriginalExpired(thumbnail.createdAt))
          ? thumbnail.originalImageUrl
          : thumbnail.imageUrl;

        const processedImagePath =
          await getImageProcessingService().applyEditsToImage(
            sourceImageUrl,
            edits,
            id,
            { applyFreemiumWatermark: needsWatermark }
          );
        processedImageUrl =
          getImageProcessingService().getProcessedImageUrl(processedImagePath);
      }
    } catch (processingError) {
      logger.error('Error processing image', processingError instanceof Error ? processingError : new Error(String(processingError)));
      // Continue with storing edits even if image processing fails
    }

    // Store the edits in the parameters field
    const updatedParameters = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
      edits: edits || {},
      processedImageUrl, // Store the processed image URL
    };

    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      parameters: updatedParameters,
      // Update the imageUrl to point to the processed image
      imageUrl: processedImageUrl,
    });

    return res.status(200).json({
      message: 'Edits applied successfully',
      thumbnail: updatedThumbnail,
    });
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
    logger.error('Error applying edits to thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply AI style transfer to thumbnail endpoint
export const applyStyleTransfer = async (req: AuthRequest, res: Response) => {
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

    // Style transfer logic here
    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      parameters: {
        ...(typeof thumbnail.parameters === 'object'
          ? thumbnail.parameters
          : {}),
        styleTransfer: true,
      },
    });

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    logger.error('Error applying style transfer', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply AI image enhancement to thumbnail endpoint
export const applyImageEnhancement = async (
  req: AuthRequest,
  res: Response
) => {
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

    // Image enhancement logic here
    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      parameters: {
        ...(typeof thumbnail.parameters === 'object'
          ? thumbnail.parameters
          : {}),
        imageEnhancement: true,
      },
    });

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    logger.error('Error applying image enhancement', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate shareable link for thumbnail
export const generateShareLink = async (req: AuthRequest, res: Response) => {
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

    // Generate a unique share token
    const shareToken = crypto.randomBytes(32).toString('hex');

    // Store the share token in the thumbnail parameters
    const updatedParameters = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
      shareToken,
      shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    };

    await getThumbnailService().updateThumbnail(id, {
      parameters: updatedParameters,
    });

    // Generate the shareable URL
    const shareUrl = `${req.protocol}://${req.get('host')}/api/thumbnails/share/${shareToken}`;

    return res.status(200).json({
      message: 'Share link generated successfully',
      shareUrl,
      shareToken,
      expiresAt: updatedParameters.shareExpiresAt,
    });
  } catch (error) {
    logger.error('Error generating share link', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Access shared thumbnail
export const accessSharedThumbnail = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token) {
      return res.status(400).json({ error: 'Share token is required' });
    }

    // Find thumbnail by share token using JSON path filter
    const thumbnail = await getPrisma().thumbnail.findFirst({
      where: {
        parameters: {
          path: ['shareToken'],
          equals: token,
        },
        deletedAt: null,
      },
      include: {
        Project_Thumbnail_projectIdToProject: true,
      },
    });

    if (!thumbnail) {
      return res.status(404).json({ error: 'Shared thumbnail not found' });
    }

    // Check if share link has expired
    const shareExpiresAt =
      thumbnail.parameters &&
      typeof thumbnail.parameters === 'object' &&
      'shareExpiresAt' in thumbnail.parameters
        ? thumbnail.parameters.shareExpiresAt
        : null;

    if (shareExpiresAt && new Date(String(shareExpiresAt)) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    return res.status(200).json({ thumbnail });
  } catch (error) {
    logger.error('Error accessing shared thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Revoke share link
export const revokeShareLink = async (req: AuthRequest, res: Response) => {
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

    // Remove share token from parameters
    const updatedParameters: Record<string, unknown> = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
    };
    delete updatedParameters.shareToken;
    delete updatedParameters.shareExpiresAt;

    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      parameters: updatedParameters,
    });

    return res.status(200).json({
      message: 'Share link revoked successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    logger.error('Error revoking share link', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Set thumbnail as featured for its project
export const setAsFeatured = async (req: AuthRequest, res: Response) => {
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

    // Set this thumbnail as featured for its project
    const updatedThumbnail = await getThumbnailService().setThumbnailAsFeatured(
      id,
      thumbnail.projectId
    );

    return res.status(200).json({
      message: 'Thumbnail set as featured successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'Thumbnail does not belong to this project') {
      return res.status(400).json({ error: errMsg });
    }

    logger.error('Error setting thumbnail as featured', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Recategorize thumbnail platform
export const recategorizeThumbnail = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const { platform } = req.body;
    const validPlatforms = ['youtube', 'tiktok', 'instagram', 'twitter'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
      });
    }

    const thumbnail = await getThumbnailService().recategorizeThumbnail(
      id,
      platform,
      user.id
    );

    return res.status(200).json({ thumbnail });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '';
    if (errMsg === 'Thumbnail not found') {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    if (errMsg === 'Not authorized') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    logger.error('Error recategorizing thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Failed to recategorize thumbnail' });
  }
};

// Get available AI styles
export const getAvailableStyles = async (_req: Request, res: Response) => {
  try {
    const styles = [
      { id: 'bold', name: 'Bold', description: 'Bold and impactful style' },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Clean and minimal design',
      },
      { id: 'colorful', name: 'Colorful', description: 'Vibrant and colorful' },
      {
        id: 'professional',
        name: 'Professional',
        description: 'Business-ready style',
      },
    ];

    return res.status(200).json({ styles });
  } catch (error) {
    logger.error('Error fetching available styles', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available AI enhancements
export const getAvailableEnhancements = async (
  _req: Request,
  res: Response
) => {
  try {
    const enhancements = [
      {
        id: 'upscale',
        name: 'Upscale',
        description: 'Increase image resolution',
      },
      { id: 'enhance', name: 'Enhance', description: 'Improve image quality' },
      { id: 'colorize', name: 'Colorize', description: 'Add vibrant colors' },
      { id: 'stylize', name: 'Stylize', description: 'Apply artistic styles' },
    ];

    return res.status(200).json({ enhancements });
  } catch (error) {
    logger.error('Error fetching available enhancements', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
