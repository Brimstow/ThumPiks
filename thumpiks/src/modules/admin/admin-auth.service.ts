import { sign, verify, SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

/** Shape of a row from prisma.adminRole queries */
interface AdminRoleRow {
  role: string;
  expiresAt?: Date | null;
  isActive: boolean;
}

/** Payload stored inside admin JWTs */
interface AdminTokenPayload {
  userId: string;
  email: string;
  roles: AdminRoles[];
  permissions: string[];
  type: string;
}

const prisma = getPrisma();

// Admin role hierarchy
export enum AdminRoles {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  ANALYST = 'analyst',
}

// Permission system
export const ADMIN_PERMISSIONS = {
  // User Management
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_BAN: 'users.ban',

  // Content Management
  CONTENT_VIEW: 'content.view',
  CONTENT_MODERATE: 'content.moderate',
  CONTENT_DELETE: 'content.delete',

  // System Management
  SYSTEM_CONFIG: 'system.config',
  SYSTEM_HEALTH: 'system.health',
  SYSTEM_LOGS: 'system.logs',

  // Analytics
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_EXPORT: 'analytics.export',

  // Support / Feedback
  SUPPORT_VIEW: 'support.view',
  SUPPORT_MANAGE: 'support.manage',

  // Admin Management
  ADMIN_ROLES: 'admin.roles',
  ADMIN_PERMISSIONS: 'admin.permissions',
} as const;

// Default role permissions
export const ROLE_PERMISSIONS = {
  [AdminRoles.SUPER_ADMIN]: Object.values(ADMIN_PERMISSIONS),
  [AdminRoles.ADMIN]: [
    ADMIN_PERMISSIONS.USERS_VIEW,
    ADMIN_PERMISSIONS.USERS_UPDATE,
    ADMIN_PERMISSIONS.USERS_BAN,
    ADMIN_PERMISSIONS.CONTENT_VIEW,
    ADMIN_PERMISSIONS.CONTENT_MODERATE,
    ADMIN_PERMISSIONS.CONTENT_DELETE,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ADMIN_PERMISSIONS.SYSTEM_HEALTH,
    ADMIN_PERMISSIONS.SUPPORT_VIEW,
    ADMIN_PERMISSIONS.SUPPORT_MANAGE,
  ],
  [AdminRoles.MODERATOR]: [
    ADMIN_PERMISSIONS.USERS_VIEW,
    ADMIN_PERMISSIONS.CONTENT_VIEW,
    ADMIN_PERMISSIONS.CONTENT_MODERATE,
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ADMIN_PERMISSIONS.SUPPORT_VIEW,
  ],
  [AdminRoles.ANALYST]: [
    ADMIN_PERMISSIONS.ANALYTICS_VIEW,
    ADMIN_PERMISSIONS.ANALYTICS_EXPORT,
    ADMIN_PERMISSIONS.SYSTEM_HEALTH,
  ],
};

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  roles: AdminRoles[];
  permissions: string[];
  lastLoginAt?: Date;
}

