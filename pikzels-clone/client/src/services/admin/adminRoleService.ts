/**
 * Admin Role & Permission Management Service
 *
 * Environment-aware role/permission data:
 * - Development: mock data
 * - Production: /api/admin/auth/* endpoints (role assignment/removal)
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetRoles,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
} from './adminMockData';

export const adminRoleService = {
  async getRoles() {
    if (shouldUseMockData()) return mockGetRoles();
    return adminApi.get('/auth/roles');
  },

  async createRole(role: Record<string, unknown>) {
    if (shouldUseMockData()) return mockCreateRole(role);
    return adminApi.post('/auth/roles', role);
  },

  async updateRole(roleId: string, data: Record<string, unknown>) {
    if (shouldUseMockData()) return mockUpdateRole(roleId, data);
    return adminApi.put(`/auth/roles/${roleId}`, data);
  },

  async deleteRole(roleId: string) {
    if (shouldUseMockData()) return mockDeleteRole(roleId);
    return adminApi.delete(`/auth/roles/${roleId}`);
  },

  async assignRole(userId: string, role: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 300));
      return { success: true, message: `Role ${role} assigned to user ${userId}` };
    }
    return adminApi.post('/auth/assign-role', { userId, role });
  },

  async removeRole(userId: string, role: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 300));
      return { success: true, message: `Role ${role} removed from user ${userId}` };
    }
    return adminApi.post('/auth/remove-role', { userId, role });
  },
};
