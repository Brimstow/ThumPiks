import { AuthService } from '../auth.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { EmailService } from '../email.service';
import { EnhancedJWTService } from '../../../services/jwt.enhanced.service';
import { logger } from '../../../utils/logger';
import { PasswordUtils } from '../../../utils/password.utils';
import { UsernameUtils } from '../../../utils/username.utils';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('bcryptjs');
jest.mock('../email.service');
jest.mock('../../../services/jwt.enhanced.service');
jest.mock('../../../utils/logger');
jest.mock('../../../utils/password.utils');
jest.mock('../../../utils/username.utils');

describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: any;

  beforeAll(() => {
    mockPrisma = new PrismaClient();
  });

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegistrationData = {
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      password: 'StrongPass123!',
    };

    it('should register a new user successfully', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email doesn't exist
      mockPrisma.user.findFirst.mockResolvedValue(null); // Username doesn't exist
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
      });

      const mockUser = {
        id: 'user-id-123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        displayPreference: 'name',
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register(
        validRegistrationData.username,
        validRegistrationData.email,
        validRegistrationData.name,
        validRegistrationData.password
      );

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
        isVerified: false,
        displayPreference: 'name',
      });
      expect(result.accessToken).toBe('access_token');
      expect(result.refreshToken).toBe('refresh_token');
      expect(result.message).toContain('Please verify your email');
    });

    it('should reject registration with existing email', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      mockPrisma.user.findUnique.mockResolvedValue({ email: 'test@example.com' });

      await expect(
        authService.register(
          validRegistrationData.username,
          validRegistrationData.email,
          validRegistrationData.name,
          validRegistrationData.password
        )
      ).rejects.toThrow('Email already exists');

      expect(logger.warn).toHaveBeenCalledWith(
        'Registration attempt with existing email',
        { email: validRegistrationData.email }
      );
    });

    it('should reject registration with existing username', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue({ username: 'testuser' });

      await expect(
        authService.register(
          validRegistrationData.username,
          validRegistrationData.email,
          validRegistrationData.name,
          validRegistrationData.password
        )
      ).rejects.toThrow('Username already taken');

      expect(logger.warn).toHaveBeenCalledWith(
        'Registration attempt with existing username',
        { username: validRegistrationData.username }
      );
    });

    it('should reject registration with invalid username', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Username must be at least 3 characters',
      });

      await expect(
        authService.register('ab', 'test@example.com', 'Test User', 'StrongPass123!')
      ).rejects.toThrow('Username must be at least 3 characters');
    });

    it('should reject registration with weak password', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (PasswordUtils.validate as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters'],
      });

      await expect(
        authService.register('testuser', 'test@example.com', 'Test User', 'weak')
      ).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should continue registration even if verification email fails', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      (EmailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service down')
      );
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });

      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
        displayPreference: 'name',
      };
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await authService.register('testuser', 'test@example.com', 'Test User', 'Pass123!');

      expect(result.user.id).toBe('user-id');
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to send verification email',
        expect.objectContaining({ userId: 'user-id' })
      );
    });

    it('should store username in lowercase', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });
      mockPrisma.user.create.mockResolvedValue({ id: '123', username: 'testuser' });

      await authService.register('TestUser', 'test@example.com', 'Test', 'Pass123!');

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            username: 'testuser', // lowercase
          }),
        })
      );
    });

    it('should hash password with cost factor 12', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({ valid: true });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'token',
        refreshToken: 'refresh',
      });
      mockPrisma.user.create.mockResolvedValue({ id: '123' });

      await authService.register('testuser', 'test@example.com', 'Test', 'Pass123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('Pass123!', 12);
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      name: 'Test User',
      passwordHash: 'hashed_password',
      isVerified: true,
      displayPreference: 'name',
    };

    it('should login successfully with email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await authService.login('test@example.com', 'password');

      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        username: mockUser.username,
        name: mockUser.name,
        isVerified: true,
        displayPreference: 'name',
      });
      expect(result.accessToken).toBe('access');
      expect(result.requiresVerification).toBe(false);
    });

    it('should login successfully with username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await authService.login('testuser', 'password');

      expect(result.user.username).toBe('testuser');
      expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    });

    it('should reject login with non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('nonexistent@example.com', 'password')).rejects.toThrow(
        'Invalid credentials'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Login attempt with non-existent identifier',
        expect.objectContaining({ identifier: 'nonexistent@example.com' })
      );
    });

    it('should reject login with invalid password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Login attempt with invalid password',
        expect.objectContaining({ userId: mockUser.id })
      );
    });

    it('should update lastLoginAt on successful login', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      await authService.login('test@example.com', 'password');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it('should indicate verification requirement for unverified users', async () => {
      const unverifiedUser = { ...mockUser, isVerified: false };
      mockPrisma.user.findUnique.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(unverifiedUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      const result = await authService.login('test@example.com', 'password');

      expect(result.requiresVerification).toBe(true);
    });

    it('should handle username case-insensitively', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'access',
        refreshToken: 'refresh',
      });

      await authService.login('TESTUSER', 'password');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: {
            equals: 'testuser', // lowercased
            mode: 'insensitive',
          },
        },
      });
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully with valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, isVerified: true });

      const result = await authService.verifyEmail('valid-token');

      expect(result.user.isVerified).toBe(true);
      expect(result.message).toBe('Email verified successfully');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          isVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });
    });

    it('should reject invalid or expired token', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token'
      );

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid or expired verification token used',
        { token: 'invalid-token' }
      );
    });
  });

  describe('resendVerification', () => {
    it('should resend verification email for unverified user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        isVerified: false,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUser);
      (EmailService.sendVerificationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await authService.resendVerification('test@example.com');

      expect(result.message).toBe('Verification email sent successfully');
      expect(EmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should return generic message for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.resendVerification('nonexistent@example.com');

      expect(result.message).toContain('If your email is registered');
      expect(EmailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should reject resend for already verified email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        isVerified: true,
      });

      await expect(authService.resendVerification('test@example.com')).rejects.toThrow(
        'Email is already verified'
      );
    });

    it('should handle email sending failures', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test',
        isVerified: false,
      });
      mockPrisma.user.update.mockResolvedValue({});
      (EmailService.sendVerificationEmail as jest.Mock).mockRejectedValue(
        new Error('Email service down')
      );

      await expect(authService.resendVerification('test@example.com')).rejects.toThrow(
        'Failed to send verification email'
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should send password reset email for existing user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (EnhancedJWTService.createResetToken as jest.Mock).mockReturnValue('reset-token');
      (EmailService.sendPasswordResetEmail as jest.Mock).mockResolvedValue({
        resetToken: 'reset-token',
      });

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.message).toContain('If your email is registered');
      expect(EmailService.sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'reset-token');
    });

    it('should return generic message for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await authService.requestPasswordReset('nonexistent@example.com');

      expect(result.message).toContain('If your email is registered');
      expect(logger.info).toHaveBeenCalledWith(
        'Password reset requested for non-existent email',
        { email: 'nonexistent@example.com' }
      );
    });

    it('should return generic message even if email sending fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
      (EnhancedJWTService.createResetToken as jest.Mock).mockReturnValue('token');
      (EmailService.sendPasswordResetEmail as jest.Mock).mockRejectedValue(new Error('Email fail'));

      const result = await authService.requestPasswordReset('test@example.com');

      expect(result.message).toContain('If your email is registered');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully with valid token', async () => {
      (EnhancedJWTService.verifyResetToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
      });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.resetPassword('valid-token', 'NewPass123!');

      expect(result.message).toBe('Password successfully reset');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { passwordHash: 'new_hashed_password' },
      });
    });

    it('should reject weak password', async () => {
      (PasswordUtils.validate as jest.Mock).mockReturnValue({
        valid: false,
        errors: ['Password must be at least 8 characters'],
      });

      await expect(authService.resetPassword('token', 'weakpass')).rejects.toThrow(
        'Password must be at least 8 characters'
      );

      // Password validation happens before token verification
      expect(EnhancedJWTService.verifyResetToken).not.toHaveBeenCalled();
    });

    it('should reject invalid reset token', async () => {
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (EnhancedJWTService.verifyResetToken as jest.Mock).mockReturnValue(null);

      await expect(authService.resetPassword('invalid-token', 'NewPass123!')).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should hash password with cost factor 12', async () => {
      (EnhancedJWTService.verifyResetToken as jest.Mock).mockReturnValue({ userId: 'user-123' });
      (PasswordUtils.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.update.mockResolvedValue({});

      await authService.resetPassword('token', 'NewPass123!');

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPass123!', 12);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        name: 'Test User',
        isVerified: true,
        isActive: true,
        displayPreference: 'name',
      };

      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({
        userId: 'user-123',
      });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (EnhancedJWTService.createTokens as jest.Mock).mockReturnValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });

      const result = await authService.refreshToken('old-refresh-token');

      expect(result.user.id).toBe('user-123');
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('should reject invalid refresh token', async () => {
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue(null);

      await expect(authService.refreshToken('invalid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject refresh for non-existent user', async () => {
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refreshToken('valid-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should reject refresh for deactivated account', async () => {
      (EnhancedJWTService.verifyRefreshToken as jest.Mock).mockReturnValue({ userId: 'user-123' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        isActive: false,
      });

      // Note: The catch block in refreshToken masks the specific error
      // This is the actual behavior - it throws generic "Invalid refresh token"
      await expect(authService.refreshToken('valid-token')).rejects.toThrow(
        'Invalid refresh token'
      );

      // But we can verify the error was logged with the specific message
      expect(logger.error).toHaveBeenCalledWith(
        'Token refresh failed',
        expect.objectContaining({ message: 'Account is deactivated' })
      );
    });
  });

  describe('generateUsernameSuggestions', () => {
    it('should generate username suggestions successfully', async () => {
      (UsernameUtils.generateSuggestions as jest.Mock).mockResolvedValue([
        'john_doe',
        'johndoe123',
        'john.doe',
      ]);

      const result = await authService.generateUsernameSuggestions('John Doe', 'john@example.com');

      expect(result.suggestions).toEqual(['john_doe', 'johndoe123', 'john.doe']);
      expect(UsernameUtils.generateSuggestions).toHaveBeenCalledWith(
        'John Doe',
        'john@example.com'
      );
    });

    it('should handle suggestion generation errors', async () => {
      (UsernameUtils.generateSuggestions as jest.Mock).mockRejectedValue(
        new Error('Generation failed')
      );

      await expect(
        authService.generateUsernameSuggestions('John Doe', 'john@example.com')
      ).rejects.toThrow('Failed to generate username suggestions');
    });
  });

  describe('checkUsernameAvailability', () => {
    it('should return available for valid unused username', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({
        valid: true,
      });

      const result = await authService.checkUsernameAvailability('newuser');

      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return unavailable with error for taken username', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockResolvedValue({
        valid: false,
        error: 'Username already taken',
      });

      const result = await authService.checkUsernameAvailability('existinguser');

      expect(result.available).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    it('should handle validation errors', async () => {
      (UsernameUtils.validateUsername as jest.Mock).mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(authService.checkUsernameAvailability('testuser')).rejects.toThrow(
        'Failed to check username availability'
      );
    });
  });

  describe('updateDisplayPreference', () => {
    it('should update display preference to name', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.updateDisplayPreference('user-123', 'name');

      expect(result.message).toBe('Display preference updated successfully');
      expect(result.displayPreference).toBe('name');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { displayPreference: 'name' },
      });
    });

    it('should update display preference to username', async () => {
      mockPrisma.user.update.mockResolvedValue({});

      const result = await authService.updateDisplayPreference('user-123', 'username');

      expect(result.displayPreference).toBe('username');
    });

    it('should handle update errors', async () => {
      mockPrisma.user.update.mockRejectedValue(new Error('Database error'));

      await expect(
        authService.updateDisplayPreference('user-123', 'name')
      ).rejects.toThrow('Failed to update display preference');
    });
  });
});
