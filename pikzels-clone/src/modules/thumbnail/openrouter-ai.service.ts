import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger';

dotenv.config();

// Timeout configuration (in milliseconds) — per-tool timeouts
// Research-backed: Gemini Flash enhance/remove-bg ~5-15s, Pro inpaint ~10-30s, upscale ~15-45s
const TOOL_TIMEOUT_MS: Record<string, number> = {
  enhance:    30_000,  // 30s - Gemini Pro, single image edit
  'remove-bg': 25_000,  // 25s - Gemini Pro, simple task
  generate:   45_000,  // 45s - Gemini Flash, text-to-image
  inpaint:    60_000,  // 60s - Gemini Pro, complex edit with context
  'face-swap': 45_000,  // 45s - Seedream, specialized portrait
  upscale:    60_000,  // 60s - FLUX/Gemini, detail-heavy 2K/4K
  expand:     45_000,  // 45s - outpainting, canvas expansion
  default:    45_000,  // 45s fallback
} as const;

// JJ: Per-tool timeout lookup — replaces flat IMAGE_GENERATION_TIMEOUT
const DEFAULT_TIMEOUT_MS = 45_000;
function getToolTimeout(toolType?: string): number {
  if (!toolType) return DEFAULT_TIMEOUT_MS;
  const val = (TOOL_TIMEOUT_MS as Record<string, number>)[toolType];
  return typeof val === 'number' ? val : DEFAULT_TIMEOUT_MS;
}

const MAX_RETRIES = 2;
const RETRY_DELAY = 3000; // 3 seconds

// Detection categories for comprehensive scene decomposition
const VALID_CATEGORIES = ['foreground', 'background', 'text', 'logo', 'decoration'] as const;
export type DetectionCategory = (typeof VALID_CATEGORIES)[number];

// Native tool definition for object detection via function calling
const DETECT_OBJECTS_TOOL = {
  type: 'function' as const,
  function: {
    name: 'report_detected_objects',
    description: 'Report all detected visual elements in the image with their bounding boxes.',
    parameters: {
      type: 'object',
      properties: {
        objects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              label: { type: 'string', description: 'Descriptive name (1-4 words). For text elements, prefix with "text:" (e.g. "text: SUBSCRIBE")' },
              category: { type: 'string', enum: ['foreground', 'background', 'text', 'logo', 'decoration'] },
              confidence: { type: 'number', description: 'Detection confidence 0.0-1.0' },
              box_2d: { type: 'array', items: { type: 'number' }, minItems: 4, maxItems: 4, description: 'Bounding box [y_min, x_min, y_max, x_max] normalized to 0-1000' },
            },
            required: ['label', 'category', 'confidence', 'box_2d'],
          },
        },
      },
      required: ['objects'],
    },
  },
};

