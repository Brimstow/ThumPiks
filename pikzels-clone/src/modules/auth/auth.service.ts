import { getPrisma } from '../../utils/prisma-factory';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from '../email/email.service';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { logger } from '../../utils/logger';
import { PasswordUtils } from '../../utils/password.utils';
import { UsernameUtils } from '../../utils/username.utils';
import { v4 as uuidv4 } from 'uuid';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../../utils/errors';

const prisma = getPrisma();

export class AuthService {
  /**
   * Register a new user with username, email, name, and password
   */
  async register(
    username: string,
    email: string,
    name: string,
    password: string
  ) {
    try {
      // Validate username
      const usernameValidation = await UsernameUtils.validateUsername(username);
      if (!usernameValidation.valid) {
        const error = usernameValidation.error || 'Invalid username';
        // Username already exists is a conflict, not a validation error
        if (
          error.toLowerCase().includes('already taken') ||
          error.toLowerCase().includes('already exists')
        ) {
          throw new ConflictError(error);
        }
        throw new ValidationError(error);
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        logger.warn('Registration attempt with existing email', { email });
        throw new ConflictError('Email already exists');
      }

      // Check if username already exists (case-insensitive)
      const existingUsername = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: 'insensitive',
          },
        },
      });

      if (existingUsername) {
        logger.warn('Registration attempt with existing username', {
          username,
        });
        throw new ConflictError('Username already taken');
      }

      // Validate password with OWASP standards
      const passwordValidation = PasswordUtils.validate(password);
      if (!passwordValidation.valid) {
        throw new ValidationError(passwordValidation.errors.join(', '));
      }

      // Hash password with high cost factor
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24); // 24 hour expiry

      // Create user (store username in lowercase for consistency)
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          username: username.toLowerCase(),
          email,
          name,
          passwordHash: hashedPassword,
          isVerified: false, // Require email verification
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
          displayPreference: 'name', // Default to showing name
        },
      });

      // Create free subscription for new user
      await prisma.subscription.create({
        data: {
          id: uuidv4(),
          userId: user.id,
          planType: 'free',
          status: 'active',
          creditsBalance: 150, // Free plan credits
          creditsUsed: 0,
          periodStart: new Date(),
          periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          billingProvider: 'none',
        },
      });

      logger.info('User registered successfully with free subscription', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          email,
          name,
          verificationToken,
          user.id
        );
      } catch (emailError) {
        logger.warn('Failed to send verification email', {
          userId: user.id,
          error: emailError,
        });
        // Don't fail registration if email fails
      }

      // Generate token pair (user can explore but not save)
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          isVerified: user.isVerified,
          displayPreference: user.displayPreference,
        },
        ...tokens,
        message:
          'Registration successful. Please verify your email to unlock all features.',
      };
    } catch (error: unknown) {
      logger.error('Registration failed', error instanceof Error ? error : new Error(String(error)), { email, username });
      throw error;
    }
  }

  /**
   * Login with username OR email
   */
  async login(
    identifier: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      // DEMO MODE: Test credential bypass for demos and staging environments
      // Set DEMO_MODE=true in your environment to enable test accounts
      // This is safer than checking NODE_ENV since it's explicit and intentional
      const isDemoMode = process.env.DEMO_MODE === 'true';
      if (
        isDemoMode &&
        identifier === 'test@example.com' &&
        password === 'Test123!'
      ) {
        logger.info('🎭 Demo mode: Test credentials used (DEMO_MODE=true)');

        // Find or create test user
        let testUser = await prisma.user.findUnique({
          where: { email: 'test@example.com' },
        });

        if (!testUser) {
          // Create test user if it doesn't exist
          const hashedPassword = await bcrypt.hash(password, 12);
          testUser = await prisma.user.create({
            data: {
              id: uuidv4(),
              username: 'testuser',
              email: 'test@example.com',
              name: 'Test User',
              passwordHash: hashedPassword,
              isVerified: true, // Auto-verify test user
              displayPreference: 'name',
            },
          });
          logger.info('🧪 Test user created', { userId: testUser.id });
        }

        // Update last login
        await prisma.user.update({
          where: { id: testUser.id },
          data: { lastLoginAt: new Date() },
        });

        const tokens = EnhancedJWTService.createTokens(
          testUser.id,
          testUser.email
        );
        return {
          user: {
            id: testUser.id,
            email: testUser.email,
            username: testUser.username,
            name: testUser.name,
            isVerified: testUser.isVerified,
            displayPreference: testUser.displayPreference,
          },
          ...tokens,
          requiresVerification: false,
        };
      }

      // Determine if identifier is email or username
      const isEmail = identifier.includes('@');

      // Find user by email or username (case-insensitive)
      const user = isEmail
        ? await prisma.user.findUnique({
            where: { email: identifier },
          })
        : await prisma.user.findFirst({
            where: {
              username: {
                equals: identifier.toLowerCase(),
                mode: 'insensitive',
              },
            },
          });

      if (!user) {
        logger.warn('Login attempt with non-existent identifier', {
          identifier,
          isEmail,
        });
        // Generic error to prevent enumeration
        throw new UnauthorizedError('Invalid credentials');
      }

      // Verify password with timing-safe comparison
      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        logger.warn('Login attempt with invalid password', {
          userId: user.id,
          identifier,
        });
        throw new UnauthorizedError('Invalid credentials');
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
        ipAddress,
        userAgent,
      });

      // Generate token pair
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          isVerified: user.isVerified,
          displayPreference: user.displayPreference,
        },
        ...tokens,
        requiresVerification: !user.isVerified,
      };
    } catch (error: unknown) {
      logger.error('Login failed', error instanceof Error ? error : new Error(String(error)), { identifier });
      throw error;
    }
  }

  /**
   * Logout user and terminate session
   */
  async logout(userId: string, sessionId: string) {
    try {
      logger.info('User logged out successfully', {
        userId,
        sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : undefined,
      });
      return { success: true };
    } catch (error: unknown) {
      logger.error('Logout failed in service', error instanceof Error ? error : new Error(String(error)), { userId });
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string) {
    try {
      // Find user with this verification token
      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: {
            gt: new Date(), // Token must not be expired
          },
        },
      });

      if (!user) {
        logger.warn('Invalid or expired verification token used', { token });
        throw new Error('Invalid or expired verification token');
      }

      // Update user as verified and clear token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });

      logger.info('Email verified successfully', {
        userId: user.id,
        email: user.email,
      });

      return {
        message: 'Email verified successfully',
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          isVerified: true,
        },
      };
    } catch (error: unknown) {
      logger.error('Email verification failed', error instanceof Error ? error : new Error(String(error)), { token });
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists
        return {
          message:
            'If your email is registered, you will receive a verification email.',
        };
      }

      if (user.isVerified) {
        throw new Error('Email is already verified');
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const verificationExpiry = new Date();
      verificationExpiry.setHours(verificationExpiry.getHours() + 24);

      // Update user with new token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: verificationToken,
          emailVerificationExpiry: verificationExpiry,
        },
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          email,
          user.name,
          verificationToken,
          user.id
        );
      } catch (emailError) {
        logger.error(
          'Failed to resend verification email',
          emailError instanceof Error
            ? emailError
            : new Error(String(emailError)),
          {
            userId: user.id,
          }
        );
        throw new Error('Failed to send verification email');
      }

      logger.info('Verification email resent', {
        userId: user.id,
        email: user.email,
      });

      return {
        message: 'Verification email sent successfully',
      };
    } catch (error: unknown) {
      logger.error('Resend verification failed', error instanceof Error ? error : new Error(String(error)), { email });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists for security
        logger.info('Password reset requested for non-existent email', {
          email,
        });
        return {
          message:
            'If your email is registered, you will receive a password reset link.',
        };
      }

      logger.info('Password reset requested', {
        userId: user.id,
        email,
      });

      // Generate secure reset token
      const resetToken = EnhancedJWTService.createResetToken(
        user.id,
        user.email
      );

      // Send password reset email
      try {
        await EmailService.sendPasswordResetEmail(user.email, resetToken, user.id);
      } catch (emailError) {
        logger.error(
          'Failed to send password reset email',
          emailError instanceof Error
            ? emailError
            : new Error(String(emailError)),
          {
            userId: user.id,
          }
        );
        // Return generic message even if email fails
      }

      return {
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    } catch (error: unknown) {
      logger.error('Password reset request failed', error instanceof Error ? error : new Error(String(error)), { email });
      throw new Error('Password reset request failed');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      // Validate new password with OWASP standards
      const passwordValidation = PasswordUtils.validate(newPassword);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Verify the reset token
      const decoded = EnhancedJWTService.verifyResetToken(token);

      if (!decoded?.userId) {
        logger.warn('Invalid password reset token used');
        throw new Error('Invalid or expired reset token');
      }

      // Hash the new password with high cost
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update user's password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash: hashedPassword },
      });

      logger.info('Password reset successfully', {
        userId: decoded.userId,
      });

      return { message: 'Password successfully reset' };
    } catch (error: unknown) {
      logger.error('Password reset failed', error instanceof Error ? error : new Error(String(error)));
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Password must be')) {
        throw error; // Re-throw validation errors
      }
      throw new Error('Invalid or expired reset token');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = EnhancedJWTService.verifyRefreshToken(refreshToken);

      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          username: true,
          name: true,
          isVerified: true,
          isActive: true,
          displayPreference: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Generate new token pair
      const newTokens = EnhancedJWTService.createTokens(user.id, user.email);

      logger.info('Token refreshed successfully', {
        userId: user.id,
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          name: user.name,
          isVerified: user.isVerified,
          displayPreference: user.displayPreference,
        },
        ...newTokens,
      };
    } catch (error: unknown) {
      logger.error('Token refresh failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Generate username suggestions
   */
  async generateUsernameSuggestions(fullName: string, email: string) {
    try {
      const suggestions = await UsernameUtils.generateSuggestions(
        fullName,
        email
      );

      return {
        suggestions,
      };
    } catch (error: unknown) {
      logger.error('Username suggestion generation failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to generate username suggestions');
    }
  }

  /**
   * Check username availability
   */
  async checkUsernameAvailability(username: string) {
    try {
      const validation = await UsernameUtils.validateUsername(username);

      return {
        available: validation.valid,
        error: validation.error,
      };
    } catch (error: unknown) {
      logger.error('Username availability check failed', error instanceof Error ? error : new Error(String(error)));
      throw new Error('Failed to check username availability');
    }
  }

  /**
   * Update display preference
   */
  async updateDisplayPreference(
    userId: string,
    preference: 'name' | 'username'
  ) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { displayPreference: preference },
      });

      logger.info('Display preference updated', {
        userId,
        preference,
      });

      return {
        message: 'Display preference updated successfully',
        displayPreference: preference,
      };
    } catch (error: unknown) {
      logger.error('Display preference update failed', error instanceof Error ? error : new Error(String(error)), { userId });
      throw new Error('Failed to update display preference');
    }
  }
}
