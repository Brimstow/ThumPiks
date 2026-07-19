import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { EnhancedJWTService } from '../services/jwt.enhanced.service';
import {
  AuthRequest,
  SecureUser,
  UserRole,
  Permission,
  FeatureKey,
} from '../types/auth';
import { getPrisma } from '../utils/prisma-factory';
import { getCurrentSubscription } from '../modules/subscription/subscription.service';
import { getPlanById } from '../modules/subscription/subscription.config';

const prisma = getPrisma();

// Enhanced authentication middleware with better security
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Try to get token from cookie first (secure HttpOnly), then fallback to Authorization header
    let token = (req as Request & { cookies?: Record<string, string> }).cookies?.token;

    // Fallback to Authorization header for backwards compatibility
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader?.split(' ')[1];
    }

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
  } catch (error: unknown) {
    logger.error('Authentication middleware error', error instanceof Error ? error : new Error(String(error)), {
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

/**
 * Optional authentication middleware.
 * If a valid token is present, attaches user to request.
 * If no token or invalid token, silently continues (req.user = undefined).
 * Useful for endpoints that work for both logged-in and anonymous users
 * but offer enhanced behaviour (e.g. higher rate limits) when authenticated.
 */
export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
    if (!token) {
      const authHeader = req.headers['authorization'];
      token = authHeader?.split(' ')[1];
    }
    if (!token) {
      next();
      return;
    }

    const decoded = EnhancedJWTService.verifyAccessToken(token);
    if (!decoded) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (user) {
      (req as AuthRequest).user = {
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
    }
  } catch {
    // Silently continue without auth
  }
  next();
};

// Refresh token middleware
export const authenticateRefreshToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    // Try to get refresh token from cookie first, then fallback to request body
    let refreshToken = (req as Request & { cookies?: Record<string, string> }).cookies?.refreshToken;

    // Fallback to request body for backwards compatibility
    if (!refreshToken) {
      refreshToken = req.body.refreshToken;
    }

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
  } catch (error: unknown) {
    logger.error('Refresh token middleware error', error instanceof Error ? error : new Error(String(error)));
    return res.status(403).json({
      error: 'Token refresh failed',
      code: 'REFRESH_ERROR',
    });
  }
};

// Subscription feature gating middleware
// Checks if the user's subscription plan includes the requested feature.
// Uses subscription.config.ts as the single source of truth for plan features.
export const requireFeature = (feature: FeatureKey) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<Response | void> => {
    const authReq = req as AuthRequest;

    if (!authReq.user) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    try {
      const subscription = await getCurrentSubscription(authReq.user.id);

      if (!subscription) {
        return res.status(403).json({
          error: 'Active subscription required',
          code: 'SUBSCRIPTION_REQUIRED',
        });
      }

      const plan = getPlanById(subscription.planType);

      if (!plan) {
        logger.warn('User has unknown plan type', {
          userId: authReq.user.id,
          planType: subscription.planType,
        });
        return res.status(403).json({
          error: 'Invalid subscription plan',
          code: 'INVALID_PLAN',
        });
      }

      const featureValue = plan.features[feature];

      // Feature is disabled (false or 0)
      if (!featureValue) {
        return res.status(403).json({
          error: 'This feature requires a higher subscription plan',
          code: 'FEATURE_NOT_AVAILABLE',
          feature,
          currentPlan: subscription.planType,
        });
      }

      // Attach subscription info for downstream use (e.g., limit checks in controllers)
      authReq.subscription = {
        id: subscription.id,
        planType: subscription.planType,
        creditsBalance: subscription.creditsBalance,
        status: subscription.status,
      };
      authReq.planFeatures = plan.features;

      next();
    } catch (error: unknown) {
      logger.error('Feature gate middleware error', error instanceof Error ? error : new Error(String(error)), {
        userId: authReq.user?.id,
        feature,
      });
      return res.status(500).json({
        error: 'Unable to verify subscription',
        code: 'SUBSCRIPTION_CHECK_ERROR',
      });
    }
  };
};

// Export alias for consistency with route imports
export const authenticate = authenticateToken;

/**
 * Extracts and type-narrows req.user, sending a 401 response if absent.
 * Returns the user or null (null means response already sent).
 *
 * Usage in controllers:
 *   const user = requireUser(req, res);
 *   if (!user) return;
 *   // user is now SecureUser (not undefined)
 */
export function requireUser(req: AuthRequest, res: Response): SecureUser | null {
  if (req.user) return req.user;
  res.status(401).json({ error: 'Unauthorized' });
  return null;
}
