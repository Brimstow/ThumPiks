import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

export const usersModule: AdminModuleConfig = {
  id: 'users',
  label: 'User Management',
  icon: 'Users',
  basePath: 'users',
  permission: 'users.view',
  order: 10,
  routes: [
    {
      path: '',
      component: lazy(() => import('../../../components/admin/UserManagement')),
      index: true,
      permission: 'users.view',
    },
    {
      path: 'roles',
      component: lazy(() => import('../../../components/admin/RolePermissionManagement')),
      permission: 'admin.roles',
    },
  ],
  navChildren: [
    { id: 'users-list', label: 'All Users', icon: 'Users', path: 'users', permission: 'users.view' },
    { id: 'users-roles', label: 'Roles & Permissions', icon: 'Shield', path: 'users/roles', permission: 'admin.roles' },
  ],
};
