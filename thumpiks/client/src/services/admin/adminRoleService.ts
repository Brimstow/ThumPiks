/**
 * Admin Role & Permission Management Service
 *
 * Environment-aware role/permission data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/auth/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetRoles,
  mockCreateRole,
  mockUpdateRole,
  mockDeleteRole,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const MOCK_DELAY = (ms = 300) => new Promise(r => setTimeout(r, ms));

const realImpl = {
  async getRoles() {
    return adminApi.get('/auth/roles');
  },
  async createRole(role: Record<string, unknown>) {
    return adminApi.post('/auth/roles', role);
  },
  async updateRole(roleId: string, data: Record<string, unknown>) {
    return adminApi.put(`/auth/roles/${roleId}`, data);
  },
  async deleteRole(roleId: string) {
    return adminApi.delete(`/auth/roles/${roleId}`);
  },
  async assignRole(userId: string, role: string) {
    return adminApi.post('/auth/assign-role', { userId, role });
  },
  async removeRole(userId: string, role: string) {
    return adminApi.post('/auth/remove-role', { userId, role });
  },
};

const mockImpl = {
  async getRoles() {
    return mockGetRoles();
  },
  async createRole(role: Record<string, unknown>) {
    return mockCreateRole(role);
  },
  async updateRole(roleId: string, data: Record<string, unknown>) {
    return mockUpdateRole(roleId, data);
  },
  async deleteRole(roleId: string) {
    return mockDeleteRole(roleId);
  },
  async assignRole(userId: string, role: string) {
    await MOCK_DELAY();
    return { success: true, message: `Role ${role} assigned to user ${userId}` };
  },
  async removeRole(userId: string, role: string) {
    await MOCK_DELAY();
    return { success: true, message: `Role ${role} removed from user ${userId}` };
  },
};

export const adminRoleService = createAdminService(realImpl, mockImpl);
