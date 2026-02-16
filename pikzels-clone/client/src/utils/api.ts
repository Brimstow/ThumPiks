import config from '../config/environment';

/**
 * Authenticated fetch wrapper that uses HttpOnly cookies for auth.
 * This replaces the old pattern of reading tokens from localStorage.
 */
// Track if a token refresh is already in progress to prevent multiple simultaneous refreshes
let refreshPromise: Promise<boolean> | null = null;

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
      } else {
        // Refresh failed - redirect to login
        // Only redirect if we're not already on the login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login?session_expired=true';
        }
      }
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
 */
export async function authPost(endpoint: string, body: unknown): Promise<Response> {
  return authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
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
