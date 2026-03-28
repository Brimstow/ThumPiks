/**
 * useAdminNavItems Hook
 *
 * Converts admin module registry configs into the AdminNavItem[]
 * shape consumed by AdminLayout's NavItem component.
 * Filters items based on the current admin user's permissions.
 */

import { useMemo } from 'react';
import { getNavItems } from '../registry';
import type { AdminNavItem } from '../registry/types';

/**
 * Returns filtered navigation items based on admin permissions.
 *
 * @param permissions - Array of permission strings the admin user has
 * @returns AdminNavItem[] ready for rendering in AdminLayout
 */
export function useAdminNavItems(permissions: string[]): AdminNavItem[] {
  return useMemo(() => {
    const allItems = getNavItems();
    return filterNavItems(allItems, permissions);
  }, [permissions]);
}

/**
 * Recursively filters nav items based on permissions.
 * An item is visible if the user has its required permission
 * (or if it has no permission requirement).
 * Wildcard '*' grants access to everything.
 */
function filterNavItems(items: AdminNavItem[], permissions: string[]): AdminNavItem[] {
  return items
    .filter(item => {
      if (!item.permission) return true;
      return permissions.includes('*') || permissions.includes(item.permission);
    })
    .map(item => {
      if (!item.children) return item;
      return {
        ...item,
        children: filterNavItems(item.children, permissions),
      };
    });
}
