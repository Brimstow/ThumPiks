/**
 * Admin Sitemap Management Service
 *
 * Environment-aware sitemap data:
 * - Development: mock data
 * - Production: /api/admin/sitemap/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetSitemapStats,
  mockGetSitemapEntries,
  mockGenerateSitemap,
  mockExportSitemap,
} from './adminMockData';

export const adminSitemapService = {
  async getStats() {
    if (shouldUseMockData()) return mockGetSitemapStats();
    return adminApi.get('/sitemap/stats');
  },

  async getEntries(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetSitemapEntries();
    return adminApi.get('/sitemap/entries', params);
  },

  async generate() {
    if (shouldUseMockData()) return mockGenerateSitemap();
    return adminApi.post('/sitemap/generate');
  },

  async exportSitemap() {
    if (shouldUseMockData()) return mockExportSitemap();
    return adminApi.get('/sitemap/export');
  },
};
