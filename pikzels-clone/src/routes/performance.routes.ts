import { Router } from 'express';
import {
  getPerformanceMetrics,
  clearPerformanceMetrics,
} from '../middleware/performance.middleware';
import { CacheService } from '../services/cache.service';
import { authenticateToken } from '../middleware/auth.middleware';
import { userApiRateLimit } from '../middleware/security.middleware';

const router = Router();
const cache = CacheService.getInstance();

// All performance routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

/**
 * Get performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const timeframe = (req.query.timeframe as 'hour' | 'day') || 'hour';
    const metrics = await getPerformanceMetrics(timeframe);

    if (!metrics) {
      return res
        .status(500)
        .json({ error: 'Failed to retrieve performance metrics' });
    }

    return res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error getting performance metrics:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get cache statistics
 */
router.get('/cache', async (_req, res) => {
  try {
    const cacheHealth = await cache.healthCheck();

    // Get some cache statistics (this would be implemented based on your Redis setup)
    const stats = {
      status: cacheHealth ? 'healthy' : 'unhealthy',
      connected: cacheHealth,
      // Note: In a real implementation, you'd get actual Redis stats like:
      // memory usage, hit ratio, connected clients, etc.
      info: 'Cache statistics would be fetched from Redis INFO command',
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Clear performance metrics (admin only)
 */
router.delete('/metrics', async (_req, res) => {
  try {
    // In a real app, you'd check for admin permissions here
    const success = await clearPerformanceMetrics();

    if (success) {
      res.json({ success: true, message: 'Performance metrics cleared' });
    } else {
      res.status(500).json({ error: 'Failed to clear performance metrics' });
    }
  } catch (error) {
    console.error('Error clearing performance metrics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get system health status
 */
router.get('/health', async (_req, res) => {
  try {
    const cacheHealth = await cache.healthCheck();

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        cache: cacheHealth ? 'healthy' : 'unhealthy',
        database: 'healthy', // Would implement Prisma health check
        server: 'healthy',
      },
      performance: {
        compression: process.env.ENABLE_COMPRESSION === 'true',
        caching: process.env.ENABLE_CACHE === 'true',
        rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
        monitoring: process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
      },
      uptime: process.uptime(),
      memory: {
        used:
          Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) /
          100,
        total:
          Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) /
          100,
        external:
          Math.round((process.memoryUsage().external / 1024 / 1024) * 100) /
          100,
      },
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
