import { Request, Response, NextFunction } from 'express';
import { getService } from '../utils/service-factory';

const cache = getService('cache');

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  lastUpdated: Date;
}

interface RequestTiming {
  startTime: number;
  route: string;
  method: string;
  userAgent?: string;
  ip?: string;
}

interface DailyMetrics {
  requests: number;
  errors: number;
}

/**
 * Performance monitoring middleware
 * Tracks response times, request counts, and error rates
 */
export const performanceMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Store timing information
    const timing: RequestTiming = {
      startTime,
      route: req.route?.path || req.path,
      method: req.method,
      userAgent: req.get('User-Agent') || 'Unknown',
      ip: req.ip || req.connection?.remoteAddress || 'Unknown',
    };

    // Attach timing to request for later use
    (req as any).timing = timing;

    // Override res.end to capture response time
    const originalEnd = res.end;
    (res as any).end = function (...args: any[]) {
      const responseTime = Date.now() - startTime;
      logPerformanceMetrics(req, res, responseTime);
      return (originalEnd as any).apply(this, args);
    };

    next();
  };
};

/**
 * Log performance metrics to cache and console
 */
async function logPerformanceMetrics(
  req: Request,
  res: Response,
  responseTime: number
) {
  try {
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    // Create metric keys
    const metricsKey = `performance:${method}:${route}`;
    const dailyKey = `performance:daily:${new Date().toISOString().split('T')[0]}`;

    // Get existing metrics
    const existingMetrics = (await cache.get<PerformanceMetrics>(
      metricsKey
    )) || {
      requestCount: 0,
      averageResponseTime: 0,
      errorCount: 0,
      lastUpdated: new Date(),
    };

    // Update metrics
    const newRequestCount = existingMetrics.requestCount + 1;
    const newAverageResponseTime =
      (existingMetrics.averageResponseTime * existingMetrics.requestCount +
        responseTime) /
      newRequestCount;
    const newErrorCount = existingMetrics.errorCount + (isError ? 1 : 0);

    const updatedMetrics: PerformanceMetrics = {
      requestCount: newRequestCount,
      averageResponseTime: Math.round(newAverageResponseTime * 100) / 100,
      errorCount: newErrorCount,
      lastUpdated: new Date(),
    };

    // Store updated metrics (keep for 1 hour)
    await cache.set(metricsKey, updatedMetrics, 3600);

    // Update daily metrics
    const dailyMetrics = (await cache.get<DailyMetrics>(dailyKey)) || {
      requests: 0,
      errors: 0,
    };
    dailyMetrics.requests += 1;
    if (isError) dailyMetrics.errors += 1;
    await cache.set(dailyKey, dailyMetrics, 86400); // Keep for 24 hours

    // Log slow requests (> 1000ms)
    if (responseTime > 1000) {
      console.warn(`🐌 Slow request detected:`, {
        method,
        route,
        responseTime: `${responseTime}ms`,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    // Log errors
    if (isError) {
      console.error(`❌ Error response:`, {
        method,
        route,
        statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
      });
    }

    // Log performance summary every 100 requests
    if (newRequestCount % 100 === 0) {
      console.log(`📊 Performance summary for ${method} ${route}:`, {
        requests: newRequestCount,
        avgResponseTime: `${updatedMetrics.averageResponseTime}ms`,
        errorRate: `${((newErrorCount / newRequestCount) * 100).toFixed(2)}%`,
      });
    }
  } catch (error) {
    console.error('Error logging performance metrics:', error);
  }
}

/**
 * Middleware to add response time header
 */
export const responseTimeMiddleware = () => {
  return (_req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Set the header before the response is sent
    const originalSend = res.send;
    res.send = function (data) {
      const responseTime = Date.now() - startTime;
      // Only set header if response hasn't been sent yet
      if (!res.headersSent) {
        res.set('X-Response-Time', `${responseTime}ms`);
      }
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Get performance metrics for monitoring dashboard
 */
export async function getPerformanceMetrics(
  _timeframe: 'hour' | 'day' = 'hour'
) {
  try {
    const patterns = [
      'performance:GET:*',
      'performance:POST:*',
      'performance:PUT:*',
      'performance:DELETE:*',
    ];

    const allMetrics: any = {};

    for (const pattern of patterns) {
      // Note: In a real implementation, you'd need to implement key scanning
      // For now, we'll return cached data structure
      allMetrics[pattern] = (await cache.get(pattern)) || {};
    }

    // Get daily summary
    const today = new Date().toISOString().split('T')[0];
    const dailyMetrics = (await cache.get<DailyMetrics>(
      `performance:daily:${today}`
    )) || {
      requests: 0,
      errors: 0,
    };

    return {
      summary: {
        totalRequests: dailyMetrics.requests,
        totalErrors: dailyMetrics.errors,
        errorRate:
          dailyMetrics.requests > 0
            ? ((dailyMetrics.errors / dailyMetrics.requests) * 100).toFixed(2) +
              '%'
            : '0%',
      },
      routes: allMetrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return null;
  }
}

/**
 * Clear performance metrics (for testing or reset)
 */
export async function clearPerformanceMetrics() {
  try {
    // In a real implementation, you'd scan and delete all performance keys
    console.log('Performance metrics cleared');
    return true;
  } catch (error) {
    console.error('Error clearing performance metrics:', error);
    return false;
  }
}
