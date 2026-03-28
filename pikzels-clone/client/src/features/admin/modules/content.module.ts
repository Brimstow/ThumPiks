import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

const ContentManagement = lazy(() => import('../../../components/admin/ContentManagement'));

export const contentModule: AdminModuleConfig = {
  id: 'content',
  label: 'Content Management',
  icon: 'Image',
  basePath: 'content',
  permission: 'content.view',
  order: 20,
  routes: [
    { path: '', component: ContentManagement, index: true, permission: 'content.view' },
    { path: 'thumbnails', component: ContentManagement, permission: 'content.view' },
    { path: 'templates', component: ContentManagement, permission: 'content.view' },
    { path: 'projects', component: ContentManagement, permission: 'content.view' },
  ],
  navChildren: [
    { id: 'thumbnails', label: 'Thumbnails', icon: 'Image', path: 'content/thumbnails', permission: 'content.view' },
    { id: 'templates', label: 'Templates', icon: 'Layout', path: 'content/templates', permission: 'content.view' },
    { id: 'projects', label: 'Projects', icon: 'FileText', path: 'content/projects', permission: 'content.view' },
  ],
};
