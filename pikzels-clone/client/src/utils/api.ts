import config from '../config/environment';

// JJ: Per-tool frontend timeouts (slightly longer than backend to allow backend's own timeout to fire first)
// Backend timeouts: enhance=30s, remove-bg=25s, generate=45s, inpaint=60s, face-swap=45s, upscale=60s, expand=45s
const AI_TOOL_TIMEOUT_MS: Record<string, number> = {
  enhance:    40_000,
  'remove-bg': 35_000,
  generate:   55_000,
  inpaint:    70_000,
  'face-swap': 55_000,
  upscale:    70_000,
  expand:     55_000,
  default:    55_000,
};

/** JJ: Get frontend timeout for an AI tool endpoint */
export function getAIToolTimeout(toolType: string): number {
  return AI_TOOL_TIMEOUT_MS[toolType] ?? AI_TOOL_TIMEOUT_MS.default;
}

/** JJ: Create an AbortController that auto-aborts after the given AI tool timeout */
export function createAIToolAbortController(toolType: string): { controller: AbortController; timeoutId: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeoutMs = getAIToolTimeout(toolType);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

/**
 * Authenticated fetch wrapper that uses HttpOnly cookies for auth.
 * This replaces the old pattern of reading tokens from localStorage.
 */
// Track if a token refresh is already in progress to prevent multiple simultaneous refreshes
let refreshPromise: Promise<boolean> | null = null;

// Track token expiration time for proactive refresh
let accessTokenExpiresAt: number = 0;
const PROACTIVE_REFRESH_BUFFER_MS = 60 * 1000; // Refresh 1 minute before expiration

/**
 * Get the access token expiration time from cookie (if available)
 * Note: We can't read HttpOnly cookies from JS, so we track when we last got a token
 */
function getTokenExpirationTime(): number {
  return accessTokenExpiresAt;
}

/**
 * Set the access token expiration time (called after successful login/refresh)
 */
export function setTokenExpiration(expiresInSeconds: number): void {
  accessTokenExpiresAt = Date.now() + (expiresInSeconds * 1000);
}

/**
 * Check if token needs proactive refresh
 */
function needsProactiveRefresh(): boolean {
  if (accessTokenExpiresAt === 0) return false;
  return Date.now() > accessTokenExpiresAt - PROACTIVE_REFRESH_BUFFER_MS;
}

/**
 * Refresh the access token using the refresh token stored in HttpOnly cookies
 * Returns true if refresh was successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${config.apiBaseUrl}/api/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Send refresh token cookie automatically
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      // New tokens are set in HttpOnly cookies automatically by the server
      // Update expiration time (15 minutes from now)
      setTokenExpiration(900);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Enhanced fetch wrapper with automatic token refresh on 401 errors
 * 
 * When a request fails with 401 (expired token):
 * 1. Attempts to refresh the access token using the refresh token
 * 2. Retries the original request with the new token
 * 3. Redirects to login if refresh fails (refresh token also expired)
 * 
 * Also performs proactive refresh before token expires during active usage
 */
export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${config.apiBaseUrl}${endpoint}`;

  const headers = new Headers(options.headers);
  
  // Set JSON content type by default if not already set and body is present
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Proactive token refresh: refresh before expiration during active usage
  // Skip if already refreshing or if this IS the refresh endpoint
  if (!refreshPromise && !endpoint.includes('/auth/refresh-token') && needsProactiveRefresh()) {
    refreshPromise = refreshAccessToken();
    try {
      await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  // Make the initial request
  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send HttpOnly cookies for auth
    cache: options.cache || 'default', // Allow cache control (e.g., 'no-store' to prevent 304)
  });

  // Handle 401 Unauthorized - Token might be expired
  if (response.status === 401) {
    // If we're already trying to refresh or this IS the refresh endpoint, don't retry
    if (refreshPromise || endpoint.includes('/auth/refresh-token')) {
      return response;
    }

    // Start token refresh (or wait for existing refresh to complete)
    refreshPromise = refreshAccessToken();
    
    try {
      const refreshSuccess = await refreshPromise;
      
      if (refreshSuccess) {
        // Retry the original request with the new token
        response = await fetch(url, {
          ...options,
          headers,
          credentials: 'include',
          cache: options.cache || 'default',
        });
      }
      // If refresh failed, return the original 401 response.
      // The caller (AuthContext, ProtectedRoute) decides what to do.
    } finally {
      // Clear the refresh promise so future requests can trigger a new refresh
      refreshPromise = null;
    }
  }

  return response;
}

/**
 * Convenience method for GET requests
 */
export async function authGet(endpoint: string): Promise<Response> {
  return authFetch(endpoint, { method: 'GET' });
}

/**
 * Convenience method for POST requests with JSON body
 * JJ: Now accepts optional RequestInit overrides (signal, etc.) for AI tool timeouts
 */
export async function authPost(endpoint: string, body: unknown, extraOptions?: RequestInit): Promise<Response> {
  return authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
    ...extraOptions,
  });
}

/**
 * Convenience method for PUT requests with JSON body
 */
export async function authPut(endpoint: string, body: unknown): Promise<Response> {
  return authFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function authDelete(endpoint: string): Promise<Response> {
  return authFetch(endpoint, { method: 'DELETE' });
}

/**
 * Convenience method for PATCH requests with JSON body
 */
export async function authPatch(endpoint: string, body: unknown): Promise<Response> {
  return authFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

/**
 * Public fetch wrapper for unauthenticated endpoints (e.g., password reset)
 * Similar to authPost but without token refresh logic
 */
export async function publicPost(endpoint: string, body: unknown): Promise<Response> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${config.apiBaseUrl}${endpoint}`;

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}
