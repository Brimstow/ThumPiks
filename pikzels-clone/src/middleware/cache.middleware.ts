import { Request, Response, NextFunction } from 'express';
import { CacheService, CacheKeys, CacheTTL } from '../services/cache.service';

interface CacheOptions {
  ttl?: number;
  keyGenerator?: (req: Request) => string;
  skipCache?: (req: Request) => boolean;
}

/**
 * Cache middleware for API responses
 */
export const cacheMiddleware = (options: CacheOptions = {}) => {
  const {
    ttl = CacheTTL.MEDIUM,
    keyGenerator = defaultKeyGenerator,
    skipCache = () => false,
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or when skipCache returns true
    if (req.method !== 'GET' || skipCache(req)) {
      return next();
    }

    const cache = CacheService.getInstance();
    const cacheKey = keyGenerator(req);

    try {
      // Try to get cached response
      const cachedResponse = await cache.get<any>(cacheKey);
      if (cachedResponse) {
        console.log(`🎯 Cache HIT: ${cacheKey}`);
        return res.json(cachedResponse);
      }

      console.log(`💨 Cache MISS: ${cacheKey}`);

      // Intercept response to cache it
      const originalJson = res.json;
      res.json = function (data: any) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cache.set(cacheKey, data, ttl).catch(console.error);
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.warn('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Default cache key generator
 */
function defaultKeyGenerator(req: Request): string {
  const userId = (req as any).user?.id || 'anonymous';
  const path = req.path;
  const query = JSON.stringify(req.query);
  return `api:${userId}:${path}:${Buffer.from(query).toString('base64')}`;
}

/**
 * Cache invalidation middleware
 * IMPORTANT: Awaits cache invalidation before response is sent
 * to prevent race conditions where refetch hits stale cache
 */
export const invalidateCacheMiddleware = (patterns: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store the original json function
    const originalJson = res.json.bind(res);
    
    // Override res.json to trigger cache invalidation before response
    (res as any).json = async function (data: any) {
      // Only invalidate on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const cache = CacheService.getInstance();
        
        // Wait for all cache invalidations to complete before sending response
        // This prevents race condition where refetch hits stale cache
        try {
          await Promise.all(patterns.map(pattern => 
            cache.delPattern(pattern)
          ));
          console.log(`[Cache Invalidation] Invalidated ${patterns.length} patterns for ${req.method} ${req.path}`);
        } catch (err) {
          console.warn(`[Cache Invalidation] Failed for patterns:`, patterns, err);
        }
      }
      return originalJson(data);
    };
    
    next();
  };
};

/**
 * User-specific cache invalidation
 */
export const invalidateUserCache = (req: Request) => {
  const userId = (req as any).user?.id;
  if (userId) {
    const cache = CacheService.getInstance();
    const patterns = [
      `api:${userId}:*`,
      `user:${userId}*`,
      `analytics:${userId}*`,
    ];
    patterns.forEach(pattern => {
      cache.delPattern(pattern).catch(console.error);
    });
  }
};

/**
 * Specific cache middleware configurations
 */
export const CacheMiddlewares = {
  // Cache user projects for 5 minutes
  userProjects: cacheMiddleware({
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      return CacheKeys.userProjects(userId);
    },
  }),

  // Cache thumbnails for 5 minutes with pagination
  userThumbnails: cacheMiddleware({
    ttl: CacheTTL.MEDIUM,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      const page = req.query.page || '1';
      return CacheKeys.userThumbnails(userId, parseInt(page as string));
    },
  }),

  // Cache analytics for 30 minutes
  analytics: cacheMiddleware({
    ttl: CacheTTL.LONG,
    keyGenerator: (req) => {
      const userId = (req as any).user?.id;
      const period = req.query.period || 'week';
      return CacheKeys.analytics(userId, period as string);
    },
  }),

  // Cache social shares for 10 minutes
  socialShares: cacheMiddleware({
    ttl: CacheTTL.MEDIUM * 2,
    keyGenerator: (req) => {
      const thumbnailId = req.params.id as string;
      if (!thumbnailId) {
        throw new Error('Thumbnail ID is required for cache key');
      }
      return CacheKeys.socialShares(thumbnailId);
    },
  }),
};