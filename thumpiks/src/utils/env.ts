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

/**
 * Validates DATABASE_URL networking configuration at boot.
 *
 * Railway services must reach Postgres over the private network
 * (postgres.railway.internal). The public TCP proxy (*.proxy.rlwy.net) is
 * meant for connections from outside the project: it is billed as network
 * egress, less reliable, and bypasses automatic PgBouncer repointing.
 *
 * Throws in production-like environments (production/staging) when
 * DATABASE_URL points at the public TCP proxy. Local development is exempt.
 *
 * @throws Error when DATABASE_URL uses the public proxy in a deployed env.
 */
export function validateDatabaseUrl(): void {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !isProductionLike()) return;

  let host: string;
  try {
    host = new URL(dbUrl).hostname;
  } catch {
    return; // Unparseable URL - let Prisma surface the real error
  }

  if (host.endsWith('.proxy.rlwy.net')) {
    throw new Error(
      'DATABASE_URL points at the Railway public TCP proxy (' +
        host +
        '). Services inside Railway must use the private network instead: ' +
        'set DATABASE_URL=${{Postgres.DATABASE_URL}} on the service. ' +
        'The public URL (DATABASE_PUBLIC_URL) is only for local/external clients.'
    );
  }
}

/**
 * Returns the client/frontend URL.
 * In production: requires CLIENT_URL env var (throws if missing).
 * In development: falls back to localhost:8556.
 */
export function getClientUrl(): string {
  const url = process.env.CLIENT_URL;
  if (url) return url;
  if (isProductionLike()) {
    throw new Error('CLIENT_URL environment variable is required in production');
  }
  return 'http://localhost:8556';
}

/**
 * Returns the frontend URL for external API headers (e.g. OpenRouter Referer).
 * In production: requires FRONTEND_URL or CLIENT_URL env var.
 * In development: falls back to localhost:8556.
 */
export function getFrontendUrl(): string {
  const url = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (url) return url;
  if (isProductionLike()) {
    throw new Error('FRONTEND_URL or CLIENT_URL environment variable is required in production');
  }
  return 'http://localhost:8556';
}
