import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import { emitAnalyticsEvent } from '../../events/event-emitter';
import { resolveModelFromTier } from './model-tiers.config';
import { deductCredits, refundCredits } from '../credit/credit.service';
import { systemMonitoringService } from '../admin/system-monitoring.service';
import { shouldApplyWatermark, getWatermarkFreeStatus, isCleanOriginalExpired } from './watermark.service';
import { getCurrentSubscription } from '../subscription/subscription.service';
import { getService } from '../../utils/service-factory';
import {
  getThumbnailService,
  getPrisma,
  aiService,
  VALID_STYLES,
} from './thumbnail.shared';

export const generateThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('generateThumbnail called', {
      hasUser: !!req.user,
    });
    const user = requireUser(req, res);
    if (!user) return;

    const { prompt, style, projectId, videoUrl, includeFace, tier, model } =
      req.body;

    // Validate videoUrl if provided — prevent SSRF by enforcing known platform URLs
    if (videoUrl) {
      const allowedPatterns = [
        /^https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)/i,
        /^https?:\/\/(www\.|vm\.|vt\.)?tiktok\.com\//i,
        /^https?:\/\/(www\.)?instagram\.com\/(p|reel|reels)\//i,
        /^https?:\/\/(www\.)?(twitter|x)\.com\//i,
        /^https?:\/\/(www\.)?twitch\.tv\//i,
        /^https?:\/\/(www\.)?vimeo\.com\//i,
      ];
      const isValidUrl = allowedPatterns.some(p => p.test(videoUrl));
      if (!isValidUrl) {
        return res.status(400).json({
          error: 'Invalid video URL. Only YouTube, TikTok, Instagram, Twitter, Twitch and Vimeo links are supported.',
        });
      }
    }

    // Credit check & deduction - 1 credit for video URL generation
    const creditCost = 1;
    const deducted = await deductCredits(
      user.id,
      creditCost,
      'Thumbnail generation from video URL'
    );
    if (!deducted) {
      return res.status(402).json({
        error: 'Insufficient credits',
        required: creditCost,
      });
    }

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
            userId: user.id,
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
              userId: user.id,
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
          userId: user.id,
        });

        // Emit analytics event
        emitAnalyticsEvent(user.id, 'generate', 'thumbnail', thumbnail.id, {
          source: 'video-url',
          platform: videoInfo.platform,
          videoUrl: videoUrl,
          videoId: videoInfo.videoId,
        });

        // Notify user of successful video thumbnail generation (fire-and-forget)
        const videoRouter = getService('notificationRouter');
        videoRouter.routeToUser(user.id, {
          type: 'thumbnail_ready',
          title: 'Video Thumbnail Ready',
          message: `Thumbnail generated from video: ${videoInfo.title.substring(0, 50)}`,
          priority: 'normal',
          actionUrl: `/dashboard/projects/${projectId || defaultProject.id}`,
        }).catch(() => {});

        return res.status(201).json({
          thumbnailUrl: thumbnail.imageUrl,
          creditCost,
          message: 'Thumbnail generated successfully from video',
          thumbnail,
        });
      } catch (videoError) {
        // Refund credits on failure
        await refundCredits(user.id, creditCost, 'Video URL generation failed');
        logger.error('Error processing video URL', videoError instanceof Error ? videoError : new Error(String(videoError)));
        return res.status(400).json({
          success: false,
          error: 'Failed to process video URL',
          creditRefunded: true,
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
          userId: user.id,
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
            userId: user.id,
            updatedAt: new Date(),
          },
        });
        logger.info('Created default AI project', { projectId: defaultProject.id });
      }
      validProjectId = defaultProject.id;
    } else {
      // Verify the provided projectId exists and belongs to user
      const prisma = getPrisma();
      const existingProject = await prisma.project.findFirst({
        where: {
          id: projectId,
          userId: user.id,
        },
      });

      if (!existingProject) {
        // Project doesn't exist or doesn't belong to user, create default
        let defaultProject = await prisma.project.findFirst({
          where: {
            userId: user.id,
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
              userId: user.id,
              updatedAt: new Date(),
            },
          });
        }
        validProjectId = defaultProject.id;
        logger.info('Using default project instead of invalid projectId', { invalidProjectId: projectId });
      }
    }

    // Check if AI service is configured
    if (aiService.isConfigured()) {
      // Use AI service to generate thumbnails
      try {
        // Resolve the model: direct model override takes priority, then tier-based lookup
        const resolvedModel = model || resolveModelFromTier(tier, 'generate');

        const imageUrls = await aiService.generateThumbnails({
          userId: user.id,
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
            userId: user.id,
          });
          thumbnails.push(thumbnail);
        }

        // Notify user of successful generation (fire-and-forget)
        const router = getService('notificationRouter');
        router.routeToUser(user.id, {
          type: 'thumbnail_ready',
          title: 'Thumbnails Ready',
          message: `${thumbnails.length} thumbnail${thumbnails.length === 1 ? '' : 's'} generated successfully.`,
          priority: 'normal',
          actionUrl: `/dashboard/projects/${validProjectId}`,
          metadata: { count: thumbnails.length, projectId: validProjectId },
        }).catch(() => {});

        return res.status(201).json({
          message: 'Thumbnails generated successfully with AI',
          thumbnails,
        });
      } catch (aiError) {
        const errorMessage =
          aiError instanceof Error ? aiError.message : String(aiError);
        const errorStack = aiError instanceof Error ? aiError.stack : undefined;

        logger.error('Error generating thumbnails with AI, falling back to placeholders', aiError instanceof Error ? aiError : new Error(String(aiError)));

        // Refund credits since AI generation failed
        await refundCredits(user.id, creditCost, 'AI generation failed - placeholder fallback');

        // Log to admin monitoring system for tracking
        await systemMonitoringService.logError(
          'error',
          `AI thumbnail generation failed for user ${user.id}: ${errorMessage}`,
          errorStack,
          {
            userId: user.id,
            prompt: prompt.substring(0, 100),
            style: style || 'bold',
            endpoint: 'generateThumbnails',
            fallbackUsed: 'placeholder',
            creditsRefunded: creditCost,
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
            userId: user.id,
          });
          thumbnails.push(thumbnail);
        }

        // Notify user of generation failure (fire-and-forget)
        const failRouter = getService('notificationRouter');
        failRouter.routeToUser(user.id, {
          type: 'thumbnail_failed',
          title: 'Thumbnail Generation Failed',
          message: 'AI generation failed. Your credits have been refunded. Please try again.',
          priority: 'high',
          actionUrl: `/dashboard/projects/${validProjectId}`,
        }).catch(() => {});

        return res.status(201).json({
          message:
            'We could not generate AI images at this time. Placeholder images have been created instead.',
          thumbnails,
          aiError: errorMessage,
          aiErrorCode: 'AI_GENERATION_FAILED',
          creditRefunded: true,
          userAction:
            'Please try again later or contact support if the issue persists.',
        });
      }
    } else {
      // Refund credits since AI service is not configured
      await refundCredits(user.id, creditCost, 'AI service not configured');

      // Log to admin monitoring - AI service not configured is a critical setup issue
      await systemMonitoringService.logError(
        'critical',
        'AI service not configured - OPENROUTER_API_KEY missing',
        undefined,
        {
          userId: user.id,
          prompt: prompt.substring(0, 100),
          endpoint: 'generateThumbnails',
          fallbackUsed: 'placeholder',
          configIssue: 'OPENROUTER_API_KEY not set',
          creditsRefunded: creditCost,
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
          userId: user.id,
        });
        thumbnails.push(thumbnail);
      }

      return res.status(201).json({
        message:
          'AI image generation is temporarily unavailable. Placeholder images have been created.',
        thumbnails,
        aiNotConfigured: true,
        aiErrorCode: 'AI_SERVICE_UNAVAILABLE',
        creditRefunded: true,
        userAction: 'Please try again later. Our team has been notified.',
      });
    }
  } catch (error) {
    logger.error('Error generating thumbnails', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Download thumbnail endpoint
export const downloadThumbnail = async (req: AuthRequest, res: Response) => {
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

    // Create the analytics event with proper object structure
    emitAnalyticsEvent(user.id, 'download', 'thumbnail', id, {
      downloadType: 'direct',
    });

    // Determine if free-tier watermark should be applied
    const subscription = await getCurrentSubscription(user.id);
    const planType = subscription?.planType || 'free';
    const needsWatermark = shouldApplyWatermark(planType);

    // Check watermark-free export availability for free users
    let watermarkFreeRemaining = 0;
    let cleanOriginalUrl: string | null = null;
    if (needsWatermark) {
      const wmStatus = await getWatermarkFreeStatus(user.id);
      watermarkFreeRemaining = wmStatus.remaining;
      // Provide clean original if available and not expired
      if (thumbnail.originalImageUrl && !isCleanOriginalExpired(thumbnail.createdAt)) {
        cleanOriginalUrl = thumbnail.originalImageUrl;
      }
    }

    // Download logic here - normally would serve file
    return res.status(200).json({
      downloadUrl: `/api/thumbnails/${id}/file`,
      message: 'Download started',
      watermarked: needsWatermark,
      watermarkFreeRemaining,
      cleanOriginalUrl,
    });
  } catch (error) {
    logger.error('Error downloading thumbnail', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
