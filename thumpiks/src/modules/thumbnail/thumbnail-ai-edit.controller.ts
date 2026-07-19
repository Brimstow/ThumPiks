import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { requireUser } from '../../middleware/auth.middleware';
import { logger } from '../../utils/logger';
import {
  openRouterService,
  replicateService,
  ensureBase64,
  ensureUrl,
} from './thumbnail.shared';
import { getFaceSwapService } from './replicate-face-swap.service';
import {
  resolveModelFromTier,
  getCreditCostForTier,
  getDefaultTier,
  getTierCapability,
} from './model-tiers.config';
import { deductCredits, refundCredits } from '../credit/credit.service';
import { getAIPriorityQueue } from './ai-priority-queue.service';
import type { AIJobParams } from './ai-priority-queue.service';
import { getCurrentSubscription } from '../subscription/subscription.service';
import { emitAnalyticsEvent } from '../../events/event-emitter';
import { watermarkImageUrls } from './watermark.service';

/**
 * Inpaint - edit specific areas of an image with mask + prompt
 * Model: google/gemini-3-pro-image-preview (configurable via OPENROUTER_MODEL_INPAINT)
 */
export const aiInpaint = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

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
    logger.info('AI Inpaint using model', { model, tier: effectiveTier, override: modelOverride || 'none' });

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'inpaint');
    const deducted = await deductCredits(
      user.id,
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

      // Build the direct executor
      const directExecutor = async () => {
        const urls = await openRouterService.inpaintImage(
          imageBase64,
          mask || '',
          prompt,
          resolvedModel || undefined
        );
        return { images: urls };
      };

      let imageUrls: string[];

      // Route through priority queue (Ultra Pro users dequeue first)
      const aiQueue = getAIPriorityQueue();
      if (aiQueue.isReady()) {
        const subscription = await getCurrentSubscription(user.id);
        const planType = subscription?.planType || 'free';
        const jobParams: AIJobParams = {
          operationType: 'inpaint',
          userId: user.id,
          planType,
          provider: 'openrouter',
          model,
          tier: tier || 'default',
          payload: { image: imageBase64, mask: mask || '', prompt, model: resolvedModel },
          toolTimeout: 60000,
        };
        const result = await aiQueue.executeViaQueue(jobParams, directExecutor);
        imageUrls = result.images as string[];
      } else {
        const result = await directExecutor();
        imageUrls = result.images;
      }

      // Emit analytics event
      emitAnalyticsEvent(user.id, 'ai-tool', 'inpaint', 'ai-inpaint', {
        model,
        promptLength: prompt.length,
      });

      // Watermark free-tier outputs
      const wmResult = await watermarkImageUrls(user.id, imageUrls);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, `AI inpaint failed`);
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI inpaint', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI inpaint failed',
    });
  }
};

/**
 * Face swap — replace face in target image with face from source image.
 * Engine: mertguvencli/face-swap-with-indexes (InsightFace inswapper, Replicate)
 * Pro tier: adds Reve Remix polish step for cinematic quality.
 */
