import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { ThumbnailService } from './thumbnail.service';
import { ImageProcessingService } from './image-processing.service';
import { OpenRouterAIService } from './openrouter-ai.service';
import { ReplicateAIService } from './replicate-ai.service';
import { CometAIService } from './comet-ai.service';
import { ZenmuxAIService } from './zenmux-ai.service';
import { emitAnalyticsEvent } from '../../events/event-emitter';
import {
  resolveModelFromTier,
  buildTierAPIResponse,
  getCreditCostForTier,
  getProviderForTier,
  getDefaultTier,
} from './model-tiers.config';
import { deductCredits, refundCredits } from '../credit/credit.service';
import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import { getPrisma as getPrismaFactory } from '../../utils/prisma-factory';
import { systemMonitoringService } from '../admin/system-monitoring.service';
import { isZodError } from '../../utils/json-validation';

// Single source of truth for valid thumbnail styles
const VALID_STYLES = [
  'bold',
  'minimalist',
  'dramatic',
  'cinematic',
  'professional',
  'creative',
  'gaming',
  'vibrant',
  'retro',
  'neon',
  'natural',
] as const;

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
  sharedPrisma = prismaClient || getPrismaFactory();
  sharedThumbnailService = new ThumbnailService({
    prisma: sharedPrisma,
    cache: cacheService,
    ...eventDependencies,
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

// Initialize Replicate AI service for computer vision tasks (segment, remove-bg, upscale, expand)
const replicateService = new ReplicateAIService();

// Initialize Comet AI service for FLUX models
const cometService = new CometAIService();

// Initialize ZenMux AI service for Gemini models via Vertex AI
const zenmuxService = new ZenmuxAIService();

// Tier types and resolveModelFromTier imported from ./model-tiers.config
// That file is the SINGLE SOURCE OF TRUTH for all tier metadata.
// To swap a model, change ONE line there. Zero frontend changes needed.

/**
 * Ensure an image value is a base64 data URL.
 * If it's already a data URL, return as-is.
 * If it's an HTTP(S) URL, fetch and convert to base64.
 * This prevents sending raw URLs to AI providers that expect base64.
 */
async function ensureBase64(image: string): Promise<string> {
  if (image.startsWith('data:')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) {
    try {
      const resp = await fetch(image);
      if (!resp.ok) throw new Error(`Failed to fetch image (${resp.status})`);
      const buffer = Buffer.from(await resp.arrayBuffer());
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      return `data:${contentType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.error('[ensureBase64] Failed to convert URL to base64:', err);
      throw new Error(
        'Could not fetch the image URL. Please try with a different image.'
      );
    }
  }
  // Assume raw base64 string
  return `data:image/png;base64,${image}`;
}

// AI service wrapper with proper interface
const aiService = {
  isConfigured: () => !!process.env.OPENROUTER_API_KEY,
  generateThumbnails: async (options: {
    userId?: string;
    prompt: string;
    style?: string;
    count?: number;
    model?: string;
  }) => {
    try {
      console.log(
        '[AI Service] Generating with model:',
        options.model || 'default'
      );
      const images = await openRouterService.generateImages(
        options.prompt,
        options.model || undefined, // Use tier-selected model or fall back to default
        options.style || 'thumbnail'
      );
      console.log('[AI Service] Generated images:', images.length);
      if (images.length === 0) {
        console.warn('[AI Service] OpenRouter returned 0 images!');
      }
      return images;
    } catch (error) {
      console.error('[AI Service] Thumbnail generation error:', error);
      return [];
    }
  },
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
    if (isZodError(error)) {
      return res.status(400).json({
        error: 'Invalid thumbnail parameters',
        details: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
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
    if (sortOrder === 'asc' || sortOrder === 'desc')
      filters.sortOrder = sortOrder;
    if (style) filters.style = String(style);
    if (dateFrom) filters.dateFrom = new Date(String(dateFrom));
    if (dateTo) filters.dateTo = new Date(String(dateTo));

    const thumbnails = await getThumbnailService().getThumbnailsByUser(
      req.user.id,
      filters
    );

    return res.status(200).json({ thumbnails });
  } catch (error) {
    console.error('Error fetching thumbnails:', error);
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      userId: req.user?.id,
    });
    return res.status(500).json({
      error: 'Internal server error',
      debug: process.env.NODE_ENV === 'test' ? String(error) : undefined,
    });
  }
};

export const getThumbnailById = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
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

    const id = req.params.id as string;
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
    if (isZodError(error)) {
      return res.status(400).json({
        error: 'Invalid thumbnail parameters',
        details: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    console.error('Error updating thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
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
    console.log('🎬 generateThumbnail called', {
      body: req.body,
      hasUser: !!req.user,
    });
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, style, projectId, videoUrl, includeFace, tier, model } =
      req.body;

    // Handle YouTube video URL generation
    if (videoUrl) {
      try {
        // Import video proxy service
        const { videoProxyService } = await import(
          '../video-proxy/video-proxy.service'
        );

        // Get video info from YouTube
        const videoInfo = await videoProxyService.getVideoInfo(videoUrl);

        // Find or create default project for this user
        const prisma = getPrisma();
        let defaultProject = await prisma.project.findFirst({
          where: {
            userId: req.user.id,
            name: 'Default',
          },
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
            },
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
        emitAnalyticsEvent(req.user.id, 'generate', 'thumbnail', thumbnail.id, {
          source: 'video-url',
          platform: videoInfo.platform,
          videoUrl: videoUrl,
          videoId: videoInfo.videoId,
        });

        return res.status(201).json({
          success: true,
          thumbnailId: thumbnail.id,
          thumbnailUrl: thumbnail.imageUrl,
          message: 'Thumbnail generated successfully from video',
          thumbnail,
        });
      } catch (videoError) {
        console.error('Error processing video URL:', videoError);
        return res.status(400).json({
          success: false,
          error: 'Failed to process video URL',
          message:
            videoError instanceof Error
              ? videoError.message
              : 'Invalid video URL',
        });
      }
    }

    // Original prompt-based generation
    // Validate required fields
    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    // Validate style if provided
    if (style && !VALID_STYLES.includes(style.toLowerCase())) {
      return res.status(400).json({
        error: `Invalid style. Must be one of: ${VALID_STYLES.join(', ')}`,
      });
    }

    // Get or create a valid project ID
    let validProjectId = projectId;

    // If projectId is missing, invalid, or a placeholder, create/find default project
    if (
      !projectId ||
      projectId === 'temp-project-id' ||
      projectId.startsWith('temp-')
    ) {
      const prisma = getPrisma();
      let defaultProject = await prisma.project.findFirst({
        where: {
          userId: req.user.id,
          name: 'AI Generated',
        },
      });

      if (!defaultProject) {
        const { v4: uuidv4 } = await import('uuid');
        defaultProject = await prisma.project.create({
          data: {
            id: uuidv4(),
            name: 'AI Generated',
            description: 'Auto-created project for AI-generated thumbnails',
            userId: req.user.id,
            updatedAt: new Date(),
          },
        });
        console.log('Created default AI project:', defaultProject.id);
      }
      validProjectId = defaultProject.id;
    } else {
      // Verify the provided projectId exists and belongs to user
      const prisma = getPrisma();
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: req.user.id,
        },
      });

      if (!existingProject) {
        // Project doesn't exist or doesn't belong to user, create default
        let defaultProject = await prisma.project.findFirst({
          where: {
            userId: req.user.id,
            name: 'AI Generated',
          },
        });

        if (!defaultProject) {
          const { v4: uuidv4 } = await import('uuid');
          defaultProject = await prisma.project.create({
            data: {
              id: uuidv4(),
              name: 'AI Generated',
              description: 'Auto-created project for AI-generated thumbnails',
              userId: req.user.id,
              updatedAt: new Date(),
            },
          });
        }
        validProjectId = defaultProject.id;
        console.log(
          'Using default project instead of invalid projectId:',
          projectId
        );
      }
    }

    // Check if AI service is configured
    if (aiService.isConfigured()) {
      // Use AI service to generate thumbnails
      try {
        // Resolve the model: direct model override takes priority, then tier-based lookup
        const resolvedModel = model || resolveModelFromTier(tier, 'generate');

        const imageUrls = await aiService.generateThumbnails({
          userId: req.user.id,
          prompt,
          style: style || 'bold',
          count: 3,
          model: resolvedModel,
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
            projectId: validProjectId,
            userId: req.user.id,
          });
          thumbnails.push(thumbnail);
        }

        return res.status(201).json({
          message: 'Thumbnails generated successfully with AI',
          thumbnails,
        });
      } catch (aiError) {
        const errorMessage =
          aiError instanceof Error ? aiError.message : String(aiError);
        const errorStack = aiError instanceof Error ? aiError.stack : undefined;

        console.error(
          'Error generating thumbnails with AI, falling back to placeholders:',
          aiError
        );

        // Log to admin monitoring system for tracking
        await systemMonitoringService.logError(
          'error',
          `AI thumbnail generation failed for user ${req.user.id}: ${errorMessage}`,
          errorStack,
          {
            userId: req.user.id,
            prompt: prompt.substring(0, 100),
            style: style || 'bold',
            endpoint: 'generateThumbnails',
            fallbackUsed: 'placeholder',
          }
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
              aiError: errorMessage,
            },
            projectId: validProjectId,
            userId: req.user.id,
          });
          thumbnails.push(thumbnail);
        }

        return res.status(201).json({
          message:
            'We could not generate AI images at this time. Placeholder images have been created instead.',
          thumbnails,
          aiError: errorMessage,
          aiErrorCode: 'AI_GENERATION_FAILED',
          userAction:
            'Please try again later or contact support if the issue persists.',
        });
      }
    } else {
      // Log to admin monitoring - AI service not configured is a critical setup issue
      await systemMonitoringService.logError(
        'critical',
        'AI service not configured - OPENROUTER_API_KEY missing',
        undefined,
        {
          userId: req.user.id,
          prompt: prompt.substring(0, 100),
          endpoint: 'generateThumbnails',
          fallbackUsed: 'placeholder',
          configIssue: 'OPENROUTER_API_KEY not set',
        }
      );

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
          projectId: validProjectId,
          userId: req.user.id,
        });
        thumbnails.push(thumbnail);
      }

      return res.status(201).json({
        message:
          'AI image generation is temporarily unavailable. Placeholder images have been created.',
        thumbnails,
        aiNotConfigured: true,
        aiErrorCode: 'AI_SERVICE_UNAVAILABLE',
        userAction: 'Please try again later. Our team has been notified.',
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

    const id = req.params.id as string;
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
    emitAnalyticsEvent(req.user.id, 'download', 'thumbnail', id, {
      downloadType: 'direct',
    });

    // Download logic here - normally would serve file
    return res.status(200).json({
      downloadUrl: `/api/thumbnails/${id}/file`,
      message: 'Download started',
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

    const id = req.params.id as string;
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
    if (isZodError(error)) {
      return res.status(400).json({
        error: 'Invalid thumbnail parameters',
        details: error.issues.map(i => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      });
    }
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

    const id = req.params.id as string;
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

    const id = req.params.id as string;
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

    const id = req.params.id as string;
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

    const id = req.params.id as string;
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

    const id = req.params.id as string;
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

// Recategorize thumbnail platform
export const recategorizeThumbnail = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const { platform } = req.body;
    const validPlatforms = ['youtube', 'tiktok', 'instagram', 'twitter'];
    if (!platform || !validPlatforms.includes(platform)) {
      return res
        .status(400)
        .json({
          error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
        });
    }

    const thumbnail = await getThumbnailService().recategorizeThumbnail(
      id,
      platform,
      req.user.id
    );

    return res.status(200).json({ thumbnail });
  } catch (error: any) {
    if (error.message === 'Thumbnail not found') {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }
    if (error.message === 'Not authorized') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.error('Error recategorizing thumbnail:', error);
    return res.status(500).json({ error: 'Failed to recategorize thumbnail' });
  }
};

// Get available AI styles
export const getAvailableStyles = async (_req: Request, res: Response) => {
  try {
    // Mock available styles - replace with real AI service
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
    console.error('Error fetching available enhancements:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// =============================================================================
// AI TOOL ENDPOINTS - Using OpenRouter with tool-specific models
// =============================================================================

/**
 * Inpaint (edit) an image - modify specific areas while preserving the rest
 * Model: google/gemini-3-pro-image-preview (configurable via OPENROUTER_MODEL_INPAINT)
 */
export const aiInpaint = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, mask, prompt, tier, model: modelOverride } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({
        error: 'Image and prompt are required',
      });
    }

    if (!openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Resolve model: direct override takes priority, then tier-based lookup, then default tier
    const effectiveTier = tier || getDefaultTier('inpaint')?.id || 'standard';
    const resolvedModel =
      modelOverride || resolveModelFromTier(effectiveTier, 'inpaint');
    const model = resolvedModel || openRouterService.getModelForTool('inpaint');
    console.log(
      `[AI Inpaint] Using model: ${model} (tier: ${effectiveTier}, override: ${modelOverride || 'none'})`
    );

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'inpaint');
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI inpaint - ${tier || 'default'} tier`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure image is base64 — frontend may send HTTP URLs (YouTube fallback, Cloudinary, etc.)
      const imageBase64 = await ensureBase64(image);

      const imageUrls = await openRouterService.inpaintImage(
        imageBase64,
        mask || '',
        prompt,
        resolvedModel || undefined
      );

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'inpaint', 'ai-inpaint', {
        model,
        promptLength: prompt.length,
      });

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, `AI inpaint failed`);
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI inpaint:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI inpaint failed',
    });
  }
};

