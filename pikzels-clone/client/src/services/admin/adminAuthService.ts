/**
 * Admin Auth Service
 * 
 * Handles admin authentication with environment-aware routing:
 * - Development: uses mock data (no backend needed)
 * - Production: hits real /api/admin/auth/* endpoints
 */

import { adminApi, shouldUseMockData, setAdminToken, setAdminUser, clearAdminAuth } from './adminApiClient';
import { mockAdminLogin, mockAdminMe } from './adminMockData';

export const adminAuthService = {
  /**
   * Login with email/password
   */
  async login(email: string, password: string) {
    if (shouldUseMockData()) {
      const result = await mockAdminLogin(email, password);
      if (result.success && result.data) {
        setAdminToken(result.data.token);
        setAdminUser(result.data.user);
      }
      return result;
    }

    const result = await adminApi.post<{ token: string; user: Record<string, unknown> }>(
      '/auth/login',
      { email, password }
    );

    if (result.success && result.data) {
      setAdminToken(result.data.token);
      setAdminUser(result.data.user);
    }

    return result;
  },

  /**
   * Logout current admin
   */
  async logout() {
    if (!shouldUseMockData()) {
      await adminApi.post('/auth/logout');
    }
    clearAdminAuth();
    return { success: true };
  },

  /**
   * Get current admin info (validate token)
   */
  async getCurrentAdmin() {
    if (shouldUseMockData()) {
      return mockAdminMe();
    }
    return adminApi.get('/auth/me');
  },
};
