import helmet from 'helmet';
import Redis from 'ioredis';
import { RateLimiterRedis, RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../utils/logger';
import { isProductionLike } from '../utils/env';

// Security Headers Middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'data:', 'blob:'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: [
        "'self'",
        'https:',
        'ws:',
        'wss:',
        'http://localhost:8556',
        'http://localhost:8550',
      ],
      fontSrc: ["'self'", 'https:', 'data:', 'blob:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'data:'],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

// ---------------------------------------------------------------------------
// Redis Client for Rate Limiting (rate-limiter-flexible + insuranceLimiter)
// ---------------------------------------------------------------------------

let sharedRedisClient: Redis | null = null;

function getRateLimitRedis(): Redis | null {
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID)
    return null;
  if (sharedRedisClient) return sharedRedisClient;

  try {
    const host = process.env.REDIS_HOST ?? 'localhost';
    const port = parseInt(process.env.REDIS_PORT ?? '8520');

    sharedRedisClient = new Redis({
      host,
      port,
      password: process.env.REDIS_PASSWORD || undefined,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });

    sharedRedisClient.on('error', () => {
      // Redis error — rate-limiter-flexible auto-falls back to insuranceLimiter
    });

    return sharedRedisClient;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rate Limiter Factory
// ---------------------------------------------------------------------------

interface LimiterConfig {
  points: number;
  duration: number; // seconds
  keyPrefix: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyGenerator: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  logLabel: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createLimiter(
  config: LimiterConfig
): (req: any, res: any, next: any) => void {
  const memoryFallback = new RateLimiterMemory({
    points: config.points,
    duration: config.duration,
    keyPrefix: config.keyPrefix,
  });

  const redis = getRateLimitRedis();
  const limiter = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        points: config.points,
        duration: config.duration,
        keyPrefix: config.keyPrefix,
        insuranceLimiter: memoryFallback,
      })
    : memoryFallback;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (req: any, res: any, next: any) => {
    const key = config.keyGenerator(req);
    limiter
      .consume(key)
      .then(rlRes => {
        res.set('X-RateLimit-Limit', String(config.points));
        res.set('X-RateLimit-Remaining', String(rlRes.remainingPoints));
        res.set('RateLimit-Limit', String(config.points));
        res.set('RateLimit-Remaining', String(rlRes.remainingPoints));
        res.set(
          'RateLimit-Reset',
          String(Math.ceil(rlRes.msBeforeNext / 1000))
        );

        if (config.skipSuccessfulRequests) {
          res.on('finish', () => {
            if (res.statusCode < 400) {
              limiter.reward(key, 1).catch(() => {});
            }
          });
        }

        next();
      })
      .catch(rlRes => {
        if (rlRes instanceof Error) {
          // Unexpected error — fail open (allow request through)
          logger.warn(
            'Rate limiter unexpected error, allowing request through',
            {
              category: 'rate-limit',
              limiter: config.logLabel,
              error: rlRes.message,
            }
          );
          next();
          return;
        }

        const retryAfter = Math.ceil(rlRes.msBeforeNext / 1000);
        res.set('Retry-After', String(retryAfter));
        res.set('X-RateLimit-Limit', String(config.points));
        res.set('X-RateLimit-Remaining', '0');

        logger.warn(`${config.logLabel} rate limit exceeded`, {
          category: 'rate-limit',
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method,
          limiter: config.keyPrefix,
          ...(req.user?.id && { userId: req.user.id }),
        });

        res.status(429).json({
          error: config.message,
          retryAfter: '15 minutes',
        });
      });
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ipKey = (req: any): string => req.ip || 'unknown';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userKey = (req: any): string => req.user?.id || req.ip || 'unknown';

// ---------------------------------------------------------------------------
// Rate Limiters — IP-based (Layer 1)
// ---------------------------------------------------------------------------

export const generalRateLimit = createLimiter({
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  duration: Math.ceil(
    parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000
  ),
  keyPrefix: 'rl:general:',
  message: 'Too many requests from this IP, please try again later.',
  keyGenerator: ipKey,
  logLabel: 'General',
});

export const authRateLimit = createLimiter({
  points: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5'),
  duration: Math.ceil(
    parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000') / 1000
  ),
  keyPrefix: 'rl:auth:',
  message: 'Too many authentication attempts, please try again later.',
  keyGenerator: ipKey,
  skipSuccessfulRequests: true,
  logLabel: 'Authentication',
});

export const uploadRateLimit = createLimiter({
  points: 20,
  duration: 900,
  keyPrefix: 'rl:upload:',
  message: 'Too many file uploads, please try again later.',
  keyGenerator: ipKey,
  logLabel: 'Upload',
});

// ---------------------------------------------------------------------------
// Rate Limiters — Per-User (Layer 2: per-account abuse prevention)
// Applied AFTER authenticateToken in route files so req.user is available.
// ---------------------------------------------------------------------------

/** General API: 200 req / 15 min per user */
export const userApiRateLimit = createLimiter({
  points: 200,
  duration: 900,
  keyPrefix: 'rl:user:api:',
  message: 'Too many requests, please try again later.',
  keyGenerator: userKey,
  logLabel: 'Per-user API',
});

/** AI generation: 30 req / 15 min per user (expensive operations) */
export const userAiRateLimit = createLimiter({
  points: 30,
  duration: 900,
  keyPrefix: 'rl:user:ai:',
  message: 'Too many AI generation requests, please try again later.',
  keyGenerator: userKey,
  logLabel: 'Per-user AI',
});

/** File uploads: 50 req / 15 min per user */
export const userUploadRateLimit = createLimiter({
  points: 50,
  duration: 900,
  keyPrefix: 'rl:user:upload:',
  message: 'Too many file uploads, please try again later.',
  keyGenerator: userKey,
  logLabel: 'Per-user upload',
});

/**
 * Credit generation limiter — stricter than general AI to prevent credit abuse.
 * Covers all credit-deducting generation endpoints (generate, ai/generate, etc.)
 * Limit: 10 generations per minute per user.
 * Rationale: each call deducts at least 1 credit and invokes an expensive AI API.
 */
export const creditGenerationRateLimit = createLimiter({
  points: 10,
  duration: 60, // 1 minute window
  keyPrefix: 'rl:user:credit:gen:',
  message: 'You are generating thumbnails too quickly. Please wait a moment before trying again.',
  keyGenerator: userKey,
  logLabel: 'Per-user credit generation',
});

// Input sanitization middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sanitizeInput = (req: any, _res: any, next: any) => {
  // Remove potentially dangerous characters from string inputs
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;

    // Remove script tags and javascript: protocol
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }

    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  // Note: In Express 5, req.query is a read-only getter (re-parsed from URL each
  // time). The assignment below silently fails in non-strict mode but throws in
  // strict mode (TypeScript output always emits "use strict"). We catch the error
  // to avoid breaking the request; route-level validators handle further sanitisation.
  if (req.query) {
    try {
      req.query = sanitizeObject(req.query);
    } catch {
      // Express 5: req.query is getter-only — skip in-place replacement
    }
  }

  next();
};

// HTTPS redirect middleware (for production)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const httpsRedirect = (req: any, res: any, next: any) => {
  if (isProductionLike() && process.env.ENABLE_HTTPS_REDIRECT === 'true') {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
  }
  next();
};

