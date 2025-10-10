import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { adminAuthService, AdminRoles } from './admin-auth.service';

const prisma = new PrismaClient();

export interface UserListItem {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
  adminRoles: Array<{
    role: string;
    isActive: boolean;
  }>;
  _count: {
    projects: number;
    thumbnails: number;
  };
}

export interface UserDetailsResponse {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  isActive: boolean;
  settings: any;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  adminRoles: Array<{
    id: string;
    role: string;
    isActive: boolean;
    assignedAt: Date;
    assignedBy: string | null;
    expiresAt: Date | null;
  }>;
  projects: Array<{
    id: string;
    name: string;
    createdAt: Date;
  }>;
  thumbnails: Array<{
    id: string;
    title: string;
    createdAt: Date;
  }>;
  subscriptions: Array<{
    id: string;
    planType: string;
    creditsBalance: number;
    periodStart: Date;
    periodEnd: Date;
  }>;
}

export interface CreateUserRequest {
  email: string;
  name?: string;
  password: string;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  isVerified?: boolean;
  isActive?: boolean;
  avatarUrl?: string;
  settings?: any;
}

export interface UserFilters {
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
  hasAdminRoles?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  lastLoginAfter?: Date;
  lastLoginBefore?: Date;
}

export interface UserSortOptions {
  field: 'createdAt' | 'lastLoginAt' | 'email' | 'name';
  direction: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface UserListResponse {
  users: UserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class UserManagementService {
  
  /**
   * Get paginated list of users with filtering and sorting
   */
  async getUsers(
    filters: UserFilters = {},
    sort: UserSortOptions = { field: 'createdAt', direction: 'desc' },
    pagination: PaginationOptions = { page: 1, limit: 50 }
  ): Promise<UserListResponse> {
    try {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};
      
      if (filters.search) {
        where.OR = [
          { email: { contains: filters.search, mode: 'insensitive' } },
          { name: { contains: filters.search, mode: 'insensitive' } }
        ];
      }

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.isVerified !== undefined) {
        where.isVerified = filters.isVerified;
      }

      if (filters.hasAdminRoles !== undefined) {
        if (filters.hasAdminRoles) {
          where.adminRoles = { some: { isActive: true } };
        } else {
          where.adminRoles = { none: { isActive: true } };
        }
      }

      if (filters.createdAfter) {
        where.createdAt = { ...where.createdAt, gte: filters.createdAfter };
      }

      if (filters.createdBefore) {
        where.createdAt = { ...where.createdAt, lte: filters.createdBefore };
      }

      if (filters.lastLoginAfter) {
        where.lastLoginAt = { ...where.lastLoginAt, gte: filters.lastLoginAfter };
      }

      if (filters.lastLoginBefore) {
        where.lastLoginAt = { ...where.lastLoginAt, lte: filters.lastLoginBefore };
      }

      // Build order by clause
      const orderBy: any = {};
      orderBy[sort.field] = sort.direction;

      // Get total count
      const total = await prisma.user.count({ where });

      // Get users
      const users = await prisma.user.findMany({
        where,
        include: {
          adminRoles: {
            where: { isActive: true },
            select: { role: true, isActive: true }
          },
          _count: {
            select: {
              projects: true,
              thumbnails: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      });

      return {
        users: users as UserListItem[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

    } catch (error) {
      console.error('Error getting users:', error);
      throw error;
    }
  }

  /**
   * Get detailed user information by ID
   */
  async getUserById(userId: string): Promise<UserDetailsResponse | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          adminRoles: {
            orderBy: { assignedAt: 'desc' }
          },
          projects: {
            select: { id: true, name: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          thumbnails: {
            select: { id: true, title: true, createdAt: true },
            orderBy: { createdAt: 'desc' },
            take: 10
          },
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });

      return user as UserDetailsResponse;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      throw error;
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest, adminId: string): Promise<string> {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email.toLowerCase() }
      });

      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 12);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          email: userData.email.toLowerCase(),
          name: userData.name || null,
          passwordHash,
          isVerified: userData.isVerified || false,
          isActive: userData.isActive !== false, // Default to true
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      // Log user creation
      await adminAuthService.logAdminAction(
        adminId,
        'USER_CREATED',
        'user',
        newUser.id,
        {
          email: newUser.email,
          name: newUser.name,
          isVerified: newUser.isVerified,
          isActive: newUser.isActive
        }
      );

      return newUser.id;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updateData: UpdateUserRequest, adminId: string): Promise<boolean> {
    try {
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check email uniqueness if email is being updated
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email.toLowerCase() }
        });

        if (emailExists) {
          throw new Error('Email already in use');
        }
      }

      // Prepare update data
      const dataToUpdate: any = {
        updatedAt: new Date()
      };

      if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
      if (updateData.email) dataToUpdate.email = updateData.email.toLowerCase();
      if (updateData.isVerified !== undefined) dataToUpdate.isVerified = updateData.isVerified;
      if (updateData.isActive !== undefined) dataToUpdate.isActive = updateData.isActive;
      if (updateData.avatarUrl !== undefined) dataToUpdate.avatarUrl = updateData.avatarUrl;
      if (updateData.settings !== undefined) dataToUpdate.settings = updateData.settings;

      // Update user
      await prisma.user.update({
        where: { id: userId },
        data: dataToUpdate
      });

      // Log user update
      await adminAuthService.logAdminAction(
        adminId,
        'USER_UPDATED',
        'user',
        userId,
        {
          changes: updateData,
          previousData: {
            email: existingUser.email,
            name: existingUser.name,
            isVerified: existingUser.isVerified,
            isActive: existingUser.isActive
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete/deactivate user
   */
  async deleteUser(userId: string, adminId: string, hardDelete: boolean = false): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          adminRoles: { where: { isActive: true } }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deletion of users with active admin roles
      if (user.adminRoles.length > 0) {
        throw new Error('Cannot delete user with active admin roles. Remove admin roles first.');
      }

      if (hardDelete) {
        // Hard delete - remove all user data
        await prisma.$transaction(async (tx) => {
          // Delete related data in correct order
          await tx.auditLog.deleteMany({ where: { userId } });
          await tx.socialShare.deleteMany({ where: { userId } });
          await tx.template.deleteMany({ where: { creatorId: userId } });
          await tx.thumbnail.deleteMany({ where: { userId } });
          await tx.subscription.deleteMany({ where: { userId } });
          await tx.teamMember.deleteMany({ where: { userId } });
          await tx.teamInvitation.deleteMany({ 
            where: { OR: [{ inviterId: userId }, { inviteeId: userId }] } 
          });
          await tx.team.deleteMany({ where: { ownerId: userId } });
          await tx.project.deleteMany({ where: { userId } });
          await tx.adminRole.deleteMany({ where: { userId } });
          await tx.user.delete({ where: { id: userId } });
        });

        await adminAuthService.logAdminAction(
          adminId,
          'USER_HARD_DELETED',
          'user',
          userId,
          { email: user.email, name: user.name },
          'warning'
        );
      } else {
        // Soft delete - deactivate user
        await prisma.user.update({
          where: { id: userId },
          data: { 
            isActive: false,
            updatedAt: new Date()
          }
        });

        await adminAuthService.logAdminAction(
          adminId,
          'USER_DEACTIVATED',
          'user',
          userId,
          { email: user.email, name: user.name }
        );
      }

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(userId: string, newPassword: string, adminId: string): Promise<boolean> {
    try {
      const passwordHash = await bcrypt.hash(newPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash,
          updatedAt: new Date()
        }
      });

      await adminAuthService.logAdminAction(
        adminId,
        'USER_PASSWORD_RESET',
        'user',
        userId,
        { resetBy: 'admin' },
        'warning'
      );

      return true;
    } catch (error) {
      console.error('Error resetting user password:', error);
      throw error;
    }
  }

  /**
   * Assign admin role to user
   */
  async assignAdminRole(
    userId: string, 
    role: AdminRoles, 
    assignedBy: string,
    expiresAt?: Date
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminAuthService.assignAdminRole(
        userId,
        role,
        assignedBy,
        expiresAt
      );

      if (success) {
        await adminAuthService.logAdminAction(
          assignedBy,
          'ADMIN_ROLE_ASSIGNED_TO_USER',
          'user',
          userId,
          { role, expiresAt, userEmail: user.email }
        );
      }

      return success;
    } catch (error) {
      console.error('Error assigning admin role:', error);
      throw error;
    }
  }

  /**
   * Remove admin role from user
   */
  async removeAdminRole(userId: string, role: AdminRoles, removedBy: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new Error('User not found');
      }

      const success = await adminAuthService.removeAdminRole(userId, role, removedBy);

      if (success) {
        await adminAuthService.logAdminAction(
          removedBy,
          'ADMIN_ROLE_REMOVED_FROM_USER',
          'user',
          userId,
          { role, userEmail: user.email }
        );
      }

      return success;
    } catch (error) {
      console.error('Error removing admin role:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<{
    total: number;
    active: number;
    verified: number;
    admins: number;
    newThisMonth: number;
    newThisWeek: number;
  }> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        total,
        active,
        verified,
        admins,
        newThisMonth,
        newThisWeek
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { isActive: true } }),
        prisma.user.count({ where: { isVerified: true } }),
        prisma.user.count({ 
          where: { 
            adminRoles: { some: { isActive: true } } 
          } 
        }),
        prisma.user.count({ where: { createdAt: { gte: oneMonthAgo } } }),
        prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } })
      ]);

      return {
        total,
        active,
        verified,
        admins,
        newThisMonth,
        newThisWeek
      };
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }
}

export const userManagementService = new UserManagementService();