import { Request, Response, NextFunction } from 'express';
import { adminAuthService, AdminUser, ADMIN_PERMISSIONS } from './admin-auth.service';

// Extend Express Request interface to include admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

/**
 * Middleware to authenticate admin users
 */
export const authenticateAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const adminUser = await adminAuthService.verifyAdminToken(token);

    if (!adminUser) {
      res.status(401).json({ 
        error: 'Invalid or expired admin token',
        code: 'ADMIN_TOKEN_INVALID'
      });
      return;
    }

    // Add admin user to request object
    req.adminUser = adminUser;
    
    // Log admin API access
    await adminAuthService.logAdminAction(
      adminUser.id,
      'ADMIN_API_ACCESS',
      'api',
      null,
      {
        endpoint: req.originalUrl,
        method: req.method,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    );

    next();
  } catch (error) {
    console.error('Admin authentication error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      code: 'ADMIN_AUTH_ERROR'
    });
  }
};

/**
 * Middleware to check if admin has specific permission
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    if (!adminAuthService.hasPermission(req.adminUser, permission)) {
      // Log permission denial
      adminAuthService.logAdminAction(
        req.adminUser.id,
        'ADMIN_PERMISSION_DENIED',
        'permission',
        null,
        {
          requiredPermission: permission,
          userPermissions: req.adminUser.permissions,
          endpoint: req.originalUrl,
          method: req.method
        },
        'warning'
      );

      res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'ADMIN_PERMISSION_DENIED',
        required: permission
      });
      return;
    }

    next();
  };
};

/**
 * Middleware to check if admin has any of the specified roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      res.status(401).json({ 
        error: 'Admin authentication required',
        code: 'ADMIN_AUTH_REQUIRED'
      });
      return;
    }

    const hasRole = req.adminUser.roles.some(role => roles.includes(role));
    
    if (!hasRole) {
      // Log role check failure
      adminAuthService.logAdminAction(
        req.adminUser.id,
        'ADMIN_ROLE_DENIED',
        'role',
        null,
        {
          requiredRoles: roles,
          userRoles: req.adminUser.roles,
          endpoint: req.originalUrl,
          method: req.method
        },
        'warning'
      );

      res.status(403).json({ 
        error: 'Insufficient role privileges',
        code: 'ADMIN_ROLE_DENIED',
        required: roles
      });
      return;
    }

    next();
  };
};

/**
 * Middleware for super admin only operations
 */
export const requireSuperAdmin = requireRole(['super_admin']);

/**
 * Middleware for admin or super admin operations
 */
export const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Common permission middleware shortcuts
 */
export const requireUserManagement = requirePermission(ADMIN_PERMISSIONS.USERS_VIEW);
export const requireUserModification = requirePermission(ADMIN_PERMISSIONS.USERS_UPDATE);
export const requireContentModeration = requirePermission(ADMIN_PERMISSIONS.CONTENT_MODERATE);
export const requireSystemAccess = requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG);
export const requireAnalytics = requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW);

/**
 * Rate limiting for admin endpoints
 */
export const adminRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.adminUser) {
      next();
      return;
    }

    const key = `admin:${req.adminUser.id}:${req.originalUrl}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old entries
    for (const [requestKey, data] of requests.entries()) {
      if (data.resetTime < windowStart) {
        requests.delete(requestKey);
      }
    }

    const requestData = requests.get(key);
    
    if (!requestData) {
      requests.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (requestData.count >= maxRequests) {
      // Log rate limit exceeded
      adminAuthService.logAdminAction(
        req.adminUser.id,
        'ADMIN_RATE_LIMIT_EXCEEDED',
        'security',
        null,
        {
          endpoint: req.originalUrl,
          maxRequests,
          windowMs,
          ipAddress: req.ip
        },
        'warning'
      );

      res.status(429).json({
        error: 'Rate limit exceeded',
        code: 'ADMIN_RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((requestData.resetTime - now) / 1000)
      });
      return;
    }

    requestData.count++;
    next();
  };
};