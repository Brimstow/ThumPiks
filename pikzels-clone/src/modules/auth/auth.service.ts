import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { EmailService } from './email.service';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { logger } from '../../utils/logger';
import { PasswordUtils } from '../../utils/password.utils';
import { UsernameUtils } from '../../utils/username.utils';

const prisma = new PrismaClient();

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
        throw new Error(usernameValidation.error || 'Invalid username');
      }

      // Check if email already exists
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        logger.warn('Registration attempt with existing email', { email });
        throw new Error('Email already exists');
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
        logger.warn('Registration attempt with existing username', { username });
        throw new Error('Username already taken');
      }

      // Validate password with OWASP standards
      const passwordValidation = PasswordUtils.validate(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.errors.join(', '));
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

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Send verification email
      try {
        await EmailService.sendVerificationEmail(
          email,
          name,
          verificationToken
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
        message: 'Registration successful. Please verify your email to unlock all features.',
      };
    } catch (error: any) {
      logger.error('Registration failed', error, { email, username });
      throw error;
    }
  }

  /**
   * Login with username OR email
   */
  async login(identifier: string, password: string) {
    try {
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
        throw new Error('Invalid credentials');
      }

      // Verify password with timing-safe comparison
      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        logger.warn('Login attempt with invalid password', {
          userId: user.id,
          identifier,
        });
        throw new Error('Invalid credentials');
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
    } catch (error: any) {
      logger.error('Login failed', error, { identifier });
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
    } catch (error: any) {
      logger.error('Email verification failed', error, { token });
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
          message: 'If your email is registered, you will receive a verification email.',
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
          verificationToken
        );
      } catch (emailError) {
        logger.error('Failed to resend verification email', {
          userId: user.id,
          error: emailError,
        });
        throw new Error('Failed to send verification email');
      }

      logger.info('Verification email resent', {
        userId: user.id,
        email: user.email,
      });

      return {
        message: 'Verification email sent successfully',
      };
    } catch (error: any) {
      logger.error('Resend verification failed', error, { email });
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
        await EmailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        logger.error(
          'Failed to send password reset email',
          emailError instanceof Error ? emailError : new Error(String(emailError)),
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
    } catch (error: any) {
      logger.error('Password reset request failed', error, { email });
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
    } catch (error: any) {
      logger.error('Password reset failed', error);
      if (error.message.includes('Password must be')) {
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
    } catch (error: any) {
      logger.error('Token refresh failed', error);
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
    } catch (error: any) {
      logger.error('Username suggestion generation failed', error);
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
    } catch (error: any) {
      logger.error('Username availability check failed', error);
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
    } catch (error: any) {
      logger.error('Display preference update failed', error, { userId });
      throw new Error('Failed to update display preference');
    }
  }
}
