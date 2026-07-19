/**
 * Admin Settings Service
 *
 * Environment-aware settings data via proxy factory:
 * - Development: mock data
 * - Production: /api/admin/settings/* endpoints
 */

import { adminApi } from './adminApiClient';
import { mockGetSettings, mockSaveSettings } from './adminMockData';
import { createAdminService } from './createAdminService';

const realImpl = {
  async getSettings() {
    return adminApi.get('/settings');
  },
  async saveSettings(changes: Record<string, unknown>) {
    return adminApi.put('/settings', changes);
  },
};

const mockImpl = {
  async getSettings() {
    return mockGetSettings();
  },
  async saveSettings(changes: Record<string, unknown>) {
    return mockSaveSettings(changes);
  },
};

export const adminSettingsService = createAdminService(realImpl, mockImpl);
