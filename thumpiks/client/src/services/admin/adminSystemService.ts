/**
 * Admin System Monitoring Service
 *
 * Environment-aware system health data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/system/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetSystemHealth,
  mockGetPerformanceMetrics,
  mockGetSystemAlerts,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const MOCK_DELAY = (ms = 400) => new Promise(r => setTimeout(r, ms));

const realImpl = {
  async getHealth() {
    return adminApi.get('/system/health');
  },
  async getPerformanceMetrics() {
    return adminApi.get('/system/performance');
  },
  async getAlerts(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/system/alerts', params);
  },
  async acknowledgeAlert(alertId: string) {
    return adminApi.post(`/system/alerts/${alertId}/acknowledge`);
  },
  async getErrorLogs(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/system/errors', params);
  },
  async cleanup() {
    return adminApi.post('/system/cleanup');
  },
};

const mockImpl = {
  async getHealth() {
    return mockGetSystemHealth();
  },
  async getPerformanceMetrics() {
    return mockGetPerformanceMetrics();
  },
  async getAlerts(_params?: Record<string, string | number | boolean | undefined>) {
    return mockGetSystemAlerts();
  },
  async acknowledgeAlert(_alertId: string) {
    await MOCK_DELAY(300);
    return { success: true, message: 'Alert acknowledged' };
  },
  async getErrorLogs(_params?: Record<string, string | number | boolean | undefined>) {
    await MOCK_DELAY();
    return {
      success: true,
      data: [
        { id: 'err_1', message: 'Image processing timeout', stack: 'Error: timeout at ImageService...', count: 3, lastOccurred: new Date().toISOString(), severity: 'high' },
        { id: 'err_2', message: 'Redis connection reset', stack: 'Error: ECONNRESET at RedisClient...', count: 1, lastOccurred: new Date().toISOString(), severity: 'medium' },
      ],
    };
  },
  async cleanup() {
    await MOCK_DELAY(1000);
    return { success: true, message: 'Cleanup completed. Removed 234 old records.' };
  },
};

export const adminSystemService = createAdminService(realImpl, mockImpl);
