/**
 * Shared Redis connection configuration.
 *
 * Reads REDIS_URL (Railway production) or falls back to
 * REDIS_HOST / REDIS_PORT / REDIS_PASSWORD (localhost development).
 *
 * Used by both replicate-queue.service.ts and ai-priority-queue.service.ts.
 */

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  maxRetriesPerRequest: null;
}

export function getRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;

  if (redisUrl?.startsWith('redis://')) {
    try {
      const url = new URL(redisUrl);
      const config: RedisConfig = {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        maxRetriesPerRequest: null,
      };
      if (url.password) {
        config.password = url.password;
      }
      return config;
    } catch {
      // Fall through to manual config
    }
  }

  const config: RedisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '8520', 10),
    maxRetriesPerRequest: null,
  };
  if (process.env.REDIS_PASSWORD) {
    config.password = process.env.REDIS_PASSWORD;
  }
  return config;
}
