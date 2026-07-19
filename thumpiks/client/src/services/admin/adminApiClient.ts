/**
 * Admin API Client
 * 
 * Centralized fetch wrapper for all admin API calls.
 * - Automatically attaches admin JWT token
 * - Routes to real API in production, mock data in development
 * - Handles token expiration and redirects to login
 * - Provides typed request/response helpers
 */

import { API_BASE_URL, IS_DEVELOPMENT } from '../../config/environment';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export interface AdminApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: Record<string, unknown> | FormData;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Force mock data even in production (for testing) */
  forceMock?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// ENV-AWARE CONFIG
// ═══════════════════════════════════════════════════════════════════

/**
 * Determine if we should use mock data.
 * - Development: use mock by default (override with VITE_ADMIN_USE_LIVE_API=true)
 * - Production: always use live API
 */
export function shouldUseMockData(forceMock?: boolean): boolean {
  if (forceMock) return true;
  if (!IS_DEVELOPMENT) return false;
  // Allow dev override to hit real API
  const useLiveApi = import.meta.env.VITE_ADMIN_USE_LIVE_API === 'true';
  return !useLiveApi;
}

// ═══════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

const TOKEN_KEY = 'adminToken';
const USER_KEY = 'adminUser';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminUser(): Record<string, unknown> | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminUser(user: Record<string, unknown>): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAdminAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminToken();
}

// ═══════════════════════════════════════════════════════════════════
// CORE FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════════

/**
 * Makes an authenticated request to the admin API.
 * Automatically handles:
 * - Token injection via Authorization header
 * - JSON serialization/deserialization
 * - Query parameter encoding
 * - 401 → redirect to admin login
 * - Error normalization
 */
export async function adminFetch<T = unknown>(
  endpoint: string,
  options: AdminRequestOptions = {}
): Promise<AdminApiResponse<T>> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    signal,
  } = options;

  // Build URL with query params
  const url = new URL(`${API_BASE_URL}/api/admin${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Build headers
  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  const token = getAdminToken();
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  // Handle body
  let requestBody: string | FormData | undefined;
  if (body instanceof FormData) {
    requestBody = body;
    // Don't set Content-Type for FormData — browser sets it with boundary
  } else if (body) {
    requestHeaders['Content-Type'] = 'application/json';
    requestBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: requestHeaders,
      body: requestBody,
      signal,
    });

    // Handle 401 — token expired or invalid
    if (response.status === 401) {
      clearAdminAuth();
      // Redirect to admin login if not already there
      if (!window.location.pathname.includes('/admin/login')) {
        window.location.href = '/admin/login';
      }
      return {
        success: false,
        error: 'Authentication expired. Please log in again.',
      };
    }

    // Handle non-JSON responses (e.g., file downloads)
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      if (response.ok) {
        // For non-JSON success responses, return raw response in data
        return {
          success: true,
          data: (await response.text()) as unknown as T,
        };
      }
      return {
        success: false,
        error: `Request failed with status ${response.status}`,
      };
    }

    const json = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: json.message || json.error || `Request failed (${response.status})`,
        ...json,
      };
    }

    return json as AdminApiResponse<T>;
  } catch (error) {
    // Network error or abort
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, error: 'Request was cancelled' };
    }
    
    console.error(`[AdminAPI] ${method} ${endpoint} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error — is the backend running?',
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
// CONVENIENCE METHODS
// ═══════════════════════════════════════════════════════════════════

export const adminApi = {
  get: <T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>, signal?: AbortSignal) =>
    adminFetch<T>(endpoint, { method: 'GET', params, signal }),

  post: <T = unknown>(endpoint: string, body?: Record<string, unknown>, signal?: AbortSignal) =>
    adminFetch<T>(endpoint, { method: 'POST', body, signal }),

  put: <T = unknown>(endpoint: string, body?: Record<string, unknown>, signal?: AbortSignal) =>
    adminFetch<T>(endpoint, { method: 'PUT', body, signal }),

  delete: <T = unknown>(endpoint: string, body?: Record<string, unknown>, signal?: AbortSignal) =>
    adminFetch<T>(endpoint, { method: 'DELETE', body, signal }),
};
