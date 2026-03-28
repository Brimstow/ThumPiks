/**
 * Admin Sitemap Management Service
 *
 * Environment-aware sitemap data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/sitemap/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetSitemapStats,
  mockGetSitemapEntries,
  mockGenerateSitemap,
  mockExportSitemap,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const realImpl = {
  async getStats() {
    return adminApi.get('/sitemap/stats');
  },
  async getEntries(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/sitemap/entries', params);
  },
  async generate() {
    return adminApi.post('/sitemap/generate');
  },
  async exportSitemap() {
    return adminApi.get('/sitemap/export');
  },
};

const mockImpl = {
  async getStats() {
    return mockGetSitemapStats();
  },
  async getEntries(_params?: Record<string, string | number | boolean | undefined>) {
    return mockGetSitemapEntries();
  },
  async generate() {
    return mockGenerateSitemap();
  },
  async exportSitemap() {
    return mockExportSitemap();
  },
};

export const adminSitemapService = createAdminService(realImpl, mockImpl);
