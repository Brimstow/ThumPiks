/**
 * Admin User Management Service
 * 
 * Environment-aware user management:
 * - Development: mock data
 * - Production: /api/admin/users/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetUsers,
  mockGetUserStats,
  mockGetUserById,
  mockUpdateUser,
  mockDeleteUser,
  mockCreateUser,
} from './adminMockData';

export const adminUserService = {
  async getUsers(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetUsers(params);
    return adminApi.get('/users', params);
  },

  async getUserStats() {
    if (shouldUseMockData()) return mockGetUserStats();
    return adminApi.get('/users/stats');
  },

  async getUserById(userId: string) {
    if (shouldUseMockData()) return mockGetUserById(userId);
    return adminApi.get(`/users/${userId}`);
  },

  async createUser(userData: Record<string, unknown>) {
    if (shouldUseMockData()) return mockCreateUser(userData);
    return adminApi.post('/users', userData);
  },

  async updateUser(userId: string, updates: Record<string, unknown>) {
    if (shouldUseMockData()) return mockUpdateUser(userId, updates);
    return adminApi.put(`/users/${userId}`, updates);
  },

  async deleteUser(userId: string) {
    if (shouldUseMockData()) return mockDeleteUser(userId);
    return adminApi.delete(`/users/${userId}`);
  },

  async resetPassword(userId: string, newPassword: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 400));
      return { success: true, message: 'Password reset successfully' };
    }
    return adminApi.post(`/users/${userId}/reset-password`, { newPassword });
  },

  async assignAdminRole(userId: string, role: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 400));
      return { success: true, message: `Role ${role} assigned successfully` };
    }
    return adminApi.post(`/users/${userId}/admin-roles`, { role });
  },

  async removeAdminRole(userId: string, role: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 400));
      return { success: true, message: `Role ${role} removed successfully` };
    }
    return adminApi.delete(`/users/${userId}/admin-roles`, { role });
  },
};
