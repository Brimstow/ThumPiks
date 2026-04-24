import { Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { VisualSearchService } from './visual-search.service';
import { getPrisma } from '../../utils/prisma-factory';
import fetch from 'node-fetch';

let sharedService: VisualSearchService;

export const initializeServices = (prismaClient?: any, cacheService?: any) => {
  sharedService = new VisualSearchService({
    prisma: prismaClient || getPrisma(),
    cache: cacheService,
  });
};

if (process.env.NODE_ENV !== 'test') {
  initializeServices();
}

const getService = () => {
  if (!sharedService) {
    initializeServices();
  }
  return sharedService;
};

/**
 * POST /api/visual-search/by-image
 * Search for similar thumbnails using an image URL.
 */
export const searchByImage = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageUrl } = req.body;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    if (!imageUrl.startsWith('http')) {
      return res.status(400).json({ error: 'Invalid image URL' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const threshold = parseFloat(req.query.threshold as string) || 0.5;

    const results = await getService().searchByImage(
      imageUrl,
      Math.min(limit, 50),
      Math.max(0, Math.min(threshold, 1))
    );

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error in visual search by image:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/visual-search/by-text
 * Search for thumbnails using text description.
 */
export const searchByText = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text } = req.body;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text is required' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const threshold = parseFloat(req.query.threshold as string) || 0.3;

    const results = await getService().searchByText(
      text.trim(),
      Math.min(limit, 50),
      Math.max(0, Math.min(threshold, 1))
    );

    return res.status(200).json(results);
  } catch (error: any) {
    console.error('Error in visual search by text:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

/**
 * POST /api/visual-search/index/:thumbnailId
 * Index a single thumbnail into the vector database.
 */
export const indexThumbnail = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const thumbnailId = Array.isArray(req.params.thumbnailId) ? req.params.thumbnailId[0] : req.params.thumbnailId;
    if (!thumbnailId) {
      return res.status(400).json({ error: 'thumbnailId is required' });
    }

    await getService().indexThumbnail(thumbnailId);

    return res.status(200).json({ success: true, thumbnailId });
  } catch (error: any) {
    if (error.message?.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    console.error('Error indexing thumbnail:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/visual-search/index-batch
 * Batch index user's thumbnails.
 */
export const indexBatch = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const batchSize = parseInt(req.body.batchSize as string) || 50;
    const result = await getService().indexBatch(
      req.user.id,
      Math.min(batchSize, 200)
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error in batch indexing:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/visual-search/health
 * Health check for visual search subsystem.
 */
export const healthCheck = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const health = await getService().healthCheck();
    return res.status(200).json(health);
  } catch (error) {
    console.error('Error in visual search health check:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/visual-search/resolve-url
 * Resolve social media URLs to direct image URLs.
 * Currently supports TikTok via oEmbed API.
 */
export const resolveUrl = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Only allow http/https protocols (SSRF prevention)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP/HTTPS URLs are allowed' });
    }

    // TikTok oEmbed resolution
    if (/tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com/.test(parsedUrl.hostname)) {
      try {
        const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
        const response = await fetch(oembedUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) {
          return res.status(404).json({ error: 'Could not resolve TikTok URL' });
        }

        const data: any = await response.json();
        if (data.thumbnail_url) {
          return res.status(200).json({
            imageUrl: data.thumbnail_url,
            platform: 'TikTok',
            title: data.title || '',
            author: data.author_name || '',
          });
        } else {
          return res.status(404).json({ error: 'No thumbnail found for TikTok video' });
        }
      } catch (error) {
        console.error('TikTok oEmbed error:', error);
        return res.status(500).json({ error: 'Failed to resolve TikTok URL' });
      }
    }

    // Unsupported platform
    return res.status(400).json({ 
      error: 'Unsupported platform. Currently only TikTok URLs are supported for server-side resolution.' 
    });
  } catch (error) {
    console.error('Error in URL resolution:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
