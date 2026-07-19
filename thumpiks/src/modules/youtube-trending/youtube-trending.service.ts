/**
 * YouTube Trending Service
 * Fetches trending videos and thumbnails from YouTube Data API v3
 */

import { logger } from '../../utils/logger';

// YouTube video category IDs (official)
// See: https://developers.google.com/youtube/v3/docs/videoCategories/list
export const YOUTUBE_CATEGORY_IDS: Record<string, string> = {
  all: '0', // Not a real category, we'll handle this specially
  gaming: '20',
  music: '10',
  education: '27',
  entertainment: '24',
  sports: '17',
  film: '1',
  news: '25',
  science: '28',
  howto: '26',
  comedy: '23',
};

// Supported region codes for YouTube trending
export const SUPPORTED_REGIONS = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'RU', name: 'Russia' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'FI', name: 'Finland' },
  { code: 'DK', name: 'Denmark' },
];

export interface YouTubeTrendingVideo {
  id: string;
  title: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  thumbnail: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
  };
  viewCount: string;
  likeCount?: string;
  commentCount?: string;
  categoryId: string;
  tags?: string[];
}

export interface YouTubeTrendingResponse {
  videos: YouTubeTrendingVideo[];
  nextPageToken?: string;
  totalResults: number;
  regionCode: string;
  categoryId: string;
}

interface YouTubeApiThumbnailInfo {
  url?: string;
}

interface YouTubeApiItem {
  id?: string;
  snippet?: {
    title?: string;
    channelTitle?: string;
    channelId?: string;
    publishedAt?: string;
    categoryId?: string;
    tags?: string[];
    thumbnails?: {
      default?: YouTubeApiThumbnailInfo;
      medium?: YouTubeApiThumbnailInfo;
      high?: YouTubeApiThumbnailInfo;
      maxres?: YouTubeApiThumbnailInfo;
    };
    assignable?: boolean;
  };
  statistics?: {
    viewCount?: string;
    likeCount?: string;
    commentCount?: string;
  };
}

interface YouTubeApiResponse {
  items?: YouTubeApiItem[];
  nextPageToken?: string;
  pageInfo?: { totalResults?: number };
}

class YouTubeTrendingService {
  private apiKey: string | undefined;
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  /**
   * Check if the service is configured with an API key
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'CHANGE_ME_TO_YOUR_YOUTUBE_API_KEY';
  }

  /**
   * Fetch trending videos from YouTube
   */
  async getTrendingVideos(options: {
    regionCode?: string;
    categoryId?: string;
    maxResults?: number;
    pageToken?: string;
  }): Promise<YouTubeTrendingResponse> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    const {
      regionCode = 'US',
      categoryId = 'all',
      maxResults = 20,
      pageToken,
    } = options;

    // Build API URL
    const params = new URLSearchParams({
      part: 'snippet,statistics',
      chart: 'mostPopular',
      regionCode: regionCode,
      maxResults: maxResults.toString(),
      key: this.apiKey!,
    });

    // Add category filter if not "all"
    if (categoryId !== 'all' && YOUTUBE_CATEGORY_IDS[categoryId]) {
      params.append('videoCategoryId', YOUTUBE_CATEGORY_IDS[categoryId]);
    }

    // Add pagination token if provided
    if (pageToken) {
      params.append('pageToken', pageToken);
    }

    const url = `${this.baseUrl}/videos?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[YouTubeTrending] API error', undefined, { errorData });
        throw new Error(
          `YouTube API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json() as YouTubeApiResponse;

      // Transform YouTube API response to our format
      const videos: YouTubeTrendingVideo[] = (data.items || []).map(
        (item: YouTubeApiItem) => ({
          id: item.id ?? '',
          title: item.snippet?.title || '',
          channelTitle: item.snippet?.channelTitle || '',
          channelId: item.snippet?.channelId || '',
          publishedAt: item.snippet?.publishedAt || '',
          thumbnail: {
            default: item.snippet?.thumbnails?.default?.url || '',
            medium: item.snippet?.thumbnails?.medium?.url || '',
            high: item.snippet?.thumbnails?.high?.url || '',
            ...(item.snippet?.thumbnails?.maxres?.url && { maxres: item.snippet.thumbnails.maxres.url }),
          },
          viewCount: item.statistics?.viewCount || '0',
          ...(item.statistics?.likeCount !== undefined && { likeCount: item.statistics.likeCount }),
          ...(item.statistics?.commentCount !== undefined && { commentCount: item.statistics.commentCount }),
          categoryId: item.snippet?.categoryId || '',
          ...(item.snippet?.tags && { tags: item.snippet.tags }),
        })
      );

      return {
        videos,
        ...(data.nextPageToken && { nextPageToken: data.nextPageToken }),
        totalResults: data.pageInfo?.totalResults || videos.length,
        regionCode,
        categoryId,
      };
    } catch (error) {
      logger.error('[YouTubeTrending] Error fetching trending videos', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get video categories for a specific region
   */
  async getVideoCategories(
    regionCode: string = 'US'
  ): Promise<{ id: string; title: string }[]> {
    if (!this.isConfigured()) {
      throw new Error('YouTube API key not configured');
    }

    const params = new URLSearchParams({
      part: 'snippet',
      regionCode: regionCode,
      key: this.apiKey!,
    });

    const url = `${this.baseUrl}/videoCategories?${params.toString()}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json() as YouTubeApiResponse;

      return (data.items || [])
        .filter((item: YouTubeApiItem) => item.snippet?.assignable)
        .map((item: YouTubeApiItem) => ({
          id: item.id ?? '',
          title: item.snippet?.title || '',
        }));
    } catch (error) {
      logger.error('[YouTubeTrending] Error fetching categories', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  /**
   * Get supported regions
   */
  getSupportedRegions() {
    return SUPPORTED_REGIONS;
  }

  /**
   * Get category mapping
   */
  getCategoryMapping() {
    return YOUTUBE_CATEGORY_IDS;
  }
}

// Export singleton instance
export const youtubeTrendingService = new YouTubeTrendingService();
