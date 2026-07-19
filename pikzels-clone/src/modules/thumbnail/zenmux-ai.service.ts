import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger';

dotenv.config();

interface ZenmuxErrorResponse {
  error?: { message?: string };
}

interface ZenmuxVertexInlineData {
  mimeType?: string;
  data?: string;
}

interface ZenmuxVertexFileData {
  mimeType?: string;
  fileUri?: string;
  data?: string;
}

interface ZenmuxVertexPart {
  text?: string;
  inlineData?: ZenmuxVertexInlineData;
  fileData?: ZenmuxVertexFileData;
}

interface ZenmuxVertexContent {
  parts?: ZenmuxVertexPart[];
}

interface ZenmuxVertexCandidate {
  content?: ZenmuxVertexContent;
}

interface ZenmuxVertexResponse {
  candidates?: ZenmuxVertexCandidate[];
  parts?: ZenmuxVertexPart[];
  images?: Array<string | { url?: string; data?: string; mimeType?: string }>;
}

interface ZenmuxChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/**
 * ZenmuxAIService - AI Service using ZenMux API aggregation platform
 *
 * ZenMux supports image generation via the Vertex AI protocol.
 * Image models are accessed through: https://zenmux.ai/api/vertex-ai
 *
 * Supported Image Models:
 * - google/gemini-3-pro-image-preview (nanobana pro) - Best quality
 * - google/gemini-2.5-flash-image (nanobana) - Fast generation
 * - inclusionai/ming-flash-omni-preview - Alternative option
 *
 * @see https://docs.zenmux.ai/guide/advanced/image-generation.html
 */
export class ZenmuxAIService {
  private apiKey: string;
  private chatApiUrl: string;
  private vertexApiUrl: string;
  private defaultImageModel: string;

  // Available image generation models on ZenMux (via Vertex AI protocol)
  static readonly IMAGE_MODELS = {
    GEMINI_3_PRO: 'google/gemini-3-pro-image-preview',
    GEMINI_3_PRO_FREE: 'google/gemini-3-pro-image-preview-free',
    GEMINI_2_5_FLASH: 'google/gemini-2.5-flash-image',
    GEMINI_2_5_FLASH_FREE: 'google/gemini-2.5-flash-image-free',
    MING_FLASH: 'inclusionai/ming-flash-omni-preview',
  } as const;

  constructor() {
    this.apiKey = process.env.ZENMUX_API_KEY || '';
    // Chat completions endpoint (for text)
    this.chatApiUrl = process.env.ZENMUX_API_URL || 'https://zenmux.ai/api/v1';
    // Vertex AI endpoint (for image generation)
    this.vertexApiUrl =
      process.env.ZENMUX_VERTEX_URL || 'https://zenmux.ai/api/vertex-ai';
    // Default to Gemini 2.5 Flash for balance of speed and quality
    this.defaultImageModel =
      process.env.ZENMUX_IMAGE_MODEL ||
      ZenmuxAIService.IMAGE_MODELS.GEMINI_2_5_FLASH;

    if (!this.apiKey) {
      logger.warn(
        'ZENMUX_API_KEY not found in environment variables. Zenmux AI features will not work.'
      );
    }
  }

  /**
   * Generate images using ZenMux AI with Vertex AI protocol
   *
   * ZenMux supports image generation through the Vertex AI endpoint
   * using Gemini/Nano Banana models.
   *
   * @param prompt Text prompt for image generation
   * @param style Style of the image (bold, minimalist, dramatic)
   * @returns Array of image URLs (base64 data URIs)
   */
  async generateImages(
    prompt: string,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Zenmux API key not configured');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // Apply style modifications to prompt
    const styledPrompt = this.applyStyle(prompt, style);

    // Use the Vertex AI protocol for image generation
    return await this.generateViaVertexAI(styledPrompt, this.defaultImageModel);
  }