/**
 * OpenRouterAIService - AI Service using OpenRouter API
 *
 * OpenRouter supports image generation through models with "image" in their output_modalities.
 * Images are generated via the chat/completions endpoint with modalities: ["image", "text"]
 *
 * Supported Image Models:
 * - google/gemini-2.5-flash-image-preview (Nano Banana - fast, good quality)
 * - google/gemini-3-pro-image-preview (Nano Banana Pro - best quality)
 * - black-forest-labs/flux-pro (FLUX Pro - high quality)
 * - black-forest-labs/flux-dev (FLUX Dev - flexible)
 * - black-forest-labs/flux-schnell (FLUX Schnell - fast, cost-effective)
 * - sourceful/riverflow-v2-standard-preview
 *
 * @see https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
export class OpenRouterAIService {
  private apiKey: string;
  private apiUrl: string;
  private defaultImageModel: string;

  // Available image generation models on OpenRouter (updated Jan 2026)
  static readonly IMAGE_MODELS = {
    // Google Nano Banana models (Gemini-based, best for thumbnails)
    NANO_BANANA: 'google/gemini-2.5-flash-image', // GA - Best value, fast
    NANO_BANANA_PRO: 'google/gemini-3-pro-image-preview', // Highest quality, 2K/4K support
    // OpenAI GPT-5 Image models
    GPT_5_IMAGE: 'openai/gpt-5-image', // Premium OpenAI quality
    GPT_5_IMAGE_MINI: 'openai/gpt-5-image-mini', // Cheaper, still great
    // Black Forest Labs FLUX.2 family
    FLUX_PRO: 'black-forest-labs/flux-pro', // Top quality
    FLUX_DEV: 'black-forest-labs/flux-dev', // Good balance
    FLUX_SCHNELL: 'black-forest-labs/flux-schnell', // Fastest, cheapest
    // ByteDance Seedream
    SEEDREAM_4_5: 'bytedance-seed/seedream-4.5', // Good for portraits
    // Sourceful Riverflow (unified text-to-image and image-to-image)
    RIVERFLOW_V2_MAX: 'sourceful/riverflow-v2-max-preview',
    RIVERFLOW_V2_STANDARD: 'sourceful/riverflow-v2-standard-preview',
    RIVERFLOW_V2_FAST: 'sourceful/riverflow-v2-fast-preview',
  } as const;

  // Recommended models for each AI tool type
  // These can be overridden via environment variables
  static readonly TOOL_MODELS = {
    // Text-to-image generation - fast, good for thumbnails
    generate: {
      primary: 'google/gemini-2.5-flash-image',
      fallback: 'black-forest-labs/flux.2-pro',
      envVar: 'OPENROUTER_MODEL_GENERATE',
    },
    // Inpainting - needs contextual understanding
    inpaint: {
      primary: 'google/gemini-3-pro-image-preview',
      fallback: 'black-forest-labs/flux.2-flex',
      envVar: 'OPENROUTER_MODEL_INPAINT',
    },
    // Face swap - needs identity preservation and facial feature detection
    // ByteDance Seedream 4.5 is specifically optimized for face swapping operations
    faceSwap: {
      primary: 'bytedance-seed/seedream-4.5',
      fallback: 'google/gemini-3-pro-image-preview',
      envVar: 'OPENROUTER_MODEL_FACESWAP',
    },
    // Upscaling - needs detail preservation
    // Using Gemini which supports 2K/4K output via image_size
    upscale: {
      primary: 'google/gemini-2.5-flash-image',
      fallback: 'google/gemini-3-pro-image-preview',
      envVar: 'OPENROUTER_MODEL_UPSCALE',
    },
    // Object detection (Gemini) - returns JSON with labeled bounding boxes
    // Used by trybrid decompose pipeline alongside Reka Edge
    detect: {
      primary: 'google/gemini-3-flash-preview',
      fallback: 'google/gemini-2.5-flash',
      envVar: 'OPENROUTER_MODEL_DETECT',
    },
    // Object detection (Reka Edge) - uses native Detect: format
    // Best-in-class spatial detection (RefCOCO-A: 93.13), runs parallel with Gemini
    detectReka: {
      primary: 'rekaai/reka-edge',   // Correct OpenRouter slug (reka/reka-edge was removed)
      fallback: 'rekaai/reka-flash-3',
      envVar: 'OPENROUTER_MODEL_DETECT_REKA',
    },
  } as const;

  // Supported aspect ratios for Gemini models
  static readonly ASPECT_RATIOS = {
    SQUARE: '1:1', // 1024×1024 (default)
    PORTRAIT_2_3: '2:3', // 832×1248
    LANDSCAPE_3_2: '3:2', // 1248×832
    PORTRAIT_3_4: '3:4', // 864×1184
    LANDSCAPE_4_3: '4:3', // 1184×864
    PORTRAIT_4_5: '4:5', // 896×1152
    LANDSCAPE_5_4: '5:4', // 1152×896
    PORTRAIT_9_16: '9:16', // 768×1344
    LANDSCAPE_16_9: '16:9', // 1344×768 (good for thumbnails)
    ULTRAWIDE: '21:9', // 1536×672
  } as const;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.apiUrl =
      process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
    // Default to Gemini 2.5 Flash Image for balance of speed and quality
    this.defaultImageModel =
      process.env.OPENROUTER_IMAGE_MODEL ||
      OpenRouterAIService.IMAGE_MODELS.NANO_BANANA;

    if (!this.apiKey) {
      console.warn(
        'OPENROUTER_API_KEY not found in environment variables. OpenRouter AI features will not work.'
      );
    }
  }

  /**
   * Generate images using OpenRouter API
   *
   * @param prompt Text prompt for image generation
   * @param model Specific model to use (must support image output)
   * @param style Style of the image (bold, minimalist, dramatic, cinematic, professional, creative, gaming)
   * @returns Array of image URLs (base64 data URLs)
   */
  async generateImages(
    prompt: string,
    model: string = this.defaultImageModel,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // Apply style modifications to prompt
    const styledPrompt = this.applyStyle(prompt, style);

    // Use 16:9 aspect ratio for thumbnails by default
    const aspectRatio = OpenRouterAIService.ASPECT_RATIOS.LANDSCAPE_16_9;

    return await this.callImageAPI(styledPrompt, model, aspectRatio, undefined, 'generate');
  }

  /**
   * Generate images with specific model and options
   *
   * @param prompt Text prompt for image generation
   * @param model Model to use
   * @param aspectRatio Aspect ratio (for Gemini models)
   * @param imageSize Image size: '1K', '2K', or '4K' (for Gemini models)
   * @param style Style to apply
   * @returns Array of image URLs
   */
  async generateWithOptions(
    prompt: string,
    model: string,
    aspectRatio: string = '16:9',
    imageSize: '1K' | '2K' | '4K' = '1K',
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const styledPrompt = this.applyStyle(prompt, style);
    return await this.callImageAPI(styledPrompt, model, aspectRatio, imageSize, 'generate');
  }

  /**
   * Apply style modifications to prompt for OpenRouter image models
   */
  private applyStyle(prompt: string, style: string): string {
    switch (style.toLowerCase()) {
      case 'bold':
        return `Generate an image: Bold, eye-catching design with high contrast and vibrant colors. ${prompt}. Make it visually striking with a clear focal point.`;
      case 'minimalist':
        return `Generate an image: Minimalist design with clean lines and simple elements. ${prompt}. Keep it elegant and uncluttered.`;
      case 'dramatic':
        return `Generate an image: Dramatic style with strong lighting and high contrast. ${prompt}. Give it a cinematic, impactful feel.`;
      case 'cinematic':
        return `Generate an image: Cinematic style with movie poster quality, professional photography, dramatic composition and lighting. ${prompt}. Make it look like a high-budget film frame.`;
      case 'professional':
        return `Generate an image: Professional, corporate style with clean design, business-like aesthetic, trustworthy and polished look. ${prompt}. Keep it sophisticated and credible.`;
      case 'creative':
        return `Generate an image: Creative, artistic style with unique perspective, artistic flair and imaginative design. ${prompt}. Make it eye-catching with creative visual elements.`;
      case 'gaming':
        return `Generate an image: Gaming-style with energetic, action-packed visuals, vibrant neon colors and gaming aesthetic. ${prompt}. Make it exciting and dynamic like a game thumbnail.`;
      case 'thumbnail':
        return `Generate a YouTube thumbnail image: ${prompt}. Make it eye-catching with bold colors, high contrast, clear text, suitable for a video thumbnail.`;
      default:
        return `Generate an image: ${prompt}`;
    }
  }

  /**
   * Call the OpenRouter API for image generation
   *
   * @param prompt The styled prompt
   * @param model The model to use
   * @param aspectRatio Aspect ratio for the image
   * @param imageSize Image size (Gemini only)
   * @returns Array of image URLs
   */
  private async callImageAPI(
    prompt: string,
    model: string,
    aspectRatio: string = '16:9',
    imageSize?: '1K' | '2K' | '4K',
    toolType?: string
  ): Promise<string[]> {
    let lastError: Error | null = null;

    // Retry loop for resilience
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`OpenRouter: Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        return await this.executeImageRequest(
          prompt,
          model,
          aspectRatio,
          imageSize,
          toolType
        );
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors
        const noRetryErrors = [
          'API key',
          'credits',
          'Invalid',
          '400',
          '401',
          '402',
        ];
        if (noRetryErrors.some(e => lastError!.message.includes(e))) {
          throw lastError;
        }

        console.warn(
          `OpenRouter attempt ${attempt + 1} failed:`,
          lastError.message
        );
      }
    }

    throw lastError || new Error('Image generation failed after retries');
  }

  /**
   * Execute a single image generation request with timeout
   */
  private async executeImageRequest(
    prompt: string,
    model: string,
    aspectRatio: string = '16:9',
    imageSize?: '1K' | '2K' | '4K',
    toolType?: string
  ): Promise<string[]> {
    // JJ: Per-tool timeout instead of flat 120s
    const timeout = getToolTimeout(toolType);
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout
    );

    try {
      // Build request body
      const requestBody: any = {
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
      };

      // Add modalities based on model type
      // FLUX models: image-only output, use ["image"]
      // Gemini/GPT: text+image output, use ["image", "text"]
      if (model.includes('flux')) {
        requestBody.modalities = ['image'];
      } else if (
        model.includes('gemini') ||
        model.includes('google/') ||
        model.includes('gpt-')
      ) {
        requestBody.modalities = ['image', 'text'];
      }

      // Add image_config for Gemini models
      if (model.includes('gemini') || model.includes('google/')) {
        requestBody.image_config = {
          aspect_ratio: aspectRatio,
        };
        if (imageSize) {
          requestBody.image_config.image_size = imageSize;
        }
      }

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8556',
          'X-Title': 'ThumPiks Canvas Editor',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any, // Cast for node-fetch compatibility
      });

      // Clear timeout on successful response
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON
        }

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('OpenRouter API key is invalid or expired');
        }
        if (response.status === 402) {
          throw new Error(
            'OpenRouter: Insufficient credits or payment required'
          );
        }
        if (response.status === 429) {
          // JJ: Parse Retry-After header for smarter backoff
          const retryAfter: string | null | undefined = response.headers?.get?.('Retry-After');
          const retryAfterSec = retryAfter ? parseInt(retryAfter, 10) : NaN;
          const waitHint = !isNaN(retryAfterSec) ? ` Retry after ${retryAfterSec}s.` : '';
          throw new Error(
            `OpenRouter rate limit exceeded.${waitHint} Please try again later.`
          );
        }
        if (response.status === 400) {
          // Check if it's a model-specific error
          const errorMsg = errorData.error?.message || errorText;
          if (
            errorMsg.includes('modalities') ||
            errorMsg.includes('image') ||
            errorMsg.includes('not support')
          ) {
            throw new Error(
              `Model '${model}' may not support image generation. Try: ${Object.values(OpenRouterAIService.IMAGE_MODELS).join(', ')}`
            );
          }
          throw new Error(
            errorMsg || 'Bad request - check model and parameters'
          );
        }

        throw new Error(
          errorData.error?.message ||
            `OpenRouter API error (${response.status}): ${response.statusText}`
        );
      }

      const data: any = await response.json();

      // Extract images from OpenRouter response
      return this.extractImagesFromResponse(data);
    } catch (error) {
      // Always clear timeout
      clearTimeout(timeoutId);

      // Handle abort/timeout specifically
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(
          `OpenRouter: Request timed out after ${timeout / 1000}s. Image generation may take longer - please try again.`
        );
      }

      if (error instanceof Error) {
        // Re-throw if already formatted
        if (error.message.startsWith('OpenRouter')) {
          throw error;
        }
        throw new Error(`OpenRouter AI generation failed: ${error.message}`);
      }
      throw new Error(`OpenRouter AI generation failed: ${String(error)}`);
    }
  }

  /**
   * Extract images from OpenRouter response
   *
   * Response format:
   * {
   *   choices: [{
   *     message: {
   *       role: "assistant",
   *       content: "...",
   *       images: [{
   *         type: "image_url",
   *         image_url: { url: "data:image/png;base64,..." }
   *       }]
   *     }
   *   }]
   * }
   *
   * @param data The API response data
   * @returns Array of image URLs
   */
  private extractImagesFromResponse(data: any): string[] {
    const images: string[] = [];

    if (!data.choices || !Array.isArray(data.choices)) {
      throw new Error('Invalid response format - no choices array');
    }

    for (const choice of data.choices) {
      const message = choice.message;
      if (!message) continue;

      // Primary format: images array in message
      if (message.images && Array.isArray(message.images)) {
        for (const img of message.images) {
          // Format: { type: "image_url", image_url: { url: "data:..." } }
          if (img.image_url?.url) {
            images.push(img.image_url.url);
          }
          // Alternative format: { url: "data:..." }
          else if (img.url) {
            images.push(img.url);
          }
          // Direct base64 data
          else if (typeof img === 'string' && img.startsWith('data:image')) {
            images.push(img);
          }
        }
      }

      // Fallback: check content for embedded images
      if (typeof message.content === 'string') {
        // Check for base64 images in content
        const base64Matches = message.content.match(
          /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g
        );
        if (base64Matches) {
          images.push(...base64Matches);
        }
      }

      // Fallback: content as array (multimodal format)
      if (Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            images.push(part.image_url.url);
          } else if (part.type === 'image' && part.url) {
            images.push(part.url);
          }
        }
      }
    }

    if (images.length === 0) {
      throw new Error(
        'No images found in response. The model may not have generated an image. ' +
          'Ensure the model supports image output and modalities includes "image".'
      );
    }

    return images;
  }

  /**
   * List available image generation models on OpenRouter
   * Fetches models and filters for those with image output capability
   *
   * @returns Array of model IDs that support image generation
   */
  async listImageModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models (${response.status})`);
      }

      const data: any = await response.json();

      if (data.data && Array.isArray(data.data)) {
        // Filter for models with image output capability
        return data.data
          .filter((model: any) => {
            const outputModalities = model.output_modalities || [];
            return outputModalities.includes('image');
          })
          .map((model: any) => model.id);
      }

      return [];
    } catch (error) {
      console.error('Failed to list OpenRouter image models:', error);
      // Return known image models as fallback
      return Object.values(OpenRouterAIService.IMAGE_MODELS);
    }
  }

  /**
   * List all available models on OpenRouter
   * @returns Array of all available model IDs
   */
  async listModels(): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models (${response.status})`);
      }

      const data: any = await response.json();

      if (data.data && Array.isArray(data.data)) {
        return data.data.map((model: any) => model.id);
      }

      return [];
    } catch (error) {
      console.error('Failed to list OpenRouter models:', error);
      return [];
    }
  }

  /**
   * Get available image models (static list)
   * @returns Array of known image model identifiers
   */
  getAvailableImageModels(): string[] {
    return Object.values(OpenRouterAIService.IMAGE_MODELS);
  }

  /**
   * Get the best model for a specific AI tool type
   * Checks environment variables first, then uses recommended defaults
   *
   * @param toolType The type of AI tool (generate, inpaint, faceSwap, upscale)
   * @param useFallback Whether to use the fallback model instead of primary
   * @returns The model ID to use
   */
  getModelForTool(
    toolType: keyof typeof OpenRouterAIService.TOOL_MODELS,
    useFallback: boolean = false
  ): string {
    const toolConfig = OpenRouterAIService.TOOL_MODELS[toolType];
    if (!toolConfig) {
      // Unknown tool type, return default image model
      return this.defaultImageModel;
    }

    // Check for environment variable override
    const envModel = process.env[toolConfig.envVar];
    if (envModel) {
      return envModel;
    }

    // Return primary or fallback based on preference
    return useFallback ? toolConfig.fallback : toolConfig.primary;
  }

  /**
   * Get all tool model configurations
   * @returns Object with model configs for each tool type
   */
  getToolModelConfigs(): typeof OpenRouterAIService.TOOL_MODELS {
    return OpenRouterAIService.TOOL_MODELS;
  }

  /**
   * Inpaint (edit) an image by providing a mask and prompt
   * Uses the inpaint-optimized model
   *
   * @param imageBase64 Base64-encoded source image
   * @param maskBase64 Base64-encoded mask (white = edit area)
   * @param prompt Description of what to fill in the masked area
   * @returns Array of image URLs
   */
  async inpaintImage(
    imageBase64: string,
    _maskBase64: string, // Reserved for future mask-based inpainting
    prompt: string,
    modelOverride?: string
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = modelOverride || this.getModelForTool('inpaint');
    const fullPrompt = `Edit this image. Apply a mask and modify the masked region as follows: ${prompt}. Preserve the unmasked areas exactly as they are.`;

    // Send image with prompt for inpainting
    return await this.callImageAPIWithImage(imageBase64, fullPrompt, model, '16:9', undefined, 'inpaint');
  }

  /**
   * Face swap - replace a face in an image with another face
   * Uses ByteDance Seedream 4.5 - specifically designed for portrait and face swap operations
   *
   * @param sourceImageBase64 Base64-encoded source image (contains the face to keep)
   * @param targetImageBase64 Base64-encoded target image (where face will be placed)
   * @param prompt Additional instructions for the swap
   * @returns Array of image URLs
   */
  async faceSwapImage(
    sourceImageBase64: string,
    targetImageBase64: string,
    prompt: string = '',
    modelOverride?: string
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = modelOverride || this.getModelForTool('faceSwap');
    const fullPrompt =
      `Perform a face swap. Take the face from the first image and seamlessly blend it onto the person in the second image. Maintain natural lighting, skin tone matching, and preserve the expression. ${prompt}`.trim();

    // Send both images for face swap
    return await this.callImageAPIWithMultipleImages(
      [sourceImageBase64, targetImageBase64],
      fullPrompt,
      model,
      'face-swap'
    );
  }

  /**
   * Upscale an image to higher resolution
   * Uses FLUX.2 Max for best detail preservation
   *
   * @param imageBase64 Base64-encoded source image
   * @param scale Scale factor (2x, 4x)
   * @returns Array of image URLs
   */
  async upscaleImage(
    imageBase64: string,
    scale: '2x' | '4x' = '2x',
    modelOverride?: string
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = modelOverride || this.getModelForTool('upscale');
    const imageSize = scale === '4x' ? '4K' : '2K';
    const fullPrompt = `Upscale this image to ${scale} resolution. Enhance details, sharpen edges, reduce artifacts, and improve overall quality while maintaining the original composition and style.`;

    // Gemini models support image_size for higher resolution output
    return await this.callImageAPIWithImage(
      imageBase64,
      fullPrompt,
      model,
      '16:9',
      imageSize,
      'upscale'
    );
  }

  /**
   * Remove background from an image
   * Creates a transparent or solid color background
   *
   * @param imageBase64 Base64-encoded source image
   * @param backgroundColor Background to apply ('transparent', 'white', 'black', or hex color)
   * @returns Array of image URLs
   */
  async removeBackground(
    imageBase64: string,
    backgroundColor: string = 'transparent'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = this.getModelForTool('inpaint'); // Inpaint model works well for this
    const bgDesc =
      backgroundColor === 'transparent'
        ? 'a completely transparent background (PNG with alpha channel)'
        : `a solid ${backgroundColor} background`;
    const fullPrompt = `Remove the background from this image. Keep only the main subject(s) in the foreground with ${bgDesc}. Preserve fine details like hair edges and semi-transparent elements.`;

    return await this.callImageAPIWithImage(imageBase64, fullPrompt, model, '16:9', undefined, 'remove-bg');
  }

  /**
   * Enhance image quality (color correction, sharpening, noise reduction)
   *
   * @param imageBase64 Base64-encoded source image
   * @param enhancementType Type of enhancement to apply
   * @returns Array of image URLs
   */
  async enhanceImage(
    imageBase64: string,
    enhancementType: 'auto' | 'color' | 'sharpen' | 'denoise' | 'hdr' = 'auto'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const model = this.getModelForTool('inpaint'); // Pro model for quality

    let enhancementDesc: string;
    switch (enhancementType) {
      case 'color':
        enhancementDesc =
          'Enhance the colors: improve saturation, correct white balance, and make colors more vibrant while keeping them natural.';
        break;
      case 'sharpen':
        enhancementDesc =
          'Sharpen the image: enhance edges and fine details without introducing artifacts or halos.';
        break;
      case 'denoise':
        enhancementDesc =
          'Remove noise and grain from the image while preserving important details and textures.';
        break;
      case 'hdr':
        enhancementDesc =
          'Apply HDR-style enhancement: expand dynamic range, bring out shadow details, and control highlights.';
        break;
      default:
        enhancementDesc =
          'Automatically enhance this image: improve colors, sharpness, reduce noise, and optimize overall quality.';
    }

    const fullPrompt = `${enhancementDesc} Maintain the original composition and style.`;

    return await this.callImageAPIWithImage(imageBase64, fullPrompt, model, '16:9', undefined, 'enhance');
  }

  // ===========================================================================
  // DETECTION HELPERS
  // ===========================================================================

  /** Compute Intersection-over-Union for two bounding boxes. */
  private static computeIoU(
    a: { yMin: number; xMin: number; yMax: number; xMax: number },
    b: { yMin: number; xMin: number; yMax: number; xMax: number }
  ): number {
    const interYMin = Math.max(a.yMin, b.yMin);
    const interXMin = Math.max(a.xMin, b.xMin);
    const interYMax = Math.min(a.yMax, b.yMax);
    const interXMax = Math.min(a.xMax, b.xMax);
    const interArea = Math.max(0, interYMax - interYMin) * Math.max(0, interXMax - interXMin);
    const aArea = (a.yMax - a.yMin) * (a.xMax - a.xMin);
    const bArea = (b.yMax - b.yMin) * (b.xMax - b.xMin);
    const unionArea = aArea + bArea - interArea;
    return unionArea > 0 ? interArea / unionArea : 0;
  }

  /** Remove detections with >70% bbox overlap, keeping earlier (higher-priority) entries. */
  private static deduplicateDetections(
    detections: Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }>,
    iouThreshold: number = 0.7
  ): Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> {
    return detections.filter((a, i) => {
      for (let j = 0; j < i; j++) {
        if (OpenRouterAIService.computeIoU(a.bbox, detections[j]!.bbox) > iouThreshold) return false;
      }
      return true;
    });
  }

  // ===========================================================================
  // OBJECT DETECTION - Detect objects with labeled bounding boxes
  // ===========================================================================

  /**
   * Detect objects in an image using native function calling (Gemini).
   * Returns semantic labels and bounding boxes for each detected object.
   * Used by the hybrid decompose pipeline.
   *
   * @param imageBase64 Base64-encoded image to analyze
   * @param maxObjects Maximum number of objects to detect
   * @returns Array of detected objects with labels and bounding boxes, or empty array on failure
   */
  async detectObjects(
    imageBase64: string,
    maxObjects: number = 14
  ): Promise<Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }>> {
    if (!this.apiKey) {
      logger.warn('[detectObjects] OpenRouter API key not configured');
      return [];
    }

    const model = this.getModelForTool('detect');
    const imageUrl = imageBase64.startsWith('data:image')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    const systemPrompt = `You are a comprehensive visual element detection model. Analyze the image and identify ALL visible elements across these categories:

