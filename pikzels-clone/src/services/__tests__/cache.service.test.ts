import { CacheService, CacheKeys, CacheTTL } from '../cache.service';

describe('CacheService', () => {
  let cacheService: CacheService;

  beforeAll(() => {
    // Ensure we're in test mode (in-memory only)
    process.env.NODE_ENV = 'test';
  });

  beforeEach(() => {
    // Get fresh instance for each test
    cacheService = CacheService.getInstance();
    // Clear in-memory cache
    cacheService.cleanup();
  });

  afterEach(() => {
    // Cleanup after each test
    cacheService.cleanup();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should use in-memory cache in test environment', async () => {
      const testKey = 'test:singleton';
      const testValue = { data: 'test' };

      await cacheService.set(testKey, testValue, 60);
      const result = await cacheService.get(testKey);

      expect(result).toEqual(testValue);
    });
  });

  describe('Basic Cache Operations', () => {
    it('should set and get string values', async () => {
      const key = 'test:string';
      const value = 'test value';

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('should set and get object values', async () => {
      const key = 'test:object';
      const value = { name: 'Test User', age: 30, active: true };

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should set and get array values', async () => {
      const key = 'test:array';
      const value = [1, 2, 3, 'four', { five: 5 }];

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should return null for non-existent keys', async () => {
      const result = await cacheService.get('non:existent:key');
      expect(result).toBeNull();
    });

    it('should handle null and undefined values', async () => {
      await cacheService.set('test:null', null, 60);
      await cacheService.set('test:undefined', undefined, 60);

      const nullResult = await cacheService.get('test:null');
      const undefinedResult = await cacheService.get('test:undefined');

      expect(nullResult).toBeNull();
      expect(undefinedResult).toBeUndefined();
    });
  });

  describe('TTL and Expiration', () => {
    it('should expire cache entries after TTL', async () => {
      const key = 'test:expire';
      const value = 'will expire';

      // Set with 1 second TTL
      await cacheService.set(key, value, 1);

      // Should exist immediately
      let result = await cacheService.get(key);
      expect(result).toBe(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be null after expiration
      result = await cacheService.get(key);
      expect(result).toBeNull();
    });

    it('should use default TTL of 300 seconds', async () => {
      const key = 'test:default-ttl';
      const value = 'default ttl value';

      await cacheService.set(key, value); // No TTL specified
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('should handle zero TTL (no expiration)', async () => {
      const key = 'test:no-expire';
      const value = 'never expires';

      await cacheService.set(key, value, 0);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await cacheService.get(key);
      expect(result).toBe(value);
    });
  });

  describe('getOrSet Pattern', () => {
    it('should fetch and cache data when cache miss', async () => {
      const key = 'test:fetch';
      const expectedData = { id: 1, name: 'Fetched Data' };
      const fetchFn = jest.fn().mockResolvedValue(expectedData);

      const result = await cacheService.getOrSet(key, fetchFn, 60);

      expect(result).toEqual(expectedData);
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached data when cache hit', async () => {
      const key = 'test:cached';
      const cachedData = { id: 1, name: 'Cached Data' };
      const fetchFn = jest.fn().mockResolvedValue({ id: 2, name: 'New Data' });

      // Pre-populate cache
      await cacheService.set(key, cachedData, 60);

      const result = await cacheService.getOrSet(key, fetchFn, 60);

      expect(result).toEqual(cachedData);
      expect(fetchFn).not.toHaveBeenCalled();
    });

    it('should handle fetch function errors gracefully', async () => {
      const key = 'test:fetch-error';
      const fetchFn = jest.fn().mockRejectedValue(new Error('Fetch failed'));

      await expect(cacheService.getOrSet(key, fetchFn, 60)).rejects.toThrow(
        'Fetch failed'
      );
    });
  });

  describe('Delete Operations', () => {
    it('should delete cached entry', async () => {
      const key = 'test:delete';
      const value = 'to be deleted';

      await cacheService.set(key, value, 60);
      expect(await cacheService.get(key)).toBe(value);

      await cacheService.del(key);
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should handle deletion of non-existent key', async () => {
      await expect(cacheService.del('non:existent')).resolves.not.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return true when in-memory cache is available', async () => {
      const isHealthy = await cacheService.healthCheck();
      expect(isHealthy).toBe(true);
    });

    it('should maintain availability after cleanup', async () => {
      cacheService.cleanup();
      const isHealthy = await cacheService.healthCheck();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Cache Key Generators', () => {
    it('should generate user cache key', () => {
      const userId = 'user123';
      expect(CacheKeys.user(userId)).toBe('user:user123');
    });

    it('should generate user projects cache key', () => {
      const userId = 'user123';
      expect(CacheKeys.userProjects(userId)).toBe('user:user123:projects');
    });

    it('should generate user thumbnails cache key with page', () => {
      const userId = 'user123';
      expect(CacheKeys.userThumbnails(userId, 2)).toBe(
        'user:user123:thumbnails:2'
      );
    });

    it('should generate user thumbnails cache key with default page', () => {
      const userId = 'user123';
      expect(CacheKeys.userThumbnails(userId)).toBe(
        'user:user123:thumbnails:1'
      );
    });

    it('should generate project cache key', () => {
      const projectId = 'proj123';
      expect(CacheKeys.project(projectId)).toBe('project:proj123');
    });

    it('should generate thumbnail cache key', () => {
      const thumbnailId = 'thumb123';
      expect(CacheKeys.thumbnail(thumbnailId)).toBe('thumbnail:thumb123');
    });

    it('should generate analytics cache key', () => {
      const userId = 'user123';
      const period = 'weekly';
      expect(CacheKeys.analytics(userId, period)).toBe(
        'analytics:user123:weekly'
      );
    });

    it('should generate social shares cache key', () => {
      const thumbnailId = 'thumb123';
      expect(CacheKeys.socialShares(thumbnailId)).toBe('social:thumb123');
    });

    it('should generate rate limit cache key', () => {
      const userId = 'user123';
      const action = 'login';
      expect(CacheKeys.rateLimit(userId, action)).toBe(
        'ratelimit:user123:login'
      );
    });
  });

  describe('Cache TTL Constants', () => {
    it('should define SHORT TTL as 60 seconds', () => {
      expect(CacheTTL.SHORT).toBe(60);
    });

    it('should define MEDIUM TTL as 300 seconds', () => {
      expect(CacheTTL.MEDIUM).toBe(300);
    });

    it('should define LONG TTL as 1800 seconds', () => {
      expect(CacheTTL.LONG).toBe(1800);
    });

    it('should define VERY_LONG TTL as 3600 seconds', () => {
      expect(CacheTTL.VERY_LONG).toBe(3600);
    });

    it('should define DAILY TTL as 86400 seconds', () => {
      expect(CacheTTL.DAILY).toBe(86400);
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should clear in-memory cache on cleanup', async () => {
      const key = 'test:cleanup';
      const value = 'to be cleaned';

      await cacheService.set(key, value, 60);
      expect(await cacheService.get(key)).toBe(value);

      cacheService.cleanup();
      expect(await cacheService.get(key)).toBeNull();
    });

    it('should handle disconnect gracefully', async () => {
      await expect(cacheService.disconnect()).resolves.not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string keys', async () => {
      const key = '';
      const value = 'empty key value';

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('should handle very long keys', async () => {
      const key = 'a'.repeat(1000);
      const value = 'long key value';

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('should handle special characters in keys', async () => {
      const key = 'test:key:with:colons:and-dashes_and_underscores';
      const value = 'special key value';

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toBe(value);
    });

    it('should handle nested object values', async () => {
      const key = 'test:nested';
      const value = {
        level1: {
          level2: {
            level3: {
              data: 'deep nested value',
              array: [1, 2, { nested: true }],
            },
          },
        },
      };

      await cacheService.set(key, value, 60);
      const result = await cacheService.get(key);

      expect(result).toEqual(value);
    });

    it('should handle multiple concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        cacheService.set(`test:concurrent:${i}`, `value${i}`, 60)
      );

      await Promise.all(operations);

      const results = await Promise.all(
        Array.from({ length: 10 }, (_, i) =>
          cacheService.get(`test:concurrent:${i}`)
        )
      );

      results.forEach((result, i) => {
        expect(result).toBe(`value${i}`);
      });
    });
  });
});
