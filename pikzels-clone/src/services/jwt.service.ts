import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';
import { isProductionLike } from '../utils/env';
import { getPrisma } from '../utils/prisma-factory';

const prisma = getPrisma();

// Enhanced JWT configuration with proper error handling
export const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET; // secretlint-disable-line
  if (!secret || secret === 'your-secret-key') {
    if (isProductionLike()) {
      logger.error('JWT_SECRET not set in environment variables');
      throw new Error('JWT_SECRET must be set in production/staging');
    }
    logger.warn('Using default JWT secret - not suitable for production');
    return 'your-secret-key';
  }
  return secret;
};

const getRefreshSecret = (): string => {
  const secret = process.env.REFRESH_TOKEN_SECRET; // secretlint-disable-line
  if (!secret) {
    if (isProductionLike()) {
      logger.error('REFRESH_TOKEN_SECRET not set in environment variables');
      throw new Error('REFRESH_TOKEN_SECRET must be set in production/staging');
    }
    logger.warn('Using default refresh secret - not suitable for production');
    return 'your-refresh-secret-key';
  }
  return secret;
};

const JWT_CONFIG = {
  access: {
    secret: getJWTSecret(), // secretlint-disable-line
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  },
  refresh: {
    secret: getRefreshSecret(), // secretlint-disable-line
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  reset: {
    secret: getJWTSecret(), // secretlint-disable-line
    expiresIn: process.env.JWT_RESET_EXPIRY || '1h',
  },
};

interface TokenPayload {
  userId: string;
  email: string;
  tokenType: 'access' | 'refresh' | 'reset';
  sessionId?: string;
  action?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class JWTService {
  /**
   * Generate a secure session ID
   */
  private static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create access token
   */
  static createAccessToken(
    userId: string,
    email: string,
    sessionId?: string
  ): string {
    const payload: TokenPayload = {
      userId,
      email,
      tokenType: 'access',
      sessionId: sessionId || this.generateSessionId(),
    };

    return jwt.sign(payload, JWT_CONFIG.access.secret, {
      expiresIn: JWT_CONFIG.access.expiresIn,
      issuer: 'thumbnail-maker-studio',
      audience: 'thumbnail-maker-users',
    } as jwt.SignOptions) as string;
  }

  /**
   * Create refresh token
   */
  static createRefreshToken(
    userId: string,
    email: string,
    sessionId: string
  ): string {
    const payload: TokenPayload = {
      userId,
      email,
      tokenType: 'refresh',
      sessionId,
    };

    return jwt.sign(payload, JWT_CONFIG.refresh.secret, {
      expiresIn: JWT_CONFIG.refresh.expiresIn,
      issuer: 'thumbnail-maker-studio',
      audience: 'thumbnail-maker-users',
    } as jwt.SignOptions) as string;
  }

  /**
   * Create password reset token
   */
  static createResetToken(userId: string, email: string): string {
    const payload: TokenPayload = {
      userId,
      email,
      tokenType: 'reset',
      action: 'reset-password',
    };

    return jwt.sign(payload, JWT_CONFIG.reset.secret, {
      expiresIn: JWT_CONFIG.reset.expiresIn,
      issuer: 'thumbnail-maker-studio',
      audience: 'thumbnail-maker-users',
    } as jwt.SignOptions) as string;
  }

  /**
   * Create complete token pair (access + refresh)
   */
  static async createTokenPair(
    userId: string,
    email: string
  ): Promise<TokenPair> {
    const sessionId = this.generateSessionId();

    const accessToken = this.createAccessToken(userId, email, sessionId);
    const refreshToken = this.createRefreshToken(userId, email, sessionId);

    // Store refresh token hash in database for security
    await this.storeRefreshToken(userId, sessionId, refreshToken);

    // Calculate expiration times in seconds
    const accessExpiresIn = this.parseExpiryToSeconds(
      JWT_CONFIG.access.expiresIn
    );
    const refreshExpiresIn = this.parseExpiryToSeconds(
      JWT_CONFIG.refresh.expiresIn
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn,
    };
  }

  /**
   * Verify and decode any token type
   */
  static verifyToken(
    token: string,
    tokenType: 'access' | 'refresh' | 'reset'
  ): TokenPayload {
    try {
      let secret: string;

      switch (tokenType) {
        case 'access':
          secret = JWT_CONFIG.access.secret; // secretlint-disable-line
          break;
        case 'refresh':
          secret = JWT_CONFIG.refresh.secret; // secretlint-disable-line
          break;
        case 'reset':
          secret = JWT_CONFIG.reset.secret; // secretlint-disable-line
          break;
        default:
          throw new Error('Invalid token type');
      }

      const decoded = jwt.verify(token, secret, {
        issuer: 'thumbnail-maker-studio',
        audience: 'thumbnail-maker-users',
      }) as TokenPayload;

      // Verify token type matches expected
      if (decoded.tokenType !== tokenType) {
        throw new Error('Token type mismatch');
      }

      return decoded;
    } catch (error: any) {
      logger.warn('Token verification failed', {
        error: error.message,
        tokenType,
      });
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshAccessToken(
    refreshToken: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const decoded = this.verifyToken(refreshToken, 'refresh');

      // Verify refresh token exists in database and is valid
      const isValidRefreshToken = await this.verifyRefreshTokenInDB(
        decoded.userId,
        decoded.sessionId!,
        refreshToken
      );

      if (!isValidRefreshToken) {
        throw new Error('Invalid refresh token');
      }

      // Create new access token with same session ID
      const accessToken = this.createAccessToken(
        decoded.userId,
        decoded.email,
        decoded.sessionId
      );
      const expiresIn = this.parseExpiryToSeconds(JWT_CONFIG.access.expiresIn);

      logger.info('Access token refreshed', {
        userId: decoded.userId,
        sessionId: decoded.sessionId,
      });

      return {
        accessToken,
        expiresIn,
      };
    } catch (error: any) {
      logger.warn('Refresh token failed', {
        error: error.message,
      });
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Revoke all tokens for a user (logout)
   */
  static async revokeAllTokens(userId: string): Promise<void> {
    try {
      // Clear all refresh tokens from database (stored in settings)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...(user?.settings as any),
            refreshTokens: {},
          },
        },
      });

      logger.info('All tokens revoked for user', { userId });
    } catch (error: any) {
      logger.error('Failed to revoke tokens', error, {
        userId,
      });
      throw new Error('Failed to revoke tokens');
    }
  }

  /**
   * Revoke specific session (logout from single device)
   */
  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    try {
      // Remove specific session from database
      await this.removeRefreshToken(userId, sessionId);

      logger.info('Session revoked', { userId, sessionId });
    } catch (error: any) {
      logger.error('Failed to revoke session', error, {
        userId,
        sessionId,
      });
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Parse expiry string to seconds
   */
  private static parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match?.[1]) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 60 * 60 * 24;
      default:
        return 900;
    }
  }

  /**
   * Store refresh token in database (hashed)
   */
  private static async storeRefreshToken(
    userId: string,
    sessionId: string,
    refreshToken: string
  ): Promise<void> {
    try {
      const hash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Get current refresh tokens
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const currentTokens = (user?.settings as any)?.refreshTokens || {};

      // Add new refresh token
      const updatedTokens = {
        ...currentTokens,
        [sessionId]: {
          hash,
          createdAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
        },
      };

      // Update user settings with refresh tokens
      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...(user?.settings as any),
            refreshTokens: updatedTokens,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to store refresh token', error, {
        userId,
        sessionId,
      });
      throw new Error('Failed to store refresh token');
    }
  }

  /**
   * Verify refresh token in database
   */
  private static async verifyRefreshTokenInDB(
    userId: string,
    sessionId: string,
    refreshToken: string
  ): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const refreshTokens = (user?.settings as any)?.refreshTokens || {};
      const tokenData = refreshTokens[sessionId];

      if (!tokenData) {
        return false;
      }

      const hash = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      if (tokenData.hash !== hash) {
        return false;
      }

      // Update last used timestamp
      await this.updateRefreshTokenLastUsed(userId, sessionId);

      return true;
    } catch (error: any) {
      logger.error('Failed to verify refresh token in DB', error, {
        userId,
        sessionId,
      });
      return false;
    }
  }

  /**
   * Remove refresh token from database
   */
  private static async removeRefreshToken(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const refreshTokens = (user?.settings as any)?.refreshTokens || {};
      delete refreshTokens[sessionId];

      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...(user?.settings as any),
            refreshTokens,
          },
        },
      });
    } catch (error: any) {
      logger.error('Failed to remove refresh token', error, {
        userId,
        sessionId,
      });
      throw new Error('Failed to remove refresh token');
    }
  }

  /**
   * Update refresh token last used timestamp
   */
  private static async updateRefreshTokenLastUsed(
    userId: string,
    sessionId: string
  ): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const refreshTokens = (user?.settings as any)?.refreshTokens || {};

      if (refreshTokens[sessionId]) {
        refreshTokens[sessionId].lastUsed = new Date().toISOString();

        await prisma.user.update({
          where: { id: userId },
          data: {
            settings: {
              ...(user?.settings as any),
              refreshTokens,
            },
          },
        });
      }
    } catch (error: any) {
      logger.error('Failed to update refresh token timestamp', error, {
        userId,
        sessionId,
      });
    }
  }

  /**
   * Clean expired refresh tokens (should be run periodically)
   */
  static async cleanExpiredTokens(): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        select: { id: true, settings: true },
      });

      for (const user of users) {
        const refreshTokens = (user.settings as any)?.refreshTokens || {};
        const now = new Date();
        const expiryMs =
          this.parseExpiryToSeconds(JWT_CONFIG.refresh.expiresIn) * 1000;

        let hasExpiredTokens = false;

        for (const [sessionId, tokenData] of Object.entries(refreshTokens)) {
          const createdAt = new Date((tokenData as any).createdAt);

          if (now.getTime() - createdAt.getTime() > expiryMs) {
            delete refreshTokens[sessionId];
            hasExpiredTokens = true;
          }
        }

        if (hasExpiredTokens) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              settings: {
                ...(user.settings as any),
                refreshTokens,
              },
            },
          });
        }
      }

      logger.info('Expired refresh tokens cleaned');
    } catch (error: any) {
      logger.error('Failed to clean expired tokens', error);
    }
  }
}

// Export for backward compatibility
export { JWT_CONFIG };
