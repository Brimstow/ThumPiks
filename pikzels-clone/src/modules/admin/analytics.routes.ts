import { Router } from 'express';
import {
  analyticsController,
  dateRangeValidation,
  userActivityLogsValidation,
  storeMetricValidation,
  exportValidation
} from './analytics.controller';
import {
  authenticateAdmin,
  requirePermission,
  adminRateLimit
} from './admin-auth.middleware';
import { ADMIN_PERMISSIONS } from './admin-auth.service';

const router = Router();

/**
 * Analytics Overview Routes
 */

// Get comprehensive analytics overview
router.get(
  '/overview',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  dateRangeValidation,
  analyticsController.getAnalyticsOverview
);

/**
 * Specific Metrics Routes
 */

// Get user metrics
router.get(
  '/users',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(200, 15 * 60 * 1000),
  dateRangeValidation,
  analyticsController.getUserMetrics
);

// Get content metrics
router.get(
  '/content',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(200, 15 * 60 * 1000),
  dateRangeValidation,
  analyticsController.getContentMetrics
);

// Get revenue metrics
router.get(
  '/revenue',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(200, 15 * 60 * 1000),
  dateRangeValidation,
  analyticsController.getRevenueMetrics
);

// Get system metrics
router.get(
  '/system',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_VIEW),
  adminRateLimit(200, 15 * 60 * 1000),
  dateRangeValidation,
  analyticsController.getSystemMetrics
);

/**
 * System Metric Management Routes
 */

// Store system metric (for internal use)
router.post(
  '/system/metrics',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG),
  adminRateLimit(500, 15 * 60 * 1000), // Higher limit for system metrics
  storeMetricValidation,
  analyticsController.storeSystemMetric
);

/**
 * Activity Monitoring Routes
 */

// Get user activity logs
router.get(
  '/activity/users',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_LOGS),
  adminRateLimit(100, 15 * 60 * 1000),
  userActivityLogsValidation,
  analyticsController.getUserActivityLogs
);

/**
 * Data Export Routes
 */

// Export analytics data
router.get(
  '/export',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.ANALYTICS_EXPORT),
  adminRateLimit(10, 15 * 60 * 1000), // Lower limit for exports
  exportValidation,
  analyticsController.exportAnalyticsData
);

/**
 * Health check for analytics system
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'analytics',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;