export interface SocialMediaPost {
  text: string;
  imageUrl?: string;
  link?: string;
}

export interface SocialMediaResponse {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
  engagement?: any;
}

export abstract class SocialMediaClient {
  protected accessToken: string;
  protected baseUrl: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Upload media to the platform
   */
  abstract uploadMedia(
    imageUrl: string
  ): Promise<{ mediaId: string } | { error: string }>;

  /**
   * Create a post on the platform
   */
  abstract createPost(
    post: SocialMediaPost,
    mediaIds?: string[]
  ): Promise<SocialMediaResponse>;

  /**
   * Get engagement metrics for a post
   */
  abstract getEngagement(postId: string): Promise<any>;

  /**
   * Format text for the platform (e.g., handle character limits, hashtags, etc.)
   */
  protected formatText(text: string, platform: string): string {
    // Basic implementation - can be overridden by platform-specific clients
    return text;
  }

  /**
   * Validate post content for the platform
   */
  protected validatePost(post: SocialMediaPost): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!post.text && !post.imageUrl) {
      errors.push('Post must contain either text or an image');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