/**
 * Generate images from text prompt
 * Model: tier-based (Flash/Standard/Pro) via model-tiers.config
 */
export const aiGenerate = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, style, tier, model: modelOverride } = req.body;

    console.log('[AI Generate] Request body:', {
      prompt: prompt?.substring(0, 50),
      style,
      tier,
      modelOverride,
    });

    if (!prompt) {
      return res.status(400).json({
        error: 'Prompt is required',
      });
    }

    // Determine which provider to use based on tier
    const provider = tier ? getProviderForTier(tier) : 'openrouter';
    console.log(
      `[AI Generate] Resolved provider: ${provider} (tier: ${tier || 'none'})`
    );

    // Check if the required provider is configured
    if (provider === 'comet' && !cometService.isConfigured()) {
      return res.status(503).json({
        error: 'Comet AI service not configured. Please set COMET_API_KEY.',
      });
    }
    if (provider === 'zenmux' && !zenmuxService.isConfigured()) {
      return res.status(503).json({
        error: 'ZenMux AI service not configured. Please set ZENMUX_API_KEY.',
      });
    }
    if (provider === 'openrouter' && !openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Resolve model: direct override takes priority, then tier-based lookup, then default
    const resolvedModel =
      modelOverride || resolveModelFromTier(tier, 'generate');
    const model =
      resolvedModel || openRouterService.getModelForTool('generate');
    console.log(
      `[AI Generate] Using model: ${model} (tier: ${tier || 'none'}, override: ${modelOverride || 'none'})`
    );

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'generate');
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI generate - ${tier || 'default'} tier`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      let imageUrls: string[];

      // Route to the appropriate provider
      if (provider === 'comet') {
        imageUrls = await cometService.generateImages(
          prompt,
          style || 'thumbnail'
        );
      } else if (provider === 'zenmux') {
        imageUrls = await zenmuxService.generateImages(
          prompt,
          style || 'thumbnail'
        );
      } else {
        imageUrls = await openRouterService.generateImages(
          prompt,
          resolvedModel || undefined,
          style || 'thumbnail'
        );
      }

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'generate', 'ai-generate', {
        model,
        promptLength: prompt.length,
        style: style || 'thumbnail',
        provider,
      });

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, `AI generate failed`);
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI generate:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI generate failed',
    });
  }
};

/**
 * Face swap - replace face in target image with face from source image
 * Model: bytedance-seed/seedream-4.5 (configurable via OPENROUTER_MODEL_FACESWAP)
 */
export const aiFaceSwap = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      sourceImage,
      targetImage,
      prompt,
      tier,
      model: modelOverride,
    } = req.body;

    if (!sourceImage || !targetImage) {
      return res.status(400).json({
        error: 'Source image and target image are required',
      });
    }

    if (!openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Resolve model: direct override takes priority, then tier-based lookup, then default
    const resolvedModel =
      modelOverride || resolveModelFromTier(tier, 'face-swap');
    const model =
      resolvedModel || openRouterService.getModelForTool('faceSwap');
    console.log(
      `[AI Face Swap] Using model: ${model} (tier: ${tier || 'none'}, override: ${modelOverride || 'none'})`
    );

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'face-swap');
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI face-swap - ${tier || 'default'} tier`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure images are base64 — frontend may send HTTP URLs
      const sourceBase64 = await ensureBase64(sourceImage);
      const targetBase64 = await ensureBase64(targetImage);

      const imageUrls = await openRouterService.faceSwapImage(
        sourceBase64,
        targetBase64,
        prompt || '',
        resolvedModel || undefined
      );

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'face-swap', 'ai-face-swap', {
        model,
      });

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, `AI face-swap failed`);
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI face swap:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI face swap failed',
    });
  }
};

