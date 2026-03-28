/**
 * Admin Feature - Public API
 *
 * Barrel export for the config-driven admin module system.
 */

// Registry
export { adminModules, getModuleById, getNavItems } from './registry';
export type { AdminModuleConfig, AdminRouteConfig, AdminNavChild, AdminNavItem } from './registry';

// Route generation
export { renderAdminRoutes } from './routes/renderAdminRoutes';

// Navigation hook
export { useAdminNavItems } from './hooks/useAdminNavItems';

// Icon resolver (for extending with new icons)
export { resolveIcon } from './registry/icon-resolver';
