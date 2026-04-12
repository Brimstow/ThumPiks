import { OAuthService } from '../oauth.service';
import { PrismaClient } from '@prisma/client';
import { EnhancedJWTService } from '../../../services/jwt.enhanced.service';
import passport from 'passport';
import { logger } from '../../../utils/logger';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    subscription: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('../../../services/jwt.enhanced.service');
jest.mock('passport');
jest.mock('passport-google-oauth20');
jest.mock('passport-github2');
jest.mock('../../../utils/logger');

describe('OAuthService', () => {
  let mockPrisma: any;
  const originalEnv = process.env;

  beforeAll(() => {
    mockPrisma = new PrismaClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('initializePassport', () => {
    it('should initialize Google OAuth strategy when credentials are provided', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-google-secret';

      OAuthService.initializePassport();

      expect(passport.use).toHaveBeenCalled();
      expect(passport.serializeUser).toHaveBeenCalled();
      expect(passport.deserializeUser).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Google OAuth strategy initialized'
      );
    });

    it('should initialize GitHub OAuth strategy when credentials are provided', () => {
      process.env.GITHUB_CLIENT_ID = 'test-github-client-id';
      process.env.GITHUB_CLIENT_SECRET = 'test-github-secret';

      OAuthService.initializePassport();

      expect(passport.use).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'GitHub OAuth strategy initialized'
      );
    });

    it('should not initialize OAuth strategies when credentials are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GITHUB_CLIENT_ID;
      delete process.env.GITHUB_CLIENT_SECRET;

      OAuthService.initializePassport();

      expect(passport.serializeUser).toHaveBeenCalled();
      expect(passport.deserializeUser).toHaveBeenCalled();
    });

    it('should serialize user correctly', () => {
      OAuthService.initializePassport();

      const serializeCallback = (passport.serializeUser as jest.Mock).mock
        .calls[0][0];
      const done = jest.fn();
      const user = { id: 'user123', email: 'test@example.com' };

      serializeCallback(user, done);

      expect(done).toHaveBeenCalledWith(null, 'user123');
    });

    it('should deserialize user successfully', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        isVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      OAuthService.initializePassport();

      const deserializeCallback = (passport.deserializeUser as jest.Mock).mock
        .calls[0][0];
      const done = jest.fn();

      await deserializeCallback('user123', done);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          isVerified: true,
        },
      });
      expect(done).toHaveBeenCalledWith(null, mockUser);
    });

    it('should handle deserialize error', async () => {
      const error = new Error('Database error');
      mockPrisma.user.findUnique.mockRejectedValue(error);
      OAuthService.initializePassport();

      const deserializeCallback = (passport.deserializeUser as jest.Mock).mock
        .calls[0][0];
      const done = jest.fn();

      await deserializeCallback('user123', done);

      expect(done).toHaveBeenCalledWith(error, null);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should handle OAuth callback for existing user', async () => {
      const profile = {
        id: 'oauth-id-123',
        provider: 'google',
        emails: [{ value: 'existing@example.com' }],
        displayName: 'Existing User',
        photos: [{ value: 'https://example.com/photo.jpg' }],
      };

      const existingUser = {
        id: 'user123',
        email: 'existing@example.com',
        name: 'Existing User',
        avatarUrl: null,
        isVerified: false,
      };

      const updatedUser = {
        ...existingUser,
        avatarUrl: 'https://example.com/photo.jpg',
        isVerified: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          name: 'Existing User',
          avatarUrl: 'https://example.com/photo.jpg',
          isVerified: true,
        },
      });
      expect(done).toHaveBeenCalledWith(null, updatedUser);
      expect(logger.info).toHaveBeenCalledWith('OAuth login successful', {
        userId: 'user123',
        provider: 'google',
        email: 'existing@example.com',
      });
    });

    it('should create new user for OAuth signup', async () => {
      const profile = {
        id: 'oauth-id-456',
        provider: 'github',
        emails: [{ value: 'newuser@example.com' }],
        displayName: 'New User',
        photos: [{ value: 'https://example.com/avatar.jpg' }],
      };

      const newUser = {
        id: expect.any(String),
        email: 'newuser@example.com',
        username: 'newuser',
        name: 'New User',
        avatarUrl: 'https://example.com/avatar.jpg',
        passwordHash: '',
        isVerified: true,
        updatedAt: expect.any(Date),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(newUser);

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'newuser@example.com',
          username: 'newuser',
          name: 'New User',
          avatarUrl: 'https://example.com/avatar.jpg',
          passwordHash: '',
          isVerified: true,
        }),
      });
      expect(done).toHaveBeenCalledWith(null, newUser);
      expect(logger.info).toHaveBeenCalledWith(
        'OAuth user created with free subscription',
        {
          userId: expect.any(String),
          provider: 'github',
          email: 'newuser@example.com',
        }
      );
    });

    it('should reject OAuth callback when no email provided', async () => {
      const profile = {
        id: 'oauth-id-789',
        provider: 'google',
        emails: [],
        displayName: 'User Without Email',
      };

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(done).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No email address provided by OAuth provider',
        }),
        null
      );
    });

    it('should generate username from email correctly', async () => {
      const profile = {
        id: 'oauth-id-999',
        provider: 'google',
        emails: [{ value: 'john.doe+test@example.com' }],
        displayName: 'John Doe',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'johndoetest', // Special chars removed, lowercase
        }),
      });
    });

    it('should use username from profile if displayName is missing', async () => {
      const profile = {
        id: 'oauth-id-111',
        provider: 'github',
        emails: [{ value: 'dev@example.com' }],
        username: 'cooldev',
        // displayName is optional, so omit it entirely
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({});

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'cooldev',
        }),
      });
    });

    it('should preserve existing user name and avatar if already set', async () => {
      const profile = {
        id: 'oauth-id-222',
        provider: 'google',
        emails: [{ value: 'user@example.com' }],
        displayName: 'New Name',
        photos: [{ value: 'https://new-avatar.com/img.jpg' }],
      };

      const existingUser = {
        id: 'user123',
        email: 'user@example.com',
        name: 'Original Name',
        avatarUrl: 'https://original-avatar.com/img.jpg',
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);
      mockPrisma.user.update.mockResolvedValue(existingUser);

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          name: 'Original Name', // Keeps existing
          avatarUrl: 'https://original-avatar.com/img.jpg', // Keeps existing
          isVerified: true,
        },
      });
    });

    it('should handle database errors during OAuth callback', async () => {
      const profile = {
        id: 'oauth-id-333',
        provider: 'github',
        emails: [{ value: 'error@example.com' }],
        displayName: 'Error User',
      };

      const dbError = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      const done = jest.fn();

      await OAuthService.handleOAuthCallback(
        'access-token',
        'refresh-token',
        profile,
        done
      );

      expect(done).toHaveBeenCalledWith(dbError, null);
      expect(logger.error).toHaveBeenCalledWith(
        'OAuth callback error',
        dbError,
        expect.objectContaining({
          provider: 'github',
          profileId: 'oauth-id-333',
        })
      );
    });
  });

  describe('generateTokensForOAuthUser', () => {
    it('should generate tokens for OAuth user successfully', async () => {
      const user = {
        id: 'user123',
        email: 'oauth@example.com',
        name: 'OAuth User',
        avatarUrl: 'https://example.com/avatar.jpg',
        isVerified: true,
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue(
        mockTokens
      );

      const result = await OAuthService.generateTokensForOAuthUser(user);

      expect(EnhancedJWTService.createTokens).toHaveBeenCalledWith(
        'user123',
        'oauth@example.com'
      );
      expect(result).toEqual({
        user: {
          id: 'user123',
          email: 'oauth@example.com',
          name: 'OAuth User',
          avatarUrl: 'https://example.com/avatar.jpg',
          isVerified: true,
        },
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
      expect(logger.info).toHaveBeenCalledWith('OAuth tokens generated', {
        userId: 'user123',
        email: 'oauth@example.com',
      });
    });

    it('should throw error when token generation fails', async () => {
      const user = {
        id: 'user456',
        email: 'error@example.com',
        name: 'Error User',
        isVerified: false,
      };

      const tokenError = new Error('JWT signing failed');
      (EnhancedJWTService.createTokens as jest.Mock).mockImplementation(() => {
        throw tokenError;
      });

      await expect(
        OAuthService.generateTokensForOAuthUser(user)
      ).rejects.toThrow('Failed to generate authentication tokens');

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to generate OAuth tokens',
        tokenError,
        { userId: 'user456' }
      );
    });
  });
});
