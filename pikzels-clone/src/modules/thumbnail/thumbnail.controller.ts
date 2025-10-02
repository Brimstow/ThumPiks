import { Request, Response } from 'express';
import { ThumbnailService } from './thumbnail.service';
import { ImageProcessingService } from './image-processing.service';
import { AIService } from './ai.service';
import { AIEnhancementService } from '../ai/ai-enhancement.service';
import { PrismaClient } from '@prisma/client';

const thumbnailService = new ThumbnailService();
const imageProcessingService = new ImageProcessingService();
const aiService = new AIService();
const aiEnhancementService = new AIEnhancementService();
const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

// Export all the controller methods
export const createThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, imageUrl, prompt, parameters, projectId } = req.body;

    // Validate required fields
    if (!title || !prompt || !projectId) {
      return res.status(400).json({
        error: 'Title, prompt, and projectId are required',
      });
    }

    const thumbnail = await thumbnailService.createThumbnail({
      title,
      imageUrl: imageUrl || '',
      prompt,
      parameters: parameters || {},
      projectId,
      userId: req.user.id,
    });

    res.status(201).json({ thumbnail });
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getThumbnails = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    const thumbnails = await thumbnailService.getThumbnailsByUser(req.user.id, {
      search: search as string,
      projectId: projectId as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      style: style as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    res.status(200).json({ thumbnails });
  } catch (error) {
    console.error('Error fetching thumbnails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getThumbnailById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json({ thumbnail });
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { title, imageUrl, prompt, parameters } = req.body;

    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      title,
      imageUrl,
      prompt,
      parameters,
    });

    res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    console.error('Error updating thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await thumbnailService.deleteThumbnail(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, style, projectId } = req.body;

    // Validate required fields
    if (!prompt || !projectId) {
      return res.status(400).json({
        error: 'Prompt and projectId are required',
      });
    }

    // Validate style if provided
    const validStyles = ['bold', 'minimalist', 'dramatic'];
    if (style && !validStyles.includes(style.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid style. Must be one of: bold, minimalist, dramatic',
      });
    }

    // Check if AI service is configured
    if (aiService.isConfigured()) {
      // Use AI service to generate thumbnails
      try {
        const imageUrls = await aiService.generateThumbnails(
          prompt,
          style || 'bold',
          3
        );

        // Generate 3 variations
        const thumbnails = [];
        for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
          const thumbnail = await thumbnailService.createThumbnail({
            title: `${prompt.substring(0, 30)} ${i + 1}`,
            imageUrl: imageUrls[i],
            prompt,
            parameters: {
              style: style || 'bold',
              variation: i + 1,
              aiGenerated: true,
            },
            projectId,
            userId: req.user.id,
          });
          thumbnails.push(thumbnail);
        }

        res.status(201).json({
          message: 'Thumbnails generated successfully with AI',
          thumbnails,
        });
      } catch (aiError) {
        console.error(
          'Error generating thumbnails with AI, falling back to placeholders:',
          aiError
        );

        // Fallback to placeholder images if AI generation fails
        const imageUrl = `https://placehold.co/1280x720/${Math.floor(Math.random() * 16777215).toString(16)}/FFFFFF?text=${encodeURIComponent(prompt.substring(0, 30))}`;

        // Generate 3 variations
        const thumbnails = [];
        for (let i = 1; i <= 3; i++) {
          const thumbnail = await thumbnailService.createThumbnail({
            title: `${prompt.substring(0, 30)} ${i}`,
            imageUrl: imageUrl,
            prompt,
            parameters: {
              style: style || 'bold',
              variation: i,
              aiGenerated: false,
              aiError:
                aiError instanceof Error ? aiError.message : String(aiError),
            },
            projectId,
            userId: req.user.id,
          });
          thumbnails.push(thumbnail);
        }

        res.status(201).json({
          message: 'Thumbnails generated with placeholders (AI service error)',
          thumbnails,
          aiError: aiError instanceof Error ? aiError.message : String(aiError),
        });
      }
    } else {
      // Fallback to placeholder images if AI service is not configured
      const imageUrl = `https://placehold.co/1280x720/${Math.floor(Math.random() * 16777215).toString(16)}/FFFFFF?text=${encodeURIComponent(prompt.substring(0, 30))}`;

      // Generate 3 variations
      const thumbnails = [];
      for (let i = 1; i <= 3; i++) {
        const thumbnail = await thumbnailService.createThumbnail({
          title: `${prompt.substring(0, 30)} ${i}`,
          imageUrl: imageUrl,
          prompt,
          parameters: {
            style: style || 'bold',
            variation: i,
            aiGenerated: false,
            aiNotConfigured: true,
          },
          projectId,
          userId: req.user.id,
        });
        thumbnails.push(thumbnail);
      }

      res.status(201).json({
        message:
          'Thumbnails generated with placeholders (AI service not configured)',
        thumbnails,
        aiNotConfigured: true,
      });
    }
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Download thumbnail endpoint
export const downloadThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // In a real implementation, we would:
    // 1. Fetch the actual image file from storage
    // 2. Set appropriate headers for file download
    // 3. Stream the file to the client
    //
    // For this implementation, we'll redirect to the image URL
    // which will allow the browser to handle the download

    // Set headers to force download
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${thumbnail.title.replace(/[^a-zA-Z0-9]/g, '_')}.png"`
    );
    res.setHeader('Content-Type', 'image/png');

    // Redirect to the image URL
    res.redirect(thumbnail.imageUrl);
  } catch (error) {
    console.error('Error downloading thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply edits to thumbnail endpoint
export const applyEdits = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { edits } = req.body;

    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Process the image with the edits
    let processedImageUrl = thumbnail.imageUrl;
    try {
      // Only process if there are actual edits
      if (edits && Object.keys(edits).length > 0) {
        const processedImagePath =
          await imageProcessingService.applyEditsToImage(
            thumbnail.imageUrl,
            edits,
            id
          );
        processedImageUrl =
          imageProcessingService.getProcessedImageUrl(processedImagePath);
      }
    } catch (processingError) {
      console.error('Error processing image:', processingError);
      // Continue with storing edits even if image processing fails
    }

    // Store the edits in the parameters field
    const updatedParameters = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
      edits: edits || {},
      processedImageUrl, // Store the processed image URL
    };

    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      parameters: updatedParameters,
      // Update the imageUrl to point to the processed image
      imageUrl: processedImageUrl,
    });

    res.status(200).json({
      message: 'Edits applied successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    console.error('Error applying edits to thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply AI style transfer to thumbnail endpoint
export const applyStyleTransfer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { styleType } = req.body;

    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate style type
    const availableStyles = aiEnhancementService.getAvailableStyles();
    if (!styleType || !availableStyles.includes(styleType.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid style type. Available styles: ${availableStyles.join(', ')}`,
      });
    }

    // Apply style transfer
    const styledImagePath = await aiEnhancementService.applyStyleTransfer(
      thumbnail.imageUrl,
      styleType,
      id
    );

    const styledImageUrl =
      aiEnhancementService.getProcessedImageUrl(styledImagePath);

    // Update the thumbnail with the styled image
    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      imageUrl: styledImageUrl,
      parameters: {
        ...(typeof thumbnail.parameters === 'object'
          ? thumbnail.parameters
          : {}),
        styleType,
        styledImageUrl,
      },
    });

    res.status(200).json({
      message: 'Style transfer applied successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    console.error('Error applying style transfer to thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply AI image enhancement to thumbnail endpoint
export const applyImageEnhancement = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { enhancementType } = req.body;

    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate enhancement type
    const availableEnhancements =
      aiEnhancementService.getAvailableEnhancements();
    if (
      !enhancementType ||
      !availableEnhancements.includes(enhancementType.toLowerCase())
    ) {
      return res.status(400).json({
        error: `Invalid enhancement type. Available enhancements: ${availableEnhancements.join(', ')}`,
      });
    }

    // Apply image enhancement
    const enhancedImagePath = await aiEnhancementService.enhanceImage(
      thumbnail.imageUrl,
      enhancementType,
      id
    );

    const enhancedImageUrl =
      aiEnhancementService.getProcessedImageUrl(enhancedImagePath);

    // Update the thumbnail with the enhanced image
    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      imageUrl: enhancedImageUrl,
      parameters: {
        ...(typeof thumbnail.parameters === 'object'
          ? thumbnail.parameters
          : {}),
        enhancementType,
        enhancedImageUrl,
      },
    });

    res.status(200).json({
      message: 'Image enhancement applied successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    console.error('Error applying image enhancement to thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate shareable link for thumbnail
export const generateShareLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Generate a unique share token (in a real implementation, you might want to store this in the database)
    const shareToken = require('crypto').randomBytes(32).toString('hex');

    // Store the share token in the thumbnail parameters
    const updatedParameters = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
      shareToken,
      shareExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    };

    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      parameters: updatedParameters,
    });

    // Generate the shareable URL
    const shareUrl = `${req.protocol}://${req.get('host')}/api/thumbnails/share/${shareToken}`;

    res.status(200).json({
      message: 'Share link generated successfully',
      shareUrl,
      shareToken,
      expiresAt: updatedParameters.shareExpiresAt,
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Access shared thumbnail
export const accessSharedThumbnail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    // Find thumbnail by share token
    // Note: This is a simplified approach. In a real implementation, you might want to:
    // 1. Add a dedicated shareToken field to the database schema
    // 2. Or use a more robust method to query JSON fields
    const thumbnails = await prisma.thumbnail.findMany({
      where: {
        // This is a workaround for querying JSON fields
        // In a production environment, you'd want a dedicated field for share tokens
      },
      include: {
        project: true,
      },
    });

    // Filter by share token in application code
    const thumbnail = thumbnails.find(
      t =>
        t.parameters &&
        typeof t.parameters === 'object' &&
        'shareToken' in t.parameters &&
        t.parameters.shareToken === token
    );

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

    if (shareExpiresAt && new Date(shareExpiresAt as any) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    res.status(200).json({ thumbnail });
  } catch (error) {
    console.error('Error accessing shared thumbnail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Revoke share link
export const revokeShareLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Remove share token from parameters
    const updatedParameters = {
      ...(typeof thumbnail.parameters === 'object' ? thumbnail.parameters : {}),
    };
    delete (updatedParameters as any).shareToken;
    delete (updatedParameters as any).shareExpiresAt;

    const updatedThumbnail = await thumbnailService.updateThumbnail(id, {
      parameters: updatedParameters,
    });

    res.status(200).json({
      message: 'Share link revoked successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    console.error('Error revoking share link:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Set thumbnail as featured for its project
export const setAsFeatured = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const thumbnail = await thumbnailService.getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Set this thumbnail as featured for its project
    const updatedThumbnail = await thumbnailService.setThumbnailAsFeatured(
      id,
      thumbnail.projectId
    );

    res.status(200).json({
      message: 'Thumbnail set as featured successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error: any) {
    if (error.message === 'Thumbnail does not belong to this project') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error setting thumbnail as featured:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available AI styles
export const getAvailableStyles = async (req: AuthRequest, res: Response) => {
  try {
    const styles = aiEnhancementService.getAvailableStyles();
    res.status(200).json({ styles });
  } catch (error) {
    console.error('Error fetching available styles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available AI enhancements
export const getAvailableEnhancements = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const enhancements = aiEnhancementService.getAvailableEnhancements();
    res.status(200).json({ enhancements });
  } catch (error) {
    console.error('Error fetching available enhancements:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
