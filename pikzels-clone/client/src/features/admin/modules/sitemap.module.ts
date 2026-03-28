import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

export const sitemapModule: AdminModuleConfig = {
  id: 'sitemap',
  label: 'Sitemap Management',
  icon: 'Globe',
  basePath: 'sitemap',
  permission: 'content.view',
  order: 30,
  routes: [
    {
      path: '',
      component: lazy(() => import('../../../components/admin/SitemapAdmin')),
      index: true,
      permission: 'content.view',
    },
  ],
};
