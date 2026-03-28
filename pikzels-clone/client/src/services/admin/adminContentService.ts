/**
 * Admin Content Management Service
 *
 * Environment-aware content data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/content/* endpoints
 */

import { adminApi } from './adminApiClient';
import {
  mockGetContent,
  mockUpdateContentStatus,
  mockDeleteContent,
  mockToggleContentFeatured,
} from './adminMockData';
import { createAdminService } from './createAdminService';

const realImpl = {
  async getContent(params?: Record<string, string | number | boolean | undefined>) {
    return adminApi.get('/content', params);
  },
  async updateStatus(ids: string[], status: string) {
    return adminApi.post('/content/bulk-status', { ids, status });
  },
  async deleteContent(ids: string[]) {
    return adminApi.post('/content/bulk-delete', { ids });
  },
  async toggleFeatured(ids: string[]) {
    return adminApi.post('/content/bulk-feature', { ids });
  },
};

const mockImpl = {
  async getContent(params?: Record<string, string | number | boolean | undefined>) {
    return mockGetContent(params);
  },
  async updateStatus(ids: string[], status: string) {
    return mockUpdateContentStatus(ids, status);
  },
  async deleteContent(ids: string[]) {
    return mockDeleteContent(ids);
  },
  async toggleFeatured(ids: string[]) {
    return mockToggleContentFeatured(ids);
  },
};

export const adminContentService = createAdminService(realImpl, mockImpl);
