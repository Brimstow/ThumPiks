import { Request, Response } from 'express';
import { videoProxyService } from './video-proxy.service';
import { logger } from '../../utils/logger';

export class VideoProxyController {
  /**
   * GET /api/video/info
   * Get video information without downloading
   */
  async getVideoInfo(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: 'URL parameter is required',
        });
        return;
      }

      const detected = videoProxyService.detectPlatform(url);
      if (!detected) {
        res.status(400).json({
          success: false,
          error: 'Unsupported video URL or platform',
          supportedPlatforms: videoProxyService.getSupportedPlatforms(),
        });
        return;
      }

      const info = await videoProxyService.getVideoInfo(url);

      res.json({
        success: true,
        data: info,
      });
    } catch (error) {
      logger.error('Failed to get video info', error as Error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to get video info',
      });
    }
  }

  /**
   * GET /api/video/stream
   * Stream video content (proxy)
   */
  async streamVideo(req: Request, res: Response): Promise<void> {
    try {
      const { url, quality } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: 'URL parameter is required',
        });
        return;
      }

      const detected = videoProxyService.detectPlatform(url);
      if (!detected) {
        res.status(400).json({
          success: false,
          error: 'Unsupported video URL or platform',
          supportedPlatforms: videoProxyService.getSupportedPlatforms(),
        });
        return;
      }

      logger.info(`Streaming video from ${detected.platform}`, {
        videoId: detected.videoId,
        quality: quality || 'default',
      });

      const { stream, info } = await videoProxyService.getVideoStream(
        url,
        typeof quality === 'string' ? quality : undefined
      );

      // Set appropriate headers for video streaming
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${info.title || 'video'}.mp4"`
      );
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Pipe the stream to response
      stream.pipe(res);

      // Handle stream errors
      stream.on('error', (error) => {
        logger.error('Stream error', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Stream error occurred',
          });
        }
      });
    } catch (error) {
      logger.error('Failed to stream video', error as Error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error:
            error instanceof Error ? error.message : 'Failed to stream video',
        });
      }
    }
  }

  /**
   * GET /api/video/proxy/youtube
   * YouTube-specific proxy endpoint
   */
  async proxyYouTube(req: Request, res: Response): Promise<void> {
    try {
      const { url, v } = req.query;
      const videoUrl =
        typeof url === 'string'
          ? url
          : typeof v === 'string'
            ? `https://www.youtube.com/watch?v=${v}`
            : null;

      if (!videoUrl) {
        res.status(400).json({
          success: false,
          error: 'URL or video ID (v) parameter is required',
        });
        return;
      }

      const detected = videoProxyService.detectPlatform(videoUrl);
      if (!detected || detected.platform !== 'youtube') {
        res.status(400).json({
          success: false,
          error: 'Invalid YouTube URL',
        });
        return;
      }

      const { stream, info } = await videoProxyService.getVideoStream(videoUrl);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${info.title || 'youtube-video'}.mp4"`
      );

      stream.pipe(res);
    } catch (error) {
      logger.error('YouTube proxy failed', error as Error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'YouTube proxy failed',
      });
    }
  }

  /**
   * GET /api/video/proxy/tiktok
   * TikTok-specific proxy endpoint
   */
  async proxyTikTok(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: 'URL parameter is required',
        });
        return;
      }

      const detected = videoProxyService.detectPlatform(url);
      if (!detected || detected.platform !== 'tiktok') {
        res.status(400).json({
          success: false,
          error: 'Invalid TikTok URL',
        });
        return;
      }

      const { stream, info } = await videoProxyService.getVideoStream(url);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${info.title || 'tiktok-video'}.mp4"`
      );

      stream.pipe(res);
    } catch (error) {
      logger.error('TikTok proxy failed', error as Error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'TikTok proxy failed',
      });
    }
  }

  /**
   * GET /api/video/proxy/instagram
   * Instagram-specific proxy endpoint
   */
  async proxyInstagram(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({
          success: false,
          error: 'URL parameter is required',
        });
        return;
      }

      const detected = videoProxyService.detectPlatform(url);
      if (!detected || detected.platform !== 'instagram') {
        res.status(400).json({
          success: false,
          error: 'Invalid Instagram URL',
        });
        return;
      }

      const { stream, info } = await videoProxyService.getVideoStream(url);

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${info.title || 'instagram-video'}.mp4"`
      );

      stream.pipe(res);
    } catch (error) {
      logger.error('Instagram proxy failed', error as Error);
      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Instagram proxy failed',
      });
    }
  }

  /**
   * GET /api/video/platforms
   * List supported platforms
   */
  async listPlatforms(_req: Request, res: Response): Promise<void> {
    const platforms = videoProxyService.getSupportedPlatforms();

    res.json({
      success: true,
      data: {
        platforms,
        count: platforms.length,
      },
    });
  }

  /**
   * GET /api/video/detect
   * Detect platform from URL
   */
  async detectPlatform(req: Request, res: Response): Promise<void> {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'URL parameter is required',
      });
      return;
    }

    const detected = videoProxyService.detectPlatform(url);

    if (detected) {
      res.json({
        success: true,
        data: {
          supported: true,
          platform: detected.platform,
          videoId: detected.videoId,
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          supported: false,
          platform: null,
          videoId: null,
          supportedPlatforms: videoProxyService.getSupportedPlatforms(),
        },
      });
    }
  }
}

export const videoProxyController = new VideoProxyController();
export default videoProxyController;
