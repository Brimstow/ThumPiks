import { logger } from '../utils/logger';
import crypto from 'crypto';

interface SecurityConfig {
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
 * Validates and returns security configuration
 * Ensures all critical security settings are properly configured
 */
export function getSecurityConfig(): SecurityConfig {
  // Validate critical environment variables
  validateEnvironment();

  const config: SecurityConfig = {
    jwt: {
      secret: getRequiredEnv('JWT_SECRET'),
      refreshSecret: getRequiredEnv('REFRESH_TOKEN_SECRET', 'different-secret-from-jwt'),
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      resetExpiry: process.env.JWT_RESET_EXPIRY || '1h',
    },
    encryption: {
      key: getRequiredEnv('ENCRYPTION_KEY'),
      algorithm: 'aes-256-gcm',
    },
    database: {
      url: getRequiredEnv('DATABASE_URL'),
      ssl: process.env.NODE_ENV === 'production',
    },
    cors: {
      origins: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    rateLimiting: {
      enabled: process.env.ENABLE_RATE_LIMITING === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
      authMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5'),
    },
    security: {
      enableHeaders: process.env.ENABLE_SECURITY_HEADERS === 'true',
      enableHttpsRedirect: process.env.ENABLE_HTTPS_REDIRECT === 'true',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      enableSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false', // Default to true
    },
    features: {
      enableCache: process.env.ENABLE_CACHE === 'true',
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
      enablePerformanceMonitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
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
    if (fallback && process.env.NODE_ENV !== 'production') {
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
    '123456'
  ];

  if (insecureDefaults.includes(value.toLowerCase())) {
    if (process.env.NODE_ENV === 'production') {
      logger.error(`Insecure default value detected for ${key}`);
      throw new Error(`Insecure default value for ${key} in production`);
    } else {
      logger.warn(`Insecure default value for ${key} - change for production`, { key });
    }
  }

  return value;
}

/**
 * Validate environment variables at startup
 */
function validateEnvironment(): void {
  const requiredVars = [
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const productionRequiredVars = [
    'REFRESH_TOKEN_SECRET',
    'ENCRYPTION_KEY'
  ];

  const missingVars: string[] = [];

  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });

  // Check production-required variables
  if (process.env.NODE_ENV === 'production') {
    productionRequiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });
  }

  if (missingVars.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVars.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Validate JWT secret length
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters for security');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be at least 32 characters in production');
    }
  }

  // Validate database URL format
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('file:')) {
    logger.warn('Unexpected database URL format', { format: dbUrl.split('://')[0] });
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
    if (config.rateLimiting.maxRequests < 1 || config.rateLimiting.authMaxAttempts < 1) {
      logger.error('Rate limiting values must be positive integers');
      throw new Error('Invalid rate limiting configuration');
    }
  }

  // Production-specific validations
  if (process.env.NODE_ENV === 'production') {
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
    if (config.cors.origins.includes('*') || config.cors.origins.includes('http://localhost:3000')) {
      logger.warn('CORS origins should be restricted in production', { 
        origins: config.cors.origins 
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
export function encryptData(data: string, key?: string): { encrypted: string; iv: string; authTag: string } {
  const encryptionKey = key || getRequiredEnv('ENCRYPTION_KEY');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey.slice(0, 32)), iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag for GCM mode (CRITICAL for data integrity)
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
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
export function decryptData(encryptedData: string, iv: string, authTag: string, key?: string): string {
  const encryptionKey = key || getRequiredEnv('ENCRYPTION_KEY');
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey.slice(0, 32)), Buffer.from(iv, 'hex'));
  
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