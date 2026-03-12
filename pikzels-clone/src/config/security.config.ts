import { logger } from '../utils/logger';
import { isProductionLike, isDevelopmentEnv } from '../utils/env';
import crypto from 'crypto';

interface SecurityConfig {
  isDevelopment: boolean;
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiry: string;
    refreshExpiry: string;
    resetExpiry: string;
  };
  encryption: {
    key: string;
    algorithm: string;
  };
  database: {
    url: string;
    ssl: boolean;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  rateLimiting: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    authWindowMs: number;
    authMaxAttempts: number;
  };
  security: {
    enableHeaders: boolean;
    enableHttpsRedirect: boolean;
    requireEmailVerification: boolean;
    enableSanitization: boolean;
  };
  features: {
    enableCache: boolean;
    enableCompression: boolean;
    enablePerformanceMonitoring: boolean;
  };
}

/**
 * Development mode defaults - relaxed settings for local development
 * These are ONLY applied when NODE_ENV is not production-like (production/staging)
 */
const DEV_DEFAULTS = {
  rateLimiting: {
    enabled: false, // Disable rate limiting in dev
    windowMs: 60000, // 1 minute (if enabled)
    maxRequests: 10000, // Very high limit
    authWindowMs: 60000, // 1 minute
    authMaxAttempts: 1000, // Very high limit
  },
  jwt: {
    accessExpiry: '24h', // Longer session for dev convenience
    refreshExpiry: '30d', // Month-long refresh token
  },
  cors: {
    origins: ['http://localhost:8556', 'http://127.0.0.1:8556'],
  },
  security: {
    enableHttpsRedirect: false, // No HTTPS locally
    enableHeaders: false, // Optional in dev
  },
};

/**
 * Production defaults - strict security settings
 * These are enforced when NODE_ENV is production-like (production/staging)
 */
const PROD_DEFAULTS = {
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100,
    authWindowMs: 900000, // 15 minutes
    authMaxAttempts: 5, // Strict limit
  },
  jwt: {
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  cors: {
    origins: [] as string[], // Must be set via CORS_ORIGIN env in production
  },
  security: {
    enableHttpsRedirect: true,
    enableHeaders: true,
  },
};

/**
 * Log development mode banner with clear warnings about relaxed security
 */
function logDevModeBanner(): void {
  const banner = `
╔══════════════════════════════════════════════════════════════════╗
║  ⚠️   DEVELOPMENT MODE ACTIVE                                     ║
║                                                                   ║
║  The following security features are RELAXED for development:    ║
║                                                                   ║
║  🔓 Rate Limiting     → DISABLED (no login attempt limits)       ║
║  🕐 JWT Expiry        → 24 hours (instead of 15 minutes)         ║
║  🌐 CORS              → localhost origins allowed                ║
║  🔒 HTTPS Redirect    → DISABLED                                 ║
║  🛡️  Security Headers  → DISABLED                                 ║
║                                                                   ║
║  ⛔ DO NOT deploy to production with NODE_ENV=development        ║
╚══════════════════════════════════════════════════════════════════╝`;

  console.log('\x1b[33m%s\x1b[0m', banner); // Yellow color

  logger.warn('🚨 DEVELOPMENT MODE: Security features relaxed', {
    rateLimiting: 'disabled',
    jwtExpiry: '24h',
    cors: 'localhost allowed',
    httpsRedirect: 'disabled',
    securityHeaders: 'disabled',
  });
}

/**
 * Get rate limiting configuration based on environment
 * In development: disabled or very high limits
 * In production: strict limits from env or defaults
 *
 * TIP: Set BYPASS_RATE_LIMIT=true for testing in any environment
 * This allows you to test without getting locked out
 */
