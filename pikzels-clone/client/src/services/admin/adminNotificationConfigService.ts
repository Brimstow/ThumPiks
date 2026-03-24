/**
 * Admin Notification Config API Service
 *
 * API client for managing notification routing configuration.
 * Supports mock data in development mode (consistent with other admin services).
 */

import { adminApi, adminFetch, shouldUseMockData } from './adminApiClient';

export type NotificationChannel = 'admin_panel' | 'email';

export interface NotificationConfigRecord {
  id: string;
  key: string;
  channels: NotificationChannel[];
  emails: string[];
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertConfigPayload {
  key: string;
  channels: NotificationChannel[];
  emails: string[];
  enabled: boolean;
}

// ── Mock data store for development mode ────────────────────────
let mockConfigs: NotificationConfigRecord[] = [];
let mockIdCounter = 1;

function makeMockConfig(payload: UpsertConfigPayload): NotificationConfigRecord {
  const now = new Date().toISOString();
  return {
    id: `mock-nc-${mockIdCounter++}`,
    key: payload.key,
    channels: payload.channels,
    emails: payload.emails,
    enabled: payload.enabled,
    metadata: null,
    createdAt: now,
    updatedAt: now,
  };
}

class AdminNotificationConfigService {
  async listAll(): Promise<NotificationConfigRecord[]> {
    if (shouldUseMockData()) return [...mockConfigs];
    const result = await adminApi.get<{ configs: NotificationConfigRecord[] }>(
      '/notifications/config'
    );
    const raw = result as unknown as { configs?: NotificationConfigRecord[] };
    return raw.configs ?? [];
  }

  async getByKey(key: string): Promise<NotificationConfigRecord | null> {
    if (shouldUseMockData()) return mockConfigs.find(c => c.key === key) ?? null;
    const result = await adminApi.get<{ config: NotificationConfigRecord }>(
      `/notifications/config/${encodeURIComponent(key)}`
    );
    const raw = result as unknown as { config?: NotificationConfigRecord };
    return raw.config ?? null;
  }

  async upsert(payload: UpsertConfigPayload): Promise<NotificationConfigRecord> {
    if (shouldUseMockData()) {
      const idx = mockConfigs.findIndex(c => c.key === payload.key);
      if (idx >= 0) {
        mockConfigs[idx] = { ...mockConfigs[idx], ...payload, updatedAt: new Date().toISOString() };
        return mockConfigs[idx];
      }
      const created = makeMockConfig(payload);
      mockConfigs.push(created);
      return created;
    }
    const result = await adminFetch<{ config: NotificationConfigRecord }>(
      '/notifications/config',
      { method: 'PUT', body: payload as unknown as Record<string, unknown> }
    );
    const raw = result as unknown as { config?: NotificationConfigRecord };
    return raw.config!;
  }

  async toggleEnabled(key: string, enabled: boolean): Promise<NotificationConfigRecord> {
    if (shouldUseMockData()) {
      const cfg = mockConfigs.find(c => c.key === key);
      if (cfg) {
        cfg.enabled = enabled;
        cfg.updatedAt = new Date().toISOString();
        return cfg;
      }
      throw new Error('Config not found');
    }
    const result = await adminFetch<{ config: NotificationConfigRecord }>(
      `/notifications/config/${encodeURIComponent(key)}/toggle`,
      { method: 'PATCH', body: { enabled } as Record<string, unknown> }
    );
    const raw = result as unknown as { config?: NotificationConfigRecord };
    return raw.config!;
  }

  async deleteConfig(key: string): Promise<void> {
    if (shouldUseMockData()) {
      mockConfigs = mockConfigs.filter(c => c.key !== key);
      return;
    }
    await adminApi.delete(
      `/notifications/config/${encodeURIComponent(key)}`
    );
  }
}

export const adminNotificationConfigService = new AdminNotificationConfigService();
