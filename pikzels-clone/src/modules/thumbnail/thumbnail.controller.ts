import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ThumbnailService } from './thumbnail.service';
import { ImageProcessingService } from './image-processing.service';
import { OpenRouterAIService } from './openrouter-ai.service';
import { emitAnalyticsEvent } from '../../events/event-emitter';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

// Create shared instances that can be overridden for testing
let sharedPrisma: PrismaClient;
let sharedThumbnailService: ThumbnailService;
let sharedImageProcessingService: ImageProcessingService;

// Initialize services (can be overridden in tests)
export const initializeServices = (
  prismaClient?: PrismaClient, 
  cacheService?: any,
  eventDependencies?: any
) => {
  sharedPrisma = prismaClient || new PrismaClient();
  sharedThumbnailService = new ThumbnailService({ 
    prisma: sharedPrisma,
    cache: cacheService,
    ...eventDependencies
  });
  sharedImageProcessingService = new ImageProcessingService();
};

// Initialize with default instances for production
if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

// Getter functions to access services
const getThumbnailService = () => {
  if (!sharedThumbnailService) {
    initializeServices();
  }
  return sharedThumbnailService;
};

const getPrisma = () => {
  if (!sharedPrisma) {
    initializeServices();
  }
  return sharedPrisma;
};

const getImageProcessingService = () => {
  if (!sharedImageProcessingService) {
    initializeServices();
  }
  return sharedImageProcessingService;
};

// Initialize OpenRouter AI service for image generation
const openRouterService = new OpenRouterAIService();

// AI service wrapper with proper interface
const aiService = {
  isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  generateThumbnails: async (options: { userId?: string; prompt: string; style?: string; count?: number }) => {
    try {
      const images = await openRouterService.generateImages(
        options.prompt,
        undefined, // use default model
        options.style || 'thumbnail'
      );
      return images;
    } catch (error) {
      console.error('AI thumbnail generation error:', error);
      return [];
    }
  }
};

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

    const thumbnail = await getThumbnailService().createThumbnail({
      title,
      imageUrl: imageUrl || '',
      prompt,
      parameters: parameters || {},
      projectId,
      userId: req.user.id,
    });

    return res.status(201).json({ thumbnail });
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

    // Build filter object conditionally to handle exactOptionalPropertyTypes
    const filters: Record<string, any> = {};
    if (search) filters.search = String(search);
    if (projectId) filters.projectId = String(projectId);
    if (sortBy) filters.sortBy = String(sortBy);
    if (sortOrder === 'asc' || sortOrder === 'desc') filters.sortOrder = sortOrder;
    if (style) filters.style = String(style);
    if (dateFrom) filters.dateFrom = new Date(String(dateFrom));
    if (dateTo) filters.dateTo = new Date(String(dateTo));

    const thumbnails = await getThumbnailService().getThumbnailsByUser(req.user.id, filters);

    return res.status(200).json({ thumbnails });
  } catch (error) {
    console.error('Error fetching thumbnails:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error details:', { message: error instanceof Error ? error.message : String(error), userId: req.user?.id });
    return res.status(500).json({ error: 'Internal server error', debug: process.env.NODE_ENV === 'test' ? String(error) : undefined });
  }
};

