/**
 * Notification Config Admin Routes
 *
 * Admin-only routes for managing notification routing configuration.
 * Protected by admin auth middleware.
 */

import { Router } from 'express';
import { authenticateAdmin, requireAdmin } from '../admin/admin-auth.middleware';
import {
  listConfigs,
  getConfig,
  upsertConfig,
  toggleConfig,
  deleteConfig,
} from './notification-config.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticateAdmin);
router.use(requireAdmin);

// GET    /api/admin/notifications/config          — List all
// GET    /api/admin/notifications/config/:key      — Get by key
// PUT    /api/admin/notifications/config           — Upsert
// PATCH  /api/admin/notifications/config/:key/toggle — Toggle enabled
// DELETE /api/admin/notifications/config/:key      — Delete

router.get('/config', listConfigs);
router.get('/config/:key', getConfig);
router.put('/config', upsertConfig);
router.patch('/config/:key/toggle', toggleConfig);
router.delete('/config/:key', deleteConfig);

export default router;
