import { Router } from 'express';
import {
  adminAuthController,
  adminLoginValidation,
  assignRoleValidation,
  removeRoleValidation,
  adminLoginRateLimit
} from './admin-auth.controller';
import {
  authenticateAdmin,
  requireSuperAdmin,
  requirePermission,
  adminRateLimit
} from './admin-auth.middleware';
import { ADMIN_PERMISSIONS } from './admin-auth.service';

const router = Router();

/**
 * Admin Authentication Routes
 */

// Admin login (public)
router.post(
  '/login',
  adminLoginRateLimit,
  adminLoginValidation,
  adminAuthController.login
);

// Admin logout (protected)
router.post(
  '/logout',
  authenticateAdmin,
  adminAuthController.logout
);

// Get current admin info (protected)
router.get(
  '/me',
  authenticateAdmin,
  adminAuthController.getCurrentAdmin
);

/**
 * Admin Role Management Routes
 * Only super admins can manage roles
 */

// Assign admin role
router.post(
  '/roles/assign',
  authenticateAdmin,
  requireSuperAdmin,
  adminRateLimit(20, 15 * 60 * 1000), // 20 requests per 15 minutes
  assignRoleValidation,
  adminAuthController.assignRole
);

// Remove admin role
router.post(
  '/roles/remove',
  authenticateAdmin,
  requireSuperAdmin,
  adminRateLimit(20, 15 * 60 * 1000),
  removeRoleValidation,
  adminAuthController.removeRole
);

/**
 * Admin Activity Monitoring Routes
 */

// Get admin activity logs
router.get(
  '/activity-logs',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_LOGS),
  adminRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  adminAuthController.getActivityLogs
);

/**
 * Health check for admin auth system
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'admin-auth',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;