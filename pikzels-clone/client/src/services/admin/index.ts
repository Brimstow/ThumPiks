/**
 * Admin Services - Barrel Export
 * 
 * Single import point for all admin service layer functionality.
 */

export { adminApi, adminFetch, shouldUseMockData } from './adminApiClient';
export type { AdminApiResponse, AdminRequestOptions } from './adminApiClient';
export {
  getAdminToken,
  setAdminToken,
  getAdminUser,
  setAdminUser,
  clearAdminAuth,
  isAdminAuthenticated,
} from './adminApiClient';

export { adminAuthService } from './adminAuthService';
export { adminUserService } from './adminUserService';
export { adminAnalyticsService } from './adminAnalyticsService';
export { adminSystemService } from './adminSystemService';
export { adminAuditService } from './adminAuditService';
export { adminContentService } from './adminContentService';
export { adminRoleService } from './adminRoleService';
export { adminSettingsService } from './adminSettingsService';
export { adminSitemapService } from './adminSitemapService';
