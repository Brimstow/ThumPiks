import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { isProductionLike } from '../utils/env';

interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  type?: string;
}

export class EnhancedJWTService {
  private static readonly ISSUER = 'thumbnail-maker-studio';
  private static readonly AUDIENCE = 'thumbnail-maker-users';

  /**
   * Public accessor for the JWT secret. Used by session coordination
   * and anywhere raw jwt.sign/verify is needed outside auth tokens.
   */
  static getSecret(): string {
    return this.getJwtSecret();
  }

  // Dynamic getters for secrets to support test environment variable injection
  private static getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret === 'your-secret-key') {
      if (isProductionLike()) {
        logger.error('CRITICAL: JWT_SECRET not set in production environment');
        throw new Error('JWT_SECRET must be set in production/staging');
      }
      logger.warn('Using default JWT secret - not suitable for production');
      return 'your-secret-key';
    }
    return secret;
  }

  private static getRefreshSecret(): string {
    const secret = process.env.REFRESH_TOKEN_SECRET;
    if (!secret || secret === 'your-refresh-secret') {
      if (isProductionLike()) {
        logger.error('CRITICAL: REFRESH_TOKEN_SECRET not set in production environment');
        throw new Error('REFRESH_TOKEN_SECRET must be set in production/staging');
      }
      logger.warn('Using default refresh secret - not suitable for production');
      return 'your-refresh-secret';
    }
    return secret;
  }

  static generateSessionId(): string {
    const SESSION_ID_BYTES = 32;
    return crypto.randomBytes(SESSION_ID_BYTES).toString('hex');
  }

  static createTokens(userId: string, email: string) {
    const sessionId = this.generateSessionId();
    
    const accessToken = jwt.sign(
      { userId, email, sessionId },
      this.getJwtSecret(),
      { expiresIn: '15m', issuer: this.ISSUER, audience: this.AUDIENCE }
    );

    const refreshToken = jwt.sign(
      { userId, email, sessionId, type: 'refresh' },
      this.getRefreshSecret(),
      { expiresIn: '7d', issuer: this.ISSUER, audience: this.AUDIENCE }
    );

    return {
      accessToken,
      refreshToken,
      sessionId,
      expiresIn: 900, // 15 minutes
    };
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret(), {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      }) as TokenPayload;
    } catch (error) {
      logger.warn('Access token verification failed', { error });
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.getRefreshSecret(), {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      }) as TokenPayload;
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (error) {
      logger.warn('Refresh token verification failed', { error });
      return null;
    }
  }

  static createResetToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email, action: 'reset-password' },
      this.getJwtSecret(),
      { expiresIn: '1h', issuer: this.ISSUER, audience: this.AUDIENCE }
    );
  }

  static verifyResetToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret(), {
        issuer: this.ISSUER,
        audience: this.AUDIENCE,
      }) as TokenPayload;
    } catch (error) {
      logger.warn('Reset token verification failed', { error });
      return null;
    }
  }
}
