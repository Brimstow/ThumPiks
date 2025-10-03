import Redis from 'ioredis';

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;

  private constructor() {
    // Skip Redis connection in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      console.log('🧪 Test environment detected - skipping Redis connection');
      return;
    }

    const redisConfig: any = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    };

    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    this.redis = new Redis(redisConfig);

    // Handle connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    this.redis.on('error', (error) => {
      console.warn('⚠️  Redis connection error:', error.message);
    });
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    try {
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.warn(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn(`Cache del error for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (!this.redis) return;
    
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn(`Cache delPattern error for pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      return (await this.redis.exists(key)) === 1;
    } catch (error) {
      console.warn(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set cached data (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttlSeconds = 300
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFunction();
    await this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, ttlSeconds = 3600): Promise<number> {
    if (!this.redis) return 0;
    
    try {
      const count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      console.warn(`Cache increment error for key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.redis) return false;
    
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close connection (for graceful shutdown)
   */
  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.disconnect();
    }
  }
}

// Cache key generators
export const CacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  userThumbnails: (userId: string, page = 1) => `user:${userId}:thumbnails:${page}`,
  project: (projectId: string) => `project:${projectId}`,
  thumbnail: (thumbnailId: string) => `thumbnail:${thumbnailId}`,
  analytics: (userId: string, period: string) => `analytics:${userId}:${period}`,
  socialShares: (thumbnailId: string) => `social:${thumbnailId}`,
  rateLimit: (userId: string, action: string) => `ratelimit:${userId}:${action}`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 1800, // 30 minutes
  VERY_LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
};