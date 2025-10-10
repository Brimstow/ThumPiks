import { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { userManagementService, UserFilters, UserSortOptions, PaginationOptions } from './user-management.service';
import { AdminRoles } from './admin-auth.service';

export class UserManagementController {

  /**
   * Get paginated list of users with filtering and sorting
   */
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      // Parse query parameters
      const {
        page = 1,
        limit = 50,
        search,
        isActive,
        isVerified,
        hasAdminRoles,
        createdAfter,
        createdBefore,
        lastLoginAfter,
        lastLoginBefore,
        sortField = 'createdAt',
        sortDirection = 'desc'
      } = req.query;

      // Build filters
      const filters: UserFilters = {};
      if (search) filters.search = search as string;
      if (isActive !== undefined) filters.isActive = isActive === 'true';
      if (isVerified !== undefined) filters.isVerified = isVerified === 'true';
      if (hasAdminRoles !== undefined) filters.hasAdminRoles = hasAdminRoles === 'true';
      if (createdAfter) filters.createdAfter = new Date(createdAfter as string);
      if (createdBefore) filters.createdBefore = new Date(createdBefore as string);
      if (lastLoginAfter) filters.lastLoginAfter = new Date(lastLoginAfter as string);
      if (lastLoginBefore) filters.lastLoginBefore = new Date(lastLoginBefore as string);

      // Build sort options
      const sort: UserSortOptions = {
        field: sortField as any,
        direction: sortDirection as 'asc' | 'desc'
      };

      // Build pagination
      const pagination: PaginationOptions = {
        page: parseInt(page as string),
        limit: Math.min(parseInt(limit as string), 100) // Max 100 per page
      };

      const result = await userManagementService.getUsers(filters, sort, pagination);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        error: 'Failed to retrieve users',
        code: 'GET_USERS_ERROR'
      });
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      const user = await userManagementService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user',
        code: 'GET_USER_ERROR'
      });
    }
  }

  /**
   * Create new user
   */
  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const adminUser = req.adminUser!;
      const userData = req.body;

      const userId = await userManagementService.createUser(userData, adminUser.id);

      res.status(201).json({
        success: true,
        data: { userId },
        message: 'User created successfully'
      });

    } catch (error) {
      console.error('Create user error:', error);
      
      if (error instanceof Error && error.message.includes('already exists')) {
        res.status(409).json({
          error: error.message,
          code: 'USER_EXISTS'
        });
        return;
      }

      res.status(500).json({
        error: 'Failed to create user',
        code: 'CREATE_USER_ERROR'
      });
    }
  }

  /**
   * Update user
   */
  async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      const adminUser = req.adminUser!;
      const updateData = req.body;

      await userManagementService.updateUser(userId!, updateData, adminUser.id);

      res.json({
        success: true,
        message: 'User updated successfully'
      });

    } catch (error) {
      console.error('Update user error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: error.message,
            code: 'USER_NOT_FOUND'
          });
          return;
        }
        
        if (error.message.includes('already in use')) {
          res.status(409).json({
            error: error.message,
            code: 'EMAIL_IN_USE'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to update user',
        code: 'UPDATE_USER_ERROR'
      });
    }
  }

  /**
   * Delete user (soft delete by default)
   */
  async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      const { hardDelete = false } = req.body;
      const adminUser = req.adminUser!;

      await userManagementService.deleteUser(userId, adminUser.id, hardDelete);

      res.json({
        success: true,
        message: hardDelete ? 'User permanently deleted' : 'User deactivated successfully'
      });

    } catch (error) {
      console.error('Delete user error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({
            error: error.message,
            code: 'USER_NOT_FOUND'
          });
          return;
        }
        
        if (error.message.includes('admin roles')) {
          res.status(400).json({
            error: error.message,
            code: 'USER_HAS_ADMIN_ROLES'
          });
          return;
        }
      }

      res.status(500).json({
        error: 'Failed to delete user',
        code: 'DELETE_USER_ERROR'
      });
    }
  }

  /**
   * Reset user password
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      const { newPassword } = req.body;
      const adminUser = req.adminUser!;

      await userManagementService.resetUserPassword(userId, newPassword, adminUser.id);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        code: 'RESET_PASSWORD_ERROR'
      });
    }
  }

  /**
   * Assign admin role to user
   */
  async assignAdminRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      const { role, expiresAt } = req.body;
      const adminUser = req.adminUser!;

      // Only super admins can assign super admin role
      if (role === AdminRoles.SUPER_ADMIN && !adminUser.roles.includes(AdminRoles.SUPER_ADMIN)) {
        res.status(403).json({
          error: 'Only super admins can assign super admin role',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      const success = await userManagementService.assignAdminRole(
        userId,
        role,
        adminUser.id,
        expiresAt ? new Date(expiresAt) : undefined
      );

      if (success) {
        res.json({
          success: true,
          message: 'Admin role assigned successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to assign admin role',
          code: 'ASSIGN_ROLE_ERROR'
        });
      }

    } catch (error) {
      console.error('Assign admin role error:', error);
      res.status(500).json({
        error: 'Failed to assign admin role',
        code: 'ASSIGN_ROLE_ERROR'
      });
    }
  }

  /**
   * Remove admin role from user
   */
  async removeAdminRole(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { userId } = req.params;
      if (!userId) {
        res.status(400).json({
          error: 'User ID is required',
          code: 'MISSING_USER_ID'
        });
        return;
      }
      
      const { role } = req.body;
      const adminUser = req.adminUser!;

      // Prevent removing super admin role unless done by another super admin
      if (role === AdminRoles.SUPER_ADMIN && !adminUser.roles.includes(AdminRoles.SUPER_ADMIN)) {
        res.status(403).json({
          error: 'Only super admins can remove super admin role',
          code: 'INSUFFICIENT_PERMISSIONS'
        });
        return;
      }

      // Prevent self-removal of super admin role
      if (userId === adminUser.id && role === AdminRoles.SUPER_ADMIN) {
        res.status(403).json({
          error: 'Cannot remove your own super admin role',
          code: 'SELF_ROLE_REMOVAL_DENIED'
        });
        return;
      }

      const success = await userManagementService.removeAdminRole(userId, role, adminUser.id);

      if (success) {
        res.json({
          success: true,
          message: 'Admin role removed successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to remove admin role',
          code: 'REMOVE_ROLE_ERROR'
        });
      }

    } catch (error) {
      console.error('Remove admin role error:', error);
      res.status(500).json({
        error: 'Failed to remove admin role',
        code: 'REMOVE_ROLE_ERROR'
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await userManagementService.getUserStats();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user statistics',
        code: 'GET_STATS_ERROR'
      });
    }
  }
}

