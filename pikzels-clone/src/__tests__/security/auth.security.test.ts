import { AuthService } from '../../modules/auth/auth.service';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { AuthService } from '../../modules/auth/auth.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

// Mock the prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock email service
jest.mock('../../modules/auth/email.service', () => ({
  EmailService: {
    sendWelcomeEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

describe('Security - Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });

  describe('JWT Security', () => {
    test('should create tokens with proper expiration times', () => {
      const tokens = EnhancedJWTService.createTokens('user123', 'test@example.com');
      
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.sessionId).toBeTruthy();
      expect(tokens.expiresIn).toBe(900); // 15 minutes
    });

    test('should verify access tokens correctly', () => {
      const tokens = EnhancedJWTService.createTokens('user123', 'test@example.com');
      const decoded = EnhancedJWTService.verifyAccessToken(tokens.accessToken);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
    });

    test('should reject invalid tokens', () => {
      const invalidToken = 'invalid.token.here';
      const decoded = EnhancedJWTService.verifyAccessToken(invalidToken);
      
      expect(decoded).toBeNull();
    });

    test('should verify refresh tokens correctly', () => {
      const tokens = EnhancedJWTService.createTokens('user123', 'test@example.com');
      const decoded = EnhancedJWTService.verifyRefreshToken(tokens.refreshToken);
      
      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.type).toBe('refresh');
    });

    test('should reject access token as refresh token', () => {
      const tokens = EnhancedJWTService.createTokens('user123', 'test@example.com');
      const decoded = EnhancedJWTService.verifyRefreshToken(tokens.accessToken);
      
      expect(decoded).toBeNull();
    });
  });

  describe('Password Security', () => {
    test('should enforce minimum password length', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.register('test@example.com', 'short')
      ).rejects.toThrow('Password must be at least 8 characters long');
    });

    test('should reject common passwords', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.register('test@example.com', 'password')
      ).rejects.toThrow('Password is too common');
    });

    test('should accept strong passwords', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: true,
      });

      const result = await authService.register('test@example.com', 'SecurePass123!');
      
      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });
  });

  describe('Account Security', () => {
    test('should prevent duplicate email registration', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: 'test@example.com',
      });

      await expect(
        authService.register('test@example.com', 'SecurePass123!')
      ).rejects.toThrow('User already exists');
    });

    test('should use generic error for invalid login', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should not reveal user existence in password reset', async () => {
      const authService = new AuthService();
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');
      
      expect(result.message).toBe(
        'If your email is registered, you will receive a password reset link.'
      );
    });
  });

  describe('Session Security', () => {
    test('should generate unique session IDs', () => {
      const tokens1 = EnhancedJWTService.createTokens('user123', 'test@example.com');
      const tokens2 = EnhancedJWTService.createTokens('user123', 'test@example.com');
      
      expect(tokens1.sessionId).not.toBe(tokens2.sessionId);
    });

    test('should include session ID in tokens', () => {
      const tokens = EnhancedJWTService.createTokens('user123', 'test@example.com');
      const accessDecoded = EnhancedJWTService.verifyAccessToken(tokens.accessToken);
      const refreshDecoded = EnhancedJWTService.verifyRefreshToken(tokens.refreshToken);
      
      expect(accessDecoded?.sessionId).toBe(tokens.sessionId);
      expect(refreshDecoded?.sessionId).toBe(tokens.sessionId);
    });
  });
});