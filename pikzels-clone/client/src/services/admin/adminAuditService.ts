/**
 * Admin Audit Logs Service
 * 
 * Environment-aware audit log data:
 * - Development: mock data
 * - Production: /api/admin/auth/activity-logs endpoint
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import { mockGetActivityLogs } from './adminMockData';

export const adminAuditService = {
  async getActivityLogs(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetActivityLogs(params);
    return adminApi.get('/auth/activity-logs', params);
  },
};
