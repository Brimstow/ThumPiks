/**
 * Admin System Monitoring Service
 * 
 * Environment-aware system health data:
 * - Development: mock data
 * - Production: /api/admin/system/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetSystemHealth,
  mockGetPerformanceMetrics,
  mockGetSystemAlerts,
} from './adminMockData';

export const adminSystemService = {
  async getHealth() {
    if (shouldUseMockData()) return mockGetSystemHealth();
    return adminApi.get('/system/health');
  },

  async getPerformanceMetrics() {
    if (shouldUseMockData()) return mockGetPerformanceMetrics();
    return adminApi.get('/system/performance');
  },

  async getAlerts(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetSystemAlerts();
    return adminApi.get('/system/alerts', params);
  },

  async acknowledgeAlert(alertId: string) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 300));
      return { success: true, message: 'Alert acknowledged' };
    }
    return adminApi.post(`/system/alerts/${alertId}/acknowledge`);
  },

  async getErrorLogs(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 400));
      return {
        success: true,
        data: [
          { id: 'err_1', message: 'Image processing timeout', stack: 'Error: timeout at ImageService...', count: 3, lastOccurred: new Date().toISOString(), severity: 'high' },
          { id: 'err_2', message: 'Redis connection reset', stack: 'Error: ECONNRESET at RedisClient...', count: 1, lastOccurred: new Date().toISOString(), severity: 'medium' },
        ],
      };
    }
    return adminApi.get('/system/errors', params);
  },

  async cleanup() {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 1000));
      return { success: true, message: 'Cleanup completed. Removed 234 old records.' };
    }
    return adminApi.post('/system/cleanup');
  },
};
