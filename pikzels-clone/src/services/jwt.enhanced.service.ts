import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';

interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  type?: string;
}

export class EnhancedJWTService {
  // Dynamic getters for secrets to support test environment variable injection
  private static getJwtSecret(): string {
    return process.env.JWT_SECRET ?? 'your-secret-key';
  }

  private static getRefreshSecret(): string {
    return process.env.REFRESH_TOKEN_SECRET ?? 'your-refresh-secret';
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
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, email, sessionId, type: 'refresh' },
      this.getRefreshSecret(),
      { expiresIn: '7d' }
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
      return jwt.verify(token, this.getJwtSecret()) as TokenPayload;
    } catch (error) {
      logger.warn('Access token verification failed', { error });
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, this.getRefreshSecret()) as TokenPayload;
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
      { expiresIn: '1h' }
    );
  }

  static verifyResetToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.getJwtSecret()) as TokenPayload;
    } catch (error) {
      logger.warn('Reset token verification failed', { error });
      return null;
    }
  }
}
