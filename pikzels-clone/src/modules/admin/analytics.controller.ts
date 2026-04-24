import { Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { analyticsService, DateRange } from './analytics.service';

export class AnalyticsController {

  /**
   * Get analytics overview
   */
  async getAnalyticsOverview(req: Request, res: Response): Promise<void> {
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
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const overview = await analyticsService.getAnalyticsOverview(dateRange);

      res.json({
        success: true,
        data: overview
      });

    } catch (error) {
      console.error('Get analytics overview error:', error);
      res.status(500).json({
        error: 'Failed to retrieve analytics overview',
        code: 'ANALYTICS_OVERVIEW_ERROR'
      });
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(req: Request, res: Response): Promise<void> {
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
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const userMetrics = await analyticsService.getUserMetrics(dateRange);

      res.json({
        success: true,
        data: userMetrics
      });

    } catch (error) {
      console.error('Get user metrics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user metrics',
        code: 'USER_METRICS_ERROR'
      });
    }
  }

  /**
   * Get content metrics
   */
  async getContentMetrics(req: Request, res: Response): Promise<void> {
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
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const contentMetrics = await analyticsService.getContentMetrics(dateRange);

      res.json({
        success: true,
        data: contentMetrics
      });

    } catch (error) {
      console.error('Get content metrics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve content metrics',
        code: 'CONTENT_METRICS_ERROR'
      });
    }
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(req: Request, res: Response): Promise<void> {
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
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const revenueMetrics = await analyticsService.getRevenueMetrics(dateRange);

      res.json({
        success: true,
        data: revenueMetrics
      });

    } catch (error) {
      console.error('Get revenue metrics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve revenue metrics',
        code: 'REVENUE_METRICS_ERROR'
      });
    }
  }

  /**
   * Get system metrics
   */
  async getSystemMetrics(req: Request, res: Response): Promise<void> {
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
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date()
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const systemMetrics = await analyticsService.getSystemMetrics(dateRange);

      res.json({
        success: true,
        data: systemMetrics
      });

    } catch (error) {
      console.error('Get system metrics error:', error);
      res.status(500).json({
        error: 'Failed to retrieve system metrics',
        code: 'SYSTEM_METRICS_ERROR'
      });
    }
  }

  /**
   * Store system metric
   */
  async storeSystemMetric(req: Request, res: Response): Promise<void> {
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

      const { metricType, value, date, additionalData } = req.body;

      await analyticsService.storeSystemMetric(
        metricType,
        value,
        date ? new Date(date) : new Date(),
        additionalData
      );

      res.json({
        success: true,
        message: 'System metric stored successfully'
      });

    } catch (error) {
      console.error('Store system metric error:', error);
      res.status(500).json({
        error: 'Failed to store system metric',
        code: 'STORE_METRIC_ERROR'
      });
    }
  }

  /**
   * Get user activity logs
   */
  async getUserActivityLogs(req: Request, res: Response): Promise<void> {
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
        offset = 0,
        userId,
        startDate,
        endDate
      } = req.query;

      let dateRange: DateRange | undefined;
      if (startDate && endDate) {
        dateRange = {
          startDate: new Date(startDate as string),
          endDate: new Date(endDate as string)
        };
      }

      const logs = await analyticsService.getUserActivityLogs(
        parseInt(limit as string),
        parseInt(offset as string),
        userId as string,
        dateRange
      );

      res.json({
        success: true,
        data: logs
      });

    } catch (error) {
      console.error('Get user activity logs error:', error);
      res.status(500).json({
        error: 'Failed to retrieve user activity logs',
        code: 'ACTIVITY_LOGS_ERROR'
      });
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(req: Request, res: Response): Promise<void> {
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
        format = 'json',
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate = new Date(),
        sections = 'users,content,revenue,system'
      } = req.query;

      const dateRange: DateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      };

      const sectionsArray = (sections as string).split(',').map(s => s.trim());

      const exportData = await analyticsService.exportAnalyticsData(
        format as 'csv' | 'json',
        dateRange,
        sectionsArray
      );

      // Set appropriate headers
      const filename = `analytics_${new Date().toISOString().split('T')[0]}.${format}`;
      const contentType = format === 'csv' ? 'text/csv' : 'application/json';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);

    } catch (error) {
      console.error('Export analytics data error:', error);
      res.status(500).json({
        error: 'Failed to export analytics data',
        code: 'EXPORT_ERROR'
      });
    }
  }
}

// Validation rules
export const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Start date must be valid ISO8601 date'),
  query('endDate').optional().isISO8601().withMessage('End date must be valid ISO8601 date')
];

export const userActivityLogsValidation = [
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('userId').optional().isUUID().withMessage('User ID must be valid UUID'),
  ...dateRangeValidation
];

export const storeMetricValidation = [
  query('metricType').isString().isLength({ min: 1, max: 100 }).withMessage('Metric type required'),
  query('value').isNumeric().withMessage('Value must be numeric'),
  query('date').optional().isISO8601().withMessage('Date must be valid ISO8601 date')
];

export const exportValidation = [
  query('format').optional().isIn(['csv', 'json']).withMessage('Format must be csv or json'),
  query('sections').optional().isString().withMessage('Sections must be comma-separated string'),
  ...dateRangeValidation
];

export const analyticsController = new AnalyticsController();