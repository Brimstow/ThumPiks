import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { AuthRequest } from '../../types/auth';

const analyticsService = new AnalyticsService();

export class AnalyticsController {
  async getUserStats(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get user stats summary
      const stats = await analyticsService.getUserStats(userId);

      return res.status(200).json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

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

  // Get top performing thumbnails with performance scores
  async getTopPerformers(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 10;

      // Validate limit parameter
      if (limit < 1 || limit > 100) {
        return res.status(400).json({
          error: 'Invalid limit. Must be between 1 and 100.',
        });
      }

      const topPerformers = await analyticsService.getTopPerformers(
        userId,
        limit
      );

      return res.status(200).json({
        topPerformers,
      });
    } catch (error) {
      console.error('Error fetching top performers:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Export analytics data as CSV
  async exportCSV(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = req.user.id;

      // Get all analytics data
      const userAnalytics = await analyticsService.getUserAnalytics(userId);
      const topPerformers = await analyticsService.getTopPerformers(userId, 50);

      // Build CSV content
      let csvContent = 'Analytics Report\n\n';
      
      // Summary stats
      csvContent += 'Summary\n';
      csvContent += 'Total Thumbnails,Projects,Recent (30 days)\n';
      csvContent += `${userAnalytics.totals.thumbnails},${userAnalytics.totals.projects},${userAnalytics.totals.recentThumbnails}\n\n`;
      
      // Top performers
      csvContent += 'Top Performers\n';
      csvContent += 'Rank,Title,Performance Score,Social Shares,Downloads,Edits,Days Active\n';
      topPerformers.forEach((performer, index) => {
        csvContent += `${index + 1},"${performer.title.replace(/"/g, '""')}",${performer.performanceScore},${performer.socialShares},${performer.downloads},${performer.edits},${performer.daysActive}\n`;
      });
      
      csvContent += '\n';
      
      // Style distribution
      csvContent += 'Style Distribution\n';
      csvContent += 'Style,Count\n';
      Object.entries(userAnalytics.styles).forEach(([style, count]) => {
        csvContent += `${style},${count}\n`;
      });

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="analytics-${Date.now()}.csv"`
      );

      return res.status(200).send(csvContent);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