// Security logging middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const securityLogger = (req: any, _res: any, next: any) => {
  // Log security-relevant events
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';

  // Log suspicious patterns
  const suspiciousPatterns = [
    /\.\./g, // Directory traversal
    /<script/gi, // XSS attempts
    /union.*select/gi, // SQL injection
    /eval\s*\(/gi, // Code injection
    /document\.cookie/gi, // Cookie theft attempts
  ];

  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  const isSuspicious = suspiciousPatterns.some(pattern =>
    pattern.test(requestString)
  );

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ip,
      userAgent,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });
  }

  // Log authentication attempts
  if (
    req.url.includes('/auth/') ||
    req.url.includes('/login') ||
    req.url.includes('/register')
  ) {
    logger.info('Authentication attempt', {
      ip,
      userAgent,
      url: req.url,
      method: req.method,
    });
  }

  next();
};

// Request size limiting middleware
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const requestSizeLimit = (req: any, res: any, next: any) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default

  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > maxSize) {
      logger.warn('Request size exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.url,
      });
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${maxSize} bytes`,
      });
    }
  }

  return next();
};

// API versioning and deprecation headers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiVersioning = (_req: any, res: any, next: any) => {
  // Add API version to response headers
  res.set('X-API-Version', '1.0.0');
  res.set('X-Powered-By', 'Thumbnail Maker Studio');

  // Remove default Express header for security
  res.removeHeader('X-Powered-By');

  next();
};
