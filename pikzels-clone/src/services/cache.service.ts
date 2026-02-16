import Redis from 'ioredis';

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private inMemoryCache: Map<string, { value: unknown; expires: number }> =
    new Map();
  private isRedisAvailable = false;
  private redisCheckInterval: NodeJS.Timeout | null = null;
  private memoryCacheCleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Skip Redis connection in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      console.log('🧪 Test environment detected - using in-memory cache only');
      this.startMemoryCacheCleanup();
      return;
    }

    // Initialize in-memory cache as fallback
    this.startMemoryCacheCleanup();

    // Try to connect to Redis (production-like setup)
    this.initializeRedis();
  }

  private initializeRedis() {
    const redisConfig: {
      host: string;
      port: number;
      maxRetriesPerRequest: number;
      retryDelayOnFailover: number;
      lazyConnect: boolean;
      connectTimeout: number;
      commandTimeout: number;
      password?: string;
    } = {
      host: process.env.REDIS_HOST ?? 'localhost',
      // NOTE: Changed from standard port 6379 to 8520 to follow project port convention (8500-8599)
      port: parseInt(process.env.REDIS_PORT ?? '8520'),
      maxRetriesPerRequest: 2,
      retryDelayOnFailover: 100,
      lazyConnect: true,
      connectTimeout: 3000,
      commandTimeout: 2000,
    };

    if (process.env.REDIS_PASSWORD) {
      redisConfig.password = process.env.REDIS_PASSWORD;
    }

    this.redis = new Redis(redisConfig);

    // Handle connection events
    this.redis.on('connect', () => {
      console.log('✅ Redis connected successfully - using Redis cache');
      this.isRedisAvailable = true;
      if (this.redisCheckInterval) {
        clearInterval(this.redisCheckInterval);
        this.redisCheckInterval = null;
      }
    });

    this.redis.on('error', _error => {
      if (!this.isRedisAvailable) {
        // Only log once when initially failing
        console.log('⚠️  Redis unavailable - falling back to in-memory cache');
      }
      this.isRedisAvailable = false;
      this.startRedisRetryCheck();
    });

    this.redis.on('close', () => {
      console.log('📴 Redis connection closed - using in-memory cache');
      this.isRedisAvailable = false;
      this.startRedisRetryCheck();
    });
  }

  private startRedisRetryCheck() {
    if (this.redisCheckInterval) return;

    const REDIS_CHECK_INTERVAL_MS = 30000; // 30 seconds
    // Check Redis availability every 30 seconds
    this.redisCheckInterval = setInterval(async () => {
      try {
        if (this.redis) {
          await this.redis.ping();
          // If ping succeeds, Redis is back online
        }
      } catch {
        // Redis still unavailable
      }
    }, REDIS_CHECK_INTERVAL_MS);
  }

  private startMemoryCacheCleanup() {
    const CLEANUP_INTERVAL_MS = 300000; // 5 minutes
    // Clean up expired entries every 5 minutes
    this.memoryCacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.inMemoryCache.entries()) {
        if (entry.expires && entry.expires < now) {
          this.inMemoryCache.delete(key);
        }
      }
    }, CLEANUP_INTERVAL_MS);
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get cached data - tries Redis first, falls back to in-memory
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first (production-like)
    if (this.redis && this.isRedisAvailable) {
      try {
        const data = await this.redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        // Redis failed, fall back to in-memory
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // Use in-memory cache as fallback
    const entry = this.inMemoryCache.get(key);
    if (!entry) return null;

    // Check if expired
    if (entry.expires && entry.expires < Date.now()) {
      this.inMemoryCache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set cached data with TTL - uses both Redis and in-memory for resilience
   */
  async set(
    key: string,
    value: unknown,
    ttlSeconds = CacheTTL.MEDIUM
  ): Promise<void> {
    // Try Redis first (production-like)
    if (this.redis && this.isRedisAvailable) {
      try {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
      } catch (error) {
        // Redis failed, mark as unavailable
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // Always store in in-memory cache as backup
    const MILLISECONDS_PER_SECOND = 1000;
    const expires =
      ttlSeconds > 0 ? Date.now() + ttlSeconds * MILLISECONDS_PER_SECOND : 0;
    this.inMemoryCache.set(key, { value, expires });
  }

  /**
   * Delete cached data
   */
  async del(key: string): Promise<void> {
    // Delete from Redis if available
    if (this.redis && this.isRedisAvailable) {
      try {
        await this.redis.del(key);
      } catch (error) {
        console.warn(`Cache del error for key ${key}:`, error);
      }
    }

    // Also delete from in-memory cache
    this.inMemoryCache.delete(key);
  }

  /**
   * Delete multiple keys by pattern (glob-style: * matches any characters)
   * Works with BOTH Redis and in-memory cache.
   */
  async delPattern(pattern: string): Promise<void> {
    // 1. Clear from Redis if available
    if (this.redis && this.isRedisAvailable) {
      try {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        console.warn(`Cache delPattern error for pattern ${pattern}:`, error);
      }
    }

    // 2. Always clear matching keys from in-memory cache
    //    Convert glob pattern (e.g. "api:*:/:*") to a RegExp
    const regexStr =
      '^' +
      pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') +
      '$';
    const regex = new RegExp(regexStr);
    for (const key of this.inMemoryCache.keys()) {
      if (regex.test(key)) {
        this.inMemoryCache.delete(key);
      }
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
    ttlSeconds = CacheTTL.MEDIUM
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
  async increment(
    key: string,
    ttlSeconds = CacheTTL.VERY_LONG
  ): Promise<number> {
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
   * Health check - returns true if either Redis or in-memory cache is available
   */
  async healthCheck(): Promise<boolean> {
    // Check Redis first
    if (this.redis && this.isRedisAvailable) {
      try {
        await this.redis.ping();
        return true;
      } catch {
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // In-memory cache is always available as fallback
    return true;
  }

  /**
   * Cleanup method for tests - clears all timers
   */
  cleanup(): void {
    if (this.redisCheckInterval) {
      clearInterval(this.redisCheckInterval);
      this.redisCheckInterval = null;
    }
    if (this.memoryCacheCleanupInterval) {
      clearInterval(this.memoryCacheCleanupInterval);
      this.memoryCacheCleanupInterval = null;
    }
    this.inMemoryCache.clear();
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
export const CACHE_KEYS = {
  user: (userId: string) => `user:${userId}`,
  userProjects: (userId: string) => `user:${userId}:projects`,
  userThumbnails: (userId: string, page = 1) =>
    `user:${userId}:thumbnails:${page}`,
  project: (projectId: string) => `project:${projectId}`,
  thumbnail: (thumbnailId: string) => `thumbnail:${thumbnailId}`,
  analytics: (userId: string, period: string) =>
    `analytics:${userId}:${period}`,
  socialShares: (thumbnailId: string) => `social:${thumbnailId}`,
  rateLimit: (userId: string, action: string) =>
    `ratelimit:${userId}:${action}`,
};

// Cache TTL constants (in seconds)
const TTL_SHORT = 60; // 1 minute
const TTL_MEDIUM = 300; // 5 minutes
const TTL_LONG = 1800; // 30 minutes
const TTL_VERY_LONG = 3600; // 1 hour
const TTL_DAILY = 86400; // 24 hours

/* eslint-disable @typescript-eslint/naming-convention */
export const CacheTTL = {
  SHORT: TTL_SHORT,
  MEDIUM: TTL_MEDIUM,
  LONG: TTL_LONG,
  VERY_LONG: TTL_VERY_LONG,
  DAILY: TTL_DAILY,
};
/* eslint-enable @typescript-eslint/naming-convention */

// Re-export with backwards compatibility
// eslint-disable-next-line @typescript-eslint/naming-convention
export const CacheKeys = CACHE_KEYS;
