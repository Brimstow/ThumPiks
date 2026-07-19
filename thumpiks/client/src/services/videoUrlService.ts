import { config } from '../config/environment';

export interface VideoUrlInfo {
  platform: 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'vimeo' | 'direct';
  videoId: string | null;
  supported: boolean;
  title?: string;
  thumbnail?: string;
  duration?: number;
}

const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  youtube: [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ],
  tiktok: [
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /(?:https?:\/\/)?(?:vm\.)?tiktok\.com\/(\w+)/,
    /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/t\/(\w+)/,
  ],
  instagram: [
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/,
  ],
  twitter: [
    /(?:https?:\/\/)?(?:www\.)?(?:twitter|x)\.com\/\w+\/status\/(\d+)/,
  ],
  vimeo: [
    /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
    /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
  ],
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  twitter: 'Twitter/X',
  vimeo: 'Vimeo',
  direct: 'Direct URL',
};

export function detectPlatformLocally(url: string): { platform: string; videoId: string } | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) {
        return { platform, videoId: match[1] };
      }
    }
  }
  return null;
}

export function isDirectVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const ext = u.pathname.split('.').pop()?.toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext || '');
  } catch {
    return false;
  }
}

export function getPlatformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] || platform;
}

export function getPlatformIcon(platform: string): string {
  const icons: Record<string, string> = {
    youtube: '▶',
    tiktok: '♪',
    instagram: '◈',
    twitter: '✦',
    vimeo: '◉',
    direct: '⬡',
  };
  return icons[platform] || '◉';
}

/**
 * Returns the URL to use as the <video> src.
 * - Direct video URLs: returned as-is (browser can play them directly)
 * - Platform URLs: proxied through backend to bypass CORS
 */
export function getVideoSrcUrl(url: string): string {
  if (isDirectVideoUrl(url)) {
    return url;
  }
  const detected = detectPlatformLocally(url);
  if (detected) {
    return `${config.apiBaseUrl}/api/video/stream?url=${encodeURIComponent(url)}`;
  }
  return url;
}

/**
 * Fetches video metadata from the backend detect + info endpoints.
 */
export async function fetchVideoInfo(url: string): Promise<VideoUrlInfo> {
  const detected = detectPlatformLocally(url);

  if (!detected) {
    if (isDirectVideoUrl(url)) {
      return {
        platform: 'direct',
        videoId: null,
        supported: true,
        title: url.split('/').pop() || 'Video',
      };
    }
    return { platform: 'direct', videoId: null, supported: false };
  }

  try {
    const res = await fetch(
      `${config.apiBaseUrl}/api/video/info?url=${encodeURIComponent(url)}`,
      { credentials: 'include' }
    );
    if (!res.ok) throw new Error('Info fetch failed');
    const data = await res.json();
    if (data.success) {
      return {
        platform: detected.platform as VideoUrlInfo['platform'],
        videoId: detected.videoId,
        supported: true,
        title: data.data.title,
        thumbnail: data.data.thumbnail,
        duration: data.data.duration,
      };
    }
  } catch {
    // Fall through to basic info
  }

  return {
    platform: detected.platform as VideoUrlInfo['platform'],
    videoId: detected.videoId,
    supported: true,
  };
}
