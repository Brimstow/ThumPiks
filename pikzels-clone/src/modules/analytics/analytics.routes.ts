import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { AuthRequest } from '../../types/auth';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes in this file require authentication
router.use(authenticateToken);

// Analytics dashboard data
router.get('/dashboard', (req, res) => {
  analyticsController.getDashboardData(req as AuthRequest, res);
});

// User stats summary (for StatsWidget)
router.get('/stats', (req, res) => {
  analyticsController.getUserStats(req as AuthRequest, res);
});

// Advanced analytics
router.get('/advanced', (req, res) => {
  analyticsController.getAdvancedAnalytics(req as AuthRequest, res);
});

// Detailed advanced analytics with timeframe filtering
router.get('/detailed', (req, res) => {
  analyticsController.getDetailedAdvancedAnalytics(req as AuthRequest, res);
});

// Comparative analytics (current vs previous period)
router.get('/comparative', (req, res) => {
  analyticsController.getComparativeAnalytics(req as AuthRequest, res);
});

// Thumbnail trends
router.get('/trends', (req, res) => {
  analyticsController.getThumbnailTrends(req as AuthRequest, res);
});

// Style distribution
router.get('/styles', (req, res) => {
  analyticsController.getStyleDistribution(req as AuthRequest, res);
});

// Project usage
router.get('/projects', (req, res) => {
  analyticsController.getProjectUsage(req as AuthRequest, res);
});

// Top performers with performance scores
router.get('/top-performers', (req, res) => {
  analyticsController.getTopPerformers(req as AuthRequest, res);
});

// Export analytics as CSV
router.get('/export/csv', (req, res) => {
  analyticsController.exportCSV(req as AuthRequest, res);
});

export default router;
