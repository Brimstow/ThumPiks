import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { EmailService } from './email.service';
import { EnhancedJWTService } from '../../services/jwt.enhanced.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export class AuthService {
  async register(email: string, password: string, name?: string) {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        logger.warn('Registration attempt with existing email', { email });
        throw new Error('User already exists');
      }

      // Enhanced password validation
      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      // Check for common password patterns
      const commonPasswords = ['password', '12345678', 'qwerty123'];
      if (commonPasswords.includes(password.toLowerCase())) {
        throw new Error('Password is too common, please choose a stronger password');
      }

      // Hash password with higher cost for better security
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: hashedPassword,
          name: name || null, // Convert undefined to null for Prisma
          isVerified: process.env.REQUIRE_EMAIL_VERIFICATION !== 'true', // Auto-verify if not required
        },
      });

      logger.info('User registered successfully', { 
        userId: user.id, 
        email: user.email 
      });

      // Send welcome email
      try {
        await EmailService.sendWelcomeEmail(email, name || '');
      } catch (emailError) {
        logger.warn('Failed to send welcome email', { 
          userId: user.id,
          error: emailError
        });
        // Don't fail registration if email fails
      }

      // Generate enhanced token pair
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
        ...tokens,
      };
    } catch (error: any) {
      logger.error('Registration failed', error, { email });
      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        logger.warn('Login attempt with non-existent email', { email });
        // Use generic error message to prevent email enumeration
        throw new Error('Invalid credentials');
      }

      // Check password with timing-safe comparison
      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        logger.warn('Login attempt with invalid password', { 
          userId: user.id,
          email 
        });
        throw new Error('Invalid credentials');
      }

      // Check if user is verified (if verification is required)
      if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
        throw new Error('Email verification required');
      }

      logger.info('User logged in successfully', { 
        userId: user.id,
        email: user.email 
      });

      // Generate enhanced token pair
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
        ...tokens,
      };
    } catch (error: any) {
      logger.error('Login failed', error, { email });
      throw error;
    }
  }

  async requestPasswordReset(email: string) {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // We don't reveal if the email exists or not for security reasons
        logger.info('Password reset requested for non-existent email', { email });
        return {
          message:
            'If your email is registered, you will receive a password reset link.',
        };
      }

      logger.info('Password reset requested', { 
        userId: user.id,
        email 
      });

      // Generate secure reset token
      const resetToken = EnhancedJWTService.createResetToken(user.id, user.email);

      // Send password reset email
      try {
        await EmailService.sendPasswordResetEmail(user.email, resetToken);
      } catch (emailError) {
        logger.error('Failed to send password reset email', emailError instanceof Error ? emailError : new Error(String(emailError)), {
          userId: user.id
        });
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

  async resetPassword(token: string, newPassword: string) {
    try {
      // Enhanced password validation
      if (newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters long');
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
        userId: decoded.userId
      });

      return { message: 'Password successfully reset' };
    } catch (error: any) {
      logger.error('Password reset failed', error);
      if (error.message.includes('Password must be')) {
        throw error; // Re-throw validation errors
      }
      throw new Error('Invalid password reset token');
    }
  }

  // New method: Refresh access token
  async refreshToken(refreshToken: string) {
    try {
      const decoded = EnhancedJWTService.verifyRefreshToken(refreshToken);
      
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          name: true,
          isVerified: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate new access token
      const newTokens = EnhancedJWTService.createTokens(user.id, user.email);

      logger.info('Token refreshed successfully', {
        userId: user.id
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isVerified: user.isVerified,
        },
        ...newTokens,
      };
    } catch (error: any) {
      logger.error('Token refresh failed', error);
      throw new Error('Invalid refresh token');
    }
  }
}
