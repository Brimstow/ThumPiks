/**
 * Social Media Platform Configurations
 * Extensible platform plugin system for video URL extraction
 */

import type { PlatformConfig, PlatformVideoInfo, VideoSourceType } from './types';

// ============================================
// PLATFORM CONFIGURATIONS
// ============================================

export const YOUTUBE_CONFIG: PlatformConfig = {
  id: 'youtube',
  name: 'YouTube',
  icon: '📺',
  urlPatterns: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  extractVideoId: (url: string) => {
    for (const pattern of YOUTUBE_CONFIG.urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },
  proxyEndpoint: '/api/video/proxy/youtube',
  enabled: true,
};

export const TIKTOK_CONFIG: PlatformConfig = {
  id: 'tiktok',
  name: 'TikTok',
  icon: '🎵',
  urlPatterns: [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/([a-zA-Z0-9]+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/([a-zA-Z0-9]+)/,
  ],
  extractVideoId: (url: string) => {
    for (const pattern of TIKTOK_CONFIG.urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },
  proxyEndpoint: '/api/video/proxy/tiktok',
  enabled: true,
};

export const INSTAGRAM_CONFIG: PlatformConfig = {
  id: 'instagram',
  name: 'Instagram',
  icon: '📷',
  urlPatterns: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
    /(?:https?:\/\/)?(?:www\.)?instagr\.am\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
  ],
  extractVideoId: (url: string) => {
    for (const pattern of INSTAGRAM_CONFIG.urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },
  proxyEndpoint: '/api/video/proxy/instagram',
  enabled: true,
};

export const TWITTER_CONFIG: PlatformConfig = {
  id: 'twitter',
  name: 'X (Twitter)',
  icon: '🐦',
  urlPatterns: [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
  ],
  extractVideoId: (url: string) => {
    for (const pattern of TWITTER_CONFIG.urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },
  proxyEndpoint: '/api/video/proxy/twitter',
  enabled: true,
};

export const VIMEO_CONFIG: PlatformConfig = {
  id: 'vimeo',
  name: 'Vimeo',
  icon: '🎬',
  urlPatterns: [
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
    /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
  ],
  extractVideoId: (url: string) => {
    for (const pattern of VIMEO_CONFIG.urlPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },
  proxyEndpoint: '/api/video/proxy/vimeo',
  enabled: true,
};

// ============================================
// PLATFORM REGISTRY
// ============================================

class PlatformRegistry {
  private platforms: Map<string, PlatformConfig> = new Map();

  constructor() {
    // Register default platforms
    this.register(YOUTUBE_CONFIG);
    this.register(TIKTOK_CONFIG);
    this.register(INSTAGRAM_CONFIG);
    this.register(TWITTER_CONFIG);
    this.register(VIMEO_CONFIG);
  }

  register(config: PlatformConfig): void {
    this.platforms.set(config.id, config);
  }

  unregister(platformId: string): boolean {
    return this.platforms.delete(platformId);
  }

  get(platformId: string): PlatformConfig | undefined {
    return this.platforms.get(platformId);
  }

  getAll(): PlatformConfig[] {
    return Array.from(this.platforms.values());
  }

  getEnabled(): PlatformConfig[] {
    return this.getAll().filter(p => p.enabled);
  }

  setEnabled(platformId: string, enabled: boolean): void {
    const platform = this.platforms.get(platformId);
    if (platform) {
      platform.enabled = enabled;
    }
  }

  /**
   * Detect which platform a URL belongs to
   */
  detectPlatform(url: string): PlatformVideoInfo | null {
    for (const platform of this.getEnabled()) {
      const videoId = platform.extractVideoId(url);
      if (videoId) {
        return {
          platform: platform.id as VideoSourceType,
          videoId,
        };
      }
    }
    return null;
  }

  /**
   * Get the proxy endpoint for a platform
   */
  getProxyEndpoint(platformId: string): string | null {
    const platform = this.platforms.get(platformId);
    return platform?.proxyEndpoint || null;
  }
}

// Singleton instance
export const platformRegistry = new PlatformRegistry();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if a URL is a supported video platform
 */
export function isSupportedVideoUrl(url: string): boolean {
  return platformRegistry.detectPlatform(url) !== null;
}

/**
 * Get platform info from URL
 */
export function getPlatformInfo(url: string): PlatformVideoInfo | null {
  return platformRegistry.detectPlatform(url);
}

/**
 * Get list of supported platforms
 */
export function getSupportedPlatforms(): PlatformConfig[] {
  return platformRegistry.getEnabled();
}

/**
 * Add a custom platform
 */
export function addCustomPlatform(config: PlatformConfig): void {
  platformRegistry.register(config);
}
