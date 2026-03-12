import { Request, Response, NextFunction } from 'express';

// Explicit mock — Partial<Response> loses methods under Express 5 + @types/express-serve-static-core v5
interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}
import { AuthRequest } from '../../types/auth';

// Mock Prisma user object
const mockUserFindUnique = jest.fn();

// Mock dependencies BEFORE imports
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: mockUserFindUnique,
    },
  })),
}));

jest.mock('../../services/jwt.enhanced.service');
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock subscription service and config
const mockGetCurrentSubscription = jest.fn();
const mockGetPlanById = jest.fn();

jest.mock('../../modules/subscription/subscription.service', () => ({
  getCurrentSubscription: (...args: any[]) =>
    mockGetCurrentSubscription(...args),
}));
jest.mock('../../modules/subscription/subscription.config', () => ({
  getPlanById: (...args: any[]) => mockGetPlanById(...args),
}));

// Now import the middleware AFTER mocks are set up
import {
  authenticateToken,
  authenticateRefreshToken,
  requireFeature,
} from '../auth.middleware';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { logger } from '../../utils/logger';

describe('Auth Middleware', () => {
  let mockReq: any;
  let mockRes: MockResponse;
  let mockNext: NextFunction;
  let mockPrisma: any;

  beforeEach(() => {
    // Reset the mock
    mockUserFindUnique.mockReset();
    mockPrisma = {
      user: {
        findUnique: mockUserFindUnique,
      },
    };
    mockReq = {
      headers: {},
      body: {},
      ip: '127.0.0.1',
      url: '/test',
      get: jest.fn(),
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(EnhancedJWTService.verifyAccessToken).toHaveBeenCalledWith(
        'valid-token'
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
        },
      });
      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        permissions: [
          'thumbnails:read',
          'thumbnails:write',
          'projects:read',
          'projects:write',
        ],
        sessionId: 'session-123',
        lastActivity: expect.any(Date),
      });
      expect(logger.info).toHaveBeenCalledWith(
        'User authenticated successfully',
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-123',
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      mockReq.headers.authorization = undefined;

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Authentication attempt without token',
        expect.objectContaining({ ip: '127.0.0.1' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token format', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue(null);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid token provided',
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'deleted-user',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Token valid but user not found',
        expect.objectContaining({ userId: 'deleted-user' })
      );
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject unverified user when email verification is required', async () => {
      process.env.REQUIRE_EMAIL_VERIFICATION = 'true';

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
      expect(mockNext).not.toHaveBeenCalled();

      delete process.env.REQUIRE_EMAIL_VERIFICATION;
    });

    it('should allow unverified user when email verification is not required', async () => {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle user without name gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
        isVerified: true,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockReq.user.name).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle token without sessionId (legacy)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        // No sessionId
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockReq.user.sessionId).toBe('legacy-session');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Authentication middleware error',
        expect.any(Error),
        expect.any(Object)
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        code: 'AUTH_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should attach all required user properties', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
      };

      mockReq.headers.authorization = 'Bearer valid-token';
      (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateToken(
        mockReq as Request,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockReq.user).toMatchObject({
        id: expect.any(String),
        email: expect.any(String),
        name: expect.any(String),
        role: expect.any(String),
        permissions: expect.any(Array),
        sessionId: expect.any(String),
        lastActivity: expect.any(Date),
      });
    });
  });

  describe('authenticateRefreshToken', () => {
    it('should authenticate valid refresh token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockReq.body.refreshToken = 'valid-refresh-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(EnhancedJWTService.verifyRefreshToken).toHaveBeenCalledWith(
        'valid-refresh-token'
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });
      expect(mockReq.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        permissions: [
          'thumbnails:read',
          'thumbnails:write',
          'projects:read',
          'projects:write',
        ],
        sessionId: 'session-123',
        lastActivity: expect.any(Date),
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should reject request without refresh token', async () => {
      mockReq.body = {};

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid refresh token', async () => {
      mockReq.body.refreshToken = 'invalid-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue(
        null
      );

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject refresh token for non-existent user', async () => {
      mockReq.body.refreshToken = 'valid-refresh-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'deleted-user',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockReq.body.refreshToken = 'valid-refresh-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(logger.error).toHaveBeenCalledWith(
        'Refresh token middleware error',
        expect.any(Error)
      );
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Token refresh failed',
        code: 'REFRESH_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle user without name gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: null,
      };

      mockReq.body.refreshToken = 'valid-refresh-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        sessionId: 'session-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockReq.user.name).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle refresh token without sessionId (legacy)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockReq.body.refreshToken = 'valid-refresh-token';
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
        // No sessionId
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await authenticateRefreshToken(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockReq.user.sessionId).toBe('legacy-session');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('requireFeature', () => {
    beforeEach(() => {
      mockGetCurrentSubscription.mockReset();
      mockGetPlanById.mockReset();
    });

    it('should reject unauthenticated requests', async () => {
      mockReq.user = undefined;

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when user has no subscription', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockResolvedValue(null);

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when plan is invalid/unknown', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockResolvedValue({
        id: 'sub-1',
        planType: 'nonexistent',
        creditsBalance: 10,
        status: 'active',
      });
      mockGetPlanById.mockReturnValue(null);

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid subscription plan',
        code: 'INVALID_PLAN',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject when feature is disabled (boolean false)', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockResolvedValue({
        id: 'sub-1',
        planType: 'free',
        creditsBalance: 5,
        status: 'active',
      });
      mockGetPlanById.mockReturnValue({
        id: 'free',
        name: 'Free',
        features: {
          abTesting: false,
          analytics: false,
          faceSwap: false,
        },
      });

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'This feature requires a higher subscription plan',
        code: 'FEATURE_NOT_AVAILABLE',
        feature: 'abTesting',
        currentPlan: 'free',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow when feature is enabled (boolean true)', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockResolvedValue({
        id: 'sub-1',
        planType: 'pro',
        creditsBalance: 120,
        status: 'active',
      });
      mockGetPlanById.mockReturnValue({
        id: 'pro',
        name: 'Creator Pro',
        features: {
          abTesting: true,
          analytics: true,
          faceSwap: 5,
        },
      });

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should allow when feature is numeric > 0 (e.g., faceSwap limit)', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockResolvedValue({
        id: 'sub-1',
        planType: 'starter',
        creditsBalance: 30,
        status: 'active',
      });
      mockGetPlanById.mockReturnValue({
        id: 'starter',
        name: 'Starter',
        features: {
          faceSwap: 1,
          abTesting: false,
        },
      });

      const middleware = requireFeature('faceSwap');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should attach subscription and planFeatures to request on success', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      const mockSubscription = {
        id: 'sub-1',
        planType: 'pro',
        creditsBalance: 120,
        status: 'active',
      };
      const mockFeatures = {
        abTesting: true,
        analytics: true,
        faceSwap: 5,
      };
      mockGetCurrentSubscription.mockResolvedValue(mockSubscription);
      mockGetPlanById.mockReturnValue({
        id: 'pro',
        name: 'Creator Pro',
        features: mockFeatures,
      });

      const middleware = requireFeature('analytics');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.subscription).toEqual({
        id: 'sub-1',
        planType: 'pro',
        creditsBalance: 120,
        status: 'active',
      });
      expect(mockReq.planFeatures).toEqual(mockFeatures);
    });

    it('should handle subscription service errors gracefully', async () => {
      mockReq.user = { id: 'user-123', email: 'test@example.com' };
      mockGetCurrentSubscription.mockRejectedValue(new Error('Database error'));

      const middleware = requireFeature('abTesting');
      await middleware(
        mockReq as AuthRequest,
        mockRes as unknown as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unable to verify subscription',
        code: 'SUBSCRIPTION_CHECK_ERROR',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
