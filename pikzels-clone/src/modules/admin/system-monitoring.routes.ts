import { Router } from 'express';
import {
  systemMonitoringController,
  alertsValidation,
  errorLogsValidation,
  logErrorValidation
} from './system-monitoring.controller';
import {
  authenticateAdmin,
  requirePermission,
  requireSuperAdmin,
  adminRateLimit
} from './admin-auth.middleware';
import { ADMIN_PERMISSIONS } from './admin-auth.service';

const router = Router();

/**
 * System Health Routes
 */

// Get system health status
router.get(
  '/health',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_HEALTH),
  adminRateLimit(100, 15 * 60 * 1000), // 100 requests per 15 minutes
  systemMonitoringController.getSystemHealth
);

// Get performance metrics
router.get(
  '/performance',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_HEALTH),
  adminRateLimit(200, 15 * 60 * 1000),
  systemMonitoringController.getPerformanceMetrics
);

/**
 * Alert Management Routes
 */

// Get system alerts
router.get(
  '/alerts',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_HEALTH),
  adminRateLimit(100, 15 * 60 * 1000),
  alertsValidation,
  systemMonitoringController.getSystemAlerts
);

// Acknowledge alert
router.post(
  '/alerts/:alertId/acknowledge',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG),
  adminRateLimit(50, 15 * 60 * 1000),
  systemMonitoringController.acknowledgeAlert
);

/**
 * Error Logging Routes
 */

// Get error logs
router.get(
  '/errors',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_LOGS),
  adminRateLimit(100, 15 * 60 * 1000),
  errorLogsValidation,
  systemMonitoringController.getErrorLogs
);

// Log system error (internal use)
router.post(
  '/errors',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.SYSTEM_CONFIG),
  adminRateLimit(500, 15 * 60 * 1000), // Higher limit for error logging
  logErrorValidation,
  systemMonitoringController.logSystemError
);

/**
 * Maintenance Routes
 */

// Cleanup old monitoring data
router.post(
  '/cleanup',
  authenticateAdmin,
  requireSuperAdmin,
  adminRateLimit(5, 60 * 60 * 1000), // 5 requests per hour
  systemMonitoringController.cleanupOldData
);

/**
 * Health check for monitoring system
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'system-monitoring',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;