/**
 * Admin Module Registry
 *
 * Central collector for all admin module configurations.
 * Imports module configs, sorts by order, and provides
 * computed accessors for routes and navigation items.
 */

import type { AdminModuleConfig, AdminNavItem } from './types';
import { resolveIcon } from './icon-resolver';

// ── Import all module configs ──────────────────────────────────
import { dashboardModule } from '../modules/dashboard.module';
import { usersModule } from '../modules/users.module';
import { contentModule } from '../modules/content.module';
import { sitemapModule } from '../modules/sitemap.module';
import { supportModule } from '../modules/support.module';
import { analyticsModule } from '../modules/analytics.module';
import { systemModule } from '../modules/system.module';

// ── Registry ───────────────────────────────────────────────────

/** All admin modules sorted by display order */
export const adminModules: AdminModuleConfig[] = [
  dashboardModule,
  usersModule,
  contentModule,
  sitemapModule,
  supportModule,
  analyticsModule,
  systemModule,
].sort((a, b) => a.order - b.order);

/**
 * Look up a module by its id.
 */
export function getModuleById(id: string): AdminModuleConfig | undefined {
  return adminModules.find(m => m.id === id);
}

/**
 * Build the navigation item tree from registered modules.
 * Resolves icon name strings to React elements.
 */
export function getNavItems(): AdminNavItem[] {
  return adminModules.map(mod => {
    const item: AdminNavItem = {
      id: mod.id,
      label: mod.label,
      icon: resolveIcon(mod.icon, 20),
      path: mod.basePath ? `/admin/${mod.basePath}` : '/admin',
      permission: mod.permission,
    };

    if (mod.navChildren && mod.navChildren.length > 0) {
      item.children = mod.navChildren.map(child => ({
        id: child.id,
        label: child.label,
        icon: resolveIcon(child.icon, 16),
        path: `/admin/${child.path}`,
        permission: child.permission,
      }));
    }

    return item;
  });
}

// Re-export types for convenience
export type { AdminModuleConfig, AdminRouteConfig, AdminNavChild, AdminNavItem } from './types';
