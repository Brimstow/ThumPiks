import axios from 'axios';
import { Readable } from 'stream';
import { logger } from '../../utils/logger';
import { ytDlpUtil, YtDlpVideoInfo } from './yt-dlp.util';
import { extractFramesFromVideo } from './ffmpeg-frames.util';

export interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  format: string;
  platform: string;
  videoId: string;
  streamUrl?: string;
  uploader?: string;
}

export interface PlatformConfig {
  name: string;
  urlPatterns: RegExp[];
  extractVideoId: (url: string) => string | null;
}

/**
 * Video Proxy Service
 * 
 * Uses yt-dlp for unified video fetching across 1000+ platforms:
 * - YouTube, Instagram, TikTok, Twitter/X, Twitch, Facebook, Vimeo, Reddit, etc.
 * 
 * Architecture:
 * - Tier 1: yt-dlp (primary) - handles all platforms with unified interface
 * - Tier 2: Platform storyboards (fallback) - for quick preview without download
 */
class VideoProxyService {
  private platforms: Map<string, PlatformConfig> = new Map();

  constructor() {
    this.registerBuiltInPlatforms();
  }

  private registerBuiltInPlatforms() {
    // YouTube platform
    this.registerPlatform({
      name: 'youtube',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('youtube')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // TikTok platform
    this.registerPlatform({
      name: 'tiktok',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
        /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/(\w+)/,
        /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/(\w+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('tiktok')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Instagram platform
    this.registerPlatform({
      name: 'instagram',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('instagram')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Twitter/X platform
    this.registerPlatform({
      name: 'twitter',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('twitter')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Twitch platform
    this.registerPlatform({
      name: 'twitch',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/videos\/(\d+)/,
        /(?:https?:\/\/)?clips\.twitch\.tv\/(\w+)/,
        /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/\w+\/clip\/(\w+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('twitch')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Vimeo platform
    this.registerPlatform({
      name: 'vimeo',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
        /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('vimeo')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Facebook platform
    this.registerPlatform({
      name: 'facebook',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/.*\/videos\/(\d+)/,
        /(?:https?:\/\/)?(?:www\.)?facebook\.com\/watch\/?\?v=(\d+)/,
        /(?:https?:\/\/)?fb\.watch\/(\w+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('facebook')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });

    // Reddit platform
    this.registerPlatform({
      name: 'reddit',
      urlPatterns: [
        /(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/\w+\/comments\/(\w+)/,
        /(?:https?:\/\/)?(?:v\.)?redd\.it\/(\w+)/,
      ],
      extractVideoId: (url: string) => {
        for (const pattern of this.platforms.get('reddit')!.urlPatterns) {
          const match = url.match(pattern);
          if (match?.[1]) return match[1];
        }
        return null;
      },
    });
  }

  registerPlatform(config: PlatformConfig) {
    this.platforms.set(config.name, config);
    logger.info(`Registered video platform: ${config.name}`);
  }

  detectPlatform(url: string): { platform: string; videoId: string } | null {
    for (const [name, config] of this.platforms) {
      const videoId = config.extractVideoId(url);
      if (videoId) {
        return { platform: name, videoId };
      }
    }
    return null;
  }

  /**
   * Get video info using yt-dlp
   * Works for all 1000+ supported platforms
   */
  async getVideoInfo(url: string): Promise<VideoInfo> {
    const detected = this.detectPlatform(url);
    
    try {
      // Use yt-dlp for all platforms
      const ytInfo = await ytDlpUtil.getVideoInfo(url);
      return this.convertYtDlpInfo(ytInfo, detected);
    } catch (error) {
      logger.error(`yt-dlp failed for ${url}`, error as Error);
      
      // Fallback: Return basic info for YouTube using storyboard API
      if (detected?.platform === 'youtube') {
        return this.getYouTubeStoryboardInfo(detected.videoId);
      }
      
      throw error;
    }
  }

  /**
   * Get video stream using yt-dlp
   * Works for all 1000+ supported platforms
   */
  async getVideoStream(
    url: string,
    quality?: string
  ): Promise<{ stream: Readable; info: VideoInfo }> {
    const detected = this.detectPlatform(url);
    
    try {
      // Get info and stream in parallel
      const [ytInfo, stream] = await Promise.all([
        ytDlpUtil.getVideoInfo(url),
        ytDlpUtil.getVideoStream(url, quality === 'worst' ? 'worst' : 'best'),
      ]);
      
      const info = this.convertYtDlpInfo(ytInfo, detected);
      return { stream, info };
    } catch (error) {
      logger.error(`Failed to get video stream for ${url}`, error as Error);
      throw error;
    }
  }

  /**
   * Check if URL is supported by any platform
   * Uses yt-dlp which supports 1000+ sites
   */
  async isSupported(url: string): Promise<boolean> {
    // First check our known platforms
    if (this.detectPlatform(url)) {
      return true;
    }
    
    // Then check yt-dlp for other supported sites
    try {
      return await ytDlpUtil.isSupported(url);
    } catch {
      return false;
    }
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  /**
   * Convert yt-dlp info to our VideoInfo format
   */
  private convertYtDlpInfo(
    ytInfo: YtDlpVideoInfo,
    detected: { platform: string; videoId: string } | null
  ): VideoInfo {
    return {
      title: ytInfo.title,
      ...(ytInfo.duration !== undefined ? { duration: ytInfo.duration } : {}),
      ...(ytInfo.thumbnail ? { thumbnail: ytInfo.thumbnail } : {}),
      format: 'mp4',
      platform: detected?.platform || ytInfo.extractor_key.toLowerCase(),
      videoId: detected?.videoId || ytInfo.id,
      ...(ytInfo.uploader ? { uploader: ytInfo.uploader } : {}),
    };
  }

  /**
   * Fallback: Get YouTube video info using storyboard/thumbnail API
   * No authentication required, instant response
   */
  private async getYouTubeStoryboardInfo(videoId: string): Promise<VideoInfo> {
    logger.info(`Using YouTube storyboard fallback for ${videoId}`);
    
    // Try to get basic info from oEmbed API
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(oembedUrl, { timeout: 5000 });
      
      return {
        title: response.data.title || `YouTube Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        format: 'mp4',
        platform: 'youtube',
        videoId,
        uploader: response.data.author_name,
      };
    } catch {
      // Even oEmbed failed, return minimal info
      return {
        title: `YouTube Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        format: 'mp4',
        platform: 'youtube',
        videoId,
      };
    }
  }

  /**
   * Get selectable video frames for Frame Picker
   * Extracts real frames from the video at evenly-spaced timestamps using
   * ffmpeg (via stream URL from yt-dlp). Returns base64 data URLs at 1280×720.
   * Falls back to YouTube static thumbnails if ffmpeg extraction fails.
   */
  async getVideoFrames(url: string): Promise<{
    frames: { url: string; label: string; width?: number; height?: number }[];
    videoInfo: { title: string; videoId: string; platform: string; duration?: number; uploader?: string };
  }> {
    const detected = this.detectPlatform(url);

    // Step 1: Get video info + stream URL via yt-dlp
    const ytInfo = await ytDlpUtil.getVideoInfo(url);
    const info = this.convertYtDlpInfo(ytInfo, detected);

    const videoInfo: { title: string; videoId: string; platform: string; duration?: number; uploader?: string } = {
      title: info.title,
      videoId: info.videoId,
      platform: info.platform,
    };
    if (info.duration != null) videoInfo.duration = info.duration;
    if (info.uploader) videoInfo.uploader = info.uploader;

    // Step 2: Try real frame extraction via ffmpeg
    if (info.duration && info.duration > 0) {
      try {
        const streamUrl = await ytDlpUtil.getStreamUrl(url, 'best');

        logger.info(`Extracting real frames from ${info.platform} video`, {
          videoId: info.videoId,
          duration: info.duration,
        });

        const extracted = await extractFramesFromVideo(
          streamUrl,
          info.duration,
          info.videoId,  // cache key — same video = instant return
          8,             // 8 frames
          1280,          // 1280×720
          720,
        );

        const frames = extracted.map((f) => ({
          url: `data:image/jpeg;base64,${f.buffer.toString('base64')}`,
          label: f.label,
          width: 1280,
          height: 720,
        }));

        return { frames, videoInfo };
      } catch (ffmpegError) {
        logger.warn(
          `FFmpeg frame extraction failed for ${url}, falling back to thumbnails`,
          ffmpegError as Error,
        );
        // Fall through to thumbnail fallback
      }
    }

    // Step 3: Fallback — use platform thumbnails
    const frames: { url: string; label: string; width?: number; height?: number }[] = [];

    if (detected?.platform === 'youtube') {
      const videoId = detected.videoId;
      const ytFrames = [
        { suffix: 'maxresdefault', label: 'Official Thumbnail (HD)', w: 1280, h: 720 },
        { suffix: 'sddefault', label: 'Official Thumbnail (SD)', w: 640, h: 480 },
        { suffix: '1', label: 'Frame — Early', w: 480, h: 360 },
        { suffix: '2', label: 'Frame — Middle', w: 480, h: 360 },
        { suffix: '3', label: 'Frame — Late', w: 480, h: 360 },
        { suffix: 'hqdefault', label: 'High Quality Default', w: 480, h: 360 },
      ];

      const checks = await Promise.allSettled(
        ytFrames.map(async (f) => {
          const frameUrl = `https://img.youtube.com/vi/${videoId}/${f.suffix}.jpg`;
          const resp = await axios.head(frameUrl, { timeout: 3000 });
          if (resp.status === 200) {
            return { url: frameUrl, label: f.label, width: f.w, height: f.h };
          }
          throw new Error('not found');
        })
      );

      for (const result of checks) {
        if (result.status === 'fulfilled') {
          frames.push(result.value);
        }
      }
    } else if (ytInfo.thumbnails && ytInfo.thumbnails.length > 0) {
      const seen = new Set<string>();
      const sorted = [...ytInfo.thumbnails]
        .filter((t) => t.url && !t.url.includes('storyboard'))
        .sort((a, b) => ((b.width || 0) * (b.height || 0)) - ((a.width || 0) * (a.height || 0)));

      for (const t of sorted) {
        if (seen.has(t.url)) continue;
        seen.add(t.url);
        const frame: { url: string; label: string; width?: number; height?: number } = {
          url: t.url,
          label: t.id || `${t.width || '?'}x${t.height || '?'}`,
        };
        if (t.width != null) frame.width = t.width;
        if (t.height != null) frame.height = t.height;
        frames.push(frame);
        if (frames.length >= 8) break;
      }
    }

    if (ytInfo.thumbnail && !frames.some((f) => f.url === ytInfo.thumbnail)) {
      frames.unshift({ url: ytInfo.thumbnail, label: 'Primary Thumbnail' });
    }

    return { frames, videoInfo };
  }

  /**
   * Get YouTube storyboard frames (pre-generated preview images)
   * Useful for quick preview without downloading the video
   */
  async getYouTubeStoryboardFrames(videoId: string): Promise<string[]> {
    // YouTube storyboard sprite URLs
    // These are pre-generated preview images at regular intervals
    const storyboardUrls: string[] = [];
    
    // L1 = low quality, L2 = medium quality storyboards
    for (let i = 0; i < 4; i++) {
      storyboardUrls.push(
        `https://i.ytimg.com/sb/${videoId}/storyboard3_L2/M${i}.jpg`
      );
    }
    
    // Also include standard thumbnails as fallback
    const thumbnailQualities = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
    for (const quality of thumbnailQualities) {
      storyboardUrls.push(`https://img.youtube.com/vi/${videoId}/${quality}.jpg`);
    }
    
    return storyboardUrls;
  }
}

export const videoProxyService = new VideoProxyService();
export default videoProxyService;
