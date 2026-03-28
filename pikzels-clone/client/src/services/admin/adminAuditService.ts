/**
 * Admin Audit Logs Service
 *
 * Environment-aware audit log data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/auth/activity-logs endpoint
 */

import { adminApi } from './adminApiClient';
import { mockGetActivityLogs } from './adminMockData';
import { createAdminService } from './createAdminService';

const realImpl = {
  async getActivityLogs(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/auth/activity-logs', params);
  },
};

const mockImpl = {
  async getActivityLogs(params?: Record<string, string | number | boolean | undefined>) {
    return mockGetActivityLogs(params);
  },
};

export const adminAuditService = createAdminService(realImpl, mockImpl);
