import { SocialMediaClient } from './social-media-client';
import { TwitterClient } from './twitter-client';
import { FacebookClient } from './facebook-client';
import { LinkedInClient } from './linkedin-client';
import { PinterestClient } from './pinterest-client';

export class SocialMediaFactory {
  static createClient(platform: string, accessToken: string): SocialMediaClient {
    switch (platform.toLowerCase()) {
      case 'twitter':
      case 'x':
        return new TwitterClient(accessToken);
      case 'facebook':
        return new FacebookClient(accessToken);
      case 'linkedin':
        return new LinkedInClient(accessToken);
      case 'pinterest':
        return new PinterestClient(accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}