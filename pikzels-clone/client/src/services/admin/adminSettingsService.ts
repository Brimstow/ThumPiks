/**
 * Admin Settings Service
 *
 * Environment-aware settings data:
 * - Development: mock data
 * - Production: /api/admin/settings/* endpoints
 */

import { adminApi, shouldUseMockData } from './adminApiClient';
import { mockGetSettings, mockSaveSettings } from './adminMockData';

export const adminSettingsService = {
  async getSettings() {
    if (shouldUseMockData()) return mockGetSettings();
    return adminApi.get('/settings');
  },

  async saveSettings(changes: Record<string, unknown>) {
    if (shouldUseMockData()) return mockSaveSettings(changes);
    return adminApi.put('/settings', changes);
  },
};
