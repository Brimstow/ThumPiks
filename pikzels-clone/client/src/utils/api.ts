import config from '../config/environment';

/**
 * Authenticated fetch wrapper that uses HttpOnly cookies for auth.
 * This replaces the old pattern of reading tokens from localStorage.
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

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Send HttpOnly cookies for auth
  });
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
