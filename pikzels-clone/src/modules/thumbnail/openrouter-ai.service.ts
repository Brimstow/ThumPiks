import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenRouterAIService - AI Service using OpenRouter API
 *
 * OpenRouter supports image generation through models with "image" in their output_modalities.
 * Images are generated via the chat/completions endpoint with modalities: ["image", "text"]
 *
 * Supported Image Models:
 * - google/gemini-2.5-flash-image-preview (Nano Banana - fast, good quality)
 * - google/gemini-3-pro-image-preview (Nano Banana Pro - best quality)
 * - black-forest-labs/flux.2-pro (FLUX.2 Pro - high quality)
 * - black-forest-labs/flux.2-flex (FLUX.2 Flex - flexible)
 * - black-forest-labs/flux.2-klein-4b (FLUX.2 Klein - fast, cost-effective)
 * - sourceful/riverflow-v2-standard-preview
 *
 * @see https://openrouter.ai/docs/guides/overview/multimodal/image-generation
 */
export class OpenRouterAIService {
  private apiKey: string;
  private apiUrl: string;
  private defaultImageModel: string;

  // Available image generation models on OpenRouter (verified working)
  static readonly IMAGE_MODELS = {
    // Gemini / Nano Banana models (verified working)
    GEMINI_2_5_FLASH_IMAGE: 'google/gemini-2.5-flash-image',
    GEMINI_3_PRO_IMAGE: 'google/gemini-3-pro-image-preview',
    // OpenAI GPT-5 Image models (verified working)
    GPT_5_IMAGE: 'openai/gpt-5-image',
    GPT_5_IMAGE_MINI: 'openai/gpt-5-image-mini',
    // FLUX.2 models from Black Forest Labs (verified working)
    FLUX_2_PRO: 'black-forest-labs/flux.2-pro',
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
      OpenRouterAIService.IMAGE_MODELS.GEMINI_2_5_FLASH_IMAGE;

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
   * @param style Style of the image (bold, minimalist, dramatic)
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

    return await this.callImageAPI(styledPrompt, model, aspectRatio);
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
    return await this.callImageAPI(styledPrompt, model, aspectRatio, imageSize);
  }

  /**
   * Apply style modifications to prompt
   */
  private applyStyle(prompt: string, style: string): string {
    switch (style.toLowerCase()) {
      case 'bold':
        return `Generate an image: Bold, eye-catching design with high contrast and vibrant colors. ${prompt}. Make it visually striking with a clear focal point.`;
      case 'minimalist':
        return `Generate an image: Minimalist design with clean lines and simple elements. ${prompt}. Keep it elegant and uncluttered.`;
      case 'dramatic':
        return `Generate an image: Dramatic style with strong lighting and high contrast. ${prompt}. Give it a cinematic, impactful feel.`;
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
    imageSize?: '1K' | '2K' | '4K'
  ): Promise<string[]> {
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
        // CRITICAL: Required for image generation
        modalities: ['image', 'text'],
        stream: false,
      };

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
      });

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
          throw new Error(
            'OpenRouter rate limit exceeded. Please try again later.'
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
