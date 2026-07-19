import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

export const systemModule: AdminModuleConfig = {
  id: 'system',
  label: 'System',
  icon: 'Settings',
  basePath: 'system',
  permission: 'system.config',
  order: 60,
  routes: [
    {
      path: 'health',
      component: lazy(() => import('../../../components/admin/SystemHealthMonitoring')),
      permission: 'system.health',
    },
    {
      path: 'logs',
      component: lazy(() => import('../../../components/admin/AuditLogs')),
      permission: 'system.logs',
    },
    {
      path: 'settings',
      component: lazy(() => import('../../../components/admin/AdminSettings')),
      permission: 'system.config',
    },
  ],
  navChildren: [
    { id: 'health', label: 'Health Monitoring', icon: 'Monitor', path: 'system/health', permission: 'system.health' },
    { id: 'logs', label: 'Audit Logs', icon: 'FileText', path: 'system/logs', permission: 'system.logs' },
    { id: 'settings', label: 'Settings', icon: 'Settings', path: 'system/settings', permission: 'system.config' },
  ],
};
