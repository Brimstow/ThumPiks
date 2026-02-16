/**
 * Admin Analytics Service
 * 
 * Environment-aware analytics data:
 * - Development: mock data
 * - Production: /api/admin/analytics/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetAnalyticsOverview,
  mockGetUserMetrics,
  mockGetContentMetrics,
  mockGetRevenueMetrics,
} from './adminMockData';

export const adminAnalyticsService = {
  async getOverview(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetAnalyticsOverview(params);
    return adminApi.get('/analytics/overview', params);
  },

  async getUserMetrics(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetUserMetrics(params);
    return adminApi.get('/analytics/users', params);
  },

  async getContentMetrics(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetContentMetrics();
    return adminApi.get('/analytics/content', params);
  },

  async getRevenueMetrics(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetRevenueMetrics();
    return adminApi.get('/analytics/revenue', params);
  },

  async getSystemMetrics(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 400));
      return { success: true, data: { requestsPerMinute: 145, errorRate: 0.8, avgResponseTime: 234 } };
    }
    return adminApi.get('/analytics/system', params);
  },

  async exportData(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) {
      await new Promise(r => setTimeout(r, 800));
      return { success: true, data: 'mock-csv-export-data', message: 'Export ready' };
    }
    return adminApi.get('/analytics/export', params);
  },
};
