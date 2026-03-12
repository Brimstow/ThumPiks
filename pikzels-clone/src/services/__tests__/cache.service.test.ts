import { CacheService, CacheKeys, CacheTTL } from '../cache.service';
import Redis from 'ioredis';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    scan: jest.fn(),
    incr: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    ping: jest.fn(),
    quit: jest.fn(),
  }));
});

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
      // lru-cache skips undefined values (treats set(key, undefined) as no-op)
      expect(undefinedResult).toBeNull();
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

  describe('Redis Integration', () => {
    let mockRedis: any;

    beforeEach(() => {
      mockRedis = (Redis as jest.MockedClass<typeof Redis>).mock.results[0]
        ?.value;
    });

    it('should call delPattern to delete keys by pattern', async () => {
      if (mockRedis) {
        // SCAN returns [cursor, keys] - simulate single-pass completion
        mockRedis.scan.mockResolvedValue(['0', ['key1', 'key2', 'key3']]);
        mockRedis.del.mockResolvedValue(3);

        await cacheService.delPattern('test:*');

        expect(mockRedis.scan).toHaveBeenCalledWith(
          '0',
          'MATCH',
          'test:*',
          'COUNT',
          100
        );
        expect(mockRedis.del).toHaveBeenCalledWith('key1', 'key2', 'key3');
      }
    });

    it('should handle delPattern with no matching keys', async () => {
      if (mockRedis) {
        mockRedis.scan.mockResolvedValue(['0', []]);

        await cacheService.delPattern('nonexistent:*');

        expect(mockRedis.scan).toHaveBeenCalledWith(
          '0',
          'MATCH',
          'nonexistent:*',
          'COUNT',
          100
        );
        expect(mockRedis.del).not.toHaveBeenCalled();
      }
    });

    it('should handle delPattern errors gracefully', async () => {
      if (mockRedis) {
        mockRedis.scan.mockRejectedValue(new Error('Redis error'));

        await expect(cacheService.delPattern('test:*')).resolves.not.toThrow();
      }
    });

    it('should check if key exists in Redis', async () => {
      if (mockRedis) {
        mockRedis.exists.mockResolvedValue(1);

        const exists = await cacheService.exists('test:key');

        expect(exists).toBe(true);
        expect(mockRedis.exists).toHaveBeenCalledWith('test:key');
      }
    });

    it('should return false when key does not exist', async () => {
      if (mockRedis) {
        mockRedis.exists.mockResolvedValue(0);

        const exists = await cacheService.exists('nonexistent:key');

        expect(exists).toBe(false);
      }
    });

    it('should handle exists errors gracefully', async () => {
      if (mockRedis) {
        mockRedis.exists.mockRejectedValue(new Error('Redis error'));

        const exists = await cacheService.exists('test:key');

        expect(exists).toBe(false);
      }
    });
  });

  describe('Memory Cache Expiration', () => {
    it('should automatically clean up expired entries', async () => {
      // Set a key that will expire
      await cacheService.set('test:auto-expire', 'value', 1);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Manually trigger cleanup by trying to get the key
      const result = await cacheService.get('test:auto-expire');

      expect(result).toBeNull();
    });

    it('should not expire entries with zero TTL', async () => {
      await cacheService.set('test:no-expiry', 'persistent', 0);

      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await cacheService.get('test:no-expiry');
      expect(result).toBe('persistent');
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle concurrent set operations', async () => {
      const promises = Array.from({ length: 50 }, (_, i) =>
        cacheService.set(`concurrent:${i}`, { index: i }, 60)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Verify all values were set
      const results = await Promise.all(
        Array.from({ length: 50 }, (_, i) =>
          cacheService.get(`concurrent:${i}`)
        )
      );

      results.forEach((result, i) => {
        expect(result).toEqual({ index: i });
      });
    });

    it('should handle concurrent delete operations', async () => {
      // Pre-populate cache
      await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          cacheService.set(`delete:${i}`, `value${i}`, 60)
        )
      );

      // Delete all concurrently
      const deletePromises = Array.from({ length: 20 }, (_, i) =>
        cacheService.del(`delete:${i}`)
      );

      await expect(Promise.all(deletePromises)).resolves.not.toThrow();

      // Verify all deleted
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) => cacheService.get(`delete:${i}`))
      );

      results.forEach(result => {
        expect(result).toBeNull();
      });
    });

    it('should handle getOrSet with slow fetch function', async () => {
      const slowFetch = jest
        .fn()
        .mockImplementation(
          () =>
            new Promise(resolve =>
              setTimeout(() => resolve({ data: 'slow' }), 100)
            )
        );

      const result = await cacheService.getOrSet('test:slow', slowFetch, 60);

      expect(result).toEqual({ data: 'slow' });
      expect(slowFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex Data Types', () => {
    it('should handle boolean values', async () => {
      await cacheService.set('test:bool:true', true, 60);
      await cacheService.set('test:bool:false', false, 60);

      expect(await cacheService.get('test:bool:true')).toBe(true);
      expect(await cacheService.get('test:bool:false')).toBe(false);
    });

    it('should handle number values including zero', async () => {
      await cacheService.set('test:number:zero', 0, 60);
      await cacheService.set('test:number:negative', -42, 60);
      await cacheService.set('test:number:float', 3.14159, 60);

      expect(await cacheService.get('test:number:zero')).toBe(0);
      expect(await cacheService.get('test:number:negative')).toBe(-42);
      expect(await cacheService.get('test:number:float')).toBe(3.14159);
    });

    it('should handle Date objects', async () => {
      const now = new Date();
      await cacheService.set('test:date', now, 60);

      const result = await cacheService.get<Date>('test:date');
      // In-memory cache preserves the Date object as-is
      expect(result).toEqual(now);
    });

    it('should handle arrays with mixed types', async () => {
      const mixedArray = [1, 'two', true, null, { key: 'value' }, [1, 2, 3]];
      await cacheService.set('test:mixed-array', mixedArray, 60);

      const result = await cacheService.get('test:mixed-array');
      expect(result).toEqual(mixedArray);
    });

    it('should handle circular reference gracefully', async () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      // In-memory cache can store circular references (doesn't serialize)
      // But it won't throw - it just stores the reference
      await expect(
        cacheService.set('test:circular', circularObj, 60)
      ).resolves.not.toThrow();

      // Getting it back will return the same circular reference
      const result = await cacheService.get('test:circular');
      expect(result).toBe(circularObj);
    });
  });

  describe('getInstance Singleton', () => {
    it('should create instance only once', () => {
      const instance1 = CacheService.getInstance();
      const instance2 = CacheService.getInstance();
      const instance3 = CacheService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });

    it('should persist data across getInstance calls', async () => {
      const instance1 = CacheService.getInstance();
      await instance1.set('test:singleton-persist', 'shared-data', 60);

      const instance2 = CacheService.getInstance();
      const result = await instance2.get('test:singleton-persist');

      expect(result).toBe('shared-data');
    });
  });

  describe('LRU Eviction', () => {
    afterEach(() => {
      // Restore default instance
      delete process.env.MAX_CACHE_ENTRIES;
      CacheService.resetInstance();
    });

    it('should evict least-recently-used entry when at capacity', async () => {
      process.env.MAX_CACHE_ENTRIES = '5';
      CacheService.resetInstance();
      const smallCache = CacheService.getInstance();

      // Fill to capacity
      for (let i = 0; i < 5; i++) {
        await smallCache.set(`evict:${i}`, `value${i}`, 60);
      }

      // Add one more -- should evict the oldest (evict:0)
      await smallCache.set('evict:5', 'value5', 60);

      expect(await smallCache.get('evict:0')).toBeNull();
      expect(await smallCache.get('evict:5')).toBe('value5');
      // Most recent entries still exist
      expect(await smallCache.get('evict:4')).toBe('value4');

      smallCache.cleanup();
    });
  });

  describe('Capacity Warning', () => {
    afterEach(() => {
      delete process.env.MAX_CACHE_ENTRIES;
      CacheService.resetInstance();
    });

    it('should log warning when cache reaches 80% capacity', async () => {
      jest.spyOn(require('../../utils/logger').logger, 'warn');
      const loggerWarn = require('../../utils/logger').logger.warn as jest.Mock;
      loggerWarn.mockClear();

      process.env.MAX_CACHE_ENTRIES = '10';
      CacheService.resetInstance();
      const cache = CacheService.getInstance();

      // Fill to 80%
      for (let i = 0; i < 8; i++) {
        await cache.set(`cap:${i}`, `value${i}`, 60);
      }

      expect(loggerWarn).toHaveBeenCalledWith(
        'In-memory cache near capacity',
        expect.objectContaining({
          size: 8,
          max: 10,
          percentage: 80,
        })
      );

      cache.cleanup();
    });

    it('should only log capacity warning once per threshold crossing', async () => {
      jest.spyOn(require('../../utils/logger').logger, 'warn');
      const loggerWarn = require('../../utils/logger').logger.warn as jest.Mock;
      loggerWarn.mockClear();

      process.env.MAX_CACHE_ENTRIES = '10';
      CacheService.resetInstance();
      const cache = CacheService.getInstance();

      // Fill past 80% twice
      for (let i = 0; i < 9; i++) {
        await cache.set(`spam:${i}`, `value${i}`, 60);
      }

      const capacityCalls = loggerWarn.mock.calls.filter(
        (call: unknown[]) => call[0] === 'In-memory cache near capacity'
      );
      expect(capacityCalls.length).toBe(1);

      cache.cleanup();
    });
  });

  describe('exists() In-Memory Fallback', () => {
    it('should return true for existing key in in-memory cache', async () => {
      await cacheService.set('exists:test', 'value', 60);
      const result = await cacheService.exists('exists:test');
      expect(result).toBe(true);
    });

    it('should return false for missing key', async () => {
      const result = await cacheService.exists('exists:missing');
      expect(result).toBe(false);
    });

    it('should return false for expired key', async () => {
      await cacheService.set('exists:expired', 'value', 1);
      await new Promise(resolve => setTimeout(resolve, 1100));
      const result = await cacheService.exists('exists:expired');
      expect(result).toBe(false);
    });
  });

  describe('increment() In-Memory Fallback', () => {
    it('should increment counter in in-memory cache', async () => {
      const count1 = await cacheService.increment('inc:test', 60);
      const count2 = await cacheService.increment('inc:test', 60);
      const count3 = await cacheService.increment('inc:test', 60);

      expect(count1).toBe(1);
      expect(count2).toBe(2);
      expect(count3).toBe(3);

      // Verify get returns the current count
      const stored = await cacheService.get<number>('inc:test');
      expect(stored).toBe(3);
    });

    it('should reset counter after TTL expires', async () => {
      await cacheService.increment('inc:expire', 1);
      await cacheService.increment('inc:expire', 1);
      expect(await cacheService.get<number>('inc:expire')).toBe(2);

      // Wait for TTL
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should start fresh
      const count = await cacheService.increment('inc:expire', 1);
      expect(count).toBe(1);
    });
  });

  describe('delPattern() In-Memory', () => {
    it('should delete matching keys and keep non-matching ones', async () => {
      await cacheService.set('pattern:a:1', 'v1', 60);
      await cacheService.set('pattern:a:2', 'v2', 60);
      await cacheService.set('pattern:b:1', 'v3', 60);
      await cacheService.set('other:key', 'v4', 60);

      await cacheService.delPattern('pattern:a:*');

      expect(await cacheService.get('pattern:a:1')).toBeNull();
      expect(await cacheService.get('pattern:a:2')).toBeNull();
      expect(await cacheService.get('pattern:b:1')).toBe('v3');
      expect(await cacheService.get('other:key')).toBe('v4');
    });
  });
});
