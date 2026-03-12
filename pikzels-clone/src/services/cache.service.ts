import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { logger } from '../utils/logger';

const DEFAULT_MAX_CACHE_ENTRIES = 10_000;
const CAPACITY_WARNING_THRESHOLD = 0.8;
const MILLISECONDS_PER_SECOND = 1000;

// lru-cache requires V extends {}; this alias satisfies the constraint for any non-undefined value
// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/consistent-type-definitions
type CacheValue = {};

export class CacheService {
  private static instance: CacheService;
  private redis: Redis | null = null;
  private inMemoryCache!: LRUCache<string, CacheValue>;
  private isRedisAvailable = false;
  private redisCheckInterval: NodeJS.Timeout | null = null;
  private capacityWarningLogged = false;

  private constructor() {
    const maxEntries = parseInt(
      process.env.MAX_CACHE_ENTRIES ?? String(DEFAULT_MAX_CACHE_ENTRIES)
    );
    this.inMemoryCache = new LRUCache<string, CacheValue>({
      max: maxEntries,
      noDisposeOnSet: true,
      dispose: (_value, key, reason) => {
        if (reason === 'evict') {
          logger.warn('Cache entry evicted due to capacity', { key });
        }
      },
    });

    // Skip Redis connection in test environment
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      console.log('🧪 Test environment detected - using in-memory cache only');
      return;
    }

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
    let result: T | null = null;
    let source: 'redis' | 'memory' = 'memory';

    // Try Redis first (production-like)
    if (this.redis && this.isRedisAvailable) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          result = JSON.parse(data);
          source = 'redis';
        }
        // Log cache event (Redis path resolved -- hit or miss)
        logger.info('cache', {
          category: 'cache',
          operation: 'get',
          key,
          hit: result !== null,
          source,
        });
        return result;
      } catch (error) {
        // Redis failed, fall back to in-memory
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // Use in-memory cache as fallback
    const value = this.inMemoryCache.get(key);
    result = value === undefined ? null : (value as T);
    logger.info('cache', {
      category: 'cache',
      operation: 'get',
      key,
      hit: result !== null,
      source,
    });
    return result;
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

    // Always store in in-memory cache as backup (skip undefined -- lru-cache treats it as delete)
    if (value !== undefined) {
      this.inMemoryCache.set(key, value as CacheValue, {
        ttl: ttlSeconds > 0 ? ttlSeconds * MILLISECONDS_PER_SECOND : 0,
      });
    }

    // Capacity warning (log once per crossing)
    const ratio = this.inMemoryCache.size / this.inMemoryCache.max;
    if (ratio >= CAPACITY_WARNING_THRESHOLD && !this.capacityWarningLogged) {
      logger.warn('In-memory cache near capacity', {
        size: this.inMemoryCache.size,
        max: this.inMemoryCache.max,
        percentage: Math.round(ratio * 100),
      });
      this.capacityWarningLogged = true;
    } else if (ratio < CAPACITY_WARNING_THRESHOLD) {
      this.capacityWarningLogged = false;
    }
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
    // 1. Clear from Redis if available (using non-blocking SCAN instead of KEYS)
    if (this.redis && this.isRedisAvailable) {
      try {
        await this.scanAndDelete(this.redis, pattern);
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
    const keysToDelete: string[] = [];
    for (const key of this.inMemoryCache.keys()) {
      if (regex.test(key)) keysToDelete.push(key);
    }
    for (const key of keysToDelete) {
      this.inMemoryCache.delete(key);
    }
  }

  private async scanAndDelete(redis: Redis, pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.redis && this.isRedisAvailable) {
      try {
        return (await this.redis.exists(key)) === 1;
      } catch (error) {
        console.warn(`Cache exists error for key ${key}:`, error);
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // In-memory fallback (has() respects TTL in lru-cache)
    return this.inMemoryCache.has(key);
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
    if (this.redis && this.isRedisAvailable) {
      try {
        const count = await this.redis.incr(key);
        if (count === 1) {
          await this.redis.expire(key, ttlSeconds);
        }
        return count;
      } catch (error) {
        console.warn(`Cache increment error for key ${key}:`, error);
        this.isRedisAvailable = false;
        this.startRedisRetryCheck();
      }
    }

    // In-memory fallback (single-threaded Node = inherently atomic)
    const current = (this.inMemoryCache.get(key) as number) ?? 0;
    const next = current + 1;
    const remainingTtl = this.inMemoryCache.getRemainingTTL(key);
    const ttlMs =
      remainingTtl > 0 ? remainingTtl : ttlSeconds * MILLISECONDS_PER_SECOND;
    this.inMemoryCache.set(key, next as CacheValue, { ttl: ttlMs });
    return next;
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
    this.inMemoryCache.clear();
    this.capacityWarningLogged = false;
  }

  /**
   * Reset singleton instance (for testing only)
   */
  static resetInstance(): void {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      CacheService.instance = undefined as unknown as CacheService;
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
