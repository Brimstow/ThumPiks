import { getRedisConfig } from '../redis-config';

describe('getRedisConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear all Redis-related env vars
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('when REDIS_URL is set (Railway production)', () => {
    it('parses host and port from REDIS_URL', () => {
      process.env.REDIS_URL = 'redis://default:secret@redis.railway.internal:6379';
      const config = getRedisConfig();
      expect(config.host).toBe('redis.railway.internal');
      expect(config.port).toBe(6379);
    });

    it('extracts password from REDIS_URL', () => {
      process.env.REDIS_URL = 'redis://default:mypassword@redis.host:6379';
      const config = getRedisConfig();
      expect(config.password).toBe('mypassword');
    });

    it('omits password field when REDIS_URL has no password', () => {
      process.env.REDIS_URL = 'redis://redis.host:6379';
      const config = getRedisConfig();
      expect(config.password).toBeUndefined();
    });

    it('sets maxRetriesPerRequest to null (required by BullMQ)', () => {
      process.env.REDIS_URL = 'redis://redis.host:6379';
      const config = getRedisConfig();
      expect(config.maxRetriesPerRequest).toBeNull();
    });
  });

  describe('when REDIS_URL is not set (localhost development)', () => {
    it('defaults to localhost:8520 (project convention)', () => {
      const config = getRedisConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(8520);
    });

    it('uses REDIS_HOST and REDIS_PORT when set', () => {
      process.env.REDIS_HOST = 'custom-host';
      process.env.REDIS_PORT = '6380';
      const config = getRedisConfig();
      expect(config.host).toBe('custom-host');
      expect(config.port).toBe(6380);
    });

    it('includes password when REDIS_PASSWORD is set', () => {
      process.env.REDIS_PASSWORD = 'local-pass';
      const config = getRedisConfig();
      expect(config.password).toBe('local-pass');
    });

    it('omits password when REDIS_PASSWORD is not set', () => {
      const config = getRedisConfig();
      expect(config.password).toBeUndefined();
    });

    it('sets maxRetriesPerRequest to null (required by BullMQ)', () => {
      const config = getRedisConfig();
      expect(config.maxRetriesPerRequest).toBeNull();
    });
  });

  describe('malformed REDIS_URL fallback', () => {
    it('falls back to manual config when REDIS_URL is not a valid URL', () => {
      process.env.REDIS_URL = 'not-a-valid-url';
      const config = getRedisConfig();
      expect(config.host).toBe('localhost');
      expect(config.port).toBe(8520);
    });
  });
});
