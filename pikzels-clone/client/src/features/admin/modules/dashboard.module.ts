import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

export const dashboardModule: AdminModuleConfig = {
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'Home',
  basePath: '',
  order: 0,
  routes: [
    {
      path: '',
      component: lazy(() => import('../../../components/admin/AdminDashboard')),
      index: true,
    },
  ],
};
