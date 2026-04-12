/**
 * Frontend Environment Configuration
 * 
 * FAILSAFE: Detects environment and validates critical settings
 * Prevents deploying to production with localhost URLs
 */

// ═══════════════════════════════════════════════════════════════════
// ENVIRONMENT DETECTION
// ═══════════════════════════════════════════════════════════════════

interface EnvironmentConfig {
  isDevelopment: boolean;
  isProduction: boolean;
  platform: string | null;
  apiBaseUrl: string;
  appUrl: string;
  ai: {
    replicateApiKey: string | null;
    openrouterApiKey: string | null;
    cometApiKey: string | null;
    zenmuxApiKey: string | null;
  };
}

/**
 * Detect if running in a cloud/production environment
 */
function detectEnvironment(): { isProduction: boolean; platform: string | null } {
  // Netlify detection
  if (import.meta.env.NETLIFY === 'true' || import.meta.env.CONTEXT) {
    return { isProduction: true, platform: 'Netlify' };
  }
  
  // Vercel detection
  if (import.meta.env.VERCEL === '1' || import.meta.env.VERCEL_ENV) {
    return { isProduction: true, platform: 'Vercel' };
  }
  
  // Cloudflare Pages detection
  if (import.meta.env.CF_PAGES === '1') {
    return { isProduction: true, platform: 'Cloudflare Pages' };
  }
  
  // Generic production detection via Vite
  if (import.meta.env.PROD) {
    // Check if we're on localhost (dev build preview)
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return { isProduction: false, platform: null };
    }
    return { isProduction: true, platform: 'Production Build' };
  }
  
  return { isProduction: false, platform: null };
}

/**
 * Validate that production deployments have proper URLs configured
 */
function validateProductionConfig(env: ReturnType<typeof detectEnvironment>, apiUrl: string): void {
  if (!env.isProduction) return;
  
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    ':8550',  // Your local backend port
    ':3000',
    ':5173',
  ];
  
  const hasLocalhostUrl = localhostPatterns.some(pattern => apiUrl.includes(pattern));
  
  if (hasLocalhostUrl) {
    const errorMsg = `
╔══════════════════════════════════════════════════════════════════════════╗
║  🚨 FRONTEND SECURITY FAILSAFE - CONFIGURATION ERROR                     ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  Platform detected: ${(env.platform || 'Production').padEnd(47)}║
║  API URL configured: ${apiUrl.slice(0, 45).padEnd(46)}║
║                                                                          ║
║  ⚠️  LOCALHOST URL DETECTED IN PRODUCTION BUILD!                         ║
║                                                                          ║
║  This will cause all API calls to fail in production.                    ║
║                                                                          ║
║  FIX: Set VITE_API_URL in your ${(env.platform || 'hosting').padEnd(36)}║
║       environment variables to your production backend URL.              ║
║                                                                          ║
║  Example: VITE_API_URL=https://your-backend.railway.app                  ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝`;
    
    console.error(errorMsg);
    
    // In production, we'll show an alert but won't crash the app
    // (unlike backend, frontend can't "refuse to start")
    if (typeof window !== 'undefined') {
      // Store error for display in UI
      (window as unknown as { __ENV_CONFIG_ERROR__: string }).__ENV_CONFIG_ERROR__ = 
        'API configuration error: localhost URL detected in production. Contact support.';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const envDetection = detectEnvironment();

// Get API URL with fallbacks
// Use ?? (not ||) so that VITE_API_URL="" enables proxy mode (relative paths)
const apiBaseUrl = import.meta.env.VITE_API_URL ?? 
  (envDetection.isProduction 
    ? 'https://thumbnail-maker-studio-production.up.railway.app'  // Your Railway backend
    : 'http://localhost:8550');

// Validate configuration in production
validateProductionConfig(envDetection, apiBaseUrl);

// Log environment info
if (!envDetection.isProduction) {
  console.log('🔧 Development Mode Active', {
    apiBaseUrl,
    platform: envDetection.platform || 'Local',
  });
} else if (apiBaseUrl === '') {
  console.log('🔄 Proxy Mode Active — API requests use relative paths (same-origin cookies)');
}

export const config: EnvironmentConfig = {
  isDevelopment: !envDetection.isProduction,
  isProduction: envDetection.isProduction,
  platform: envDetection.platform,
  apiBaseUrl,
  appUrl: import.meta.env.VITE_APP_URL || (envDetection.isProduction ? '' : 'http://localhost:8556'),
  ai: {
    replicateApiKey: import.meta.env.VITE_REPLICATE_API_KEY || null,
    openrouterApiKey: import.meta.env.VITE_OPENROUTER_API_KEY || null,
    cometApiKey: import.meta.env.VITE_COMET_API_KEY || null,
    zenmuxApiKey: import.meta.env.VITE_ZENMUX_API_KEY || null,
  },
};

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

export const API_BASE_URL = config.apiBaseUrl;
export const IS_DEVELOPMENT = config.isDevelopment;
export const IS_PRODUCTION = config.isProduction;

/**
 * OAuth redirect URLs
 * Centralized to follow DRY principle
 */
export const OAUTH_URLS = {
  google: `${config.apiBaseUrl}/api/auth/google`,
  github: `${config.apiBaseUrl}/api/auth/github`,
} as const;

/**
 * Check if there's an environment configuration error
 * Use this in your App.tsx to show error UI
 */
export function getEnvConfigError(): string | null {
  if (typeof window !== 'undefined') {
    return (window as unknown as { __ENV_CONFIG_ERROR__?: string }).__ENV_CONFIG_ERROR__ || null;
  }
  return null;
}

export default config;
