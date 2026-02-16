/**
 * Admin Content Management Service
 *
 * Environment-aware content data:
 * - Development: mock data
 * - Production: /api/admin/content/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import {
  mockGetContent,
  mockUpdateContentStatus,
  mockDeleteContent,
  mockToggleContentFeatured,
} from './adminMockData';

export const adminContentService = {
  async getContent(params?: Record<string, string | number | boolean | undefined>) {
    if (shouldUseMockData()) return mockGetContent(params);
    return adminApi.get('/content', params);
  },

  async updateStatus(ids: string[], status: string) {
    if (shouldUseMockData()) return mockUpdateContentStatus(ids, status);
    return adminApi.post('/content/bulk-status', { ids, status });
  },

  async deleteContent(ids: string[]) {
    if (shouldUseMockData()) return mockDeleteContent(ids);
    return adminApi.post('/content/bulk-delete', { ids });
  },

  async toggleFeatured(ids: string[]) {
    if (shouldUseMockData()) return mockToggleContentFeatured(ids);
    return adminApi.post('/content/bulk-feature', { ids });
  },
};