function getRateLimitConfig(
  isDevelopment: boolean,
  defaults: typeof DEV_DEFAULTS | typeof PROD_DEFAULTS
): SecurityConfig['rateLimiting'] {
  // Allow explicit bypass for testing (works in any environment)
  if (process.env.BYPASS_RATE_LIMIT === 'true') {
    logger.warn(
      '⚠️ BYPASS_RATE_LIMIT=true: Rate limiting DISABLED for testing'
    );
    return {
      enabled: false,
      windowMs: defaults.rateLimiting.windowMs,
      maxRequests: 999999,
      authWindowMs: defaults.rateLimiting.authWindowMs,
      authMaxAttempts: 999999,
    };
  }

  // In development, always use relaxed settings unless explicitly overridden
  if (isDevelopment) {
    const forceRateLimiting = process.env.FORCE_RATE_LIMITING === 'true';

    if (forceRateLimiting) {
      logger.info(
        '⚠️ DEV MODE: Rate limiting FORCE ENABLED via FORCE_RATE_LIMITING=true'
      );
      return {
        enabled: true,
        windowMs: parseInt(
          process.env.RATE_LIMIT_WINDOW_MS ||
            String(defaults.rateLimiting.windowMs)
        ),
        maxRequests: parseInt(
          process.env.RATE_LIMIT_MAX_REQUESTS ||
            String(defaults.rateLimiting.maxRequests)
        ),
        authWindowMs: parseInt(
          process.env.AUTH_RATE_LIMIT_WINDOW_MS ||
            String(defaults.rateLimiting.authWindowMs)
        ),
        authMaxAttempts: parseInt(
          process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ||
            String(defaults.rateLimiting.authMaxAttempts)
        ),
      };
    }

    // Default: disabled in development
    return {
      enabled: false,
      windowMs: defaults.rateLimiting.windowMs,
      maxRequests: defaults.rateLimiting.maxRequests,
      authWindowMs: defaults.rateLimiting.authWindowMs,
      authMaxAttempts: defaults.rateLimiting.authMaxAttempts,
    };
  }

  // Production: use env values or strict defaults
  return {
    enabled: process.env.ENABLE_RATE_LIMITING !== 'false', // Default to true in production
    windowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || String(defaults.rateLimiting.windowMs)
    ),
    maxRequests: parseInt(
      process.env.RATE_LIMIT_MAX_REQUESTS ||
        String(defaults.rateLimiting.maxRequests)
    ),
    authWindowMs: parseInt(
      process.env.AUTH_RATE_LIMIT_WINDOW_MS ||
        String(defaults.rateLimiting.authWindowMs)
    ),
    authMaxAttempts: parseInt(
      process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS ||
        String(defaults.rateLimiting.authMaxAttempts)
    ),
  };
}

/**
 * Validates and returns security configuration
 * Ensures all critical security settings are properly configured
 *
 * DEVELOPMENT MODE: Automatically applies relaxed settings when NODE_ENV is not production-like (production/staging)
 * PRODUCTION MODE: Enforces strict security settings
 */
export function getSecurityConfig(): SecurityConfig {
  // Validate critical environment variables
  validateEnvironment();

  const isDevelopment = isDevelopmentEnv();
  const defaults = isDevelopment ? DEV_DEFAULTS : PROD_DEFAULTS;

  // Log development mode banner
  if (isDevelopment) {
    logDevModeBanner();
  }

  const config: SecurityConfig = {
    isDevelopment,
    jwt: {
      secret: getRequiredEnv('JWT_SECRET'),
      refreshSecret: getRequiredEnv(
        'REFRESH_TOKEN_SECRET',
        'different-secret-from-jwt'
      ),
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || defaults.jwt.accessExpiry,
      refreshExpiry:
        process.env.JWT_REFRESH_EXPIRY || defaults.jwt.refreshExpiry,
      resetExpiry: process.env.JWT_RESET_EXPIRY || '1h',
    },
    encryption: {
      key: getRequiredEnv('ENCRYPTION_KEY'),
      algorithm: 'aes-256-gcm',
    },
    database: {
      url: getRequiredEnv('DATABASE_URL'),
      ssl: isProductionLike(),
    },
    cors: {
      origins: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : isDevelopment
          ? defaults.cors.origins
          : ['https://yourdomain.com'],
      credentials: process.env.CORS_CREDENTIALS !== 'false', // Default to true
    },
    rateLimiting: getRateLimitConfig(isDevelopment, defaults),
    security: {
      enableHeaders:
        process.env.ENABLE_SECURITY_HEADERS === 'true' ||
        (!isDevelopment && defaults.security.enableHeaders),
      enableHttpsRedirect:
        process.env.ENABLE_HTTPS_REDIRECT === 'true' && !isDevelopment,
      requireEmailVerification:
        process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      enableSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false', // Default to true
    },
    features: {
      enableCache: process.env.ENABLE_CACHE === 'true',
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
      enablePerformanceMonitoring:
        process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
    },
  };

  // Validate configuration
  validateSecurityConfig(config);

  logger.info('Security configuration loaded', {
    environment: process.env.NODE_ENV,
    featuresEnabled: Object.entries(config.features)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
    securityEnabled: Object.entries(config.security)
      .filter(([, enabled]) => enabled)
      .map(([feature]) => feature),
  });

  return config;
}

/**
 * Get required environment variable with validation
 */
