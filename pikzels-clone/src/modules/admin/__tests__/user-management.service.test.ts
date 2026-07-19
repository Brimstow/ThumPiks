/**
 * Tests for UserManagementService
 *
 * Verifies:
 * - User listing with filters, sorting, pagination
 * - User CRUD (create, read, update, delete)
 * - Password reset
 * - Admin role assignment/removal
 * - User statistics
 * - Error handling and edge cases
 */

// Set env before imports
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-new-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock Prisma via prisma-factory (following existing pattern)
const mockPrisma: any = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  adminRole: {
    create: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  socialShare: { deleteMany: jest.fn() },
  template: { deleteMany: jest.fn() },
  thumbnail: { deleteMany: jest.fn() },
  subscription: { deleteMany: jest.fn() },
  teamMember: { deleteMany: jest.fn() },
  teamInvitation: { deleteMany: jest.fn() },
  team: { deleteMany: jest.fn() },
  project: { deleteMany: jest.fn() },
  $transaction: jest.fn((fn: (tx: any) => Promise<void>) => fn(mockPrisma)),
};

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => mockPrisma),
}));

// Mock jsonwebtoken (used by admin-auth.service which is imported by user-management.service)
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
}));

import { UserManagementService, UserFilters, UserSortOptions, PaginationOptions } from '../user-management.service';
import { AdminRoles } from '../admin-auth.service';
import bcrypt from 'bcryptjs';

