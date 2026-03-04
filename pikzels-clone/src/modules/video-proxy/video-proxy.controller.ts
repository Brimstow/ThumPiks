import { Request, Response } from 'express';
import axios from 'axios';
import { videoProxyService } from './video-proxy.service';
import { ytDlpUtil, YtDlpVideoInfo } from './yt-dlp.util';
import { extractFramesFromVideo } from './ffmpeg-frames.util';
import { logger } from '../../utils/logger';

/**
 * Cache resolved CDN URLs so the browser's Range requests
 * all hit the same upstream resource (same file size).
 * Entries expire after 10 minutes (YouTube URLs typically last ~6 hours).
 */
interface CdnCacheEntry {
  streamUrl: string;
  info: YtDlpVideoInfo;
  expiresAt: number;
}
const cdnCache = new Map<string, CdnCacheEntry>();
const CDN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedCdn(key: string): CdnCacheEntry | null {
  const entry = cdnCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cdnCache.delete(key);
    return null;
  }
  return entry;
}

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
   * Stream video content (proxy with Range support)
   * Uses yt-dlp to get the direct CDN URL, then proxies with proper
   * byte-range handling so the browser can seek and read metadata.
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

      const qualityArg = quality === 'worst' ? 'worst' : 'best';
      const cacheKey = `${url}::${qualityArg}`;

      // Reuse cached CDN URL so every Range request hits the same upstream resource
      let streamUrl: string;
      let ytInfo: YtDlpVideoInfo;

      const cached = getCachedCdn(cacheKey);
      if (cached) {
        streamUrl = cached.streamUrl;
        ytInfo = cached.info;
        logger.info(`Using cached CDN URL for ${detected.platform}`, {
          videoId: detected.videoId,
        });
      } else {
        logger.info(`Resolving CDN URL for ${detected.platform}`, {
          videoId: detected.videoId,
          quality: qualityArg,
        });
        [streamUrl, ytInfo] = await Promise.all([
          ytDlpUtil.getStreamUrl(url, qualityArg as 'best' | 'worst'),
          ytDlpUtil.getVideoInfo(url),
        ]);
        cdnCache.set(cacheKey, {
          streamUrl,
          info: ytInfo,
          expiresAt: Date.now() + CDN_CACHE_TTL,
        });
      }

      // Build upstream request headers, forwarding Range if present
      const upstreamHeaders: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      };
      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      let upstream;
      try {
        upstream = await axios.get(streamUrl, {
          responseType: 'stream',
          headers: upstreamHeaders,
          timeout: 60000,
        });
      } catch (upstreamErr: unknown) {
        // If the CDN returns 403/416, the URL may have expired – evict and retry once
        const axErr = upstreamErr as { response?: { status?: number } };
        if (
          cached &&
          axErr.response?.status &&
          [403, 410, 416].includes(axErr.response.status)
        ) {
          logger.warn('Cached CDN URL returned error, evicting and retrying', {
            status: axErr.response.status,
            videoId: detected.videoId,
          });
          cdnCache.delete(cacheKey);
          const freshUrl = await ytDlpUtil.getStreamUrl(
            url,
            qualityArg as 'best' | 'worst'
          );
          cdnCache.set(cacheKey, {
            streamUrl: freshUrl,
            info: ytInfo,
            expiresAt: Date.now() + CDN_CACHE_TTL,
          });
          upstream = await axios.get(freshUrl, {
            responseType: 'stream',
            headers: upstreamHeaders,
            timeout: 60000,
          });
        } else {
          throw upstreamErr;
        }
      }

      // Relay status (200 or 206)
      res.status(upstream.status);

      // Relay critical headers for seeking / metadata
      const relay = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
      ];
      for (const h of relay) {
        const v = upstream.headers[h];
        if (v) res.setHeader(h, v);
      }

      // Ensure Content-Type is video
      if (!upstream.headers['content-type']?.startsWith('video/')) {
        res.setHeader('Content-Type', 'video/mp4');
      }

      res.setHeader(
        'Content-Disposition',
        `inline; filename="${ytInfo.title || 'video'}.mp4"`
      );
      res.setHeader('Cache-Control', 'public, max-age=3600');
      // Always advertise Range support so the browser can seek
      if (!upstream.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      // Pipe upstream to client
      upstream.data.pipe(res);

      upstream.data.on('error', (error: Error) => {
        logger.error('Upstream stream error', error);
        if (!res.headersSent) {
          res.status(500).json({ success: false, error: 'Stream error occurred' });
        }
      });

      // Abort upstream when client disconnects to avoid leaked connections
      res.on('close', () => {
        if (upstream.data.destroy) upstream.data.destroy();
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
      if (detected?.platform !== 'youtube') {
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
        error: error instanceof Error ? error.message : 'YouTube proxy failed',
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
      if (detected?.platform !== 'tiktok') {
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
        error: error instanceof Error ? error.message : 'TikTok proxy failed',
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
      if (detected?.platform !== 'instagram') {
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
   * GET /api/video/storyboard
   * Get YouTube storyboard frames (pre-generated preview images)
   * Fallback when yt-dlp is unavailable
   */
  async getStoryboardFrames(req: Request, res: Response): Promise<void> {
    try {
      const { url, v } = req.query;
      let videoId: string | null = null;

      if (typeof v === 'string') {
        videoId = v;
      } else if (typeof url === 'string') {
        const detected = videoProxyService.detectPlatform(url);
        if (detected?.platform === 'youtube') {
          videoId = detected.videoId;
        }
      }

      if (!videoId) {
        res.status(400).json({
          success: false,
          error: 'YouTube video ID (v) or URL parameter is required',
        });
        return;
      }

      const frames = await videoProxyService.getYouTubeStoryboardFrames(videoId);

      res.json({
        success: true,
        data: {
          videoId,
          frames,
          count: frames.length,
          note: 'Storyboard frames are pre-generated by YouTube. For precise frame extraction, use the /api/video/stream endpoint.',
        },
      });
    } catch (error) {
      logger.error('Failed to get storyboard frames', error as Error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get storyboard frames',
      });
    }
  }

  /**
   * GET /api/video/frames
   * Get selectable frames for Frame Picker UI
   */
  async getVideoFrames(req: Request, res: Response): Promise<void> {
    try {
      const { url } = req.query;

      if (!url || typeof url !== 'string') {
        res.status(400).json({ success: false, error: 'URL parameter is required' });
        return;
      }

      const result = await videoProxyService.getVideoFrames(url);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to get video frames', error as Error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get video frames',
      });
    }
  }

  /**
   * GET /api/video/frames/stream
   * SSE endpoint — streams real-time progress as frames are extracted.
   * Events:
   *   phase:resolving  — getting video info + stream URL
   *   phase:extracting — extracting frame N of M
   *   phase:done       — all frames extracted, includes full data
   *   phase:error      — extraction failed
   */
  async getVideoFramesStream(req: Request, res: Response): Promise<void> {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, error: 'URL parameter is required' });
      return;
    }

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders();

    const send = (event: string, data: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Abort flag — stop work if the client disconnects
    let aborted = false;
    req.on('close', () => { aborted = true; });

    try {
      // Phase 1: Resolve video info
      send('progress', { phase: 'resolving', message: 'Getting video info...' });

      const info = await videoProxyService.getVideoInfo(url);

      if (aborted) return;

      const videoInfo = {
        title: info.title,
        videoId: info.videoId,
        platform: info.platform,
        duration: info.duration,
        uploader: info.uploader,
      };

      send('progress', { phase: 'resolving', message: 'Getting stream URL...' });

      if (!info.duration || info.duration <= 0) {
        // No duration — fall back to regular endpoint
        send('progress', { phase: 'resolving', message: 'Falling back to thumbnails...' });
        const result = await videoProxyService.getVideoFrames(url);
        send('complete', { frames: result.frames, videoInfo: result.videoInfo });
        res.end();
        return;
      }

      const streamUrl = await ytDlpUtil.getStreamUrl(url, 'best');

      if (aborted) return;

      send('progress', { phase: 'extracting', current: 0, total: 8, message: 'Starting frame extraction...' });

      // Phase 2: Extract frames with progress
      const extracted = await extractFramesFromVideo(
        streamUrl,
        info.duration!,
        info.videoId,
        8,
        1280,
        720,
        (event) => {
          if (aborted) return;
          if (event.phase === 'extracting' && !event.frame) {
            // Starting extraction of this frame
            send('progress', {
              phase: 'extracting',
              current: event.current,
              total: event.total,
              message: `Extracting frame ${event.current} of ${event.total}...`,
            });
          } else if (event.phase === 'extracting' && event.frame) {
            // Frame completed — send as a preview
            send('frame', {
              index: event.current - 1,
              current: event.current,
              total: event.total,
              url: `data:image/jpeg;base64,${event.frame.buffer.toString('base64')}`,
              label: event.frame.label,
              width: 1280,
              height: 720,
            });
          }
        },
      );

      if (aborted) return;

      // Phase 3: Send complete result
      const frames = extracted.map((f) => ({
        url: `data:image/jpeg;base64,${f.buffer.toString('base64')}`,
        label: f.label,
        width: 1280,
        height: 720,
      }));

      send('complete', { frames, videoInfo });
      res.end();
    } catch (error) {
      logger.error('SSE frame extraction failed', error as Error);
      send('error', {
        message: error instanceof Error ? error.message : 'Frame extraction failed',
      });
      res.end();
    }
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
