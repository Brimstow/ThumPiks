export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
}

export interface SimilarityMatch {
  id: string;
  score: number;
  thumbnailId: string;
  imageUrl: string;
  title: string;
  userId: string;
}

export interface VisualSearchResult {
  query: {
    imageUrl: string;
    embedding?: number[];
  };
  matches: SimilarityMatch[];
  total: number;
}

export interface IndexedThumbnail {
  id: string;
  thumbnailId: string;
  imageUrl: string;
  title: string;
  userId: string;
}

export interface EmbeddingServiceDependencies {
  cache?: import('../../services/cache.service').CacheService;
}

export interface VisualSearchServiceDependencies {
  prisma?: import('@prisma/client').PrismaClient;
  cache?: import('../../services/cache.service').CacheService;
}
