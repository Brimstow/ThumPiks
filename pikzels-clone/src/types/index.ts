// Re-export all types for easy importing

// Authentication & Security types
export * from './auth';

// API Request/Response types
export * from './api';

// Database model types
export * from './database';

// Utility types
export type Nullable<T> = T | null;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Environment types
export type Environment = 'development' | 'production' | 'test';

// HTTP method types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// Image processing types
export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpg' | 'png' | 'webp';
  crop?: boolean;
}

// AI enhancement types
export interface AIEnhancementOptions {
  style?: 'bold' | 'minimalist' | 'dramatic';
  prompt?: string;
  seed?: number;
  steps?: number;
}

// Cache types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string;
  tags?: string[];
}

// Event types for analytics
export interface AnalyticsEvent {
  type: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  timestamp: Date;
}