export const getThumbnailById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.status(200).json({ thumbnail });
  } catch (error) {
    console.error('Error fetching thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }
    
    const { title, imageUrl, prompt, parameters } = req.body;

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      title,
      imageUrl,
      prompt,
      parameters,
    });

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    console.error('Error updating thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await getThumbnailService().deleteThumbnail(id);
    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const generateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    console.log('🎬 generateThumbnail called', { body: req.body, hasUser: !!req.user });
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, style, projectId, videoUrl, includeFace } = req.body;

    // Handle YouTube video URL generation
    if (videoUrl) {
      try {
        // Import video proxy service
        const { videoProxyService } = await import('../video-proxy/video-proxy.service');
        
        // Get video info from YouTube
        const videoInfo = await videoProxyService.getVideoInfo(videoUrl);
        
        // Find or create default project for this user
        const prisma = getPrisma();
        let defaultProject = await prisma.project.findFirst({
          where: {
            userId: req.user.id,
            name: 'Default'
          }
        });
        
        if (!defaultProject) {
          const { v4: uuidv4 } = await import('uuid');
          defaultProject = await prisma.project.create({
            data: {
              id: uuidv4(),
              name: 'Default',
              description: 'Default project for quick generations',
              userId: req.user.id,
              updatedAt: new Date(),
            }
          });
        }
        
        // Create thumbnail with video metadata
        const thumbnail = await getThumbnailService().createThumbnail({
          title: videoInfo.title,
          imageUrl: videoInfo.thumbnail || '',
          prompt: `YouTube video: ${videoInfo.title}`,
          parameters: {
            videoUrl: videoUrl,
            videoId: videoInfo.videoId,
            platform: videoInfo.platform,
            includeFace: includeFace || false,
            generatedFrom: 'video-url',
          },
          projectId: projectId || defaultProject.id,
          userId: req.user.id,
        });
        
        // Emit analytics event
        emitAnalyticsEvent(
          req.user.id,
          'generate',
          'thumbnail',
          thumbnail.id,
          {
            source: 'video-url',
            platform: videoInfo.platform,
            videoUrl: videoUrl,
            videoId: videoInfo.videoId,
          }
        );
        
        return res.status(201).json({
          success: true,
          thumbnailId: thumbnail.id,
          thumbnailUrl: thumbnail.imageUrl,
          message: 'Thumbnail generated successfully from video',
          thumbnail
        });
      } catch (videoError) {
        console.error('Error processing video URL:', videoError);
        return res.status(400).json({
          success: false,
          error: 'Failed to process video URL',
          message: videoError instanceof Error ? videoError.message : 'Invalid video URL'
        });
      }
    }

    // Original prompt-based generation
    // Validate required fields
    if (!prompt || !projectId) {
      return res.status(400).json({
        error: 'Prompt and projectId are required',
      });
    }

    // Validate style if provided
    const validStyles = ['bold', 'minimalist', 'dramatic', 'cinematic', 'professional', 'creative', 'gaming'];
    if (style && !validStyles.includes(style.toLowerCase())) {
      return res.status(400).json({
        error: 'Invalid style. Must be one of: bold, minimalist, dramatic, cinematic, professional, creative, gaming',
      });
    }

    // Check if AI service is configured
    if (aiService.isConfigured()) {
      // Use AI service to generate thumbnails
      try {
        const imageUrls = await aiService.generateThumbnails({
          userId: req.user.id,
          prompt,
          style: style || 'bold',
          count: 3
        });

        // Generate 3 variations
        const thumbnails = [];
        for (let i = 0; i < Math.min(imageUrls.length, 3); i++) {
          const thumbnail = await getThumbnailService().createThumbnail({
            title: `${prompt.substring(0, 30)} ${i + 1}`,
            imageUrl: imageUrls[i] || '',
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

        return res.status(201).json({
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
          const thumbnail = await getThumbnailService().createThumbnail({
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

        return res.status(201).json({
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
        const thumbnail = await getThumbnailService().createThumbnail({
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

      return res.status(201).json({
        message:
          'Thumbnails generated with placeholders (AI service not configured)',
        thumbnails,
        aiNotConfigured: true,
      });
    }
  } catch (error) {
    console.error('Error generating thumbnails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Download thumbnail endpoint
export const downloadThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Create the analytics event with proper object structure
    emitAnalyticsEvent(
      req.user.id,
      'download',
      'thumbnail',
      id,
      { downloadType: 'direct' }
    );

    // Download logic here - normally would serve file
    return res.status(200).json({ 
      downloadUrl: `/api/thumbnails/${id}/file`,
      message: 'Download started' 
    });
  } catch (error) {
    console.error('Error downloading thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
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

    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

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
          await getImageProcessingService().applyEditsToImage(
            thumbnail.imageUrl,
            edits,
            id
          );
        processedImageUrl =
          getImageProcessingService().getProcessedImageUrl(processedImagePath);
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
    console.error('Error applying edits to thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Apply AI style transfer to thumbnail endpoint
export const applyStyleTransfer = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Style transfer logic here
    const updatedThumbnail = await getThumbnailService().updateThumbnail(
      id,
      { parameters: { styleTransfer: true } }
    );

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    console.error('Error applying style transfer:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Image enhancement logic here
    const updatedThumbnail = await getThumbnailService().updateThumbnail(
      id,
      { parameters: { imageEnhancement: true } }
    );

    return res.status(200).json({ thumbnail: updatedThumbnail });
  } catch (error) {
    console.error('Error applying image enhancement:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Generate shareable link for thumbnail
export const generateShareLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }
    
    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Generate a unique share token (in a real implementation, you might want to store this in the database)
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
    console.error('Error generating share link:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Access shared thumbnail
export const accessSharedThumbnail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Share token is required' });
    }

    // Find thumbnail by share token
    // Note: This is a simplified approach. In a real implementation, you might want to:
    // 1. Add a dedicated shareToken field to the database schema
    // 2. Or use a more robust method to query JSON fields
    const thumbnails = await getPrisma().thumbnail.findMany({
      where: {
        // This is a workaround for querying JSON fields
        // In a production environment, you'd want a dedicated field for share tokens
      },
      include: {
        Project_Thumbnail_projectIdToProject: true,
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

    return res.status(200).json({ thumbnail });
  } catch (error) {
    console.error('Error accessing shared thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Revoke share link
export const revokeShareLink = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }
    
    const thumbnail = await getThumbnailService().getThumbnailById(id);

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

    const updatedThumbnail = await getThumbnailService().updateThumbnail(id, {
      parameters: updatedParameters,
    });

    return res.status(200).json({
      message: 'Share link revoked successfully',
      thumbnail: updatedThumbnail,
    });
  } catch (error) {
    console.error('Error revoking share link:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Set thumbnail as featured for its project
export const setAsFeatured = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }
    
    const thumbnail = await getThumbnailService().getThumbnailById(id);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    // Check if user owns this thumbnail
    if (thumbnail.userId !== req.user.id) {
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
  } catch (error: any) {
    if (error.message === 'Thumbnail does not belong to this project') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error setting thumbnail as featured:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available AI styles
export const getAvailableStyles = async (_req: Request, res: Response) => {
  try {
    // Mock available styles - replace with real AI service
    const styles = [
      { id: 'bold', name: 'Bold', description: 'Bold and impactful style' },
      { id: 'minimal', name: 'Minimal', description: 'Clean and minimal design' },
      { id: 'colorful', name: 'Colorful', description: 'Vibrant and colorful' },
      { id: 'professional', name: 'Professional', description: 'Business-ready style' },
    ];
    
    return res.status(200).json({ styles });
  } catch (error) {
    console.error('Error fetching available styles:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available AI enhancements
export const getAvailableEnhancements = async (
  _req: Request,
  res: Response
) => {
  try {
    // Mock available enhancements - replace with real AI service
    const enhancements = [
      { id: 'upscale', name: 'Upscale', description: 'Increase image resolution' },
      { id: 'enhance', name: 'Enhance', description: 'Improve image quality' },
      { id: 'colorize', name: 'Colorize', description: 'Add vibrant colors' },
      { id: 'stylize', name: 'Stylize', description: 'Apply artistic styles' },
    ];
    
    return res.status(200).json({ enhancements });
  } catch (error) {
    console.error('Error fetching available enhancements:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
