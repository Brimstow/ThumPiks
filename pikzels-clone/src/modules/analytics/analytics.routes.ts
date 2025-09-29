import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();
const analyticsController = new AnalyticsController();

// All routes in this file require authentication
router.use(authenticateToken);

// Analytics dashboard data
router.get('/dashboard', (req, res) => analyticsController.getDashboardData(req, res));

// Advanced analytics
router.get('/advanced', (req, res) => analyticsController.getAdvancedAnalytics(req, res));

// Detailed advanced analytics with timeframe filtering
router.get('/detailed', (req, res) => analyticsController.getDetailedAdvancedAnalytics(req, res));

// Comparative analytics (current vs previous period)
router.get('/comparative', (req, res) => analyticsController.getComparativeAnalytics(req, res));

// Thumbnail trends
router.get('/trends', (req, res) => analyticsController.getThumbnailTrends(req, res));

// Style distribution
router.get('/styles', (req, res) => analyticsController.getStyleDistribution(req, res));

// Project usage
router.get('/projects', (req, res) => analyticsController.getProjectUsage(req, res));

export default router;