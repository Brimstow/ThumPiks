import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { systemMonitoringService } from './system-monitoring.service';

export class SystemMonitoringController {

  /**
   * Get system health status
   */
  async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await systemMonitoringService.getSystemHealth();

      res.json({
        success: true,
        data: health
      });

    } catch (error) {
      console.error('Get system health error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system health',
        code: 'SYSTEM_HEALTH_ERROR'
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await systemMonitoringService.collectSystemMetrics();

      res.json({
        success: true,
        data: metrics
      });

    } catch (error) {
      console.error('Get performance metrics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve performance metrics',
        code: 'PERFORMANCE_METRICS_ERROR'
      });
    }
  }

  /**
   * Get system alerts
   */
  async getSystemAlerts(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { resolved = false } = req.query;
      const alerts = await systemMonitoringService.getSystemAlerts(resolved === 'true');

      res.json({
        success: true,
        data: alerts
      });

    } catch (error) {
      console.error('Get system alerts error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system alerts',
        code: 'SYSTEM_ALERTS_ERROR'
      });
    }
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { alertId } = req.params;
      const adminUser = req.adminUser!;

      const success = await systemMonitoringService.acknowledgeAlert(alertId!, adminUser.id);

      if (success) {
        res.json({
          success: true,
          message: 'Alert acknowledged successfully'
        });
      } else {
        res.status(500).json({
          error: 'Failed to acknowledge alert',
          code: 'ACKNOWLEDGE_ALERT_ERROR'
        });
      }

    } catch (error) {
      console.error('Acknowledge alert error:', error);
      res.status(500).json({
        error: 'Failed to acknowledge alert',
        code: 'ACKNOWLEDGE_ALERT_ERROR'
      });
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const {
        limit = 100,
        level
      } = req.query;

      const logs = await systemMonitoringService.getErrorLogs(
        parseInt(limit as string),
        level as 'error' | 'warning' | 'critical' | undefined
      );

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      console.error('Get error logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve error logs',
        code: 'ERROR_LOGS_ERROR'
      });
    }
  }

  /**
   * Log system error (for internal use)
   */
  async logSystemError(req: Request, res: Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors.array()
        });
        return;
      }

      const { level, message, stack, context } = req.body;

      await systemMonitoringService.logError(level, message, stack, context);

      res.json({
        success: true,
        message: 'Error logged successfully'
      });

    } catch (error) {
      console.error('Log system error error:', error);
      res.status(500).json({
        error: 'Failed to log system error',
        code: 'LOG_ERROR_ERROR'
      });
    }
  }

  /**
   * Trigger cleanup of old monitoring data
   */
  async cleanupOldData(req: Request, res: Response): Promise<void> {
    try {
      await systemMonitoringService.cleanupOldData();

      res.json({
        success: true,
        message: 'Old monitoring data cleaned up successfully'
      });

    } catch (error) {
      console.error('Cleanup old data error:', error);
      res.status(500).json({
        error: 'Failed to cleanup old data',
        code: 'CLEANUP_ERROR'
      });
    }
  }
}

// Validation rules
export const alertsValidation = [
  query('resolved').optional().isBoolean().withMessage('Resolved must be boolean')
];

export const errorLogsValidation = [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('level').optional().isIn(['error', 'warning', 'critical']).withMessage('Level must be error, warning, or critical')
];

export const logErrorValidation = [
  query('level').isIn(['error', 'warning', 'critical']).withMessage('Level must be error, warning, or critical'),
  query('message').isString().isLength({ min: 1, max: 1000 }).withMessage('Message required (max 1000 chars)'),
  query('stack').optional().isString().withMessage('Stack must be string'),
  query('context').optional().isObject().withMessage('Context must be object')
];

export const systemMonitoringController = new SystemMonitoringController();