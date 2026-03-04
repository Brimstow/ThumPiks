import { AIService } from './ai.service';
import { CometAIService } from './comet-ai.service';
import { ZenmuxAIService } from './zenmux-ai.service';
import { OpenRouterAIService } from './openrouter-ai.service';
import { ReplicateAIService } from './replicate-ai.service';

export type AIProvider = 'openai' | 'comet' | 'zenmux' | 'openrouter' | 'replicate';

export interface AIGenerationOptions {
  provider?: AIProvider;
  prompt: string;
  style?: string;
  count?: number;
  model?: string; // For OpenRouter
}

/**
 * AI Service Manager - Unified interface for all AI providers
 * Use this in your canvas editor to easily switch between AI services
 */
export class AIServiceManager {
  private openaiService: AIService;
  private cometService: CometAIService;
  private zenmuxService: ZenmuxAIService;
  private openrouterService: OpenRouterAIService;
  private replicateService: ReplicateAIService;

  constructor() {
    this.openaiService = new AIService();
    this.cometService = new CometAIService();
    this.zenmuxService = new ZenmuxAIService();
    this.openrouterService = new OpenRouterAIService();
    this.replicateService = new ReplicateAIService();
  }

  /**
   * Generate images using the specified AI provider
   * @param options Generation options including provider, prompt, style, etc.
   * @returns Array of image URLs
   */
  async generateImages(options: AIGenerationOptions): Promise<string[]> {
    const {
      provider = 'openai',
      prompt,
      style = 'default',
      count = 1,
      model = 'stability-ai/sdxl',
    } = options;

    switch (provider) {
      case 'openai':
        if (!this.openaiService.isConfigured()) {
          throw new Error('OpenAI service is not configured. Please set OPENAI_API_KEY.');
        }
        return await this.openaiService.generateThumbnails(prompt, style, count);

      case 'comet':
        if (!this.cometService.isConfigured()) {
          throw new Error('Comet AI service is not configured. Please set COMET_API_KEY.');
        }
        return await this.cometService.generateImages(prompt, style);

      case 'zenmux':
        if (!this.zenmuxService.isConfigured()) {
          throw new Error('Zenmux AI service is not configured. Please set ZENMUX_API_KEY.');
        }
        return await this.zenmuxService.generateImages(prompt, style);

      case 'openrouter':
        if (!this.openrouterService.isConfigured()) {
          throw new Error('OpenRouter service is not configured. Please set OPENROUTER_API_KEY.');
        }
        return await this.openrouterService.generateImages(prompt, model, style);

      default:
        throw new Error(`Unknown AI provider: ${provider}`);
    }
  }

  /**
   * Get list of available (configured) AI providers
   * @returns Array of provider names that are ready to use
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];

    if (this.openaiService.isConfigured()) {
      providers.push('openai');
    }
    if (this.cometService.isConfigured()) {
      providers.push('comet');
    }
    if (this.zenmuxService.isConfigured()) {
      providers.push('zenmux');
    }
    if (this.openrouterService.isConfigured()) {
      providers.push('openrouter');
    }
    if (this.replicateService.isConfigured()) {
      providers.push('replicate');
    }

    return providers;
  }

  /**
   * Check if a specific provider is configured and ready to use
   * @param provider The AI provider to check
   * @returns Boolean indicating if the provider is configured
   */
  isProviderConfigured(provider: AIProvider): boolean {
    switch (provider) {
      case 'openai':
        return this.openaiService.isConfigured();
      case 'comet':
        return this.cometService.isConfigured();
      case 'zenmux':
        return this.zenmuxService.isConfigured();
      case 'openrouter':
        return this.openrouterService.isConfigured();
      case 'replicate':
        return this.replicateService.isConfigured();
      default:
        return false;
    }
  }

  /**
   * Get the first available provider
   * @returns The first configured provider or null if none are configured
   */
  getDefaultProvider(): AIProvider | null {
    const available = this.getAvailableProviders();
    return available.length > 0 ? (available[0] as AIProvider) : null;
  }

  /**
   * List available models for OpenRouter
   * @returns Array of available model IDs
   */
  async listOpenRouterModels(): Promise<string[]> {
    if (!this.openrouterService.isConfigured()) {
      throw new Error('OpenRouter service is not configured');
    }
    return await this.openrouterService.listModels();
  }

  /**
   * Get the Replicate AI service instance for direct access
   * Used by controllers that need Replicate-specific methods (segment, removeBg, upscale, expand)
   */
  getReplicateService(): ReplicateAIService {
    return this.replicateService;
  }

  /**
   * Get the OpenRouter AI service instance for direct access
   * Used by controllers that need OpenRouter-specific methods
   */
  getOpenRouterService(): OpenRouterAIService {
    return this.openrouterService;
  }
}

// Export a singleton instance for easy use
export const aiServiceManager = new AIServiceManager();
