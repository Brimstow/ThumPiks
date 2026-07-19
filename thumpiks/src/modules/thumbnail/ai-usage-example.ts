/**
 * AI Service Usage Examples
 *
 * This file demonstrates how to use the AI services in your canvas editor
 */

import { aiServiceManager, AIProvider } from './ai-service-manager';
import { logger } from '../../utils/logger';

// ============================================================================
// Example 1: Simple Image Generation with Default Provider
// ============================================================================
export async function simpleGeneration(): Promise<unknown[]> {
  try {
    const images = await aiServiceManager.generateImages({
      prompt: 'A stunning YouTube thumbnail with gaming theme',
      style: 'bold',
      count: 3,
    });

    logger.info('Generated images', { count: images.length });
    return images;
  } catch (error) {
    logger.error('Generation failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ============================================================================
// Example 2: Generate with Specific Provider (Comet AI)
// ============================================================================
export async function generateWithComet(): Promise<unknown[]> {
  try {
    const images = await aiServiceManager.generateImages({
      provider: 'comet',
      prompt: 'Minimalist design for tech tutorial thumbnail',
      style: 'minimalist',
      count: 2,
    });

    return images;
  } catch (error) {
    logger.error('Comet generation failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ============================================================================
// Example 3: Generate with OpenRouter (Multiple Models)
// ============================================================================
export async function generateWithOpenRouter(): Promise<unknown[]> {
  try {
    // First, list available models
    const models = await aiServiceManager.listOpenRouterModels();
    logger.info('Available OpenRouter models', { models });

    // Generate with specific model
    const images = await aiServiceManager.generateImages({
      provider: 'openrouter',
      prompt: 'Epic cinematic thumbnail for movie review',
      style: 'dramatic',
      model: 'stability-ai/sdxl', // or 'midjourney' or any other available model
      count: 1,
    });

    return images;
  } catch (error) {
    logger.error('OpenRouter generation failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

// ============================================================================
// Example 4: Check Available Providers
// ============================================================================
export function checkAvailableProviders() {
  const available = aiServiceManager.getAvailableProviders();
  logger.info('Available AI providers', { available });

  // Check specific provider
  const isCometAvailable = aiServiceManager.isProviderConfigured('comet');
  logger.info('Is Comet AI available?', { isCometAvailable });

  return available;
}

// ============================================================================
// Example 5: Canvas Editor Integration - Generate with Fallback
// ============================================================================
export async function generateWithFallback(
  prompt: string,
  style: string = 'bold'
) {
  // Get available providers
  const providers: AIProvider[] = ['comet', 'zenmux', 'openrouter', 'openai'];

  for (const provider of providers) {
    if (aiServiceManager.isProviderConfigured(provider)) {
      try {
        logger.info('Attempting generation with provider', { provider });

        const images = await aiServiceManager.generateImages({
          provider,
          prompt,
          style,
          count: 3,
        });

        logger.info('Success with provider', { provider });
        return { images, provider };
      } catch (error) {
        logger.warn('Provider failed, trying next provider', { provider });
        continue;
      }
    }
  }

  throw new Error('No AI providers available or all providers failed');
}

// ============================================================================
// Example 6: Batch Generation with Multiple Providers
// ============================================================================
export async function batchGenerateFromMultipleProviders(prompt: string) {
  const available = aiServiceManager.getAvailableProviders();

  const results = await Promise.allSettled(
    available.map(async provider => {
      const images = await aiServiceManager.generateImages({
        provider,
        prompt,
        style: 'bold',
        count: 1,
      });

      return {
        provider,
        images,
      };
    })
  );

  // Filter successful results
  const successful = results
    .filter(result => result.status === 'fulfilled')
    .map((result: PromiseFulfilledResult<unknown>) => result.value);

  logger.info('Generated images from providers', { providerCount: successful.length });
  return successful;
}

// ============================================================================
// Example 7: Integration with Canvas Editor
// ============================================================================
export class CanvasEditorAI {
  private currentProvider: AIProvider | null;

  constructor() {
    // Auto-detect and use first available provider
    this.currentProvider = aiServiceManager.getDefaultProvider();
  }

  setProvider(provider: AIProvider) {
    if (!aiServiceManager.isProviderConfigured(provider)) {
      throw new Error(`Provider ${provider} is not configured`);
    }
    this.currentProvider = provider;
  }

  async generateForCanvas(
    prompt: string,
    options?: { style?: string; count?: number }
  ) {
    if (!this.currentProvider) {
      throw new Error('No AI provider configured');
    }

    return await aiServiceManager.generateImages({
      provider: this.currentProvider,
      prompt,
      style: options?.style || 'bold',
      count: options?.count || 3,
    });
  }

  getAvailableProviders() {
    return aiServiceManager.getAvailableProviders();
  }
}
