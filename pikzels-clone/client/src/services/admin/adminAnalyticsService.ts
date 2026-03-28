/**
 * Admin Analytics Service
 *
 * Environment-aware analytics data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/analytics/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetAnalyticsOverview,
  mockGetUserMetrics,
  mockGetContentMetrics,
  mockGetRevenueMetrics,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const MOCK_DELAY = (ms = 400) => new Promise(r => setTimeout(r, ms));

const realImpl = {
  async getOverview(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/overview', params);
  },
  async getUserMetrics(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/users', params);
  },
  async getContentMetrics(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/content', params);
  },
  async getRevenueMetrics(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/revenue', params);
  },
  async getSystemMetrics(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/system', params);
  },
  async exportData(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/analytics/export', params);
  },
};

const mockImpl = {
  async getOverview(params?: Record<string, string | number | boolean | undefined>) {
    return mockGetAnalyticsOverview(params);
  },
  async getUserMetrics(params?: Record<string, string | number | boolean | undefined>) {
    return mockGetUserMetrics(params);
  },
  async getContentMetrics(_params?: Record<string, string | number | boolean | undefined>) {
    return mockGetContentMetrics();
  },
  async getRevenueMetrics(_params?: Record<string, string | number | boolean | undefined>) {
    return mockGetRevenueMetrics();
  },
  async getSystemMetrics(_params?: Record<string, string | number | boolean | undefined>) {
    await MOCK_DELAY();
    return { success: true, data: { requestsPerMinute: 145, errorRate: 0.8, avgResponseTime: 234 } };
  },
  async exportData(_params?: Record<string, string | number | boolean | undefined>) {
    await MOCK_DELAY(800);
    return { success: true, data: 'mock-csv-export-data', message: 'Export ready' };
  },
};

export const adminAnalyticsService = createAdminService(realImpl, mockImpl);