describe('UserManagementService', () => {
  let service: UserManagementService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UserManagementService();
    // Default: auditLog.create always succeeds
    mockPrisma.auditLog.create.mockResolvedValue({});
  });

  // ═════════════════════════════════════════════════════════════
  // getUsers
  // ═════════════════════════════════════════════════════════════
  describe('getUsers', () => {
    it('returns paginated user list with defaults', async () => {
      const mockUsers = [
        { id: 'u1', email: 'user1@test.com', name: 'User 1', AdminRole: [], _count: { Project: 2, Thumbnail: 5 } },
        { id: 'u2', email: 'user2@test.com', name: 'User 2', AdminRole: [], _count: { Project: 0, Thumbnail: 1 } },
      ];
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers();

      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
      expect(result.users).toHaveLength(2);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
          orderBy: { createdAt: 'desc' },
        })
      );
    });

    it('applies search filter across email and name', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const filters: UserFilters = { search: 'john' };
      await service.getUsers(filters);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { email: { contains: 'john', mode: 'insensitive' } },
              { name: { contains: 'john', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('applies isActive filter', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ isActive: true });

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('applies isVerified filter', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ isVerified: false });

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isVerified: false }),
        })
      );
    });

    it('filters users with admin roles', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ hasAdminRoles: true });

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AdminRole: { some: { isActive: true } },
          }),
        })
      );
    });

    it('filters users without admin roles', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.getUsers({ hasAdminRoles: false });

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AdminRole: { none: { isActive: true } },
          }),
        })
      );
    });

    it('applies date range filters', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const createdAfter = new Date('2024-01-01');
      const createdBefore = new Date('2024-12-31');
      await service.getUsers({ createdAfter, createdBefore });

      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: createdAfter, lte: createdBefore },
          }),
        })
      );
    });

    it('applies custom sort and pagination', async () => {
      mockPrisma.user.count.mockResolvedValue(100);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const sort: UserSortOptions = { field: 'email', direction: 'asc' };
      const pagination: PaginationOptions = { page: 3, limit: 20 };
      const result = await service.getUsers({}, sort, pagination);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { email: 'asc' },
          skip: 40, // (page 3 - 1) * 20
          take: 20,
        })
      );
      expect(result.pagination.totalPages).toBe(5); // 100 / 20
    });
  });

  // ═════════════════════════════════════════════════════════════
  // getUserById
  // ═════════════════════════════════════════════════════════════
  describe('getUserById', () => {
    it('returns user with all related data', async () => {
      const mockUser = {
        id: 'u1',
        email: 'admin@test.com',
        name: 'Admin User',
        AdminRole: [{ id: 'r1', role: 'admin', isActive: true }],
        Project: [{ id: 'p1', name: 'My Project' }],
        Thumbnail: [{ id: 't1', title: 'Thumb 1' }],
        Subscription: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserById('u1');

      expect(result).toBeTruthy();
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u1' },
          include: expect.objectContaining({
            AdminRole: expect.anything(),
            Project: expect.anything(),
            Thumbnail: expect.anything(),
            Subscription: expect.anything(),
          }),
        })
      );
    });

    it('returns null for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getUserById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // createUser
  // ═════════════════════════════════════════════════════════════
  describe('createUser', () => {
    it('creates user with hashed password and logs action', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email not taken
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-1',
        email: 'new@test.com',
        name: 'New User',
        isVerified: false,
        isActive: true,
      });

      const userId = await service.createUser(
        { email: 'New@Test.com', name: 'New User', password: 'SecurePass123!' },
        'admin-1'
      );

      expect(userId).toBe('new-user-1');
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePass123!', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@test.com', // Lowercased
          name: 'New User',
          passwordHash: 'hashed-new-password',
        }),
      });
      // Verify audit log was created
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing', email: 'taken@test.com' });

      await expect(
        service.createUser(
          { email: 'taken@test.com', password: 'pass123' },
          'admin-1'
        )
      ).rejects.toThrow('User with this email already exists');
    });

    it('defaults isActive to true and isVerified to false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        name: 'User',
        isVerified: false,
        isActive: true,
      });

      await service.createUser({ email: 'a@b.com', password: 'pass' }, 'admin-1');

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isVerified: false,
          isActive: true,
        }),
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // updateUser
  // ═════════════════════════════════════════════════════════════
  describe('updateUser', () => {
    const existingUser = {
      id: 'u1',
      email: 'old@test.com',
      name: 'Old Name',
      isVerified: true,
      isActive: true,
    };

    it('updates user fields and logs changes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue({ ...existingUser, name: 'New Name' });

      const result = await service.updateUser('u1', { name: 'New Name' }, 'admin-1');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ name: 'New Name' }),
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUser('nonexistent', { name: 'Test' }, 'admin-1')
      ).rejects.toThrow('User not found');
    });

    it('checks email uniqueness when updating email', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser) // First call: find existing user
        .mockResolvedValueOnce({ id: 'other', email: 'taken@test.com' }); // Second: email check

      await expect(
        service.updateUser('u1', { email: 'taken@test.com' }, 'admin-1')
      ).rejects.toThrow('Email already in use');
    });

    it('allows updating email when it is unique', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(existingUser)
        .mockResolvedValueOnce(null); // Email not taken
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.updateUser('u1', { email: 'new@test.com' }, 'admin-1');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ email: 'new@test.com' }),
      });
    });
  });

  // ═════════════════════════════════════════════════════════════
  // deleteUser
  // ═════════════════════════════════════════════════════════════
  describe('deleteUser', () => {
    const normalUser = {
      id: 'u1',
      email: 'user@test.com',
      name: 'Normal User',
      AdminRole: [],
    };

    it('soft-deletes user by deactivating', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(normalUser);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.deleteUser('u1', 'admin-1');

      expect(result).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ isActive: false }),
      });
    });

    it('hard-deletes user with cascading deletes in transaction', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(normalUser);

      const result = await service.deleteUser('u1', 'admin-1', true);

      expect(result).toBe(true);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      // Verify cascade deletion order
      expect(mockPrisma.auditLog.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
      expect(mockPrisma.project.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent', 'admin-1')).rejects.toThrow(
        'User not found'
      );
    });

    it('prevents deletion of user with active admin roles', async () => {
      const adminUser = {
        ...normalUser,
        AdminRole: [{ role: 'admin', isActive: true }],
      };
      mockPrisma.user.findUnique.mockResolvedValue(adminUser);

      await expect(service.deleteUser('u1', 'admin-1')).rejects.toThrow(
        'Cannot delete user with active admin roles'
      );
    });
  });

  // ═════════════════════════════════════════════════════════════
  // resetUserPassword
  // ═════════════════════════════════════════════════════════════
  describe('resetUserPassword', () => {
    it('hashes new password and updates user', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await service.resetUserPassword('u1', 'NewSecurePass!', 'admin-1');

      expect(result).toBe(true);
      expect(bcrypt.hash).toHaveBeenCalledWith('NewSecurePass!', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({ passwordHash: 'hashed-new-password' }),
      });
      // Should log with warning severity
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // assignAdminRole / removeAdminRole
  // ═════════════════════════════════════════════════════════════
  describe('assignAdminRole', () => {
    it('assigns role via adminAuthService and logs action', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
      mockPrisma.adminRole.create.mockResolvedValue({});

      const result = await service.assignAdminRole(
        'u1',
        AdminRoles.MODERATOR,
        'admin-1'
      );

      expect(result).toBe(true);
      expect(mockPrisma.adminRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'u1',
          role: AdminRoles.MODERATOR,
          assignedBy: 'admin-1',
          isActive: true,
        }),
      });
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.assignAdminRole('nonexistent', AdminRoles.ADMIN, 'admin-1')
      ).rejects.toThrow('User not found');
    });
  });

  describe('removeAdminRole', () => {
    it('removes role via adminAuthService and logs action', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'user@test.com' });
      mockPrisma.adminRole.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.removeAdminRole(
        'u1',
        AdminRoles.MODERATOR,
        'admin-1'
      );

      expect(result).toBe(true);
      expect(mockPrisma.adminRole.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', role: AdminRoles.MODERATOR, isActive: true },
        data: { isActive: false },
      });
    });

    it('throws when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.removeAdminRole('nonexistent', AdminRoles.ADMIN, 'admin-1')
      ).rejects.toThrow('User not found');
    });
  });

  // ═════════════════════════════════════════════════════════════
  // getUserStats
  // ═════════════════════════════════════════════════════════════
  describe('getUserStats', () => {
    it('returns aggregated user statistics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(1000) // total
        .mockResolvedValueOnce(950)  // active
        .mockResolvedValueOnce(800)  // verified
        .mockResolvedValueOnce(5)    // admins
        .mockResolvedValueOnce(50)   // newThisMonth
        .mockResolvedValueOnce(12);  // newThisWeek

      const stats = await service.getUserStats();

      expect(stats).toEqual({
        total: 1000,
        active: 950,
        verified: 800,
        admins: 5,
        newThisMonth: 50,
        newThisWeek: 12,
      });
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(6);
    });

    it('propagates database errors', async () => {
      mockPrisma.user.count.mockRejectedValue(new Error('DB down'));

      await expect(service.getUserStats()).rejects.toThrow('DB down');
    });
  });
});