export class AdminAuthService {
  /**
   * Authenticate admin user with email and password
   */
  async authenticateAdmin(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: AdminUser; token: string } | null> {
    try {
      // Find user with admin roles
      const user = await prisma.user.findUnique({
        where: { email },
        include: {
          AdminRole: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
          },
        },
      });

      if (!user || !user.isActive || user.AdminRole.length === 0) {
        await this.logAdminAction(null, 'ADMIN_LOGIN_FAILED', 'auth', null, {
          email,
          reason: 'No admin access',
          ipAddress,
          userAgent,
        });
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        await this.logAdminAction(user.id, 'ADMIN_LOGIN_FAILED', 'auth', null, {
          reason: 'Invalid password',
          ipAddress,
          userAgent,
        });
        return null;
      }

      // Get active roles and permissions
      const roles = user.AdminRole.filter(
        (role: AdminRoleRow) => !role.expiresAt || role.expiresAt > new Date()
      ).map((role: AdminRoleRow) => role.role as AdminRoles);

      const permissions = this.getPermissionsForRoles(roles);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT token
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        roles,
        permissions,
        type: 'admin',
      };

      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
      }

      const token = sign(tokenPayload, secret, {
        expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
      } as SignOptions);

      // Log successful login
      await this.logAdminAction(user.id, 'ADMIN_LOGIN_SUCCESS', 'auth', null, {
        ipAddress,
        userAgent,
      });

      const adminUser: AdminUser = {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin User',
        roles,
        permissions,
        ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt }),
      };

      return { user: adminUser, token };
    } catch (error) {
      logger.error('Admin authentication error', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Verify admin JWT token and return user info
   */
  async verifyAdminToken(token: string): Promise<AdminUser | null> {
    try {
      const decoded = verify(token, process.env.JWT_SECRET!) as AdminTokenPayload;

      if (decoded.type !== 'admin') {
        return null;
      }

      // Fetch fresh user data to ensure roles haven't changed
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          AdminRole: {
            where: { isActive: true },
            orderBy: { assignedAt: 'desc' },
          },
        },
      });

      if (!user || !user.isActive || user.AdminRole.length === 0) {
        return null;
      }

      // Check if roles have been updated since token was issued
      const currentRoles = user.AdminRole.filter(
        (role: AdminRoleRow) => !role.expiresAt || role.expiresAt > new Date()
      ).map((role: AdminRoleRow) => role.role as AdminRoles);

      const currentPermissions = this.getPermissionsForRoles(currentRoles);

      return {
        id: user.id,
        email: user.email,
        name: user.name || 'Admin User',
        roles: currentRoles,
        permissions: currentPermissions,
        ...(user.lastLoginAt && { lastLoginAt: user.lastLoginAt }),
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if admin user has specific permission
   */
  hasPermission(adminUser: AdminUser, permission: string): boolean {
    return adminUser.permissions.includes(permission);
  }

  /**
   * Check if admin user has any of the specified roles
   */
  hasRole(adminUser: AdminUser, roles: AdminRoles[]): boolean {
    return adminUser.roles.some(role => roles.includes(role));
  }

  /**
   * Assign admin role to user
   */
  async assignAdminRole(
    userId: string,
    role: AdminRoles,
    assignedBy: string,
    expiresAt?: Date,
    customPermissions?: string[]
  ): Promise<boolean> {
    try {
      const permissions = customPermissions || ROLE_PERMISSIONS[role] || [];

      const createData: {
        id: string;
        userId: string;
        role: string;
        permissions: string;
        assignedBy: string;
        isActive: boolean;
        expiresAt?: Date;
      } = {
        id: `admin-role-${userId}-${role}-${Date.now()}`,
        userId,
        role,
        permissions: JSON.stringify(permissions),
        assignedBy,
        isActive: true,
      };

      if (expiresAt) {
        createData.expiresAt = expiresAt;
      }

      await prisma.adminRole.create({
        data: createData,
      });

      // Log the role assignment
      await this.logAdminAction(
        assignedBy,
        'ADMIN_ROLE_ASSIGNED',
        'admin_role',
        userId,
        {
          role,
          permissions: permissions.length,
          expiresAt,
        }
      );

      return true;
    } catch (error) {
      logger.error('Error assigning admin role', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Remove admin role from user
   */
  async removeAdminRole(
    userId: string,
    role: AdminRoles,
    removedBy: string
  ): Promise<boolean> {
    try {
      await prisma.adminRole.updateMany({
        where: { userId, role, isActive: true },
        data: { isActive: false },
      });

      // Log the role removal
      await this.logAdminAction(
        removedBy,
        'ADMIN_ROLE_REMOVED',
        'admin_role',
        userId,
        {
          role,
        }
      );

      return true;
    } catch (error) {
      logger.error('Error removing admin role', error instanceof Error ? error : undefined);
      return false;
    }
  }

  /**
   * Get permissions for given roles
   */
  private getPermissionsForRoles(roles: AdminRoles[]): string[] {
    const permissionSet = new Set<string>();

    roles.forEach(role => {
      const rolePermissions = ROLE_PERMISSIONS[role] || [];
      rolePermissions.forEach(permission => permissionSet.add(permission));
    });

    return Array.from(permissionSet);
  }

  /**
   * Log admin actions for audit trail
   */
  async logAdminAction(
    adminId: string | null,
    action: string,
    resource: string,
    resourceId: string | null,
    details?: unknown,
    severity: 'info' | 'warning' | 'error' | 'critical' = 'info'
  ): Promise<void> {
    try {
      const logData: {
        id: string;
        adminId: string | null;
        action: string;
        resource: string;
        resourceId: string | null;
        severity: string;
        timestamp: Date;
        details?: string;
      } = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        adminId,
        action,
        resource,
        resourceId,
        severity,
        timestamp: new Date(),
      };

      if (details) {
        logData.details = JSON.stringify(details);
      }

      await prisma.auditLog.create({
        data: logData,
      });
    } catch (error) {
      logger.error('Error logging admin action', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get admin activity logs
   */
  async getAdminLogs(
    limit: number = 50,
    offset: number = 0,
    adminId?: string,
    action?: string,
    resource?: string,
    severity?: string
  ) {
    const where: {
      adminId?: string;
      action?: string;
      resource?: string;
      severity?: string;
    } = {};

    if (adminId) where.adminId = adminId;
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (severity) where.severity = severity;

    return prisma.auditLog.findMany({
      where,
      include: {
        User_AuditLog_adminIdToUser: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });
  }
}

export const adminAuthService = new AdminAuthService();
