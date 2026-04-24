/**
 * Tests for frontend admin services using proxy factory
 *
 * Verifies that each service:
 * - Delegates to mock implementation in dev mode
 * - Delegates to real adminApi in production mode
 * - Passes parameters correctly
 */

// Control mock mode
let mockShouldUseMock = true;

jest.mock('../../../config/environment', () => ({
  API_BASE_URL: 'http://localhost:8550',
  IS_DEVELOPMENT: true,
}));

const mockAdminApi = {
  get: jest.fn().mockResolvedValue({ success: true, data: {} }),
  post: jest.fn().mockResolvedValue({ success: true, data: {} }),
  put: jest.fn().mockResolvedValue({ success: true, data: {} }),
  delete: jest.fn().mockResolvedValue({ success: true, data: {} }),
};

jest.mock('../adminApiClient', () => ({
  shouldUseMockData: jest.fn(() => mockShouldUseMock),
  adminApi: mockAdminApi,
  adminFetch: jest.fn().mockResolvedValue({ success: true, data: {} }),
  getAdminToken: jest.fn(),
  setAdminToken: jest.fn(),
  getAdminUser: jest.fn(),
  setAdminUser: jest.fn(),
  clearAdminAuth: jest.fn(),
  isAdminAuthenticated: jest.fn(),
}));

// Mock all adminMockData functions
jest.mock('../adminMockData', () => ({
  mockGetUsers: jest.fn().mockResolvedValue({ success: true, data: { users: [{ id: 'mock-u1' }] } }),
  mockGetUserStats: jest.fn().mockResolvedValue({ success: true, data: { total: 100 } }),
  mockGetUserById: jest.fn().mockResolvedValue({ success: true, data: { id: 'mock-u1' } }),
  mockUpdateUser: jest.fn().mockResolvedValue({ success: true }),
  mockDeleteUser: jest.fn().mockResolvedValue({ success: true }),
  mockCreateUser: jest.fn().mockResolvedValue({ success: true, data: { id: 'new-1' } }),
  mockGetAnalyticsOverview: jest.fn().mockResolvedValue({ success: true, data: { totalUsers: 500 } }),
  mockGetUserMetrics: jest.fn().mockResolvedValue({ success: true, data: { newUsers: 42 } }),
  mockGetContentMetrics: jest.fn().mockResolvedValue({ success: true, data: { totalContent: 200 } }),
  mockGetRevenueMetrics: jest.fn().mockResolvedValue({ success: true, data: { totalRevenue: 5000 } }),
  mockGetSystemHealth: jest.fn().mockResolvedValue({ success: true, data: { overall: 'healthy' } }),
  mockGetPerformanceMetrics: jest.fn().mockResolvedValue({ success: true, data: { cpu: 45 } }),
  mockGetSystemAlerts: jest.fn().mockResolvedValue({ success: true, data: [] }),
  mockGetActivityLogs: jest.fn().mockResolvedValue({ success: true, data: [] }),
  mockGetContent: jest.fn().mockResolvedValue({ success: true, data: [] }),
  mockUpdateContentStatus: jest.fn().mockResolvedValue({ success: true }),
  mockDeleteContent: jest.fn().mockResolvedValue({ success: true }),
  mockToggleContentFeatured: jest.fn().mockResolvedValue({ success: true }),
  mockGetRoles: jest.fn().mockResolvedValue({ success: true, data: [] }),
  mockCreateRole: jest.fn().mockResolvedValue({ success: true }),
  mockUpdateRole: jest.fn().mockResolvedValue({ success: true }),
  mockDeleteRole: jest.fn().mockResolvedValue({ success: true }),
  mockGetSettings: jest.fn().mockResolvedValue({ success: true, data: {} }),
  mockSaveSettings: jest.fn().mockResolvedValue({ success: true }),
  mockGetSitemapStats: jest.fn().mockResolvedValue({ success: true, data: {} }),
  mockGetSitemapEntries: jest.fn().mockResolvedValue({ success: true, data: [] }),
  mockGenerateSitemap: jest.fn().mockResolvedValue({ success: true }),
  mockExportSitemap: jest.fn().mockResolvedValue({ success: true, data: '<xml />' }),
  mockAdminLogin: jest.fn().mockResolvedValue({ success: true, data: { token: 't', user: {} } }),
  mockAdminMe: jest.fn().mockResolvedValue({ success: true, data: {} }),
}));

import { adminUserService } from '../adminUserService';
import { adminAnalyticsService } from '../adminAnalyticsService';
import { adminSystemService } from '../adminSystemService';
import { adminAuditService } from '../adminAuditService';
import { adminContentService } from '../adminContentService';
import { adminRoleService } from '../adminRoleService';
import { adminSettingsService } from '../adminSettingsService';
import { adminSitemapService } from '../adminSitemapService';
import {
  mockGetUsers,
  mockGetUserStats,
  mockGetAnalyticsOverview,
  mockGetSystemHealth,
  mockGetActivityLogs,
  mockGetContent,
  mockGetRoles,
  mockGetSettings,
  mockGetSitemapStats,
} from '../adminMockData';

