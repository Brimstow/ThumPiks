import { Router } from 'express';
import {
  userManagementController,
  getUsersValidation,
  getUserByIdValidation,
  createUserValidation,
  updateUserValidation,
  deleteUserValidation,
  resetPasswordValidation,
  assignRoleValidation,
  removeRoleValidation
} from './user-management.controller';
import {
  authenticateAdmin,
  requirePermission,
  requireSuperAdmin,
  adminRateLimit
} from './admin-auth.middleware';
import { ADMIN_PERMISSIONS } from './admin-auth.service';

const router = Router();

/**
 * User List and Search Routes
 */

// Get users with filtering, sorting, and pagination
router.get(
  '/',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_VIEW),
  adminRateLimit(200, 15 * 60 * 1000), // 200 requests per 15 minutes
  getUsersValidation,
  userManagementController.getUsers
);

// Get user statistics
router.get(
  '/stats',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(100, 15 * 60 * 1000),
  userManagementController.getUserStats
);

// Health check for user management system
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'user-management',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Get user by ID (this must come AFTER /stats and /health to avoid conflicts)
router.get(
  '/:userId',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_VIEW),
  adminRateLimit(300, 15 * 60 * 1000),
  getUserByIdValidation,
  userManagementController.getUserById
);

/**
 * User Creation and Modification Routes
 */

// Create new user
router.post(
  '/',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_CREATE),
  adminRateLimit(20, 15 * 60 * 1000), // 20 user creations per 15 minutes
  createUserValidation,
  userManagementController.createUser
);

// Update user
router.put(
  '/:userId',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_UPDATE),
  adminRateLimit(50, 15 * 60 * 1000), // 50 updates per 15 minutes
  updateUserValidation,
  userManagementController.updateUser
);

// Delete user (soft delete by default)
router.delete(
  '/:userId',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_DELETE),
  adminRateLimit(10, 15 * 60 * 1000), // 10 deletions per 15 minutes
  deleteUserValidation,
  userManagementController.deleteUser
);

/**
 * User Account Management Routes
 */

// Reset user password
router.post(
  '/:userId/reset-password',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.USERS_UPDATE),
  adminRateLimit(30, 15 * 60 * 1000), // 30 password resets per 15 minutes
  resetPasswordValidation,
  userManagementController.resetPassword
);

/**
 * Admin Role Management Routes
 * Only super admins can manage admin roles
 */

// Assign admin role to user
router.post(
  '/:userId/admin-roles',
  authenticateAdmin,
  requireSuperAdmin,
  adminRateLimit(15, 15 * 60 * 1000), // 15 role assignments per 15 minutes
  assignRoleValidation,
  userManagementController.assignAdminRole
);

// Remove admin role from user
router.delete(
  '/:userId/admin-roles',
  authenticateAdmin,
  requireSuperAdmin,
  adminRateLimit(15, 15 * 60 * 1000), // 15 role removals per 15 minutes
  removeRoleValidation,
  userManagementController.removeAdminRole
);

export default router;