/**
 * Upscale - increase image resolution with AI enhancement
 * Provider: Replicate (Real-ESRGAN) with OpenRouter fallback
 */
export const aiUpscale = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, scale = '2x', tier, model: modelOverride } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    // Validate scale
    if (scale !== '2x' && scale !== '4x') {
      return res.status(400).json({
        error: 'Scale must be "2x" or "4x"',
      });
    }

    // Prefer Replicate for upscale (purpose-built Real-ESRGAN model)
    const useReplicate =
      replicateService.isConfigured() && !modelOverride && !tier;
    const useOpenRouter = openRouterService.isConfigured();

    if (!useReplicate && !useOpenRouter) {
      return res.status(503).json({
        error:
          'AI service not configured. Please set REPLICATE_API_KEY or OPENROUTER_API_KEY.',
      });
    }

    const provider = useReplicate ? 'replicate' : 'openrouter';
    let model: string;

    if (useReplicate) {
      model = replicateService.getModelForTool('upscale');
    } else {
      const resolvedModel =
        modelOverride || resolveModelFromTier(tier, 'upscale');
      model = resolvedModel || openRouterService.getModelForTool('upscale');
    }

    console.log(
      `[AI Upscale] Using provider: ${provider}, model: ${model}, scale: ${scale}`
    );

    // Credit check & deduction
    const creditCost = useReplicate ? 1 : getCreditCostForTier(tier, 'upscale');
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI upscale - ${provider}`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure image is base64 — frontend may send HTTP URLs
      const imageBase64 = await ensureBase64(image);
      let imageUrls: string[];

      if (useReplicate) {
        const scaleNum = scale === '4x' ? 4 : 2;
        const resultUrl = await replicateService.upscale(imageBase64, scaleNum);
        imageUrls = [resultUrl];
      } else {
        imageUrls = await openRouterService.upscaleImage(
          imageBase64,
          scale,
          modelOverride || undefined
        );
      }

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'upscale', 'ai-upscale', {
        model,
        scale,
        provider,
      });

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
        scale,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, `AI upscale failed`);
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI upscale:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI upscale failed',
    });
  }
};

/**
 * Remove background - extract subject from background
 * Provider: Replicate (RMBG 2.0) with OpenRouter fallback
 */
export const aiRemoveBackground = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, backgroundColor = 'transparent' } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    // Prefer Replicate for remove-bg (purpose-built RMBG 2.0 model)
    const useReplicate = replicateService.isConfigured();
    const useOpenRouter = openRouterService.isConfigured();

    if (!useReplicate && !useOpenRouter) {
      return res.status(503).json({
        error:
          'AI service not configured. Please set REPLICATE_API_KEY or OPENROUTER_API_KEY.',
      });
    }

    const provider = useReplicate ? 'replicate' : 'openrouter';
    const model = useReplicate
      ? replicateService.getModelForTool('removeBg')
      : openRouterService.getModelForTool('inpaint');
    console.log(
      `[AI Remove Background] Using provider: ${provider}, model: ${model}`
    );

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      'AI remove-background'
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure image is base64 — frontend may send HTTP URLs
      const imageBase64 = await ensureBase64(image);
      let imageUrls: string[];

      if (useReplicate) {
        // Replicate returns a single URL to transparent PNG
        const resultUrl = await replicateService.removeBackground(imageBase64);
        imageUrls = [resultUrl];
      } else {
        // Fallback to OpenRouter prompt-based removal
        imageUrls = await openRouterService.removeBackground(
          imageBase64,
          backgroundColor
        );
      }

      // Emit analytics event
      emitAnalyticsEvent(
        req.user.id,
        'ai-tool',
        'remove-background',
        'ai-remove-background',
        { model, backgroundColor, provider }
      );

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(
        req.user.id,
        creditCost,
        'AI remove-background failed'
      );
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI remove background:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'AI remove background failed',
    });
  }
};

/**
 * Enhance - improve image quality (color, sharpness, noise reduction)
 * Model: google/gemini-3-pro-image-preview (uses inpaint model for quality)
 */
export const aiEnhance = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, enhancementType = 'auto' } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    // Validate enhancement type
    const validTypes = ['auto', 'color', 'sharpen', 'denoise', 'hdr'];
    if (!validTypes.includes(enhancementType)) {
      return res.status(400).json({
        error: `Enhancement type must be one of: ${validTypes.join(', ')}`,
      });
    }

    if (!openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    const model = openRouterService.getModelForTool('inpaint');
    console.log(`[AI Enhance] Using model: ${model}, type: ${enhancementType}`);

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(req.user.id, creditCost, 'AI enhance');
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure image is base64 — frontend may send HTTP URLs
      const imageBase64 = await ensureBase64(image);

      const imageUrls = await openRouterService.enhanceImage(
        imageBase64,
        enhancementType
      );

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'enhance', 'ai-enhance', {
        model,
        enhancementType,
      });

      return res.status(200).json({
        success: true,
        images: imageUrls,
        model,
        enhancementType,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, 'AI enhance failed');
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI enhance:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI enhance failed',
    });
  }
};

// =============================================================================
// REPLICATE AI TOOL ENDPOINTS - Computer vision tasks via Replicate
// =============================================================================

/**
 * Segment objects in an image using SAM 2 (Segment Anything Model)
 * Provider: Replicate
 *
 * Supports two modes:
 * - 'auto': Auto-segmentation with grid (meta/sam-2) - returns all detected objects
 * - 'interactive': Click-to-select (meta/sam-2-video) - returns mask for clicked object
 *
 * Body: {
 *   image: base64,
 *   mode?: 'auto' | 'interactive',  // default: 'auto'
 *   clicks?: Array<{x, y, label}>,  // required for interactive mode
 *   options?: { pointsPerSide?, predIouThresh?, stabilityScoreThresh?, useM2m? }  // auto mode options
 * }
 */
export const aiSegment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, mode = 'auto', clicks, options } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    // Validate mode
    if (mode !== 'auto' && mode !== 'interactive') {
      return res.status(400).json({
        error: 'Invalid mode. Must be "auto" or "interactive"',
      });
    }

    // Interactive mode requires clicks
    if (mode === 'interactive' && (!clicks || clicks.length === 0)) {
      return res.status(400).json({
        error: 'Interactive mode requires at least one click point',
      });
    }

    if (!replicateService.isConfigured()) {
      return res.status(503).json({
        error:
          'Replicate AI service not configured. Please set REPLICATE_API_KEY.',
      });
    }

    const modelType = mode === 'interactive' ? 'segmentInteractive' : 'segment';
    const model = replicateService.getModelForTool(modelType);
    console.log(
      `[AI Segment] Mode: ${mode}, Model: ${model}, Clicks: ${clicks?.length || 0}`
    );

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI segment (SAM ${mode})`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      if (mode === 'interactive') {
        // Interactive mode: click-to-select
        const result = await replicateService.segmentInteractive(image, clicks);

        // Emit analytics event
        emitAnalyticsEvent(
          req.user.id,
          'ai-tool',
          'segment',
          'ai-segment-interactive',
          {
            model,
            clickCount: clicks.length,
            maskCount: result.masks.length,
          }
        );

        return res.status(200).json({
          success: true,
          mode: 'interactive',
          masks: result.masks,
          model,
          predictionId: result.predictionId,
        });
      } else {
        // Auto mode: grid-based detection of all objects
        const result = await replicateService.segment(image, options);

        // Emit analytics event
        emitAnalyticsEvent(
          req.user.id,
          'ai-tool',
          'segment',
          'ai-segment-auto',
          {
            model,
            maskCount: result.masks.length,
            pointsPerSide: options?.pointsPerSide || 32,
          }
        );

        return res.status(200).json({
          success: true,
          mode: 'auto',
          masks: result.masks,
          combinedMask: result.combinedMask,
          model,
          predictionId: result.predictionId,
        });
      }
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, 'AI segment failed');
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI segment:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI segment failed',
    });
  }
};