// Validation rules
export const getUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().isLength({ max: 100 }).withMessage('Search term too long'),
  query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  query('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
  query('hasAdminRoles').optional().isBoolean().withMessage('hasAdminRoles must be boolean'),
  query('sortField').optional().isIn(['createdAt', 'lastLoginAt', 'email', 'name']).withMessage('Invalid sort field'),
  query('sortDirection').optional().isIn(['asc', 'desc']).withMessage('Sort direction must be asc or desc')
];

export const getUserByIdValidation = [
  param('userId').isUUID().withMessage('Valid user ID required')
];

export const createUserValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
];

export const updateUserValidation = [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('name').optional().isString().isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
  body('isVerified').optional().isBoolean().withMessage('isVerified must be boolean'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('avatarUrl').optional().isURL().withMessage('Avatar URL must be valid URL')
];

export const deleteUserValidation = [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('hardDelete').optional().isBoolean().withMessage('hardDelete must be boolean')
];

export const resetPasswordValidation = [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
];

export const assignRoleValidation = [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('role').isIn(Object.values(AdminRoles)).withMessage('Valid admin role required'),
  body('expiresAt').optional().isISO8601().withMessage('Valid expiration date required')
];

export const removeRoleValidation = [
  param('userId').isUUID().withMessage('Valid user ID required'),
  body('role').isIn(Object.values(AdminRoles)).withMessage('Valid admin role required')
];

export const userManagementController = new UserManagementController();