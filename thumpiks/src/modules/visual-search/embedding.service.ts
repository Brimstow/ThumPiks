import fetch from 'node-fetch';
import { CacheService } from '../../services/cache.service';
import { EmbeddingResult, EmbeddingServiceDependencies } from './types';

/**
 * Embedding service using Jina CLIP v2 API.
 * Generates 768-dimensional vectors for images and text.
 * No local computation - all done via API to avoid Railway RAM overhead.
 */
export class EmbeddingService {
  private cache: CacheService;
  private apiKey: string;
  private apiUrl: string;

  constructor(dependencies: EmbeddingServiceDependencies = {}) {
    this.cache = dependencies.cache || CacheService.getInstance();
    this.apiKey = process.env.JINA_API_KEY || '';
    this.apiUrl =
      process.env.JINA_API_URL || 'https://api.jina.ai/v1/embeddings';
  }

  /**
   * Generate embedding from an image URL.
   * Uses Jina CLIP v2 which supports both image and text inputs.
   */
  async embedImage(imageUrl: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('Jina API key not configured');
    }

    // Check cache first (embeddings are deterministic)
    const cacheKey = `embedding:image:${imageUrl}`;
    const cached = await this.cache.get<EmbeddingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'jina-clip-v2',
        input: [{ image: imageUrl }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Jina embedding failed (${response.status}): ${errorText}`
      );
    }

    const data: { data?: Array<{ embedding?: number[] }> } = await response.json();
    const vector = data.data?.[0]?.embedding;

    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid embedding response from Jina API');
    }

    const result: EmbeddingResult = {
      vector,
      dimensions: vector.length,
    };

    // Cache embedding for 24 hours (deterministic, won't change)
    await this.cache.set(cacheKey, result, 86400);

    return result;
  }

  /**
   * Generate embedding from text query.
   * Used for text-to-image similarity search.
   */
  async embedText(text: string): Promise<EmbeddingResult> {
    if (!this.apiKey) {
      throw new Error('Jina API key not configured');
    }

    const cacheKey = `embedding:text:${text}`;
    const cached = await this.cache.get<EmbeddingResult>(cacheKey);
    if (cached) {
      return cached;
    }

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'jina-clip-v2',
        input: [{ text }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Jina embedding failed (${response.status}): ${errorText}`
      );
    }

    const data: { data?: Array<{ embedding?: number[] }> } = await response.json();
    const vector = data.data?.[0]?.embedding;

    if (!vector || !Array.isArray(vector)) {
      throw new Error('Invalid embedding response from Jina API');
    }

    const result: EmbeddingResult = {
      vector,
      dimensions: vector.length,
    };

    // Cache text embeddings for 1 hour
    await this.cache.set(cacheKey, result, 3600);

    return result;
  }
}
