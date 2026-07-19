import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

const AnalyticsDashboard = lazy(() => import('../../../components/admin/AnalyticsDashboard'));

export const analyticsModule: AdminModuleConfig = {
  id: 'analytics',
  label: 'Analytics',
  icon: 'BarChart3',
  basePath: 'analytics',
  permission: 'analytics.view',
  order: 50,
  routes: [
    { path: '', component: AnalyticsDashboard, index: true, permission: 'analytics.view' },
    { path: 'users', component: AnalyticsDashboard, permission: 'analytics.view' },
    { path: 'performance', component: AnalyticsDashboard, permission: 'analytics.view' },
  ],
  navChildren: [
    { id: 'overview', label: 'Overview', icon: 'BarChart3', path: 'analytics', permission: 'analytics.view' },
    { id: 'user-activity', label: 'User Activity', icon: 'Activity', path: 'analytics/users', permission: 'analytics.view' },
    { id: 'performance', label: 'Performance', icon: 'Monitor', path: 'analytics/performance', permission: 'analytics.view' },
  ],
};