function getRequiredEnv(key: string, fallback?: string): string {
  const value = process.env[key];

  if (!value) {
    if (fallback && isDevelopmentEnv()) {
      logger.warn(`Using fallback for ${key} in development`, { key });
      return fallback;
    }

    logger.error(`Required environment variable ${key} is not set`);
    throw new Error(`Required environment variable ${key} is not set`);
  }

  // Check for insecure defaults
  const insecureDefaults = [
    'your-secret-key',
    'your-refresh-secret',
    'your-encryption-key',
    'change-me',
    'default',
    '123456',
  ];

  if (insecureDefaults.includes(value.toLowerCase())) {
    if (isProductionLike()) {
      logger.error(`Insecure default value detected for ${key}`);
      throw new Error(`Insecure default value for ${key} in production`);
    } else {
      logger.warn(`Insecure default value for ${key} - change for production`, {
        key,
      });
    }
  }

  return value;
}

/**
 * Detect if running in a cloud/production-like environment
 * This is a FAILSAFE - even if NODE_ENV is not set, we detect cloud platforms
 */
function isCloudEnvironment(): { isCloud: boolean; platform: string | null } {
  // Railway detection
  if (process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID) {
    return { isCloud: true, platform: 'Railway' };
  }
  // Heroku detection
  if (process.env.DYNO || process.env.HEROKU_APP_NAME) {
    return { isCloud: true, platform: 'Heroku' };
  }
  // Vercel detection
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return { isCloud: true, platform: 'Vercel' };
  }
  // Render detection
  if (process.env.RENDER || process.env.RENDER_SERVICE_ID) {
    return { isCloud: true, platform: 'Render' };
  }
  // AWS detection
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV) {
    return { isCloud: true, platform: 'AWS' };
  }
  // Google Cloud detection
  if (process.env.GOOGLE_CLOUD_PROJECT || process.env.GAE_APPLICATION) {
    return { isCloud: true, platform: 'Google Cloud' };
  }
  // Azure detection
  if (
    process.env.WEBSITE_SITE_NAME ||
    process.env.AZURE_FUNCTIONS_ENVIRONMENT
  ) {
    return { isCloud: true, platform: 'Azure' };
  }
  // Fly.io detection
  if (process.env.FLY_APP_NAME || process.env.FLY_ALLOC_ID) {
    return { isCloud: true, platform: 'Fly.io' };
  }
  // Generic cloud indicators
  if (process.env.PORT && !process.env.npm_lifecycle_event) {
    // PORT is set but not running via npm script - likely cloud
    return { isCloud: true, platform: 'Unknown Cloud' };
  }

  return { isCloud: false, platform: null };
}

/**
 * Validate environment variables at startup
 *
 * FAILSAFE: Blocks startup in cloud environments if security is misconfigured
 */
function validateEnvironment(): void {
  const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];

  const productionRequiredVars = [
    'REFRESH_TOKEN_SECRET',
    'ENCRYPTION_KEY',
    'CORS_ORIGIN', // Must explicitly set CORS in production
  ];

  const missingVars: string[] = [];

  // ═══════════════════════════════════════════════════════════════════
  // FAILSAFE #1: Detect cloud environment and enforce production mode
  // ═══════════════════════════════════════════════════════════════════
  const cloudCheck = isCloudEnvironment();

  if (cloudCheck.isCloud) {
    logger.info(`☁️  Cloud environment detected: ${cloudCheck.platform}`);

    // CRITICAL: If we're in a cloud environment but NODE_ENV is not production-like
    if (!isProductionLike()) {
      const errorMsg = `
╔══════════════════════════════════════════════════════════════════════════╗
║  🚨 SECURITY FAILSAFE TRIGGERED - STARTUP BLOCKED                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Cloud platform detected: ${(cloudCheck.platform || 'Unknown').padEnd(44)}║
║  But NODE_ENV is: ${(process.env.NODE_ENV || 'undefined').padEnd(50)}║
║                                                                          ║
║  This is DANGEROUS! Development settings would be used in production.    ║
║                                                                          ║
║  FIX: Set NODE_ENV=production in your ${(cloudCheck.platform || 'cloud').padEnd(30)}║
║       environment variables before deploying.                            ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝`;

      console.error('\x1b[31m%s\x1b[0m', errorMsg);
      logger.error(
        `FAILSAFE: Cloud environment detected without NODE_ENV=production - platform: ${cloudCheck.platform}, nodeEnv: ${process.env.NODE_ENV}`
      );

      throw new Error(
        `SECURITY FAILSAFE: Set NODE_ENV=production for ${cloudCheck.platform} deployment`
      );
    }
  }

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // FAILSAFE #2: Enforce strict requirements in production-like envs
  // ═══════════════════════════════════════════════════════════════════
  if (isProductionLike()) {
    productionRequiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    // Additional production-like checks
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      logger.error(
        'JWT_SECRET must be at least 32 characters in production/staging'
      );
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production/staging'
      );
    }

    // Check for insecure placeholder values
    const insecurePatterns = [
      'CHANGE_ME',
      'your-',
      'example',
      'test',
      'default',
      '123456',
    ];
    const sensitiveVars = [
      'JWT_SECRET',
      'REFRESH_TOKEN_SECRET',
      'ENCRYPTION_KEY',
    ];

    sensitiveVars.forEach(varName => {
      const value = process.env[varName] || '';
      if (
        insecurePatterns.some(pattern =>
          value.toLowerCase().includes(pattern.toLowerCase())
        )
      ) {
        logger.error(
          `INSECURE VALUE: ${varName} contains placeholder/test value in ${process.env.NODE_ENV}`
        );
        throw new Error(
          `${varName} contains insecure placeholder value - change it for ${process.env.NODE_ENV}!`
        );
      }
    });
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate JWT secret length (warning in dev, error in prod - handled above)
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32 && isDevelopmentEnv()) {
    logger.warn('JWT_SECRET should be at least 32 characters for security');
  }

  // Validate database URL format
  const dbUrl = process.env.DATABASE_URL;
  if (
    dbUrl &&
    !dbUrl.startsWith('postgresql://') &&
    !dbUrl.startsWith('file:')
  ) {
    logger.warn('Unexpected database URL format', {
      format: dbUrl.split('://')[0],
    });
  }

  logger.info('Environment validation completed');
}

