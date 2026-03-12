// Mock environment variables first
process.env.JWT_SECRET = 'test-secret-key-that-is-32-chars-long!!';
process.env.JWT_ACCESS_EXPIRY = '15m';

// Mock dependencies before imports
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}));

// Mock Admin Auth Service (ROOT PROBLEM FIX)
jest.mock('../admin-auth.service', () => ({
  adminAuthService: {
    authenticateAdmin: jest.fn(),
    verifyAdminToken: jest.fn(),
    hasPermission: jest.fn(),
    logAdminAction: jest.fn(),
    assignAdminRole: jest.fn(),
    removeAdminRole: jest.fn(),
  },
  AdminRoles: {
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin',
  },
  ADMIN_PERMISSIONS: {
    USERS_VIEW: 'users.view',
    USERS_CREATE: 'users.create',
    USERS_UPDATE: 'users.update',
    USERS_DELETE: 'users.delete',
    ANALYTICS_VIEW: 'analytics.view',
  },
}));

// Mock User Management Service
jest.mock('../user-management.service', () => ({
  userManagementService: {
    getUsers: jest.fn(),
    getUserById: jest.fn(),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    getUserStats: jest.fn(),
  },
}));

// Mock Prisma Client
const mockPrisma = {
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
    findMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

// Now import the modules
import request from 'supertest';
import { createServer } from 'http';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Import admin routes
import adminAuthRoutes from '../admin-auth.routes';
import userManagementRoutes from '../user-management.routes';
import { adminAuthService, AdminRoles } from '../admin-auth.service';
import { userManagementService } from '../user-management.service';

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Add admin routes
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/admin/users', userManagementRoutes);

  return app;
};

