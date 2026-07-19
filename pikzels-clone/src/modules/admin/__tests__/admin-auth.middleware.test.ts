import { Request, Response, NextFunction } from 'express';

// Mock admin user object
const mockVerifyAdminToken = jest.fn();
const mockLogAdminAction = jest.fn();
const mockHasPermission = jest.fn();

// Mock dependencies BEFORE imports
jest.mock('../admin-auth.service', () => ({
  adminAuthService: {
    verifyAdminToken: mockVerifyAdminToken,
    logAdminAction: mockLogAdminAction,
    hasPermission: mockHasPermission,
  },
  ADMIN_PERMISSIONS: {
    USERS_VIEW: 'users:view',
    USERS_UPDATE: 'users:update',
    CONTENT_MODERATE: 'content:moderate',
    SYSTEM_CONFIG: 'system:config',
    ANALYTICS_VIEW: 'analytics:view',
  },
}));

// Now import the middleware AFTER mocks are set up
import {
  authenticateAdmin,
  requirePermission,
  requireRole,
  requireSuperAdmin,
  requireAdmin,
  adminRateLimit,
} from '../admin-auth.middleware';

describe('Admin Auth Middleware', () => {
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks
    mockVerifyAdminToken.mockReset();
    mockLogAdminAction.mockReset();
    mockHasPermission.mockReset();

    mockReq = {
      headers: {},
      originalUrl: '/admin/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn((header: string) => {
        if (header === 'User-Agent') return 'Mozilla/5.0 Test';
        return undefined;
      }),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('authenticateAdmin', () => {
    it('should authenticate valid admin token', async () => {
      const mockAdminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      mockVerifyAdminToken.mockResolvedValue(mockAdminUser);
      mockLogAdminAction.mockResolvedValue(undefined);

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyAdminToken).toHaveBeenCalledWith('valid-token');
      expect(mockReq.adminUser).toEqual(mockAdminUser);
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin-123',
        'ADMIN_API_ACCESS',
        'api',
        null,
        {
          endpoint: '/admin/test',
          method: 'GET',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 Test',
        }
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockVerifyAdminToken).not.toHaveBeenCalled();
    });

    it('should reject request with invalid authorization format', async () => {
      mockReq.headers.authorization = 'InvalidFormat token';

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid admin token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      mockVerifyAdminToken.mockResolvedValue(null);

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired admin token',
        code: 'ADMIN_TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      mockReq.headers.authorization = 'Bearer error-token';
      mockVerifyAdminToken.mockRejectedValue(new Error('Token verification failed'));

      // Mock console.error to avoid test output noise
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication error',
        code: 'ADMIN_AUTH_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should extract token from Bearer authorization correctly', async () => {
      const mockAdminUser = {
        id: 'admin-456',
        username: 'superadmin',
        email: 'superadmin@example.com',
        roles: ['super_admin'],
        permissions: ['*'],
      };

      mockReq.headers.authorization = 'Bearer my-complex-jwt-token-12345';
      mockVerifyAdminToken.mockResolvedValue(mockAdminUser);
      mockLogAdminAction.mockResolvedValue(undefined);

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockVerifyAdminToken).toHaveBeenCalledWith('my-complex-jwt-token-12345');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should allow access with required permission', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view', 'users:update'],
      };

      mockHasPermission.mockReturnValue(true);

      const middleware = requirePermission('users:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(mockReq.adminUser, 'users:view');
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access without admin user', () => {
      const middleware = requirePermission('users:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without required permission', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      mockHasPermission.mockReturnValue(false);
      mockLogAdminAction.mockResolvedValue(undefined);

      const middleware = requirePermission('users:delete');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(mockReq.adminUser, 'users:delete');
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin-123',
        'ADMIN_PERMISSION_DENIED',
        'permission',
        null,
        {
          requiredPermission: 'users:delete',
          userPermissions: ['users:view'],
          endpoint: '/admin/test',
          method: 'GET',
        },
        'warning'
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        code: 'ADMIN_PERMISSION_DENIED',
        required: 'users:delete',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle different permission types', () => {
      mockReq.adminUser = {
        id: 'admin-789',
        username: 'moderator',
        email: 'moderator@example.com',
        roles: ['moderator'],
        permissions: ['content:moderate'],
      };

      mockHasPermission.mockReturnValue(true);

      const middleware = requirePermission('content:moderate');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockHasPermission).toHaveBeenCalledWith(mockReq.adminUser, 'content:moderate');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should allow access with required role', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      const middleware = requireRole(['admin', 'super_admin']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access if user has any of the required roles', () => {
      mockReq.adminUser = {
        id: 'admin-456',
        username: 'superadmin',
        email: 'superadmin@example.com',
        roles: ['super_admin'],
        permissions: ['*'],
      };

      const middleware = requireRole(['admin', 'super_admin', 'moderator']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access without admin user', () => {
      const middleware = requireRole(['admin']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access without required role', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'moderator',
        email: 'moderator@example.com',
        roles: ['moderator'],
        permissions: ['content:moderate'],
      };

      mockLogAdminAction.mockResolvedValue(undefined);

      const middleware = requireRole(['admin', 'super_admin']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin-123',
        'ADMIN_ROLE_DENIED',
        'role',
        null,
        {
          requiredRoles: ['admin', 'super_admin'],
          userRoles: ['moderator'],
          endpoint: '/admin/test',
          method: 'GET',
        },
        'warning'
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient role privileges',
        code: 'ADMIN_ROLE_DENIED',
        required: ['admin', 'super_admin'],
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle multiple roles for user', () => {
      mockReq.adminUser = {
        id: 'admin-999',
        username: 'multirole',
        email: 'multirole@example.com',
        roles: ['admin', 'moderator'],
        permissions: ['users:view', 'content:moderate'],
      };

      const middleware = requireRole(['moderator']);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('requireSuperAdmin', () => {
    it('should allow access for super_admin role', () => {
      mockReq.adminUser = {
        id: 'admin-456',
        username: 'superadmin',
        email: 'superadmin@example.com',
        roles: ['super_admin'],
        permissions: ['*'],
      };

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-super_admin roles', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      mockLogAdminAction.mockResolvedValue(undefined);

      requireSuperAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    it('should allow access for admin role', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow access for super_admin role', () => {
      mockReq.adminUser = {
        id: 'admin-456',
        username: 'superadmin',
        email: 'superadmin@example.com',
        roles: ['super_admin'],
        permissions: ['*'],
      };

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should deny access for non-admin roles', () => {
      mockReq.adminUser = {
        id: 'admin-789',
        username: 'moderator',
        email: 'moderator@example.com',
        roles: ['moderator'],
        permissions: ['content:moderate'],
      };

      mockLogAdminAction.mockResolvedValue(undefined);

      requireAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('adminRateLimit', () => {
    let originalDateNow: () => number;
    let mockTime: number;

    beforeEach(() => {
      // Mock Date.now()
      mockTime = 1000000000000; // Starting time
      originalDateNow = Date.now;
      Date.now = jest.fn(() => mockTime);
    });

    afterEach(() => {
      // Restore Date.now()
      Date.now = originalDateNow;
    });

    it('should allow first request', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      const middleware = adminRateLimit(5, 60000); // 5 requests per minute
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow requests within limit', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      const middleware = adminRateLimit(5, 60000);

      // Make 5 requests
      for (let i = 0; i < 5; i++) {
        (mockNext as jest.Mock).mockClear();
        middleware(mockReq as Request, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      mockLogAdminAction.mockResolvedValue(undefined);

      const middleware = adminRateLimit(3, 60000); // 3 requests per minute

      // Make 3 requests (should all pass)
      for (let i = 0; i < 3; i++) {
        (mockNext as jest.Mock).mockClear();
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 4th request should be blocked
      (mockNext as jest.Mock).mockClear();
      (mockRes.status as jest.Mock).mockClear();
      (mockRes.json as jest.Mock).mockClear();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Rate limit exceeded',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        retryAfter: expect.any(Number),
      });
      expect(mockNext).not.toHaveBeenCalled();
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin-123',
        'ADMIN_RATE_LIMIT_EXCEEDED',
        'security',
        null,
        expect.objectContaining({
          endpoint: '/admin/test',
          maxRequests: 3,
          windowMs: 60000,
        }),
        'warning'
      );
    });

    it('should reset limit after time window', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      const middleware = adminRateLimit(2, 60000); // 2 requests per minute

      // Make 2 requests at time T
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Advance time by 61 seconds
      mockTime += 61000;

      // Next request should be allowed (old entries cleaned)
      (mockNext as jest.Mock).mockClear();
      (mockRes.status as jest.Mock).mockClear();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip rate limiting if no admin user', () => {
      const middleware = adminRateLimit(1, 60000);

      // Make multiple requests without admin user
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledTimes(3);
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle different endpoints separately', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      const middleware = adminRateLimit(2, 60000);

      // Make 2 requests to /admin/test
      middleware(mockReq as Request, mockRes as Response, mockNext);
      middleware(mockReq as Request, mockRes as Response, mockNext);

      // Change endpoint
      mockReq.originalUrl = '/admin/other';
      (mockNext as jest.Mock).mockClear();
      (mockRes.status as jest.Mock).mockClear();

      // Should allow request to different endpoint
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should use custom max requests and window', () => {
      mockReq.adminUser = {
        id: 'admin-123',
        username: 'admin',
        email: 'admin@example.com',
        roles: ['admin'],
        permissions: ['users:view'],
      };

      mockLogAdminAction.mockResolvedValue(undefined);

      const middleware = adminRateLimit(10, 30000); // 10 requests per 30 seconds

      // Make 10 requests (should all pass)
      for (let i = 0; i < 10; i++) {
        (mockNext as jest.Mock).mockClear();
        middleware(mockReq as Request, mockRes as Response, mockNext);
      }

      // 11th request should be blocked
      (mockNext as jest.Mock).mockClear();
      (mockRes.status as jest.Mock).mockClear();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockLogAdminAction).toHaveBeenCalledWith(
        'admin-123',
        'ADMIN_RATE_LIMIT_EXCEEDED',
        'security',
        null,
        expect.objectContaining({
          maxRequests: 10,
          windowMs: 30000,
        }),
        'warning'
      );
    });
  });
});
