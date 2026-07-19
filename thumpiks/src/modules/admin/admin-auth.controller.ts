import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { adminAuthService, AdminRoles } from './admin-auth.service';
import { isProductionLike } from '../../utils/env';
import { logger } from '../../utils/logger';
import rateLimit from 'express-rate-limit';

// Rate limiting for admin auth endpoints
export const adminLoginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many admin login attempts',
    code: 'ADMIN_LOGIN_RATE_LIMIT',
    retryAfter: 15 * 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Remove custom keyGenerator to use default IP-based limiting
  skipSuccessfulRequests: true,
});

export class AdminAuthController {
  /**
   * Admin login endpoint
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'ADMIN_VALIDATION_ERROR',
          errors: errors.array(),
        });
        return;
      }

      const { email, password } = req.body;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      // Authenticate admin
      const result = await adminAuthService.authenticateAdmin(
        email,
        password,
        ipAddress,
        userAgent
      );

      if (!result) {
        res.status(401).json({
          error: 'Invalid admin credentials',
          code: 'ADMIN_LOGIN_FAILED',
        });
        return;
      }

      const { user, token } = result;

      // Set secure HTTP-only cookie for admin session
      res.cookie('admin_token', token, {
        httpOnly: true,
        secure: isProductionLike(),
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.json({
        success: true,
        admin: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          permissions: user.permissions,
          lastLoginAt: user.lastLoginAt,
        },
        token,
      });
    } catch (error) {
      logger.error('Admin login error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Authentication failed',
        code: 'ADMIN_LOGIN_ERROR',
      });
    }
  }

  /**
   * Admin logout endpoint
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (req.adminUser) {
        // Log admin logout
        await adminAuthService.logAdminAction(
          req.adminUser.id,
          'ADMIN_LOGOUT',
          'auth',
          null,
          {
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
          }
        );
      }

      // Clear admin session cookie
      res.clearCookie('admin_token');

      res.json({
        success: true,
        message: 'Admin logged out successfully',
      });
    } catch (error) {
      logger.error('Admin logout error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Logout failed',
        code: 'ADMIN_LOGOUT_ERROR',
      });
    }
  }

  /**
   * Get current admin user info
   */
  async getCurrentAdmin(req: Request, res: Response): Promise<void> {
    try {
      if (!req.adminUser) {
        res.status(401).json({
          error: 'Admin authentication required',
          code: 'ADMIN_AUTH_REQUIRED',
        });
        return;
      }

      res.json({
        success: true,
        admin: {
          id: req.adminUser.id,
          email: req.adminUser.email,
          name: req.adminUser.name,
          roles: req.adminUser.roles,
          permissions: req.adminUser.permissions,
          lastLoginAt: req.adminUser.lastLoginAt,
        },
      });
    } catch (error) {
      logger.error('Get current admin error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to get admin info',
        code: 'ADMIN_INFO_ERROR',
      });
    }
  }

  /**
   * Assign admin role to user
   */
  async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'ADMIN_VALIDATION_ERROR',
          errors: errors.array(),
        });
        return;
      }

      const { userId, role, expiresAt } = req.body;
      const adminUser = req.adminUser!;

      // Check if role is valid
      if (!Object.values(AdminRoles).includes(role)) {
        res.status(400).json({
          error: 'Invalid admin role',
          code: 'ADMIN_INVALID_ROLE',
        });
        return;
      }

      // Only super admins can assign super admin role
      if (
        role === AdminRoles.SUPER_ADMIN &&
        !adminUser.roles.includes(AdminRoles.SUPER_ADMIN)
      ) {
        res.status(403).json({
          error: 'Only super admins can assign super admin role',
          code: 'ADMIN_PERMISSION_DENIED',
        });
        return;
      }

      const success = await adminAuthService.assignAdminRole(
        userId,
        role,
        adminUser.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (!success) {
        res.status(500).json({
          error: 'Failed to assign admin role',
          code: 'ADMIN_ROLE_ASSIGNMENT_FAILED',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Admin role assigned successfully',
      });
    } catch (error) {
      logger.error('Assign admin role error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to assign admin role',
        code: 'ADMIN_ROLE_ASSIGNMENT_ERROR',
      });
    }
  }

  /**
   * Remove admin role from user
   */
  async removeRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'ADMIN_VALIDATION_ERROR',
          errors: errors.array(),
        });
        return;
      }

      const { userId, role } = req.body;
      const adminUser = req.adminUser!;

      // Prevent removing super admin role unless done by another super admin
      if (
        role === AdminRoles.SUPER_ADMIN &&
        !adminUser.roles.includes(AdminRoles.SUPER_ADMIN)
      ) {
        res.status(403).json({
          error: 'Only super admins can remove super admin role',
          code: 'ADMIN_PERMISSION_DENIED',
        });
        return;
      }

      // Prevent self-removal of super admin role
      if (userId === adminUser.id && role === AdminRoles.SUPER_ADMIN) {
        res.status(403).json({
          error: 'Cannot remove your own super admin role',
          code: 'ADMIN_SELF_ROLE_REMOVAL_DENIED',
        });
        return;
      }

      const success = await adminAuthService.removeAdminRole(
        userId,
        role,
        adminUser.id
      );

      if (!success) {
        res.status(500).json({
          error: 'Failed to remove admin role',
          code: 'ADMIN_ROLE_REMOVAL_FAILED',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Admin role removed successfully',
      });
    } catch (error) {
      logger.error('Remove admin role error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to remove admin role',
        code: 'ADMIN_ROLE_REMOVAL_ERROR',
      });
    }
  }

  /**
   * Get admin activity logs
   */
  async getActivityLogs(req: Request, res: Response): Promise<void> {
    try {
      const {
        limit = 50,
        offset = 0,
        adminId,
        action,
        resource,
        severity,
      } = req.query;

      const logs = await adminAuthService.getAdminLogs(
        parseInt(limit as string),
        parseInt(offset as string),
        adminId as string,
        action as string,
        resource as string,
        severity as string
      );

      res.json({
        success: true,
        logs,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      logger.error('Get admin activity logs error', error instanceof Error ? error : undefined);
      res.status(500).json({
        error: 'Failed to fetch activity logs',
        code: 'ADMIN_LOGS_ERROR',
      });
    }
  }
}

// Validation rules for admin endpoints
export const adminLoginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
];

export const assignRoleValidation = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('role')
    .isIn(Object.values(AdminRoles))
    .withMessage('Valid admin role is required'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Valid expiration date is required'),
];

export const removeRoleValidation = [
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('role')
    .isIn(Object.values(AdminRoles))
    .withMessage('Valid admin role is required'),
];

export const adminAuthController = new AdminAuthController();
