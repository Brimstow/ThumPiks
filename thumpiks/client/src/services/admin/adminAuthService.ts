/**
 * Admin Auth Service
 *
 * Handles admin authentication with environment-aware routing:
 * - Development: uses mock data (no backend needed)
 * - Production: hits real /api/admin/auth/* endpoints
 */

import { adminApi, setAdminToken, setAdminUser, clearAdminAuth } from './adminApiClient';
import { mockAdminLogin, mockAdminMe } from './adminMockData';
import { createAdminService } from './createAdminService';

function handleLoginResult(result: any) {
  if (result.success && result.data) {
    setAdminToken(result.data.token);
    setAdminUser(result.data.user);
  }
  return result;
}

const realImpl = {
  async login(email: string, password: string) {
    const result = await adminApi.post<{ token: string; user: Record<string, unknown> }>(
      '/auth/login',
      { email, password }
    );
    return handleLoginResult(result);
  },

  async logout() {
    await adminApi.post('/auth/logout');
    clearAdminAuth();
    return { success: true };
  },

  async getCurrentAdmin() {
    return adminApi.get('/auth/me');
  },
};

const mockImpl = {
  async login(email: string, password: string) {
    const result = await mockAdminLogin(email, password);
    return handleLoginResult(result);
  },

  async logout() {
    clearAdminAuth();
    return { success: true };
  },

  async getCurrentAdmin() {
    return mockAdminMe();
  },
};

export const adminAuthService = createAdminService(realImpl, mockImpl);
