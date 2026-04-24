import { Router } from 'express';
import { query } from 'express-validator';
import {
  authenticateAdmin,
  requirePermission,
  adminRateLimit
} from './admin-auth.middleware';
import { ADMIN_PERMISSIONS } from './admin-auth.service';

const router = Router();

/**
 * Sitemap Management Controller
 */
const sitemapController = {
  // Get sitemap entries with filtering and pagination
  getSitemapEntries: async (req: any, res: any) => {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        type = 'all',
        status = 'all',
        sortField = 'lastModified',
        sortDirection = 'desc'
      } = req.query;

      // Mock sitemap data - replace with actual database queries
      const mockEntries = [
        {
          id: '1',
          url: 'https://thumbnailcreator.com/',
          lastModified: '2024-01-15T10:00:00Z',
          changeFreq: 'daily',
          priority: 1.0,
          status: 'active',
          type: 'page',
          indexStatus: 'indexed',
          crawledAt: '2024-01-15T08:30:00Z',
          clicks: 1250,
          impressions: 5670
        },
        {
          id: '2',
          url: 'https://thumbnailcreator.com/templates',
          lastModified: '2024-01-14T15:20:00Z',
          changeFreq: 'weekly',
          priority: 0.8,
          status: 'active',
          type: 'page',
          indexStatus: 'indexed',
          crawledAt: '2024-01-14T12:15:00Z',
          clicks: 890,
          impressions: 3420
        },
        {
          id: '3',
          url: 'https://thumbnailcreator.com/thumbnails/gaming-header-123',
          lastModified: '2024-01-13T09:45:00Z',
          changeFreq: 'monthly',
          priority: 0.6,
          status: 'active',
          type: 'thumbnail',
          indexStatus: 'indexed',
          crawledAt: '2024-01-13T14:20:00Z',
          clicks: 45,
          impressions: 180
        }
      ];

      // Apply filters
      const filteredEntries = mockEntries.filter(entry => {
        const matchesSearch = entry.url.toLowerCase().includes(search.toLowerCase());
        const matchesType = type === 'all' || entry.type === type;
        const matchesStatus = status === 'all' || entry.status === status;
        return matchesSearch && matchesType && matchesStatus;
      });

      // Apply sorting
      filteredEntries.sort((a: any, b: any) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

      res.json({
        success: true,
        data: {
          entries: paginatedEntries,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(filteredEntries.length / limit),
            totalEntries: filteredEntries.length,
            hasNext: endIndex < filteredEntries.length,
            hasPrev: startIndex > 0
          }
        }
      });
    } catch (error) {
      console.error('Error fetching sitemap entries:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sitemap entries'
      });
    }
  },

  // Get sitemap statistics
  getSitemapStats: async (_req: any, res: any) => {
    try {
      // Mock stats - replace with actual database queries
      const stats = {
        totalUrls: 1247,
        indexedUrls: 1089,
        pendingUrls: 158,
        errorUrls: 23,
        lastGenerated: '2024-01-15T10:30:00Z',
        fileSize: '2.3 MB',
        avgClickThrough: 3.2
      };

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching sitemap stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sitemap statistics'
      });
    }
  },

  // Generate new sitemap
  generateSitemap: async (_req: any, res: any) => {
    try {
      // Mock sitemap generation - replace with actual implementation
      console.log('Generating sitemap...');
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({
        success: true,
        message: 'Sitemap generated successfully',
        data: {
          generatedAt: new Date().toISOString(),
          totalUrls: 1247,
          fileSize: '2.3 MB'
        }
      });
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate sitemap'
      });
    }
  },

  // Export sitemap XML
  exportSitemap: async (_req: any, res: any) => {
    try {
      // Mock XML generation - replace with actual sitemap XML generation
      const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://thumbnailcreator.com/</loc>
    <lastmod>2024-01-15T10:00:00Z</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://thumbnailcreator.com/templates</loc>
    <lastmod>2024-01-14T15:20:00Z</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Content-Disposition', 'attachment; filename="sitemap.xml"');
      res.send(sitemapXml);
    } catch (error) {
      console.error('Error exporting sitemap:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export sitemap'
      });
    }
  }
};

/**
 * Validation middleware
 */
const getSitemapEntriesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isLength({ max: 255 }).withMessage('Search term too long'),
  query('type').optional().isIn(['all', 'page', 'thumbnail', 'template', 'project', 'user_profile']).withMessage('Invalid type'),
  query('status').optional().isIn(['all', 'active', 'pending', 'excluded']).withMessage('Invalid status'),
  query('sortField').optional().isIn(['url', 'lastModified', 'priority', 'type']).withMessage('Invalid sort field'),
  query('sortDirection').optional().isIn(['asc', 'desc']).withMessage('Invalid sort direction')
];

/**
 * Sitemap Management Routes
 */

// Get sitemap entries with filtering and pagination
router.get(
  '/entries',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.CONTENT_VIEW),
  adminRateLimit(200, 15 * 60 * 1000), // 200 requests per 15 minutes
  getSitemapEntriesValidation,
  sitemapController.getSitemapEntries
);

// Get sitemap statistics
router.get(
  '/stats',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.CONTENT_VIEW),
  adminRateLimit(100, 15 * 60 * 1000),
  sitemapController.getSitemapStats
);

// Generate new sitemap
router.post(
  '/generate',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.CONTENT_MODERATE),
  adminRateLimit(10, 15 * 60 * 1000), // 10 generations per 15 minutes
  sitemapController.generateSitemap
);

// Export sitemap XML
router.get(
  '/export',
  authenticateAdmin,
  requirePermission(ADMIN_PERMISSIONS.CONTENT_VIEW),
  adminRateLimit(20, 15 * 60 * 1000), // 20 exports per 15 minutes
  sitemapController.exportSitemap
);

/**
 * Health check for sitemap system
 */
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    service: 'sitemap-admin',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

export default router;