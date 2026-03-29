import { getPrisma } from '../../utils/prisma-factory';
import crypto from 'crypto';
import { logger } from '../../utils/logger';
import bcrypt from 'bcryptjs';

const prisma = getPrisma();

// Rate limiting configuration
const RATE_LIMITS = {
  // Per email: 3 requests per hour
  perEmail: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  // Per IP: 10 requests per hour
  perIp: { maxRequests: 10, windowMs: 60 * 60 * 1000 },
};

// Token configuration
const TOKEN_CONFIG = {
  expiryHours: 1,
  tokenLength: 32,
};

export interface RequestPasswordResetResult {
  success: boolean;
  message: string;
  rateLimited?: boolean;
  token?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  message: string;
  userId?: string;
}

export class PasswordResetService {
  /**
   * Request a password reset token
   * Implements rate limiting per email and per IP
   */
  async requestPasswordReset(
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<RequestPasswordResetResult> {
    try {
      // Check rate limits before processing
      const rateLimitCheck = await this.checkRateLimits(email, ipAddress);
      if (rateLimitCheck.limited) {
        logger.warn('Password reset rate limit exceeded', {
          email,
          ipAddress,
          reason: rateLimitCheck.reason,
        });
        return {
          success: false,
          message: 'Too many reset attempts. Please try again later.',
          rateLimited: true,
        };
      }

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Don't reveal if email exists for security
        logger.info('Password reset requested for non-existent email', {
          email,
          ipAddress,
        });
        return {
          success: true,
          message:
            'If your email is registered, you will receive a password reset link.',
        };
      }

      // Invalidate any existing unused tokens for this user
      await this.invalidateExistingTokens(user.id);

      // Generate secure random token
      const token = crypto
        .randomBytes(TOKEN_CONFIG.tokenLength)
        .toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + TOKEN_CONFIG.expiryHours);

      // Store token in database
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          expiresAt,
        },
      });

      // Log the audit event
      await this.logAuditEvent({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        ipAddress,
        userAgent,
        details: { email },
      });

      logger.info('Password reset token created', {
        userId: user.id,
        email,
        ipAddress,
      });

      return {
        success: true,
        message:
          'If your email is registered, you will receive a password reset link.',
        token, // Return token for email service to use
      };
    } catch (error: any) {
      logger.error('Password reset request failed', error, {
        email,
        ipAddress,
      });
      throw new Error('Password reset request failed');
    }
  }

  /**
   * Verify a password reset token
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    message?: string;
  }> {
    try {
      const tokenRecord = await prisma.passwordResetToken.findUnique({
        where: { token },
      });

      if (!tokenRecord) {
        logger.warn('Invalid password reset token used', { token: '***' });
        return { valid: false, message: 'Invalid or expired reset token' };
      }

      if (tokenRecord.isUsed) {
        logger.warn('Reused password reset token attempt', {
          userId: tokenRecord.userId,
          token: '***',
        });
        return {
          valid: false,
          message: 'This reset link has already been used',
        };
      }

      if (new Date() > tokenRecord.expiresAt) {
        logger.warn('Expired password reset token used', {
          userId: tokenRecord.userId,
          token: '***',
        });
        return { valid: false, message: 'Reset link has expired' };
      }

      return { valid: true, userId: tokenRecord.userId };
    } catch (error: any) {
      logger.error('Token verification failed', error);
      return { valid: false, message: 'Invalid or expired reset token' };
    }
  }

  /**
   * Reset password with token
   * Implements session invalidation and audit logging
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ResetPasswordResult> {
    try {
      // Verify token first
      const verification = await this.verifyToken(token);
      if (!verification.valid || !verification.userId) {
        return { success: false, message: verification.message! };
      }

      const userId = verification.userId;

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Start transaction to ensure atomicity
      await prisma.$transaction(async tx => {
        // Update user's password
        await tx.user.update({
          where: { id: userId },
          data: { passwordHash: hashedPassword },
        });

        // Mark token as used
        await tx.passwordResetToken.update({
          where: { token },
          data: {
            isUsed: true,
            usedAt: new Date(),
          },
        });

        // Invalidate all existing sessions for this user
        await tx.userSession.updateMany({
          where: {
            userId,
            isActive: true,
          },
          data: {
            isActive: false,
            logoutAt: new Date(),
          },
        });
      });

      // Log the audit event
      await this.logAuditEvent({
        userId,
        action: 'PASSWORD_RESET_COMPLETED',
        ipAddress,
        userAgent,
        details: {
          sessionsInvalidated: true,
        },
      });

      logger.info('Password reset completed successfully', {
        userId,
        ipAddress,
      });

      return {
        success: true,
        message:
          'Password successfully reset. Please log in with your new password.',
        userId,
      };
    } catch (error: any) {
      logger.error('Password reset failed', error, { token: '***' });
      throw new Error('Password reset failed');
    }
  }

  /**
   * Check rate limits for password reset requests
   */
  private async checkRateLimits(
    email: string,
    ipAddress?: string
  ): Promise<{ limited: boolean; reason?: string }> {
    const now = new Date();
    const emailWindow = new Date(now.getTime() - RATE_LIMITS.perEmail.windowMs);
    const ipWindow = new Date(now.getTime() - RATE_LIMITS.perIp.windowMs);

    // Check per-email rate limit
    const emailCount = await prisma.passwordResetToken.count({
      where: {
        User: { email },
        createdAt: { gte: emailWindow },
      },
    });

    if (emailCount >= RATE_LIMITS.perEmail.maxRequests) {
      return {
        limited: true,
        reason: `Email ${email} exceeded ${RATE_LIMITS.perEmail.maxRequests} requests per hour`,
      };
    }

    // Check per-IP rate limit (if IP is provided)
    if (ipAddress) {
      const ipCount = await prisma.passwordResetToken.count({
        where: {
          ipAddress,
          createdAt: { gte: ipWindow },
        },
      });

      if (ipCount >= RATE_LIMITS.perIp.maxRequests) {
        return {
          limited: true,
          reason: `IP ${ipAddress} exceeded ${RATE_LIMITS.perIp.maxRequests} requests per hour`,
        };
      }
    }

    return { limited: false };
  }

  /**
   * Invalidate existing unused tokens for a user
   */
  private async invalidateExistingTokens(userId: string): Promise<void> {
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });
  }

  /**
   * Log audit events to the AuditLog table
   */
  private async logAuditEvent({
    userId,
    action,
    ipAddress,
    userAgent,
    details,
  }: {
    userId: string;
    action: string;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          action,
          resource: 'PASSWORD_RESET',
          details: details || {},
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          severity: 'info',
        },
      });
    } catch (error: any) {
      // Don't fail the main operation if audit logging fails
      logger.error('Failed to create audit log', error, {
        userId,
        action,
      });
    }
  }

  /**
   * Clean up expired tokens (can be called by a scheduled job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const result = await prisma.passwordResetToken.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
          isUsed: false,
        },
      });

      logger.info('Cleaned up expired password reset tokens', {
        count: result.count,
      });

      return result.count;
    } catch (error: any) {
      logger.error('Failed to cleanup expired tokens', error);
      return 0;
    }
  }
}

export const passwordResetService = new PasswordResetService();
