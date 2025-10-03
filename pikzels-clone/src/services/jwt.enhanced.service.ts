import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret';

interface TokenPayload {
  userId: string;
  email: string;
  sessionId?: string;
  type?: string;
}

export class EnhancedJWTService {
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static createTokens(userId: string, email: string) {
    const sessionId = this.generateSessionId();
    
    const accessToken = jwt.sign(
      { userId, email, sessionId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
      { userId, email, sessionId, type: 'refresh' },
      REFRESH_SECRET,
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
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.warn('Access token verification failed', { error });
      return null;
    }
  }

  static verifyRefreshToken(token: string): TokenPayload | null {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET) as TokenPayload;
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
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  }

  static verifyResetToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (error) {
      logger.warn('Reset token verification failed', { error });
      return null;
    }
  }
}