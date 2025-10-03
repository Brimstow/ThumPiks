import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AuthRequest } from '../../types/auth';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getDashboardData(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get user analytics data
      const userAnalytics = await analyticsService.getUserAnalytics(userId);

      // Get thumbnail statistics
      const thumbnailStats = await analyticsService.getThumbnailStats(userId);

      // Get advanced analytics
      const advancedAnalytics =
        await analyticsService.getAdvancedAnalytics(userId);

      return res.status(200).json({
        userAnalytics,
        thumbnailStats,
        advancedAnalytics,
      });
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getThumbnailTrends(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get user analytics data (which includes trends)
      const userAnalytics = await analyticsService.getUserAnalytics(userId);

      return res.status(200).json({
        trends: userAnalytics.trends,
      });
    } catch (error) {
      console.error('Error fetching thumbnail trends:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStyleDistribution(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get user analytics data (which includes style distribution)
      const userAnalytics = await analyticsService.getUserAnalytics(userId);

      return res.status(200).json({
        styles: userAnalytics.styles,
      });
    } catch (error) {
      console.error('Error fetching style distribution:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getProjectUsage(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get user analytics data (which includes project usage)
      const userAnalytics = await analyticsService.getUserAnalytics(userId);

      return res.status(200).json({
        projects: userAnalytics.projects,
      });
    } catch (error) {
      console.error('Error fetching project usage:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAdvancedAnalytics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get advanced analytics data
      const advancedAnalytics =
        await analyticsService.getAdvancedAnalytics(userId);

      return res.status(200).json({
        advancedAnalytics,
      });
    } catch (error) {
      console.error('Error fetching advanced analytics data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // New endpoint for detailed advanced analytics with timeframe filtering
  async getDetailedAdvancedAnalytics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;
      const timeframe =
        (req.query.timeframe as 'daily' | 'weekly' | 'monthly') || 'daily';

      // Validate timeframe parameter
      if (!['daily', 'weekly', 'monthly'].includes(timeframe)) {
        return res
          .status(400)
          .json({
            error: 'Invalid timeframe. Must be daily, weekly, or monthly.',
          });
      }

      // Get detailed advanced analytics data
      const detailedAdvancedAnalytics =
        await analyticsService.getDetailedAdvancedAnalytics(userId, timeframe);

      return res.status(200).json({
        detailedAdvancedAnalytics,
      });
    } catch (error) {
      console.error('Error fetching detailed advanced analytics data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // New endpoint for comparative analytics (current vs previous period)
  async getComparativeAnalytics(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;
      const timeframe =
        (req.query.timeframe as 'daily' | 'weekly' | 'monthly') || 'weekly';

      // Validate timeframe parameter
      if (!['daily', 'weekly', 'monthly'].includes(timeframe)) {
        return res
          .status(400)
          .json({
            error: 'Invalid timeframe. Must be daily, weekly, or monthly.',
          });
      }

      // Get comparative analytics data
      const comparativeAnalytics =
        await analyticsService.getComparativeAnalytics(userId, timeframe);

      return res.status(200).json({
        comparativeAnalytics,
      });
    } catch (error) {
      console.error('Error fetching comparative analytics data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
