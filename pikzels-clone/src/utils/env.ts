/**
 * Environment detection utilities
 *
 * Single source of truth for determining environment type.
 * Both 'production' and 'staging' are treated as production-like
 * (strict security, secure cookies, HTTPS, etc.)
 *
 * @example
 *   import { isProductionLike, isDevelopmentEnv } from '../utils/env';
 *   if (isProductionLike()) { // strict security }
 */

const PRODUCTION_LIKE_ENVS = ['production', 'staging'];

/**
 * Returns true if the environment should use production-grade security.
 * Matches: 'production', 'staging'
 */
export function isProductionLike(): boolean {
  return PRODUCTION_LIKE_ENVS.includes(process.env.NODE_ENV || '');
}

/**
 * Returns true if the environment is local development.
 * Opposite of isProductionLike().
 */
export function isDevelopmentEnv(): boolean {
  return !isProductionLike();
}

/**
 * Returns the current NODE_ENV value, defaulting to 'development'.
 */
export function getNodeEnv(): string {
  return process.env.NODE_ENV || 'development';
}