describe('Admin Routing Tests', () => {
  let app: express.Application;
  const mockAdminAuthService = adminAuthService as jest.Mocked<
    typeof adminAuthService
  >;
  const mockUserManagementService = userManagementService as jest.Mocked<
    typeof userManagementService
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();

    // Setup default admin auth service mocks (ROOT PROBLEM FIX)
    const mockAdminUser = {
      id: 'admin123',
      email: 'admin@test.com',
      name: 'Admin User',
      roles: [AdminRoles.ADMIN],
      permissions: [
        'users.view',
        'users.create',
        'users.update',
        'users.delete',
      ],
      lastLoginAt: new Date(),
    };

    mockAdminAuthService.verifyAdminToken.mockResolvedValue(mockAdminUser);
    mockAdminAuthService.hasPermission.mockReturnValue(true);
    mockAdminAuthService.logAdminAction.mockResolvedValue(undefined);

    // Setup authenticateAdmin mock for login routes
    mockAdminAuthService.authenticateAdmin.mockResolvedValue({
      user: mockAdminUser,
      token: 'mock-admin-token',
    });

    // Setup other admin service mocks
    mockAdminAuthService.assignAdminRole.mockResolvedValue(true);
    mockAdminAuthService.removeAdminRole.mockResolvedValue(true);

    // Setup user management service mocks (ROOT PROBLEM FIX)
    mockUserManagementService.getUsers.mockResolvedValue({
      users: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
    mockUserManagementService.getUserById.mockResolvedValue(null);
    mockUserManagementService.createUser.mockResolvedValue('new-user-id');
    mockUserManagementService.updateUser.mockResolvedValue(true);
    mockUserManagementService.deleteUser.mockResolvedValue(true);
    mockUserManagementService.getUserStats.mockResolvedValue({
      total: 100,
      active: 85,
      verified: 70,
      admins: 5,
      newThisMonth: 15,
      newThisWeek: 3,
    });
  });

  describe('Admin Authentication Routes', () => {
    describe('POST /api/admin/auth/login', () => {
      it('should handle admin login successfully', async () => {
        const mockAdmin = {
          id: 'admin123',
          email: 'admin@test.com',
          name: 'Admin User',
          passwordHash: 'hashedPassword',
          isActive: true,
          adminRoles: [
            {
              role: AdminRoles.ADMIN,
              isActive: true,
              expiresAt: null,
            },
          ],
        };

        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
        mockPrisma.user.update.mockResolvedValue(mockAdmin);
        mockPrisma.auditLog.create.mockResolvedValue({});
        (jwt.sign as jest.Mock).mockReturnValue('mock-jwt-token');

        const response = await request(createServer(app))
          .post('/api/admin/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'password123',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('token');
        expect(response.body).toHaveProperty('admin');
        expect(response.body.admin.email).toBe('admin@test.com');
      });

      it('should reject invalid credentials', async () => {
        // Override the authenticateAdmin mock to return null for invalid credentials
        mockAdminAuthService.authenticateAdmin.mockResolvedValueOnce(null);
        mockPrisma.auditLog.create.mockResolvedValue({});

        const response = await request(createServer(app))
          .post('/api/admin/auth/login')
          .send({
            email: 'invalid@test.com',
            password: 'wrongpassword',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate required fields', async () => {
        const response = await request(createServer(app))
          .post('/api/admin/auth/login')
          .send({
            email: 'invalid-email',
            // missing password
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('GET /api/admin/auth/me', () => {
      it('should return current admin info with valid token', async () => {
        const mockDecoded = {
          userId: 'admin123',
          email: 'admin@test.com',
          type: 'admin',
        };

        const mockAdmin = {
          id: 'admin123',
          email: 'admin@test.com',
          name: 'Admin User',
          isActive: true,
          adminRoles: [
            {
              role: AdminRoles.ADMIN,
              isActive: true,
              expiresAt: null,
            },
          ],
        };

        (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

        const response = await request(createServer(app))
          .get('/api/admin/auth/me')
          .set('Authorization', 'Bearer valid-admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('admin');
        expect(response.body.admin.email).toBe('admin@test.com');
      });

      it('should reject request without token', async () => {
        const response = await request(createServer(app)).get(
          '/api/admin/auth/me'
        );

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject invalid token', async () => {
        // Override the verifyAdminToken mock to return null for invalid token
        mockAdminAuthService.verifyAdminToken.mockResolvedValueOnce(null);

        const response = await request(createServer(app))
          .get('/api/admin/auth/me')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/admin/auth/logout', () => {
      it('should handle admin logout', async () => {
        const mockDecoded = {
          userId: 'admin123',
          email: 'admin@test.com',
          type: 'admin',
        };

        const mockAdmin = {
          id: 'admin123',
          email: 'admin@test.com',
          name: 'Admin User',
          isActive: true,
          adminRoles: [
            {
              role: AdminRoles.ADMIN,
              isActive: true,
              expiresAt: null,
            },
          ],
        };

        (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
        mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
        mockPrisma.auditLog.create.mockResolvedValue({});

        const response = await request(createServer(app))
          .post('/api/admin/auth/logout')
          .set('Authorization', 'Bearer valid-admin-token');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('message');
      });
    });

    describe('GET /api/admin/auth/health', () => {
      it('should return health check status', async () => {
        const response = await request(createServer(app)).get(
          '/api/admin/auth/health'
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('service', 'admin-auth');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
      });
    });
  });

  describe('User Management Routes', () => {
    const mockAdminToken = 'valid-admin-token';

    beforeEach(() => {
      // Setup mock admin authentication for user management routes
      const mockDecoded = {
        userId: 'admin123',
        email: 'admin@test.com',
        type: 'admin',
      };

      const mockAdmin = {
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        isActive: true,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null,
          },
        ],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
    });

    beforeEach(() => {
      // Setup mock admin authentication
      const mockDecoded = {
        userId: 'admin123',
        email: 'admin@test.com',
        type: 'admin',
        roles: [AdminRoles.ADMIN],
        permissions: [
          'users.view',
          'users.create',
          'users.update',
          'users.delete',
        ],
      };

      const mockAdmin = {
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        isActive: true,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null,
          },
        ],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
    });

    describe('GET /api/admin/users', () => {
      it('should return paginated user list', async () => {
        const mockUsers = [
          {
            id: 'user1',
            email: 'user1@test.com',
            name: 'User One',
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            adminRoles: [],
            _count: { projects: 2, thumbnails: 5 },
          },
          {
            id: 'user2',
            email: 'user2@test.com',
            name: 'User Two',
            isVerified: false,
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: null,
            adminRoles: [],
            _count: { projects: 1, thumbnails: 3 },
          },
        ];

        // Mock the service call instead of Prisma directly
        mockUserManagementService.getUsers.mockResolvedValueOnce({
          users: mockUsers,
          pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
        });

        const response = await request(createServer(app))
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${mockAdminToken}`)
          .query({
            page: 1,
            limit: 10,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('users');
        expect(response.body.data).toHaveProperty('pagination');
        expect(response.body.data.users).toHaveLength(2);
      });

      it('should handle filtering by search term', async () => {
        const mockUsers = [
          {
            id: 'user1',
            email: 'john@test.com',
            name: 'John Doe',
            isVerified: true,
            isActive: true,
            createdAt: new Date(),
            lastLoginAt: new Date(),
            adminRoles: [],
            _count: { projects: 1, thumbnails: 2 },
          },
        ];

        // Mock the service call instead of Prisma directly
        mockUserManagementService.getUsers.mockResolvedValueOnce({
          users: mockUsers,
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        });

        const response = await request(createServer(app))
          .get('/api/admin/users')
          .set('Authorization', `Bearer ${mockAdminToken}`)
          .query({
            search: 'john',
            page: 1,
            limit: 10,
          });

        expect(response.status).toBe(200);
        expect(response.body.data.users).toHaveLength(1);
        expect(response.body.data.users[0].name).toBe('John Doe');
      });

      it('should reject unauthorized access', async () => {
        const response = await request(createServer(app)).get(
          '/api/admin/users'
        );

        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/admin/users/:userId', () => {
      it('should return specific user details', async () => {
        const validUUID = '550e8400-e29b-41d4-a716-446655440000';
        const mockUser = {
          id: validUUID,
          email: 'user@test.com',
          name: 'Test User',
          avatarUrl: null,
          isVerified: true,
          isActive: true,
          settings: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: null,
          adminRoles: [],
          projects: [],
          thumbnails: [],
          subscriptions: [],
        };

        // Override the service mock to return the user for this test
        mockUserManagementService.getUserById.mockResolvedValueOnce(mockUser);

        const response = await request(createServer(app))
          .get(`/api/admin/users/${validUUID}`)
          .set('Authorization', `Bearer ${mockAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data.id).toBe(validUUID);
        expect(response.body.data.email).toBe('user@test.com');
      });

      it('should return 404 for non-existent user', async () => {
        // Mock service to return null for non-existent user
        mockUserManagementService.getUserById.mockResolvedValueOnce(null);

        const response = await request(createServer(app))
          .get('/api/admin/users/550e8400-e29b-41d4-a716-446655440000')
          .set('Authorization', `Bearer ${mockAdminToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/admin/users', () => {
      it('should create new user successfully', async () => {
        const newUser = {
          email: 'newuser@test.com',
          name: 'New User',
          password: 'securepassword123',
        };

        const createdUser = {
          id: 'newuser123',
          email: newUser.email,
          name: newUser.name,
          isActive: true,
          createdAt: new Date(),
        };

        (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
        mockPrisma.user.create.mockResolvedValue(createdUser);
        mockPrisma.auditLog.create.mockResolvedValue({});

        const response = await request(createServer(app))
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${mockAdminToken}`)
          .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('userId');
        expect(response.body).toHaveProperty(
          'message',
          'User created successfully'
        );
      });

      it('should validate required fields', async () => {
        const response = await request(createServer(app))
          .post('/api/admin/users')
          .set('Authorization', `Bearer ${mockAdminToken}`)
          .send({
            email: 'invalid-email',
            // missing required fields
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('GET /api/admin/users/stats', () => {
      it('should return user statistics', async () => {
        // Mock the database queries for stats
        mockPrisma.user.count
          .mockResolvedValueOnce(100) // total users
          .mockResolvedValueOnce(95) // active users
          .mockResolvedValueOnce(15); // new users this month

        const response = await request(createServer(app))
          .get('/api/admin/users/stats')
          .set('Authorization', `Bearer ${mockAdminToken}`);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('total');
        expect(response.body.data).toHaveProperty('active');
        expect(response.body.data).toHaveProperty('newThisMonth');
      });
    });

    describe('GET /api/admin/users/health', () => {
      it('should return health check status', async () => {
        const response = await request(createServer(app)).get(
          '/api/admin/users/health'
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('service', 'user-management');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('version');
      });
    });
  });

  describe('Route Parameter Validation', () => {
    const mockAdminToken = 'valid-admin-token';

    beforeEach(() => {
      // Setup mock admin authentication
      const mockDecoded = {
        userId: 'admin123',
        email: 'admin@test.com',
        type: 'admin',
        roles: [AdminRoles.ADMIN],
        permissions: ['users.view', 'users.update', 'users.delete'],
      };

      const mockAdmin = {
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        isActive: true,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null,
          },
        ],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);
    });

    it('should validate userId parameter format', async () => {
      const response = await request(createServer(app))
        .get('/api/admin/users/invalid-user-id-format')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // Should handle gracefully even with invalid format
      expect([400, 404]).toContain(response.status);
    });

    it('should handle special characters in routes', async () => {
      const response = await request(createServer(app))
        .get('/api/admin/users/@#$%^&*()')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      // Should handle gracefully
      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Mock service to throw database error
      mockUserManagementService.getUsers.mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const mockDecoded = {
        userId: 'admin123',
        email: 'admin@test.com',
        type: 'admin',
        roles: [AdminRoles.ADMIN],
        permissions: ['users.view'],
      };

      const mockAdmin = {
        id: 'admin123',
        email: 'admin@test.com',
        name: 'Admin User',
        isActive: true,
        adminRoles: [
          {
            role: AdminRoles.ADMIN,
            isActive: true,
            expiresAt: null,
          },
        ],
      };

      (jwt.verify as jest.Mock).mockReturnValue(mockDecoded);
      mockPrisma.user.findUnique.mockResolvedValue(mockAdmin);

      const response = await request(createServer(app))
        .get('/api/admin/users')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(createServer(app))
        .post('/api/admin/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });
  });
});
