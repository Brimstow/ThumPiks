import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { EnhancedJWTService } from '../services/jwt.enhanced.service';
import { AuthRequest, SecureUser, UserRole, Permission } from '../types/auth';

const prisma = new PrismaClient();
// const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // TODO: Use for verification

// Enhanced authentication middleware with better security
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (!token) {
      logger.warn('Authentication attempt without token', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
      return res.status(401).json({
        error: 'Access token required',
        code: 'TOKEN_MISSING',
      });
    }

    // Verify token using enhanced JWT service
    const decoded = EnhancedJWTService.verifyAccessToken(token);

    if (!decoded) {
      logger.warn('Invalid token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
      });
      return res.status(403).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID',
      });
    }

    // Verify user still exists and is active
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
      logger.warn('Token valid but user not found', {
        userId: decoded.userId,
        ip: req.ip,
      });
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    // Check if user is verified (optional security measure)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.isVerified) {
      return res.status(403).json({
        error: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Attach user to request with session info
    (req as AuthRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: 'user' as UserRole, // Default role
      permissions: [
        'thumbnails:read',
        'thumbnails:write',
        'projects:read',
        'projects:write',
      ] as Permission[],
      sessionId: decoded.sessionId || 'legacy-session',
      lastActivity: new Date(),
    } as SecureUser;

    // Log successful authentication for security monitoring
    logger.info('User authenticated successfully', {
      userId: user.id,
      sessionId: decoded.sessionId,
      ip: req.ip,
      url: req.url,
    });

    next();
  } catch (error: any) {
    logger.error('Authentication middleware error', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
    });

    return res.status(403).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR',
    });
  }
};

// Refresh token middleware
export const authenticateRefreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_MISSING',
      });
    }

    const decoded = EnhancedJWTService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(403).json({
        error: 'Invalid refresh token',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      role: 'user' as UserRole,
      permissions: [
        'thumbnails:read',
        'thumbnails:write',
        'projects:read',
        'projects:write',
      ] as Permission[],
      sessionId: decoded.sessionId || 'legacy-session',
      lastActivity: new Date(),
    } as SecureUser;

    next();
  } catch (error: any) {
    logger.error('Refresh token middleware error', error);
    return res.status(403).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
};

// Optional: Role-based access control middleware
export const requireRole = (allowedRoles: UserRole[]) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<any> => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    // For now, we'll implement this when we add roles to the User model
    // This is a placeholder for future role-based access control
    console.log('Allowed roles:', allowedRoles); // Use the parameter

    next();
  };
};

// Export alias for consistency with route imports
export const authenticate = authenticateToken;