FOREGROUND — Main subjects: people, animals, vehicles, products, furniture
BACKGROUND — Scene regions: sky, mountains, ground, floor, water, walls, horizon
TEXT — Any rendered text: titles, captions, subtitles, watermarks, labels, timestamps
LOGO — Brand marks: YouTube play button, channel logos, product logos, social icons
DECORATION — Visual embellishments: arrows, borders, frames, shapes, lines, circles, stars, emoji

Rules:
- Detect up to ${maxObjects} elements across ALL categories
- Include at least one background region if visible
- For text elements, include the readable content in the label prefixed with "text:" (e.g. "text: SUBSCRIBE")
- Each distinct text block is a separate detection
- Merge overlapping detections of the same element
- Order by visual importance: foreground first, then text, logos, backgrounds last
- Call report_detected_objects with your results`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const requestBody: any = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: `Detect all visual elements in this image — foreground subjects, background regions, text overlays, logos, and decorations (up to ${maxObjects}). Call report_detected_objects with the results.` },
            ],
          },
        ],
        tools: [DETECT_OBJECTS_TOOL],
        tool_choice: { type: 'function', function: { name: 'report_detected_objects' } },
        stream: false,
      };

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8556',
          'X-Title': 'ThumPiks Canvas Editor',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('[detectObjects] API error', { status: response.status, model, errorPreview: errorText.slice(0, 500) });
        return [];
      }

      const data: any = await response.json();
      const toolCalls = data.choices?.[0]?.message?.tool_calls;

      if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        // Fallback: try to parse text content as JSON (in case model ignores tool_choice)
        const rawContent = data.choices?.[0]?.message?.content || '';
        logger.warn('[detectObjects] No tool_calls in response, attempting text fallback', { contentPreview: rawContent.slice(0, 300) });
        return this.parseDetectionFallback(rawContent);
      }

      const toolCall = toolCalls[0];
      let args: any;
      try {
        args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch {
        logger.warn('[detectObjects] Failed to parse tool_call arguments', { raw: String(toolCall.function?.arguments).slice(0, 500) });
        return [];
      }

      const objects = Array.isArray(args.objects) ? args.objects : [];
      const results: Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> = [];

      for (const item of objects) {
        const label = typeof item.label === 'string' ? item.label : '';
        if (!label) continue;

        const box = item.box_2d;
        if (!Array.isArray(box) || box.length !== 4 || !box.every((v: any) => typeof v === 'number')) continue;

        const [yMin, xMin, yMax, xMax] = box as [number, number, number, number];

        const category: DetectionCategory =
          typeof item.category === 'string' && (VALID_CATEGORIES as readonly string[]).includes(item.category)
            ? (item.category as DetectionCategory)
            : 'foreground';

        const confidence: number =
          typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1
            ? item.confidence
            : 0.5;

        results.push({ label, category, confidence, bbox: { yMin, xMin, yMax, xMax } });
      }

      const deduped = OpenRouterAIService.deduplicateDetections(results);
      logger.info('[detectObjects] Parsed detection results (native tool calling)', { raw: results.length, deduped: deduped.length, elements: deduped.map(r => `${r.label} [${r.category}]`) });
      return deduped;
    } catch (error) {
      clearTimeout(timeoutId);
      logger.warn('[detectObjects] Detection failed', { error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  }

  /**
   * Lightweight fallback parser for when the model ignores tool_choice
   * and returns detection results as plain text/JSON instead.
   */
  private parseDetectionFallback(
    rawContent: string
  ): Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> {
    let content = rawContent.trim();
    if (!content) return [];

    // Strip markdown code fences if present
    if (content.startsWith('```')) {
      content = content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    if (!content.startsWith('[')) {
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (arrayMatch) content = arrayMatch[0];
    }

    try {
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) return [];

      const results: Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> = [];
      for (const item of parsed) {
        const label = item.label || item.name || item.object;
        if (typeof label !== 'string') continue;

        const box = item.box_2d || item.bounding_box || item.bbox;
        if (!Array.isArray(box) || box.length !== 4 || !box.every((v: any) => typeof v === 'number')) continue;

        const [yMin, xMin, yMax, xMax] = box as [number, number, number, number];
        const category: DetectionCategory =
          typeof item.category === 'string' && (VALID_CATEGORIES as readonly string[]).includes(item.category)
            ? (item.category as DetectionCategory)
            : 'foreground';
        const confidence = typeof item.confidence === 'number' && item.confidence >= 0 && item.confidence <= 1 ? item.confidence : 0.5;
        results.push({ label, category, confidence, bbox: { yMin, xMin, yMax, xMax } });
      }

      return OpenRouterAIService.deduplicateDetections(results);
    } catch {
      logger.warn('[detectObjects] Fallback text parsing failed', { preview: content.slice(0, 300) });
      return [];
    }
  }

  // ===========================================================================
  // REKA EDGE DETECTION - Native Detect: format for precision object detection
  // ===========================================================================

  /**
   * Category-specific expressions for Reka Edge's native Detect: format.
   * Each entry maps a DetectionCategory to a comma-separated expression string.
   * Reka was trained on "Detect: {expression}" and returns <obj> tagged output.
   */
  private static readonly REKA_DETECT_EXPRESSIONS: Record<DetectionCategory, string> = {
    foreground: 'people, person, animal, vehicle, car, product, furniture, main subject, figure',
    text: 'text overlay, title text, caption, subtitle, watermark, label, timestamp, rendered text',
    logo: 'logo, brand mark, YouTube play button, channel logo, product logo, social media icon',
    decoration: 'arrow, border, frame, shape, line, circle, star, emoji, graphic element, banner',
    background: 'sky, mountain, ground, floor, water, wall, horizon, scenery, background region',
  };

  /**
   * Detect objects using Reka Edge's native Detect: format.
   * Makes category-specific calls in parallel for precision.
   * Returns the same interface as detectObjects() for seamless pipeline integration.
   */
  async detectObjectsReka(
    imageBase64: string,
    maxObjects: number = 14
  ): Promise<Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }>> {
    if (!this.apiKey) {
      logger.warn('[detectObjectsReka] OpenRouter API key not configured');
      return [];
    }

    const model = this.getModelForTool('detectReka');
    const imageUrl = imageBase64.startsWith('data:image')
      ? imageBase64
      : `data:image/png;base64,${imageBase64}`;

    const categories = Object.keys(OpenRouterAIService.REKA_DETECT_EXPRESSIONS) as DetectionCategory[];

    // Run all category-specific Detect: calls in parallel
    logger.info('[detectObjectsReka] Starting parallel Detect: calls', { model, categories: categories.length });
    const categoryResults = await Promise.allSettled(
      categories.map(category =>
        this.rekaDetectCall(imageUrl, OpenRouterAIService.REKA_DETECT_EXPRESSIONS[category], model)
          .then(rawContent => ({ category, rawContent }))
      )
    );

    const allResults: Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> = [];

    for (const result of categoryResults) {
      if (result.status !== 'fulfilled') {
        logger.warn('[detectObjectsReka] Category call failed', { error: (result.reason as Error)?.message });
        continue;
      }

      const { category, rawContent } = result.value;
      const parsed = this.parseRekaDetectResponse(rawContent, category);
      allResults.push(...parsed);
    }

    // Cap at maxObjects, sorted by confidence descending
    allResults.sort((a, b) => b.confidence - a.confidence);
    const capped = allResults.slice(0, maxObjects);

    logger.info('[detectObjectsReka] Reka detection complete', {
      total: capped.length,
      elements: capped.map(r => `${r.label} [${r.category}]`),
    });

    return capped;
  }

  /**
   * Make a single Reka Edge Detect: API call.
   * Returns raw response content string.
   */
  private async rekaDetectCall(
    imageUrl: string,
    expression: string,
    model: string
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s per call

    try {
      const requestBody: any = {
        model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: imageUrl } },
              { type: 'text', text: `Detect: ${expression}` },
            ],
          },
        ],
        stream: false,
      };

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8556',
          'X-Title': 'ThumPiks Canvas Editor',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn('[rekaDetectCall] API error', { status: response.status, model, errorPreview: errorText.slice(0, 300) });
        return '';
      }

      const data: any = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || '';
      logger.info('[rekaDetectCall] Reka response', { expression: expression.slice(0, 50), contentLength: rawContent.length, contentPreview: rawContent.slice(0, 300) });
      return rawContent;
    } catch (error) {
      clearTimeout(timeoutId);
      logger.warn('[rekaDetectCall] Failed', { expression: expression.slice(0, 50), error: error instanceof Error ? error.message : String(error) });
      return '';
    }
  }

  /**
   * Parse Reka Edge's native <obj> tag detection output.
   * Format: <obj> label x1,y1,x2,y2 </obj> or <obj> label x1,y1,x2,y2;x3,y3,x4,y4 </obj>
   * Coordinates may be pixel-based or normalized; we normalize to 0-1000.
   */
  private parseRekaDetectResponse(
    rawContent: string,
    category: DetectionCategory
  ): Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> {
    if (!rawContent.trim()) return [];

    const results: Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }> = [];

    // Match <obj> ... </obj> tags
    const objRegex = /<obj>\s*([\s\S]*?)\s*<\/obj>/gi;
    let match: RegExpExecArray | null;

    while ((match = objRegex.exec(rawContent)) !== null) {
      const inner = match[1]!.trim();
      // Expected: "label x1,y1,x2,y2" or "label x1,y1,x2,y2;x3,y3,x4,y4"
      // The coordinates are at the end, separated from the label
      const coordPattern = /(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/g;
      const allCoords: Array<[number, number, number, number]> = [];
      let coordMatch: RegExpExecArray | null;

      while ((coordMatch = coordPattern.exec(inner)) !== null) {
        allCoords.push([
          parseFloat(coordMatch[1]!),
          parseFloat(coordMatch[2]!),
          parseFloat(coordMatch[3]!),
          parseFloat(coordMatch[4]!),
        ]);
      }

      if (allCoords.length === 0) continue;

      // Extract label: everything before the first coordinate match
      const firstCoordIdx = inner.search(/\d+(?:\.\d+)?\s*,\s*\d+(?:\.\d+)?\s*,/);
      let label = firstCoordIdx > 0 ? inner.substring(0, firstCoordIdx).trim() : inner;
      // Clean up trailing/leading whitespace and punctuation
      label = label.replace(/[\s,;]+$/, '').trim();
      if (!label) label = `${category} element`;

      // Process each bounding box (multiple = multiple instances of same object)
      for (const [x1, y1, x2, y2] of allCoords) {
        // Reka may return pixel coords or normalized coords
        // If any coord > 1000, assume pixel coords and we can't normalize without image dims
        // For safety, clamp to 0-1000 range (Reka via OpenRouter likely uses 0-1000 like Gemini)
        const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(v)));

        results.push({
          label,
          category,
          confidence: 0.85, // Reka doesn't return confidence; use high default (strong detector)
          bbox: {
            yMin: clamp(y1),
            xMin: clamp(x1),
            yMax: clamp(y2),
            xMax: clamp(x2),
          },
        });
      }
    }

    // Fallback: if no <obj> tags found, try to parse as plain text with coordinates
    if (results.length === 0 && rawContent.includes(',')) {
      logger.info('[parseRekaDetectResponse] No <obj> tags found, trying coordinate fallback', { category, preview: rawContent.slice(0, 200) });
      // Some Reka responses may just return "label: x1,y1,x2,y2" without tags
      const lineRegex = /^(.+?)\s+(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/gm;
      let lineMatch: RegExpExecArray | null;
      while ((lineMatch = lineRegex.exec(rawContent)) !== null) {
        const label = lineMatch[1]!.replace(/[\s:;]+$/, '').trim();
        if (!label) continue;
        const clamp = (v: number) => Math.max(0, Math.min(1000, Math.round(parseFloat(v as any))));
        results.push({
          label,
          category,
          confidence: 0.80,
          bbox: {
            yMin: clamp(lineMatch[3] as any),
            xMin: clamp(lineMatch[2] as any),
            yMax: clamp(lineMatch[5] as any),
            xMax: clamp(lineMatch[4] as any),
          },
        });
      }
    }

    logger.info('[parseRekaDetectResponse] Parsed Reka results', { category, count: results.length });
    return results;
  }

  // ===========================================================================
  // TRYBRID DETECTION - Reka Edge + Gemini in parallel, merged + deduped
  // ===========================================================================

  /**
   * Trybrid detection: Run Reka Edge and Gemini 3 Flash in parallel,
   * merge results, and deduplicate overlapping detections.
   *
   * Reka Edge excels at precise spatial detection (RefCOCO-A: 93.13).
   * Gemini excels at reasoning about abstract elements (text, logos, decorations).
   * Combined, they provide comprehensive scene decomposition.
   *
   * @param imageBase64 Base64-encoded image to analyze
   * @param maxObjects Maximum number of objects to detect
   * @returns Merged, deduplicated array of detected objects
   */
  async detectObjectsParallel(
    imageBase64: string,
    maxObjects: number = 14
  ): Promise<Array<{ label: string; category: DetectionCategory; confidence: number; bbox: { yMin: number; xMin: number; yMax: number; xMax: number } }>> {
    logger.info('[detectObjectsParallel] Starting trybrid detection (Reka + Gemini)');

    // Run both detectors in parallel
    const [rekaResult, geminiResult] = await Promise.allSettled([
      this.detectObjectsReka(imageBase64, maxObjects),
      this.detectObjects(imageBase64, maxObjects),
    ]);

    const rekaObjects = rekaResult.status === 'fulfilled' ? rekaResult.value : [];
    const geminiObjects = geminiResult.status === 'fulfilled' ? geminiResult.value : [];

    if (rekaResult.status === 'rejected') {
      logger.warn('[detectObjectsParallel] Reka detection failed, using Gemini only', { error: (rekaResult.reason as Error)?.message });
    }
    if (geminiResult.status === 'rejected') {
      logger.warn('[detectObjectsParallel] Gemini detection failed, using Reka only', { error: (geminiResult.reason as Error)?.message });
    }

    logger.info('[detectObjectsParallel] Raw results', { reka: rekaObjects.length, gemini: geminiObjects.length });

    // Merge: Reka results first (higher spatial precision), then Gemini
    const merged = [...rekaObjects, ...geminiObjects];

    // Deduplicate: remove detections with >70% bbox overlap, keeping earlier (Reka-priority)
    const deduped = OpenRouterAIService.deduplicateDetections(merged);

    // Cap at maxObjects
    const capped = deduped.slice(0, maxObjects);

    logger.info('[detectObjectsParallel] Trybrid detection complete', {
      reka: rekaObjects.length,
      gemini: geminiObjects.length,
      merged: merged.length,
      deduped: capped.length,
      elements: capped.map(r => `${r.label} [${r.category}]`),
    });

    return capped;
  }

  /**
   * Call OpenRouter API with an input image for editing tasks
   *
   * @param imageBase64 Base64-encoded image
   * @param prompt The editing prompt
   * @param model Model to use
   * @param aspectRatio Aspect ratio for output
   * @param imageSize Image size for Gemini models
   * @returns Array of image URLs
   */
  private async callImageAPIWithImage(
    imageBase64: string,
    prompt: string,
    model: string,
    aspectRatio: string = '16:9',
    imageSize?: '1K' | '2K' | '4K',
    toolType?: string
  ): Promise<string[]> {
    let lastError: Error | null = null;

    // JJ: Retry loop — mirrors callImageAPI's retry logic.
    // Without retries, a single transient 504/502/503 from Railway's edge proxy
    // (caused by keepAliveTimeout connection reuse) kills the entire operation.
    // A second attempt almost always succeeds on a fresh connection.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // JJ: Per-tool timeout instead of flat 120s
      const timeout = getToolTimeout(toolType);
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout
      );

      try {
        if (attempt > 0) {
          console.log(`OpenRouter (image-with-image): Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        // Ensure base64 has proper data URL prefix
        const imageUrl = imageBase64.startsWith('data:image')
          ? imageBase64
          : `data:image/png;base64,${imageBase64}`;

        const requestBody: any = {
          model: model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image_url',
                  image_url: { url: imageUrl },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
          stream: false,
        };

        // Add modalities based on model type
        // FLUX models: image-only output, use ["image"]
        // Gemini/GPT: text+image output, use ["image", "text"]
        if (model.includes('flux')) {
          requestBody.modalities = ['image'];
        } else if (
          model.includes('gemini') ||
          model.includes('google/') ||
          model.includes('gpt-')
        ) {
          requestBody.modalities = ['image', 'text'];
        }

        // Add image_config for Gemini models
        if (model.includes('gemini') || model.includes('google/')) {
          requestBody.image_config = { aspect_ratio: aspectRatio };
          if (imageSize) {
            requestBody.image_config.image_size = imageSize;
          }
        }

        const response = await fetch(`${this.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8556',
            'X-Title': 'ThumPiks Canvas Editor',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal as any,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenRouter API error (${response.status}): ${errorText}`
          );
        }

        const data: any = await response.json();
        return this.extractImagesFromResponse(data);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(
            `OpenRouter: Request timed out after ${timeout / 1000}s`
          );
          // JJ: Don't retry on timeout — if the model can't respond within
          // the per-tool timeout, retrying won't help (it's a capacity issue).
          throw lastError;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors (same list as callImageAPI)
        const noRetryErrors = [
          'API key',
          'credits',
          'Invalid',
          '400',
          '401',
          '402',
        ];
        if (noRetryErrors.some(e => lastError!.message.includes(e))) {
          throw lastError;
        }

        console.warn(
          `OpenRouter (image-with-image) attempt ${attempt + 1} failed:`,
          lastError.message
        );
      }
    }

    throw lastError || new Error('Image-with-image request failed after retries');
  }

  /**
   * Call OpenRouter API with multiple input images (for face swap, etc.)
   */
  private async callImageAPIWithMultipleImages(
    imagesBase64: string[],
    prompt: string,
    model: string,
    toolType?: string
  ): Promise<string[]> {
    let lastError: Error | null = null;

    // JJ: Retry loop — same rationale as callImageAPIWithImage.
    // Face-swap is especially vulnerable: it sends two large base64 images,
    // making the request payload larger and more likely to hit Railway proxy issues.
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const timeout = getToolTimeout(toolType);
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        timeout
      );

      try {
        if (attempt > 0) {
          console.log(`OpenRouter (multi-image): Retry attempt ${attempt}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        // Build content array with all images then the prompt
        const content: any[] = imagesBase64.map(img => {
          const imageUrl = img.startsWith('data:image')
            ? img
            : `data:image/png;base64,${img}`;
          return {
            type: 'image_url',
            image_url: { url: imageUrl },
          };
        });
        content.push({ type: 'text', text: prompt });

        const requestBody: any = {
          model: model,
          messages: [{ role: 'user', content }],
          stream: false,
        };

        // Add modalities based on model type
        if (model.includes('flux')) {
          requestBody.modalities = ['image'];
        } else if (
          model.includes('gemini') ||
          model.includes('google/') ||
          model.includes('gpt-')
        ) {
          requestBody.modalities = ['image', 'text'];
        }

        const response = await fetch(`${this.apiUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:8556',
            'X-Title': 'ThumPiks Canvas Editor',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal as any,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `OpenRouter API error (${response.status}): ${errorText}`
          );
        }

        const data: any = await response.json();
        return this.extractImagesFromResponse(data);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(
            `OpenRouter: Request timed out after ${timeout / 1000}s`
          );
          // Don't retry on timeout — capacity issue, not transient.
          throw lastError;
        }

        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on certain errors (same list as callImageAPI)
        const noRetryErrors = [
          'API key',
          'credits',
          'Invalid',
          '400',
          '401',
          '402',
        ];
        if (noRetryErrors.some(e => lastError!.message.includes(e))) {
          throw lastError;
        }

        console.warn(
          `OpenRouter (multi-image) attempt ${attempt + 1} failed:`,
          lastError.message
        );
      }
    }

    throw lastError || new Error('Multi-image request failed after retries');
  }

  /**
   * Validate if the OpenRouter AI service is properly configured
   * @returns Boolean indicating if the service is ready to use
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get service information
   * @returns Object with service details
   */
  getServiceInfo(): {
    name: string;
    apiUrl: string;
    configured: boolean;
    defaultModel: string;
    availableModels: string[];
  } {
    return {
      name: 'OpenRouter AI',
      apiUrl: this.apiUrl,
      configured: this.isConfigured(),
      defaultModel: this.defaultImageModel,
      availableModels: this.getAvailableImageModels(),
    };
  }
}
