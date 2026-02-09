import fetch from 'node-fetch';
import { SimilarityMatch, IndexedThumbnail } from './types';

const COLLECTION_NAME = 'thumbnails';
const VECTOR_SIZE = 768; // Jina CLIP v2 output dimensions

/**
 * Qdrant vector database client.
 * Manages thumbnail embeddings for similarity search.
 *
 * Uses Qdrant Cloud in production, local Qdrant in development.
 */
export class QdrantService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = (
      process.env.QDRANT_URL || 'http://localhost:6333'
    ).replace(/\/$/, '');
    this.apiKey = process.env.QDRANT_API_KEY || '';
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      h['api-key'] = this.apiKey;
    }
    return h;
  }

  /**
   * Ensure the thumbnails collection exists with proper configuration.
   */
  async ensureCollection(): Promise<void> {
    // Check if collection exists
    const checkRes = await fetch(
      `${this.baseUrl}/collections/${COLLECTION_NAME}`,
      { method: 'GET', headers: this.headers }
    );

    if (checkRes.ok) return; // Already exists

    // Create collection
    const createRes = await fetch(`${this.baseUrl}/collections/${COLLECTION_NAME}`, {
      method: 'PUT',
      headers: this.headers,
      body: JSON.stringify({
        vectors: {
          size: VECTOR_SIZE,
          distance: 'Cosine',
        },
        optimizers_config: {
          indexing_threshold: 1000,
        },
      }),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(
        `Failed to create Qdrant collection (${createRes.status}): ${errorText}`
      );
    }
  }

  /**
   * Upsert a thumbnail embedding into the collection.
   */
  async upsertPoint(
    thumbnail: IndexedThumbnail,
    vector: number[]
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/collections/${COLLECTION_NAME}/points`,
      {
        method: 'PUT',
        headers: this.headers,
        body: JSON.stringify({
          points: [
            {
              id: thumbnail.id,
              vector,
              payload: {
                thumbnailId: thumbnail.thumbnailId,
                imageUrl: thumbnail.imageUrl,
                title: thumbnail.title,
                userId: thumbnail.userId,
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Qdrant upsert failed (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Search for similar thumbnails by vector.
   */
  async search(
    vector: number[],
    limit: number = 20,
    scoreThreshold: number = 0.5
  ): Promise<SimilarityMatch[]> {
    const response = await fetch(
      `${this.baseUrl}/collections/${COLLECTION_NAME}/points/search`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          vector,
          limit,
          score_threshold: scoreThreshold,
          with_payload: true,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Qdrant search failed (${response.status}): ${errorText}`
      );
    }

    const data: any = await response.json();
    return (data.result || []).map((point: any) => ({
      id: String(point.id),
      score: point.score,
      thumbnailId: point.payload?.thumbnailId || '',
      imageUrl: point.payload?.imageUrl || '',
      title: point.payload?.title || '',
      userId: point.payload?.userId || '',
    }));
  }

  /**
   * Delete a point from the collection.
   */
  async deletePoint(pointId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/collections/${COLLECTION_NAME}/points/delete`,
      {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          points: [pointId],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Qdrant delete failed (${response.status}): ${errorText}`
      );
    }
  }

  /**
   * Get collection info for health checks.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/collections/${COLLECTION_NAME}`,
        { method: 'GET', headers: this.headers }
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}