export const aiFaceSwap = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const {
      sourceImage,
      targetImage,
      targetFaceIndex = 0,
      tier,
    } = req.body;

    if (!sourceImage || !targetImage) {
      return res.status(400).json({
        error: 'Source image and target image are required',
      });
    }

    const faceSwapService = getFaceSwapService();

    if (!faceSwapService.isConfigured()) {
      return res.status(503).json({
        error: 'Face swap service not configured. Please set REPLICATE_API_KEY.',
      });
    }

    // Credit check & deduction (before API call)
    const creditCost = getCreditCostForTier(tier, 'face-swap');
    const deducted = await deductCredits(
      user.id,
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
      // Ensure source and target are HTTP URLs (upload base64 to Cloudinary if needed)
      const sourceUrl = await ensureUrl(sourceImage);
      const targetUrl = await ensureUrl(targetImage);

      const result = await faceSwapService.swapFace(sourceUrl, targetUrl, {
        targetFaceIndex: Number(targetFaceIndex) || 0,
        tier: tier === 'pro' ? 'pro' : 'standard',
      });

      logger.info('Face swap pipeline complete', {
        pipeline: result.pipeline,
        tier: tier || 'standard',
        userId: user.id,
      });

      // Emit analytics event
      emitAnalyticsEvent(user.id, 'ai-tool', 'face-swap', 'ai-face-swap', {
        pipeline: result.pipeline,
        tier: tier || 'standard',
      });

      // Watermark free-tier outputs (download-time only — see watermark.service)
      const wmResult = await watermarkImageUrls(user.id, [result.url]);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        pipeline: result.pipeline,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, `AI face-swap failed`);
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI face swap', error instanceof Error ? error : new Error(String(error)));
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
    const user = requireUser(req, res);
    if (!user) return;

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

    // Validate scale-tier compatibility (4K requires Pro tier)
    const effectiveTier = tier || 'standard';
    const maxScale = getTierCapability(effectiveTier, 'upscale', 'maxScale');
    if (maxScale && scale === '4x' && maxScale !== '4x') {
      return res.status(400).json({
        error: '4x upscale requires the Pro tier. Please select ThumPiks Pro for 4K output.',
        code: 'SCALE_TIER_MISMATCH',
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

    logger.info('AI Upscale using provider', { provider, model, scale });

    // Credit check & deduction
    const creditCost = useReplicate ? 1 : getCreditCostForTier(tier, 'upscale');
    const deducted = await deductCredits(
      user.id,
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
      emitAnalyticsEvent(user.id, 'ai-tool', 'upscale', 'ai-upscale', {
        model,
        scale,
        provider,
      });

      // Watermark free-tier outputs
      const wmResult = await watermarkImageUrls(user.id, imageUrls);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
        scale,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, `AI upscale failed`);
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI upscale', error instanceof Error ? error : new Error(String(error)));
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
    const user = requireUser(req, res);
    if (!user) return;

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
    logger.info('AI Remove Background using provider', { provider, model });

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(
      user.id,
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
        user.id,
        'ai-tool',
        'remove-background',
        'ai-remove-background',
        { model, backgroundColor, provider }
      );

      // Watermark free-tier outputs
      const wmResult = await watermarkImageUrls(user.id, imageUrls);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
        provider,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(
        user.id,
        creditCost,
        'AI remove-background failed'
      );
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI remove background', error instanceof Error ? error : new Error(String(error)));
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
    const user = requireUser(req, res);
    if (!user) return;

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
    logger.info('AI Enhance using model', { model, enhancementType });

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(user.id, creditCost, 'AI enhance');
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
      emitAnalyticsEvent(user.id, 'ai-tool', 'enhance', 'ai-enhance', {
        model,
        enhancementType,
      });

      // Watermark free-tier outputs
      const wmResult = await watermarkImageUrls(user.id, imageUrls);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
        enhancementType,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, 'AI enhance failed');
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI enhance', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI enhance failed',
    });
  }
};

/**
 * Segment objects in an image using SAM 2 (Segment Anything Model)
 * Provider: Replicate
 *
 * Supports two modes:
 * - 'auto': Auto-segmentation with grid (meta/sam-2) - returns all detected objects
 * - 'interactive': Click-to-select (meta/sam-2-video) - returns mask for clicked object
 */
export const aiSegment = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

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
    logger.info('AI Segment', { mode, model, clickCount: clicks?.length || 0 });

    // Credit check & deduction - flat 1 credit (non-tiered tool)
    const creditCost = 1;
    const deducted = await deductCredits(
      user.id,
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
          user.id,
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
          user.id,
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
      await refundCredits(user.id, creditCost, 'AI segment failed');
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI segment', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI segment failed',
    });
  }
};

/**
 * Decompose an image into isolated semantic layers using SAM auto-segmentation.
 * Each detected object becomes a separate RGBA layer that can be independently
 * edited, moved, or styled in the Advanced Editor.
 */
export const aiDecompose = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { image, maxLayers = 14 } = req.body;

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
      user.id,
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
      const result = await replicateService.decompose(image, maxLayers, openRouterService);

      // Emit analytics event
      emitAnalyticsEvent(user.id, 'ai-tool', 'decompose', 'ai-decompose', {
        layerCount: result.layers.length,
        maxLayers,
        pipeline: result.pipeline,
      });

      return res.status(200).json({
        success: true,
        layers: result.layers,
        predictionId: result.predictionId,
        pipeline: result.pipeline,
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, 'AI decompose failed');
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI decompose', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI decompose failed',
    });
  }
};

/**
 * Expand/Outpaint - Extend canvas in any direction with AI-generated content
 * Provider: Replicate (purpose-built outpainting model)
 */
export const aiExpand = async (req: AuthRequest, res: Response) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

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

    logger.info('AI Expand', { direction, pixels, model });

    // Credit check & deduction - 2 credits (similar complexity to upscale)
    const creditCost = 2;
    const deducted = await deductCredits(
      user.id,
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
      emitAnalyticsEvent(user.id, 'ai-tool', 'expand', 'ai-expand', {
        model,
        direction,
        expandPixels: pixels,
        hasPrompt: !!prompt,
      });

      const wmResult = await watermarkImageUrls(user.id, [resultUrl]);

      return res.status(200).json({
        success: true,
        images: wmResult.displayUrls,
        originals: wmResult.originalUrls,
        model,
        direction,
        expandPixels: pixels,
        provider: 'replicate',
      });
    } catch (apiError) {
      // Refund credits on API failure
      await refundCredits(user.id, creditCost, 'AI expand failed');
      throw apiError;
    }
  } catch (error) {
    logger.error('Error in AI expand', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'AI expand failed',
    });
  }
};