  /**
   * Generate images using a specific model
   *
   * @param prompt Text prompt for image generation
   * @param model Model to use (from IMAGE_MODELS)
   * @param style Style of the image
   * @returns Array of image URLs
   */
  async generateWithModel(
    prompt: string,
    model: string,
    style: string = 'default'
  ): Promise<string[]> {
    if (!this.apiKey) {
      throw new Error('Zenmux API key not configured');
    }

    const styledPrompt = this.applyStyle(prompt, style);
    return await this.generateViaVertexAI(styledPrompt, model);
  }

  /**
   * Apply style modifications to prompt
   */
  private applyStyle(prompt: string, style: string): string {
    switch (style.toLowerCase()) {
      case 'bold':
        return `Create an image: Bold, eye-catching design with high contrast and vibrant colors. ${prompt}. Make it visually striking with a clear focal point.`;
      case 'minimalist':
        return `Create an image: Minimalist design with clean lines and simple elements. ${prompt}. Keep it elegant and uncluttered.`;
      case 'dramatic':
        return `Create an image: Dramatic style with strong lighting and high contrast. ${prompt}. Give it a cinematic, impactful feel.`;
      case 'thumbnail':
        return `Create a YouTube thumbnail image: ${prompt}. Make it eye-catching, bold colors, high contrast, suitable for a video thumbnail at 1280x720 resolution.`;
      default:
        return `Generate an image: ${prompt}`;
    }
  }