// =============================================================================
// AI DECOMPOSE - Auto-decompose image into isolated layers using SAM
// =============================================================================

/**
 * Decompose an image into isolated semantic layers using SAM auto-segmentation.
 * Each detected object becomes a separate RGBA layer that can be independently
 * edited, moved, or styled in the Advanced Editor.
 *
 * Body: { image: base64, maxLayers?: number (default 8) }
 * Returns: { success, layers: Array<{ name, imageBase64, bounds, score }>, predictionId }
 */
export const aiDecompose = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { image, maxLayers = 8 } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    if (!replicateService.isConfigured()) {
      return res.status(503).json({
        error:
          'Replicate AI service not configured. Please set REPLICATE_API_KEY.',
      });
    }

    // Credit check & deduction - 3 credits (heavier operation than single segment)
    const creditCost = 3;
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      'AI decompose (auto-layer extraction)'
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      const result = await replicateService.decompose(image, maxLayers);

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'decompose', 'ai-decompose', {
        layerCount: result.layers.length,
        maxLayers,
      });

      return res.status(200).json({
        success: true,
        layers: result.layers,
        predictionId: result.predictionId,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, 'AI decompose failed');
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI decompose:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI decompose failed',
    });
  }
};

/**
 * Expand/Outpaint - Extend canvas in any direction with AI-generated content
 * Provider: Replicate (purpose-built outpainting model)
 *
 * @body image - Base64-encoded source image
 * @body prompt - Description of what to fill in expanded areas (optional)
 * @body direction - Expansion direction: 'left' | 'right' | 'top' | 'bottom' | 'all'
 * @body expandPixels - How many pixels to expand (64-512, default 256)
 */
