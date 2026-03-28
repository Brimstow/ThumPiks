/**
 * Admin Module Registry - Type Definitions
 *
 * Core contracts for the config-driven admin module system.
 * All admin modules, routes, and navigation items are described
 * by these types.
 */

import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * A single route within an admin module.
 */
export interface AdminRouteConfig {
  /** Relative sub-path ('' for module index route) */
  path: string;
  /** Lazy-loaded page component */
  component: LazyExoticComponent<ComponentType<any>>;
  /** Permission required to access this route (omit for unrestricted) */
  permission?: string;
  /** True for index routes (renders at parent path without adding a sub-path) */
  index?: boolean;
}

/**
 * A sub-navigation item within a module's collapsible nav group.
 */
export interface AdminNavChild {
  /** Unique child identifier */
  id: string;
  /** Display label */
  label: string;
  /** Lucide icon name string (e.g., 'Shield') - resolved at render time */
  icon: string;
  /** Path relative to /admin (e.g., 'users/roles') */
  path: string;
  /** Permission required to see this nav item */
  permission?: string;
}

/**
 * Configuration for a single admin module (feature area).
 * Each module declares its routes, navigation, and permissions.
 */
export interface AdminModuleConfig {
  /** Unique module identifier (e.g., 'users', 'analytics') */
  id: string;
  /** Human-readable label for navigation */
  label: string;
  /** Lucide icon name string (e.g., 'Users') - resolved at render time */
  icon: string;
  /** Base path relative to /admin (e.g., 'users') */
  basePath: string;
  /** Top-level permission gate for the entire module (omit for always-visible) */
  permission?: string;
  /** Sort order for navigation (lower = higher in sidebar) */
  order: number;
  /** Route definitions within this module */
  routes: AdminRouteConfig[];
  /** Optional sub-navigation items (for collapsible nav groups) */
  navChildren?: AdminNavChild[];
}

/**
 * Shape of a resolved navigation item consumed by AdminLayout's NavItem component.
 * This matches the existing AdminNavItem interface in AdminLayout.tsx.
 */
export interface AdminNavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  permission?: string;
  children?: AdminNavItem[];
}
