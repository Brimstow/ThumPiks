import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { getPrisma } from '../../utils/prisma-factory';
import { CacheService } from '../../services/cache.service';
import { EmbeddingService } from './embedding.service';
import { QdrantService } from './qdrant.service';
import {
  VisualSearchResult,
  VisualSearchServiceDependencies,
  IndexedThumbnail,
} from './types';

/**
 * Visual Search Service
 *
 * Orchestrates embedding generation (Jina CLIP v2) and
 * similarity search (Qdrant) for thumbnail discovery.
 */
export class VisualSearchService {
  private prisma: PrismaClient;
  private cache: CacheService;
  private embeddingService: EmbeddingService;
  private qdrantService: QdrantService;
  private initialized = false;

  constructor(dependencies: VisualSearchServiceDependencies = {}) {
    this.prisma = dependencies.prisma || getPrisma();
    this.cache = dependencies.cache || CacheService.getInstance();
    this.embeddingService = new EmbeddingService({ cache: this.cache });
    this.qdrantService = new QdrantService();
  }

  /**
   * Ensure Qdrant collection exists on first use.
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.qdrantService.ensureCollection();
    this.initialized = true;
  }

  /**
   * Search for visually similar thumbnails using an image URL.
   */
  async searchByImage(
    imageUrl: string,
    limit: number = 20,
    scoreThreshold: number = 0.5
  ): Promise<VisualSearchResult> {
    await this.ensureInitialized();

    // Generate embedding for the query image
    const embedding = await this.embeddingService.embedImage(imageUrl);

    // Search Qdrant for similar vectors
    const matches = await this.qdrantService.search(
      embedding.vector,
      limit,
      scoreThreshold
    );

    return {
      query: { imageUrl, embedding: embedding.vector },
      matches,
      total: matches.length,
    };
  }

  /**
   * Search for thumbnails using a text description.
   * Leverages CLIP's cross-modal capabilities.
   */
  async searchByText(
    text: string,
    limit: number = 20,
    scoreThreshold: number = 0.3
  ): Promise<VisualSearchResult> {
    await this.ensureInitialized();

    const embedding = await this.embeddingService.embedText(text);

    const matches = await this.qdrantService.search(
      embedding.vector,
      limit,
      scoreThreshold
    );

    return {
      query: { imageUrl: '', embedding: embedding.vector },
      matches,
      total: matches.length,
    };
  }

  /**
   * Index a single thumbnail into the vector database.
   * Called after thumbnail creation or when re-indexing.
   */
  async indexThumbnail(thumbnailId: string): Promise<void> {
    await this.ensureInitialized();

    const thumbnail = await this.prisma.thumbnail.findUnique({
      where: { id: thumbnailId },
    });

    if (!thumbnail) {
      throw new Error(`Thumbnail not found: ${thumbnailId}`);
    }

    const embedding = await this.embeddingService.embedImage(
      thumbnail.imageUrl
    );

    const indexed: IndexedThumbnail = {
      id: uuidv4(),
      thumbnailId: thumbnail.id,
      imageUrl: thumbnail.imageUrl,
      title: thumbnail.title,
      userId: thumbnail.userId,
    };

    await this.qdrantService.upsertPoint(indexed, embedding.vector);
  }

  /**
   * Batch index multiple thumbnails.
   * Useful for initial import or re-indexing.
   */
  async indexBatch(
    userId: string,
    batchSize: number = 50
  ): Promise<{ indexed: number; errors: number }> {
    await this.ensureInitialized();

    const thumbnails = await this.prisma.thumbnail.findMany({
      where: { userId },
      take: batchSize,
      orderBy: { createdAt: 'desc' },
    });

    let indexed = 0;
    let errors = 0;

    for (const thumbnail of thumbnails) {
      try {
        const embedding = await this.embeddingService.embedImage(
          thumbnail.imageUrl
        );

        const point: IndexedThumbnail = {
          id: uuidv4(),
          thumbnailId: thumbnail.id,
          imageUrl: thumbnail.imageUrl,
          title: thumbnail.title,
          userId: thumbnail.userId,
        };

        await this.qdrantService.upsertPoint(point, embedding.vector);
        indexed++;
      } catch {
        errors++;
      }
    }

    return { indexed, errors };
  }

  /**
   * Remove a thumbnail from the vector index.
   */
  async removeThumbnail(pointId: string): Promise<void> {
    await this.qdrantService.deletePoint(pointId);
  }

  /**
   * Health check for the visual search subsystem.
   */
  async healthCheck(): Promise<{
    qdrant: boolean;
    jina: boolean;
  }> {
    const qdrant = await this.qdrantService.healthCheck();

    // Simple Jina check - just verify API key is configured
    const jina = !!process.env.JINA_API_KEY;

    return { qdrant, jina };
  }
}