export const aiExpand = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      image,
      prompt = '',
      direction = 'all',
      expandPixels = 256,
    } = req.body;

    if (!image) {
      return res.status(400).json({
        error: 'Image is required',
      });
    }

    // Validate direction
    const validDirections = ['left', 'right', 'top', 'bottom', 'all'] as const;
    if (!validDirections.includes(direction)) {
      return res.status(400).json({
        error: `Direction must be one of: ${validDirections.join(', ')}`,
      });
    }

    // Validate expandPixels range
    const pixels = Math.min(512, Math.max(64, Number(expandPixels) || 256));

    // Expand uses Replicate exclusively (purpose-built outpainting model)
    if (!replicateService.isConfigured()) {
      return res.status(503).json({
        error:
          'Replicate AI service not configured. Please set REPLICATE_API_KEY.',
      });
    }

    const model = replicateService.getModelForTool('expand');

    console.log(
      `[AI Expand] direction: ${direction}, pixels: ${pixels}, model: ${model}`
    );

    // Credit check & deduction - 2 credits (similar complexity to upscale)
    const creditCost = 2;
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      `AI expand - ${direction}`
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Ensure image is base64 — frontend may send HTTP URLs
      const imageBase64 = await ensureBase64(image);

      const resultUrl = await replicateService.expand(
        imageBase64,
        prompt,
        direction as 'left' | 'right' | 'top' | 'bottom' | 'all',
        pixels
      );

      // Emit analytics event
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'expand', 'ai-expand', {
        model,
        direction,
        expandPixels: pixels,
        hasPrompt: !!prompt,
      });

      return res.status(200).json({
        success: true,
        images: [resultUrl],
        model,
        direction,
        expandPixels: pixels,
        provider: 'replicate',
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(req.user.id, creditCost, 'AI expand failed');
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI expand:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI expand failed',
    });
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
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const thumbnails = await getThumbnailService().getDeletedThumbnails(
      req.user.id
    );

    return res.status(200).json({
      message: 'Deleted thumbnails retrieved',
      thumbnails,
      count: thumbnails.length,
    });
  } catch (error) {
    console.error('Error fetching deleted thumbnails:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Restore a soft-deleted thumbnail
 */
export const restoreThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    // Fetch including deleted
    const thumbnail = await getThumbnailService().getThumbnailById(id, true);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    if (thumbnail.userId !== req.user.id) {
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
    console.error('Error restoring thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Permanently delete a soft-deleted thumbnail (hard delete)
 */
export const hardDeleteThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Thumbnail ID is required' });
    }

    const thumbnail = await getThumbnailService().getThumbnailById(id, true);

    if (!thumbnail) {
      return res.status(404).json({ error: 'Thumbnail not found' });
    }

    if (thumbnail.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await getThumbnailService().hardDeleteThumbnail(id);

    return res.status(200).json({
      message: 'Thumbnail permanently deleted',
      thumbnail: deleted,
    });
  } catch (error: any) {
    if (error.message === 'Thumbnail must be soft-deleted first') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error hard-deleting thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate AI-powered text suggestions for thumbnail titles
 * Uses OpenRouter chat completions (text-only, no image generation)
 * Cost: 1 credit per generation
 * Body: { prompt: string, context?: string, tone?: string, count?: number, maxLength?: number }
 */
export const aiGenerateText = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      prompt,
      context,
      tone = 'clickbait',
      count = 5,
      maxLength = 60,
    } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!openRouterService.isConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured. Please set OPENROUTER_API_KEY.',
      });
    }

    // Credit check & deduction (1 credit for text generation)
    const creditCost = 1;
    const deducted = await deductCredits(
      req.user.id,
      creditCost,
      'AI text generation'
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

    try {
      // Build the system prompt for title generation
      const toneInstructions: Record<string, string> = {
        clickbait:
          'Maximum clicks & curiosity. Use power words, numbers, emotional triggers. Create FOMO.',
        professional:
          'Clean, authoritative, trustworthy. No hype, just clear value propositions.',
        casual:
          'Friendly, relatable, conversational. Like talking to a friend.',
        dramatic:
          'High emotion, urgency, impact. Create suspense and excitement.',
        educational:
          'Informative, clear, structured. Focus on learning outcomes and value.',
      };

      const styleTypes = [
        'bold',
        'question',
        'listicle',
        'emotional',
        'curiosity',
      ];

      const systemPrompt = `You are an expert YouTube thumbnail text generator. Generate exactly ${count} short, punchy text suggestions for a YouTube thumbnail overlay.

Rules:
- Each suggestion must be ${maxLength} characters or fewer
- Text must be readable at thumbnail size (short, impactful)
- Use UPPERCASE for key words to simulate thumbnail text styling
- Tone: ${toneInstructions[tone] || toneInstructions.clickbait}
${context ? `- Context: ${context}` : ''}

For each suggestion, assign one of these styles: ${styleTypes.join(', ')}
Also assign a click-worthiness score from 0.0 to 1.0.

Respond ONLY with a valid JSON array. No markdown, no explanation. Example:
[{"text": "YOU WON'T BELIEVE This!", "style": "curiosity", "score": 0.92}]`;

      // Use a text-only model via OpenRouter chat completions
      const textModel = 'google/gemini-2.5-flash';

      const apiUrl =
        process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
      const response = await fetch(`${apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'https://thumpiks.com',
          'X-Title': 'ThumPiks AI Text Generator',
        },
        body: JSON.stringify({
          model: textModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
          temperature: 0.9,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errData: any = await response.json().catch(() => ({}));
        await refundCredits(
          req.user.id,
          creditCost,
          'AI text generation failed'
        );
        throw new Error(
          errData.error?.message || `OpenRouter API error (${response.status})`
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content || '';

      // Parse the JSON response
      let suggestions: Array<{ text: string; style: string; score: number }>;
      try {
        // Strip markdown code fences if present
        const cleaned = content
          .replace(/```json?\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        suggestions = JSON.parse(cleaned);

        if (!Array.isArray(suggestions)) {
          throw new Error('Response is not an array');
        }

        // Validate and sanitize
        suggestions = suggestions
          .filter(
            s => s && typeof s.text === 'string' && s.text.trim().length > 0
          )
          .slice(0, count)
          .map(s => ({
            text: s.text.trim().slice(0, maxLength + 20), // Allow slight overflow
            style: styleTypes.includes(s.style) ? s.style : 'bold',
            score:
              typeof s.score === 'number'
                ? Math.min(1, Math.max(0, s.score))
                : 0.8,
          }));
      } catch {
        // If JSON parsing fails, try to extract text lines
        const lines = content
          .split('\n')
          .filter(
            (l: string) =>
              l.trim().length > 0 && l.trim().length <= maxLength + 20
          );
        suggestions = lines.slice(0, count).map((line: string, i: number) => ({
          text: line
            .replace(/^\d+[.)]\s*/, '')
            .replace(/^["']|["']$/g, '')
            .trim(),
          style: styleTypes[i % styleTypes.length] as string,
          score: 0.75,
        }));
      }

      if (suggestions.length === 0) {
        await refundCredits(
          req.user.id,
          creditCost,
          'AI text generation returned no results'
        );
        return res
          .status(500)
          .json({ error: 'No valid suggestions generated. Please try again.' });
      }

      // Emit analytics
      emitAnalyticsEvent(req.user.id, 'ai-tool', 'generate-text', 'ai-text', {
        promptLength: prompt.length,
        tone,
        suggestionsCount: suggestions.length,
      });

      return res.status(200).json({
        success: true,
        suggestions,
        model: textModel,
        creditCost,
      });
    } catch (apiError) {
      await refundCredits(req.user.id, creditCost, 'AI text generation failed');
      throw apiError;
    }
  } catch (error) {
    console.error('Error in AI text generation:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'AI text generation failed',
    });
  }
};

/**
 * Get AI tool model configurations - shows which models are assigned to each tool
 */
export const getAIToolModels = async (_req: Request, res: Response) => {
  try {
    // Build the full tier response from the single source of truth.
    // The frontend fetches this on mount and renders the ModelTierSelector from it.
    // No hardcoded model data lives in the frontend — only here.
    const response = buildTierAPIResponse(openRouterService.isConfigured());

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching AI tool models:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
