import axios from 'axios';
import { Readable } from 'stream';
import { logger } from '../../utils/logger';

export interface VideoInfo {
  title: string;
  duration?: number;
  thumbnail?: string;
  format: string;
  platform: string;
  videoId: string;
  streamUrl?: string;
}

export interface PlatformConfig {
  name: string;
  urlPatterns: RegExp[];
  extractVideoId: (url: string) => string | null;
  getVideoInfo: (videoId: string) => Promise<VideoInfo>;
  getVideoStream: (videoId: string, quality?: string) => Promise<Readable>;
}

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
      getVideoInfo: async (videoId: string) => {
        return this.getYouTubeVideoInfo(videoId);
      },
      getVideoStream: async (videoId: string, quality?: string) => {
        return this.getYouTubeVideoStream(videoId, quality);
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
      getVideoInfo: async (videoId: string) => {
        return this.getTikTokVideoInfo(videoId);
      },
      getVideoStream: async (videoId: string) => {
        return this.getTikTokVideoStream(videoId);
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
      getVideoInfo: async (videoId: string) => {
        return this.getInstagramVideoInfo(videoId);
      },
      getVideoStream: async (videoId: string) => {
        return this.getInstagramVideoStream(videoId);
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
      getVideoInfo: async (videoId: string) => {
        return this.getTwitterVideoInfo(videoId);
      },
      getVideoStream: async (videoId: string) => {
        return this.getTwitterVideoStream(videoId);
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
      getVideoInfo: async (videoId: string) => {
        return this.getVimeoVideoInfo(videoId);
      },
      getVideoStream: async (videoId: string) => {
        return this.getVimeoVideoStream(videoId);
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

  async getVideoInfo(url: string): Promise<VideoInfo> {
    const detected = this.detectPlatform(url);
    if (!detected) {
      throw new Error('Unsupported video URL or platform');
    }

    const platform = this.platforms.get(detected.platform);
    if (!platform) {
      throw new Error(`Platform ${detected.platform} not found`);
    }

    try {
      return await platform.getVideoInfo(detected.videoId);
    } catch (error) {
      logger.error(`Failed to get video info for ${url}`, error as Error);
      throw error;
    }
  }

  async getVideoStream(
    url: string,
    quality?: string
  ): Promise<{ stream: Readable; info: VideoInfo }> {
    const detected = this.detectPlatform(url);
    if (!detected) {
      throw new Error('Unsupported video URL or platform');
    }

    const platform = this.platforms.get(detected.platform);
    if (!platform) {
      throw new Error(`Platform ${detected.platform} not found`);
    }

    try {
      const [info, stream] = await Promise.all([
        platform.getVideoInfo(detected.videoId),
        platform.getVideoStream(detected.videoId, quality),
      ]);
      return { stream, info };
    } catch (error) {
      logger.error(`Failed to get video stream for ${url}`, error as Error);
      throw error;
    }
  }

  getSupportedPlatforms(): string[] {
    return Array.from(this.platforms.keys());
  }

  // Platform-specific implementations

  private async getYouTubeVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      // Use YouTube oEmbed API for basic info (no API key required)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(oembedUrl);

      return {
        title: response.data.title || `YouTube Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        format: 'mp4',
        platform: 'youtube',
        videoId,
      };
    } catch (error) {
      logger.warn(`Failed to get YouTube oEmbed info for ${videoId}`, {
        error: (error as Error).message,
      });
      // Return basic info on failure
      return {
        title: `YouTube Video ${videoId}`,
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        format: 'mp4',
        platform: 'youtube',
        videoId,
      };
    }
  }

  private async getYouTubeVideoStream(
    videoId: string,
    _quality?: string
  ): Promise<Readable> {
    // For YouTube, we need to use a third-party service or ytdl-core
    // This is a simplified implementation using Invidious (open-source YouTube frontend)
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.snopyta.org',
      'https://yewtu.be',
    ];

    for (const instance of invidiousInstances) {
      try {
        const apiUrl = `${instance}/api/v1/videos/${videoId}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        // Find a suitable format
        const formats = response.data.formatStreams || [];
        const adaptiveFormats = response.data.adaptiveFormats || [];
        const allFormats = [...formats, ...adaptiveFormats];

        // Prefer mp4 with video+audio
        const mp4Format = allFormats.find(
          (f: any) =>
            f.container === 'mp4' &&
            f.type?.includes('video') &&
            !f.type?.includes('audio/mp4')
        );

        const streamUrl = mp4Format?.url || formats[0]?.url;

        if (streamUrl) {
          const videoResponse = await axios.get(streamUrl, {
            responseType: 'stream',
            timeout: 30000,
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
          });
          return videoResponse.data;
        }
      } catch (error) {
        logger.warn(`Invidious instance ${instance} failed`, {
          error: (error as Error).message,
        });
        continue;
      }
    }

    throw new Error(
      'Failed to get YouTube video stream. All instances unavailable.'
    );
  }

  private async getTikTokVideoInfo(videoId: string): Promise<VideoInfo> {
    // TikTok video info - basic implementation
    return {
      title: `TikTok Video ${videoId}`,
      format: 'mp4',
      platform: 'tiktok',
      videoId,
    };
  }

  private async getTikTokVideoStream(videoId: string): Promise<Readable> {
    // TikTok requires more complex handling due to their anti-bot measures
    // This is a placeholder - in production, use a service like tikwm.com or similar
    const tikwmUrl = `https://www.tikwm.com/api/?url=https://www.tiktok.com/@user/video/${videoId}`;

    try {
      const response = await axios.get(tikwmUrl, { timeout: 15000 });
      const videoUrl = response.data?.data?.play;

      if (videoUrl) {
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'stream',
          timeout: 30000,
        });
        return videoResponse.data;
      }
    } catch (error) {
      logger.error('TikTok stream failed', error as Error);
    }

    throw new Error(
      'Failed to get TikTok video stream. Platform may require additional configuration.'
    );
  }

  private async getInstagramVideoInfo(videoId: string): Promise<VideoInfo> {
    return {
      title: `Instagram Video ${videoId}`,
      format: 'mp4',
      platform: 'instagram',
      videoId,
    };
  }

  private async getInstagramVideoStream(videoId: string): Promise<Readable> {
    // Instagram requires authentication for most content
    // This is a placeholder implementation
    throw new Error(
      `Instagram video streaming requires authentication. Video ID: ${videoId}`
    );
  }

  private async getTwitterVideoInfo(videoId: string): Promise<VideoInfo> {
    return {
      title: `Twitter/X Video ${videoId}`,
      format: 'mp4',
      platform: 'twitter',
      videoId,
    };
  }

  private async getTwitterVideoStream(videoId: string): Promise<Readable> {
    // Twitter/X requires API access
    throw new Error(
      `Twitter/X video streaming requires API authentication. Video ID: ${videoId}`
    );
  }

  private async getVimeoVideoInfo(videoId: string): Promise<VideoInfo> {
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`;
      const response = await axios.get(oembedUrl, { timeout: 10000 });

      return {
        title: response.data.title || `Vimeo Video ${videoId}`,
        thumbnail: response.data.thumbnail_url,
        duration: response.data.duration,
        format: 'mp4',
        platform: 'vimeo',
        videoId,
      };
    } catch (error) {
      return {
        title: `Vimeo Video ${videoId}`,
        format: 'mp4',
        platform: 'vimeo',
        videoId,
      };
    }
  }

  private async getVimeoVideoStream(videoId: string): Promise<Readable> {
    // Vimeo player config endpoint
    try {
      const configUrl = `https://player.vimeo.com/video/${videoId}/config`;
      const response = await axios.get(configUrl, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          Referer: 'https://vimeo.com/',
        },
      });

      const progressiveFiles = response.data?.request?.files?.progressive || [];
      const bestQuality = progressiveFiles.sort(
        (a: any, b: any) => (b.width || 0) - (a.width || 0)
      )[0];

      if (bestQuality?.url) {
        const videoResponse = await axios.get(bestQuality.url, {
          responseType: 'stream',
          timeout: 30000,
        });
        return videoResponse.data;
      }
    } catch (error) {
      logger.error('Vimeo stream failed', error as Error);
    }

    throw new Error(
      'Failed to get Vimeo video stream. Video may be private or unavailable.'
    );
  }
}

export const videoProxyService = new VideoProxyService();
export default videoProxyService;