/**
 * Validate security configuration
 */
function validateSecurityConfig(config: SecurityConfig): void {
  // Validate JWT configuration
  if (config.jwt.secret === config.jwt.refreshSecret) {
    logger.error('JWT secret and refresh secret must be different');
    throw new Error('JWT secret and refresh secret must be different');
  }

  // Validate encryption key length
  if (config.encryption.key.length < 32) {
    logger.error('Encryption key must be at least 32 characters');
    throw new Error('Encryption key must be at least 32 characters');
  }

  // Validate rate limiting settings
  if (config.rateLimiting.enabled) {
    if (
      config.rateLimiting.maxRequests < 1 ||
      config.rateLimiting.authMaxAttempts < 1
    ) {
      logger.error('Rate limiting values must be positive integers');
      throw new Error('Invalid rate limiting configuration');
    }
  }

  // Production-like validations (production + staging)
  if (isProductionLike()) {
    if (!config.security.enableHeaders) {
      logger.warn('Security headers should be enabled in production');
    }

    if (!config.security.enableHttpsRedirect) {
      logger.warn('HTTPS redirect should be enabled in production');
    }

    if (!config.rateLimiting.enabled) {
      logger.warn('Rate limiting should be enabled in production');
    }

    // Check CORS origins in production
    if (
      config.cors.origins.includes('*') ||
      config.cors.origins.includes('http://localhost:8556')
    ) {
      logger.warn('CORS origins should be restricted in production', {
        origins: config.cors.origins,
      });
    }
  }

  logger.info('Security configuration validation completed');
}

/**
 * Generate a secure random key for environment variables
 */
export function generateSecureKey(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param data - Data to encrypt
 * @param key - Optional encryption key (uses ENCRYPTION_KEY env if not provided)
 * @returns Object containing encrypted data, IV, and auth tag
 */
export function encryptData(
  data: string,
  key?: string
): { encrypted: string; iv: string; authTag: string } {
  const encryptionKey = key || getRequiredEnv('ENCRYPTION_KEY');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey.slice(0, 32)),
    iv
  );

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag for GCM mode (CRITICAL for data integrity)
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedData - Encrypted data in hex format
 * @param iv - Initialization vector in hex format
 * @param authTag - Authentication tag in hex format (required for GCM)
 * @param key - Optional encryption key (uses ENCRYPTION_KEY env if not provided)
 * @returns Decrypted plaintext string
 */
export function decryptData(
  encryptedData: string,
  iv: string,
  authTag: string,
  key?: string
): string {
  const encryptionKey = key || getRequiredEnv('ENCRYPTION_KEY');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(encryptionKey.slice(0, 32)),
    Buffer.from(iv, 'hex')
  );

  // Set authentication tag (CRITICAL for GCM integrity verification)
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Hash sensitive data (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure session ID
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Export the configuration
export const securityConfig = getSecurityConfig();
