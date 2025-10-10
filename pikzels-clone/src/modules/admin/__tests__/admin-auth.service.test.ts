// Mock environment variables first
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRY = '15m';

// Mock dependencies before imports
jest.mock('bcryptjs', () => ({
  compare: jest.fn()
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
}));

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn()
  },
  adminRole: {
    create: jest.fn(),
    updateMany: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn()
  }
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// Now import the modules
import { AdminAuthService, AdminRoles, ADMIN_PERMISSIONS } from '../admin-auth.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('AdminAuthService', () => {
  let adminAuthService: AdminAuthService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create fresh service instance
    adminAuthService = new AdminAuthService();
  });

  describe('authenticateAdmin', () => {
    it('should authenticate admin with valid credentials', async () => {
      const mockUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        passwordHash: 'hashedPassword',
        isActive: true,
        lastLoginAt: null,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null
          }
        ]
      };

      // Setup mocks
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      mockPrisma.auditLog.create.mockResolvedValue({});
      (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

      const result = await adminAuthService.authenticateAdmin(
        'admin@test.com',
        'password123',
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBeTruthy();
      expect(result?.user.email).toBe('admin@test.com');
      expect(result?.user.roles).toContain(AdminRoles.ADMIN);
      expect(result?.token).toBe('mock-jwt-token');
    });

    it('should fail authentication with invalid password', async () => {
      const mockUser = {
        id: 'user123',
        email: 'admin@test.com',
        passwordHash: 'hashedPassword',
        isActive: true,
        adminRoles: [{ role: AdminRoles.ADMIN, isActive: true }]
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await adminAuthService.authenticateAdmin(
        'admin@test.com',
        'wrongpassword',
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBeNull();
    });

    it('should fail authentication for user without admin roles', async () => {
      const mockUser = {
        id: 'user123',
        email: 'user@test.com',
        passwordHash: 'hashedPassword',
        isActive: true,
        adminRoles: []
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await adminAuthService.authenticateAdmin(
        'user@test.com',
        'password123',
        '127.0.0.1',
        'test-agent'
      );

      expect(result).toBeNull();
    });
  });

  describe('assignAdminRole', () => {
    it('should successfully assign admin role to user', async () => {
      mockPrisma.adminRole.create.mockResolvedValue({
        id: 'role123',
        userId: 'user123',
        role: AdminRoles.MODERATOR,
        isActive: true
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await adminAuthService.assignAdminRole(
        'user123',
        AdminRoles.MODERATOR,
        'admin123'
      );

      expect(result).toBe(true);
      expect(mockPrisma.adminRole.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          role: AdminRoles.MODERATOR,
          assignedBy: 'admin123',
          isActive: true
        })
      });
    });

    it('should handle errors when assigning role', async () => {
      mockPrisma.adminRole.create.mockRejectedValue(new Error('Database error'));

      const result = await adminAuthService.assignAdminRole(
        'user123',
        AdminRoles.MODERATOR,
        'admin123'
      );

      expect(result).toBe(false);
    });
  });

  describe('removeAdminRole', () => {
    it('should successfully remove admin role from user', async () => {
      mockPrisma.adminRole.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await adminAuthService.removeAdminRole(
        'user123',
        AdminRoles.MODERATOR,
        'admin123'
      );

      expect(result).toBe(true);
      expect(mockPrisma.adminRole.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user123', role: AdminRoles.MODERATOR, isActive: true },
        data: { isActive: false }
      });
    });
  });

  describe('hasPermission', () => {
    it('should return true for user with required permission', () => {
      const adminUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        roles: [AdminRoles.ADMIN],
        permissions: [ADMIN_PERMISSIONS.USERS_VIEW, ADMIN_PERMISSIONS.USERS_UPDATE]
      };

      const result = adminAuthService.hasPermission(adminUser, ADMIN_PERMISSIONS.USERS_VIEW);
      expect(result).toBe(true);
    });

    it('should return false for user without required permission', () => {
      const adminUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        roles: [AdminRoles.ANALYST],
        permissions: [ADMIN_PERMISSIONS.ANALYTICS_VIEW]
      };

      const result = adminAuthService.hasPermission(adminUser, ADMIN_PERMISSIONS.USERS_DELETE);
      expect(result).toBe(false);
    });
  });

  describe('verifyAdminToken', () => {
    it('should verify valid admin token', async () => {
      const mockDecoded = {
        userId: 'user123',
        email: 'admin@test.com',
        type: 'admin'
      };

      const mockUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        isActive: true,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null
          }
        ]
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await adminAuthService.verifyAdminToken('valid-token');

      expect(result).toBeTruthy();
      expect(result?.email).toBe('admin@test.com');
      expect(result?.roles).toContain(AdminRoles.ADMIN);
    });

    it('should reject non-admin token', async () => {
      const mockDecoded = {
        userId: 'user123',
        email: 'user@test.com',
        type: 'user'
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded as any);

      const result = await adminAuthService.verifyAdminToken('user-token');

      expect(result).toBeNull();
    });
  });

  describe('hasRole', () => {
    it('should return true for user with required role', () => {
      const adminUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        roles: [AdminRoles.ADMIN, AdminRoles.MODERATOR],
        permissions: []
      };

      const result = adminAuthService.hasRole(adminUser, [AdminRoles.ADMIN]);
      expect(result).toBe(true);
    });

    it('should return false for user without required role', () => {
      const adminUser = {
        id: 'user123',
        email: 'admin@test.com',
        name: 'Admin User',
        roles: [AdminRoles.ANALYST],
        permissions: []
      };

      const result = adminAuthService.hasRole(adminUser, [AdminRoles.ADMIN, AdminRoles.MODERATOR]);
      expect(result).toBe(false);
    });
  });
});