describe('Admin Services (proxy factory delegation)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShouldUseMock = true;
  });

  // ═════════════════════════════════════════════════════════════
  // adminUserService
  // ═════════════════════════════════════════════════════════════
  describe('adminUserService', () => {
    describe('mock mode', () => {
      it('getUsers delegates to mockGetUsers', async () => {
        const result = await adminUserService.getUsers({ page: '1' });
        expect(mockGetUsers).toHaveBeenCalledWith({ page: '1' });
        expect(result.success).toBe(true);
      });

      it('getUserStats delegates to mockGetUserStats', async () => {
        const result = await adminUserService.getUserStats();
        expect(mockGetUserStats).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getUsers calls adminApi.get with /users', async () => {
        await adminUserService.getUsers({ page: '1' });
        expect(mockAdminApi.get).toHaveBeenCalledWith('/users', { page: '1' });
      });

      it('getUserStats calls adminApi.get with /users/stats', async () => {
        await adminUserService.getUserStats();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/users/stats');
      });

      it('getUserById calls correct endpoint', async () => {
        await adminUserService.getUserById('user-123');
        expect(mockAdminApi.get).toHaveBeenCalledWith('/users/user-123');
      });

      it('createUser sends POST with user data', async () => {
        const userData = { email: 'new@test.com', name: 'New User' };
        await adminUserService.createUser(userData);
        expect(mockAdminApi.post).toHaveBeenCalledWith('/users', userData);
      });

      it('updateUser sends PUT to correct endpoint', async () => {
        await adminUserService.updateUser('user-123', { name: 'Updated' });
        expect(mockAdminApi.put).toHaveBeenCalledWith('/users/user-123', { name: 'Updated' });
      });

      it('deleteUser sends DELETE to correct endpoint', async () => {
        await adminUserService.deleteUser('user-123');
        expect(mockAdminApi.delete).toHaveBeenCalledWith('/users/user-123');
      });

      it('resetPassword sends POST to correct endpoint', async () => {
        await adminUserService.resetPassword('user-123', 'newPass123');
        expect(mockAdminApi.post).toHaveBeenCalledWith('/users/user-123/reset-password', { newPassword: 'newPass123' });
      });

      it('assignAdminRole sends POST to correct endpoint', async () => {
        await adminUserService.assignAdminRole('user-123', 'admin');
        expect(mockAdminApi.post).toHaveBeenCalledWith('/users/user-123/admin-roles', { role: 'admin' });
      });

      it('removeAdminRole sends DELETE to correct endpoint', async () => {
        await adminUserService.removeAdminRole('user-123', 'moderator');
        expect(mockAdminApi.delete).toHaveBeenCalledWith('/users/user-123/admin-roles', { role: 'moderator' });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminAnalyticsService
  // ═════════════════════════════════════════════════════════════
  describe('adminAnalyticsService', () => {
    describe('mock mode', () => {
      it('getOverview delegates to mock', async () => {
        const result = await adminAnalyticsService.getOverview();
        expect(mockGetAnalyticsOverview).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getOverview calls /analytics/overview', async () => {
        await adminAnalyticsService.getOverview({ period: '30d' });
        expect(mockAdminApi.get).toHaveBeenCalledWith('/analytics/overview', { period: '30d' });
      });

      it('getUserMetrics calls /analytics/users', async () => {
        await adminAnalyticsService.getUserMetrics();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/analytics/users', undefined);
      });

      it('getContentMetrics calls /analytics/content', async () => {
        await adminAnalyticsService.getContentMetrics();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/analytics/content', undefined);
      });

      it('getRevenueMetrics calls /analytics/revenue', async () => {
        await adminAnalyticsService.getRevenueMetrics();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/analytics/revenue', undefined);
      });

      it('exportData calls /analytics/export', async () => {
        await adminAnalyticsService.exportData({ format: 'csv' });
        expect(mockAdminApi.get).toHaveBeenCalledWith('/analytics/export', { format: 'csv' });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminSystemService
  // ═════════════════════════════════════════════════════════════
  describe('adminSystemService', () => {
    describe('mock mode', () => {
      it('getHealth delegates to mock', async () => {
        const result = await adminSystemService.getHealth();
        expect(mockGetSystemHealth).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getHealth calls /system/health', async () => {
        await adminSystemService.getHealth();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/system/health');
      });

      it('getPerformanceMetrics calls /system/performance', async () => {
        await adminSystemService.getPerformanceMetrics();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/system/performance');
      });

      it('acknowledgeAlert sends POST', async () => {
        await adminSystemService.acknowledgeAlert('alert-1');
        expect(mockAdminApi.post).toHaveBeenCalledWith('/system/alerts/alert-1/acknowledge');
      });

      it('cleanup sends POST', async () => {
        await adminSystemService.cleanup();
        expect(mockAdminApi.post).toHaveBeenCalledWith('/system/cleanup');
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminAuditService
  // ═════════════════════════════════════════════════════════════
  describe('adminAuditService', () => {
    describe('mock mode', () => {
      it('getActivityLogs delegates to mock', async () => {
        const result = await adminAuditService.getActivityLogs();
        expect(mockGetActivityLogs).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getActivityLogs calls /auth/activity-logs', async () => {
        await adminAuditService.getActivityLogs({ limit: 50 });
        expect(mockAdminApi.get).toHaveBeenCalledWith('/auth/activity-logs', { limit: 50 });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminContentService
  // ═════════════════════════════════════════════════════════════
  describe('adminContentService', () => {
    describe('mock mode', () => {
      it('getContent delegates to mock', async () => {
        const result = await adminContentService.getContent();
        expect(mockGetContent).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getContent calls /content', async () => {
        await adminContentService.getContent({ page: '1' });
        expect(mockAdminApi.get).toHaveBeenCalledWith('/content', { page: '1' });
      });

      it('updateStatus sends bulk status update', async () => {
        await adminContentService.updateStatus(['id1', 'id2'], 'approved');
        expect(mockAdminApi.post).toHaveBeenCalledWith('/content/bulk-status', {
          ids: ['id1', 'id2'],
          status: 'approved',
        });
      });

      it('deleteContent sends bulk delete', async () => {
        await adminContentService.deleteContent(['id1']);
        expect(mockAdminApi.post).toHaveBeenCalledWith('/content/bulk-delete', { ids: ['id1'] });
      });

      it('toggleFeatured sends bulk feature toggle', async () => {
        await adminContentService.toggleFeatured(['id1', 'id2']);
        expect(mockAdminApi.post).toHaveBeenCalledWith('/content/bulk-feature', {
          ids: ['id1', 'id2'],
        });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminRoleService
  // ═════════════════════════════════════════════════════════════
  describe('adminRoleService', () => {
    describe('mock mode', () => {
      it('getRoles delegates to mock', async () => {
        const result = await adminRoleService.getRoles();
        expect(mockGetRoles).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getRoles calls /auth/roles', async () => {
        await adminRoleService.getRoles();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/auth/roles');
      });

      it('createRole sends POST to /auth/roles', async () => {
        await adminRoleService.createRole({ name: 'editor', permissions: [] });
        expect(mockAdminApi.post).toHaveBeenCalledWith('/auth/roles', {
          name: 'editor',
          permissions: [],
        });
      });

      it('assignRole sends POST to /auth/assign-role', async () => {
        await adminRoleService.assignRole('user-1', 'admin');
        expect(mockAdminApi.post).toHaveBeenCalledWith('/auth/assign-role', {
          userId: 'user-1',
          role: 'admin',
        });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminSettingsService
  // ═════════════════════════════════════════════════════════════
  describe('adminSettingsService', () => {
    describe('mock mode', () => {
      it('getSettings delegates to mock', async () => {
        const result = await adminSettingsService.getSettings();
        expect(mockGetSettings).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getSettings calls /settings', async () => {
        await adminSettingsService.getSettings();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/settings');
      });

      it('saveSettings sends PUT to /settings', async () => {
        await adminSettingsService.saveSettings({ siteName: 'Pikzels' });
        expect(mockAdminApi.put).toHaveBeenCalledWith('/settings', { siteName: 'Pikzels' });
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // adminSitemapService
  // ═════════════════════════════════════════════════════════════
  describe('adminSitemapService', () => {
    describe('mock mode', () => {
      it('getStats delegates to mock', async () => {
        const result = await adminSitemapService.getStats();
        expect(mockGetSitemapStats).toHaveBeenCalled();
        expect(result.success).toBe(true);
      });
    });

    describe('real mode', () => {
      beforeEach(() => { mockShouldUseMock = false; });

      it('getStats calls /sitemap/stats', async () => {
        await adminSitemapService.getStats();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/sitemap/stats');
      });

      it('generate sends POST to /sitemap/generate', async () => {
        await adminSitemapService.generate();
        expect(mockAdminApi.post).toHaveBeenCalledWith('/sitemap/generate');
      });

      it('exportSitemap calls /sitemap/export', async () => {
        await adminSitemapService.exportSitemap();
        expect(mockAdminApi.get).toHaveBeenCalledWith('/sitemap/export');
      });
    });
  });
});
