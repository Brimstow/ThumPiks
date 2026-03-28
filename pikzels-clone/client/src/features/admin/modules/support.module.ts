import { lazy } from 'react';
import type { AdminModuleConfig } from '../registry/types';

export const supportModule: AdminModuleConfig = {
  id: 'support',
  label: 'Support',
  icon: 'MessageSquare',
  basePath: 'support',
  permission: 'support.view',
  order: 40,
  routes: [
    {
      path: '',
      component: lazy(() => import('../../../components/admin/FeedbackManagement')),
      index: true,
      permission: 'support.view',
    },
    {
      path: 'notifications',
      component: lazy(() => import('../../../components/admin/NotificationConfigAdmin')),
      permission: 'support.view',
    },
  ],
  navChildren: [
    { id: 'feedback-tickets', label: 'Feedback & Tickets', icon: 'MessageSquare', path: 'support', permission: 'support.view' },
    { id: 'notifications', label: 'Notification Routing', icon: 'Bell', path: 'support/notifications', permission: 'support.view' },
  ],
};
