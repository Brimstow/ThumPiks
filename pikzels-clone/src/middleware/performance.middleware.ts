import { Request, Response, NextFunction } from 'express';
import { getService } from '../utils/service-factory';
import { logger } from '../utils/logger';

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

// --- Buffered metrics to reduce Redis write amplification ---
interface BufferedRouteMetric {
  requestCount: number;
  totalResponseTime: number;
  errorCount: number;
}

const FLUSH_INTERVAL_MS = 10_000; // Flush every 10 seconds
const FLUSH_REQUEST_THRESHOLD = 100; // Or every 100 requests

const metricsBuffer = new Map<string, BufferedRouteMetric>();
let dailyBuffer: DailyMetrics = { requests: 0, errors: 0 };
let bufferedRequestCount = 0;
let flushTimer: NodeJS.Timeout | null = null;

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushMetricsBuffer().catch(err =>
      logger.error(
        'Failed to flush perf metrics buffer',
        err instanceof Error ? err : new Error(String(err))
      )
    );
  }, FLUSH_INTERVAL_MS);
  // Unref so the timer doesn't prevent graceful shutdown
  flushTimer.unref();
}

/**
 * Flush buffered metrics to Redis in a single batch.
 * Called periodically and on shutdown.
 */
export async function flushMetricsBuffer(): Promise<void> {
  if (bufferedRequestCount === 0) return;

  const routeEntries = Array.from(metricsBuffer.entries());
  const dailySnapshot = { ...dailyBuffer };
  const dailyKey = `performance:daily:${new Date().toISOString().split('T')[0]}`;

  // Reset buffers immediately so new requests accumulate into a fresh buffer
  metricsBuffer.clear();
  dailyBuffer = { requests: 0, errors: 0 };
  bufferedRequestCount = 0;

  try {
    // Merge each route's buffered counts into the existing cached metrics
    for (const [metricsKey, buffered] of routeEntries) {
      const existing = (await cache.get<PerformanceMetrics>(metricsKey)) || {
        requestCount: 0,
        averageResponseTime: 0,
        errorCount: 0,
        lastUpdated: new Date(),
      };

      const newCount = existing.requestCount + buffered.requestCount;
      const newAvg =
        (existing.averageResponseTime * existing.requestCount +
          buffered.totalResponseTime) /
        newCount;

      await cache.set(
        metricsKey,
        {
          requestCount: newCount,
          averageResponseTime: Math.round(newAvg * 100) / 100,
          errorCount: existing.errorCount + buffered.errorCount,
          lastUpdated: new Date(),
        } as PerformanceMetrics,
        3600
      );
    }

    // Merge daily counters
    if (dailySnapshot.requests > 0) {
      const existingDaily = (await cache.get<DailyMetrics>(dailyKey)) || {
        requests: 0,
        errors: 0,
      };
      existingDaily.requests += dailySnapshot.requests;
      existingDaily.errors += dailySnapshot.errors;
      await cache.set(dailyKey, existingDaily, 86400);
    }
  } catch (error) {
    logger.error(
      'Error flushing performance metrics buffer',
      error instanceof Error ? error : new Error(String(error))
    );
  }
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
    (req as unknown as Record<string, unknown>).timing = timing;

    // Override res.end to capture response time
    const originalEnd = res.end.bind(res) as (...args: unknown[]) => Response;
    res.end = function (...args: unknown[]) {
      const responseTime = Date.now() - startTime;
      logPerformanceMetrics(req, res, responseTime);
      return originalEnd(...args);
    } as typeof res.end;

    next();
  };
};

/**
 * Buffer performance metrics in-memory; flush to Redis periodically.
 * Eliminates per-request Redis writes (2 set() calls → 0).
 */
function logPerformanceMetrics(
  req: Request,
  res: Response,
  responseTime: number
) {
  try {
    const route = req.route?.path || req.path;
    const method = req.method;
    const statusCode = res.statusCode;
    const isError = statusCode >= 400;

    // Structured request metric for every request (enables p50/p95/p99 in Axiom)
    logger.info('request', {
      category: 'request',
      method,
      url: route,
      statusCode,
      duration: responseTime,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    // Buffer metrics in-memory instead of writing to Redis per-request
    const metricsKey = `performance:${method}:${route}`;
    const existing = metricsBuffer.get(metricsKey) || {
      requestCount: 0,
      totalResponseTime: 0,
      errorCount: 0,
    };
    existing.requestCount += 1;
    existing.totalResponseTime += responseTime;
    if (isError) existing.errorCount += 1;
    metricsBuffer.set(metricsKey, existing);

    // Buffer daily counters
    dailyBuffer.requests += 1;
    if (isError) dailyBuffer.errors += 1;

    bufferedRequestCount += 1;

    // Ensure flush timer is running
    startFlushTimer();

    // Flush early if threshold reached
    if (bufferedRequestCount >= FLUSH_REQUEST_THRESHOLD) {
      flushMetricsBuffer().catch(err =>
        logger.error(
          'Failed to flush perf metrics buffer',
          err instanceof Error ? err : new Error(String(err))
        )
      );
    }

    // Log slow requests (> 1000ms)
    if (responseTime > 1000) {
      logger.performance(`${method} ${route}`, responseTime, {
        method,
        url: route,
        statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    // Log errors
    if (isError) {
      logger.error('Error response', undefined, {
        method,
        url: route,
        statusCode,
        duration: responseTime,
        ip: req.ip,
      });
    }
  } catch (error) {
    logger.error(
      'Error logging performance metrics',
      error instanceof Error ? error : new Error(String(error))
    );
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

    const allMetrics: Record<string, unknown> = {};

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
    logger.error(
      'Error getting performance metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

/**
 * Clear performance metrics (for testing or reset)
 */
export async function clearPerformanceMetrics() {
  try {
    // In a real implementation, you'd scan and delete all performance keys
    logger.info('Performance metrics cleared');
    return true;
  } catch (error) {
    logger.error(
      'Error clearing performance metrics',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}
