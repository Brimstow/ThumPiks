/**
 * YouTube Trending Routes
 * Public endpoints for fetching YouTube trending videos and thumbnails
 */

import { Router, Request, Response } from 'express';
import {
  youtubeTrendingService,
  SUPPORTED_REGIONS,
  YOUTUBE_CATEGORY_IDS,
} from './youtube-trending.service';

const router = Router();

/**
 * GET /api/youtube-trending/status
 * Check if YouTube API is configured
 */
router.get('/status', (_req: Request, res: Response) => {
  const isConfigured = youtubeTrendingService.isConfigured();

  return res.json({
    configured: isConfigured,
    message: isConfigured
      ? 'YouTube API is configured and ready'
      : 'YouTube API key not configured. Add YOUTUBE_API_KEY to your environment variables.',
  });
});

/**
 * GET /api/youtube-trending/regions
 * Get list of supported regions for trending videos
 */
router.get('/regions', (_req: Request, res: Response) => {
  return res.json({
    regions: SUPPORTED_REGIONS,
  });
});

/**
 * GET /api/youtube-trending/categories
 * Get list of video categories
 */
router.get('/categories', (_req: Request, res: Response) => {
  // Return our curated categories that map to YouTube category IDs
  const categories = Object.entries(YOUTUBE_CATEGORY_IDS).map(([key, id]) => ({
    id: key,
    youtubeId: id,
    name: key.charAt(0).toUpperCase() + key.slice(1),
  }));

  return res.json({ categories });
});

/**
 * GET /api/youtube-trending/videos
 * Fetch trending videos from YouTube
 *
 * Query params:
 * - region: Country code (default: US)
 * - category: Category key from YOUTUBE_CATEGORY_IDS (default: all)
 * - limit: Max results (default: 20, max: 50)
 * - pageToken: Pagination token for next page
 */
router.get('/videos', async (req: Request, res: Response) => {
  try {
    // Check if configured
    if (!youtubeTrendingService.isConfigured()) {
      return res.status(503).json({
        error: 'YouTube API not configured',
        configured: false,
        message:
          'The YouTube trending feature is coming soon. Add YOUTUBE_API_KEY to enable.',
      });
    }

    const {
      region = 'US',
      category = 'all',
      limit = '20',
      pageToken,
    } = req.query;

    // Validate region
    const regionCode = String(region).toUpperCase();
    const validRegion = SUPPORTED_REGIONS.find(r => r.code === regionCode);
    if (!validRegion) {
      return res.status(400).json({
        error: 'Invalid region code',
        validRegions: SUPPORTED_REGIONS.map(r => r.code),
      });
    }

    // Validate category
    const categoryId = String(category).toLowerCase();
    if (categoryId !== 'all' && !YOUTUBE_CATEGORY_IDS[categoryId]) {
      return res.status(400).json({
        error: 'Invalid category',
        validCategories: Object.keys(YOUTUBE_CATEGORY_IDS),
      });
    }

    // Validate limit
    const maxResults = Math.min(
      Math.max(1, parseInt(String(limit), 10) || 20),
      50
    );

    // Fetch trending videos
    const options: {
      regionCode: string;
      categoryId: string;
      maxResults: number;
      pageToken?: string;
    } = {
      regionCode,
      categoryId,
      maxResults,
    };

    // Only add pageToken if it exists (avoiding undefined in exactOptionalPropertyTypes)
    if (pageToken) {
      options.pageToken = String(pageToken);
    }

    const result = await youtubeTrendingService.getTrendingVideos(options);

    return res.json({
      success: true,
      ...result,
      region: validRegion,
    });
  } catch (error: any) {
    console.error('[YouTubeTrending] Route error:', error);

    // Handle specific YouTube API errors
    if (error.message?.includes('YouTube API error')) {
      return res.status(502).json({
        error: 'YouTube API error',
        message: 'Failed to fetch data from YouTube. Please try again later.',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch trending videos',
    });
  }
});

export default router;
