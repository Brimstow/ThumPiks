/**
 * Admin User Management Service
 *
 * Environment-aware user management via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/users/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetUsers,
  mockGetUserStats,
  mockGetUserById,
  mockUpdateUser,
  mockDeleteUser,
  mockCreateUser,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const MOCK_DELAY = (ms = 400) => new Promise(r => setTimeout(r, ms));

const realImpl = {
  async getUsers(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/users', params);
  },
  async getUserStats() {
    return adminApi.get('/users/stats');
  },
  async getUserById(userId: string) {
    return adminApi.get(`/users/${userId}`);
  },
  async createUser(userData: Record<string, unknown>) {
    return adminApi.post('/users', userData);
  },
  async updateUser(userId: string, updates: Record<string, unknown>) {
    return adminApi.put(`/users/${userId}`, updates);
  },
  async deleteUser(userId: string) {
    return adminApi.delete(`/users/${userId}`);
  },
  async resetPassword(userId: string, newPassword: string) {
    return adminApi.post(`/users/${userId}/reset-password`, { newPassword });
  },
  async assignAdminRole(userId: string, role: string) {
    return adminApi.post(`/users/${userId}/admin-roles`, { role });
  },
  async removeAdminRole(userId: string, role: string) {
    return adminApi.delete(`/users/${userId}/admin-roles`, { role });
  },
};

const mockImpl = {
  async getUsers(params?: Record<string, string | number | boolean | undefined>) {
    return mockGetUsers(params);
  },
  async getUserStats() {
    return mockGetUserStats();
  },
  async getUserById(userId: string) {
    return mockGetUserById(userId);
  },
  async createUser(userData: Record<string, unknown>) {
    return mockCreateUser(userData);
  },
  async updateUser(userId: string, updates: Record<string, unknown>) {
    return mockUpdateUser(userId, updates);
  },
  async deleteUser(userId: string) {
    return mockDeleteUser(userId);
  },
  async resetPassword(_userId: string, _newPassword: string) {
    await MOCK_DELAY();
    return { success: true, message: 'Password reset successfully' };
  },
  async assignAdminRole(_userId: string, role: string) {
    await MOCK_DELAY();
    return { success: true, message: `Role ${role} assigned successfully` };
  },
  async removeAdminRole(_userId: string, role: string) {
    await MOCK_DELAY();
    return { success: true, message: `Role ${role} removed successfully` };
  },
};

export const adminUserService = createAdminService(realImpl, mockImpl);