  /**
   * Generate images via Vertex AI protocol
   * This is the core method that handles image generation through ZenMux's Vertex AI endpoint
   *
   * @param prompt The styled prompt
   * @param model The model to use
   * @returns Array of image URLs (base64 data URIs)
   */
  private async generateViaVertexAI(
    prompt: string,
    model: string
  ): Promise<string[]> {
    try {
      // Vertex AI protocol endpoint for content generation
      const endpoint = `${this.vertexApiUrl}/v1/models/${model}:generateContent`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            // Request both text and image in response
            responseModalities: ['TEXT', 'IMAGE'],
            // Optional: temperature for creativity
            temperature: 0.8,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: ZenmuxErrorResponse = {};
        try {
          errorData = JSON.parse(errorText);
        } catch {
          // Not JSON, use raw text
        }

        // Handle specific error codes
        if (response.status === 401) {
          throw new Error('Zenmux API key is invalid or expired');
        }
        if (response.status === 429) {
          throw new Error(
            'Zenmux API rate limit exceeded. Please try again later.'
          );
        }
        if (response.status === 402) {
          throw new Error(
            'Zenmux API: Insufficient credits or payment required'
          );
        }
        if (response.status === 400) {
          throw new Error(
            errorData.error?.message ||
              'Bad request - check model name and parameters'
          );
        }
        if (response.status === 404) {
          throw new Error(
            `Model '${model}' not found. Try one of: ${Object.values(ZenmuxAIService.IMAGE_MODELS).join(', ')}`
          );
        }

        throw new Error(
          errorData.error?.message ||
            `Zenmux Vertex AI error (${response.status}): ${response.statusText}`
        );
      }

      const data = await response.json() as ZenmuxVertexResponse;

      // Extract images from Vertex AI response format
      return this.extractImagesFromVertexResponse(data);
    } catch (error) {
      if (error instanceof Error) {
        // Re-throw if already formatted as Zenmux error
        if (error.message.startsWith('Zenmux')) {
          throw error;
        }
        throw new Error(`Zenmux AI generation failed: ${error.message}`);
      }
      throw new Error(`Zenmux AI generation failed: ${String(error)}`);
    }
  }

  /**
   * Extract image data from Vertex AI response format
   *
   * Vertex AI response format:
   * {
   *   candidates: [{
   *     content: {
   *       parts: [
   *         { text: "..." },
   *         { inlineData: { mimeType: "image/png", data: "base64..." } }
   *       ]
   *     }
   *   }]
   * }
   *
   * @param data The API response data
   * @returns Array of image URLs (base64 data URIs)
   */
  private extractImagesFromVertexResponse(data: ZenmuxVertexResponse): string[] {
    const images: string[] = [];

    // Handle Vertex AI response format
    if (data.candidates && Array.isArray(data.candidates)) {
      for (const candidate of data.candidates) {
        const content = candidate.content;
        if (!content?.parts) continue;

        for (const part of content.parts) {
          // Check for inline image data
          if (part.inlineData) {
            const { mimeType, data: base64Data } = part.inlineData;
            if (base64Data) {
              const dataUri = `data:${mimeType || 'image/png'};base64,${base64Data}`;
              images.push(dataUri);
            }
          }

          // Check for file data (alternative format)
          if (part.fileData) {
            const { mimeType, fileUri } = part.fileData;
            if (fileUri) {
              images.push(fileUri);
            } else if (part.fileData.data) {
              const dataUri = `data:${mimeType || 'image/png'};base64,${part.fileData.data}`;
              images.push(dataUri);
            }
          }

          // Check for image URL in text (fallback)
          if (part.text && typeof part.text === 'string') {
            const urlMatches = part.text.match(
              /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp)/gi
            );
            if (urlMatches) {
              images.push(...urlMatches);
            }
          }
        }
      }
    }

    // Alternative response format (direct parts array)
    if (data.parts && Array.isArray(data.parts)) {
      for (const part of data.parts) {
        if (part.inlineData) {
          const { mimeType, data: base64Data } = part.inlineData;
          if (base64Data) {
            const dataUri = `data:${mimeType || 'image/png'};base64,${base64Data}`;
            images.push(dataUri);
          }
        }
      }
    }

    // Check for images array (some models return this)
    if (data.images && Array.isArray(data.images)) {
      for (const img of data.images) {
        if (typeof img === 'string') {
          images.push(img);
        } else if (img.url) {
          images.push(img.url);
        } else if (img.data) {
          const mimeType = img.mimeType || 'image/png';
          images.push(`data:${mimeType};base64,${img.data}`);
        }
      }
    }

    if (images.length === 0) {
      throw new Error(
        'No images found in response. The model may not have generated an image for this prompt.'
      );
    }

    return images;
  }

  /**
   * Generate text completion using ZenMux chat endpoint
   *
   * @param prompt The prompt to send
   * @param model The model to use (e.g., 'openai/gpt-4o-mini', 'anthropic/claude-sonnet-4')
   * @returns The text response
   */
  async generateText(
    prompt: string,
    model: string = 'openai/gpt-4o-mini'
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Zenmux API key not configured');
    }

    try {
      const response = await fetch(`${this.chatApiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as ZenmuxErrorResponse;
        throw new Error(
          errorData.error?.message || `Zenmux API error (${response.status})`
        );
      }

      const data = await response.json() as ZenmuxChatResponse;

      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }

      throw new Error('Invalid response from Zenmux - no content');
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Zenmux text generation failed: ${error.message}`);
      }
      throw new Error(`Zenmux text generation failed: ${String(error)}`);
    }
  }

  /**
   * Alias for generateImages for backwards compatibility
   */
  async generateImagesViaChat(
    prompt: string,
    style: string = 'default'
  ): Promise<string[]> {
    return this.generateImages(prompt, style);
  }

  /**
   * List available image generation models
   * @returns Array of available model identifiers
   */
  getAvailableImageModels(): string[] {
    return Object.values(ZenmuxAIService.IMAGE_MODELS);
  }

  /**
   * Validate if the Zenmux AI service is properly configured
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
    chatApiUrl: string;
    vertexApiUrl: string;
    configured: boolean;
    defaultModel: string;
    availableModels: string[];
  } {
    return {
      name: 'ZenMux AI',
      chatApiUrl: this.chatApiUrl,
      vertexApiUrl: this.vertexApiUrl,
      configured: this.isConfigured(),
      defaultModel: this.defaultImageModel,
      availableModels: this.getAvailableImageModels(),
    };
  }
}
