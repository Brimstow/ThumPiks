import { Response } from 'express';
import { SocialShareService } from './social-share.service';
import { SocialMediaFactory } from './social-media-factory';
import { ThumbnailService } from '../thumbnail/thumbnail.service';
import { AuthRequest } from '../../types/auth';

const socialShareService = new SocialShareService();
const thumbnailService = new ThumbnailService();

export class SocialShareController {
  /**
   * Share a thumbnail to social media platforms
   */
  async shareThumbnail(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { thumbnailId, platforms, message } = req.body;

      // Validate required fields
      if (!thumbnailId || !platforms || !Array.isArray(platforms)) {
        return res.status(400).json({
          error: 'thumbnailId and platforms array are required',
        });
      }

      // Get the thumbnail
      const thumbnail = await thumbnailService.getThumbnailById(thumbnailId);
      if (!thumbnail) {
        return res.status(404).json({ error: 'Thumbnail not found' });
      }

      // Check if user owns this thumbnail
      if (thumbnail.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Get user's social media access tokens from settings
      // In a real implementation, you would retrieve these from the user's settings
      // For now, we'll use mock tokens
      const userTokens: Record<string, string> = {
        // 'twitter': 'user_twitter_token',
        // 'facebook': 'user_facebook_token',
        // 'linkedin': 'user_linkedin_token',
        // 'pinterest': 'user_pinterest_token'
      };

      // Share to each platform
      const results: any[] = [];

      for (const platform of platforms) {
        try {
          // Create a social share record with pending status
          const socialShare = await socialShareService.createSocialShare({
            thumbnailId,
            userId: req.user.id,
            platform,
            status: 'pending',
          });

          // Check if we have an access token for this platform
          if (!userTokens[platform]) {
            // Update the social share record with failed status
            await socialShareService.updateSocialShare(socialShare.id, {
              status: 'failed',
              errorMessage: `No access token for ${platform}`,
            });

            results.push({
              platform,
              success: false,
              error: `No access token for ${platform}`,
            });
            continue;
          }

          // Create the social media client
          const client = SocialMediaFactory.createClient(
            platform,
            userTokens[platform]
          );

          // Upload the image
          const uploadResult = await client.uploadMedia(thumbnail.imageUrl);

          if ('error' in uploadResult) {
            // Update the social share record with failed status
            await socialShareService.updateSocialShare(socialShare.id, {
              status: 'failed',
              errorMessage: uploadResult.error,
            });

            results.push({
              platform,
              success: false,
              error: uploadResult.error,
            });
            continue;
          }

          // Create the post
          const postResult = await client.createPost(
            {
              text: message || `Check out this thumbnail: ${thumbnail.title}`,
              imageUrl: thumbnail.imageUrl,
            },
            [uploadResult.mediaId]
          );

          if (postResult.success) {
            // Update the social share record with success status
            await socialShareService.updateSocialShare(socialShare.id, {
              status: 'success',
              shareUrl: postResult.postUrl || '',
              shareId: postResult.postId || '',
            });

            results.push({
              platform,
              success: true,
              shareUrl: postResult.postUrl,
              shareId: postResult.postId,
            });
          } else {
            // Update the social share record with failed status
            await socialShareService.updateSocialShare(socialShare.id, {
              status: 'failed',
              errorMessage: postResult.error || 'Unknown error',
            });

            results.push({
              platform,
              success: false,
              error: postResult.error,
            });
          }
        } catch (error: any) {
          // Create a social share record with failed status
          await socialShareService.createSocialShare({
            thumbnailId,
            userId: req.user.id,
            platform,
            status: 'failed',
            errorMessage: error.message || 'Unknown error',
          });

          results.push({
            platform,
            success: false,
            error: error.message || 'Unknown error',
          });
        }
      }

      return res.status(200).json({
        message: 'Social sharing completed',
        results,
      });
    } catch (error) {
      console.error('Error sharing thumbnail:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get social shares for a user
   */
  async getSocialShares(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { platform, status, thumbnailId } = req.query;

      const socialShares = await socialShareService.getSocialSharesByUser(
        req.user.id,
        {
          platform: platform as string,
          status: status as string,
          thumbnailId: thumbnailId as string,
        }
      );

      return res.status(200).json({ socialShares });
    } catch (error) {
      console.error('Error fetching social shares:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get social shares for a specific thumbnail
   */
  async getSocialSharesForThumbnail(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const thumbnailId = req.params.thumbnailId as string;
      if (!thumbnailId) {
        return res.status(400).json({ error: 'Thumbnail ID is required' });
      }

      // Get the thumbnail to verify ownership
      const thumbnail = await thumbnailService.getThumbnailById(thumbnailId);
      if (!thumbnail) {
        return res.status(404).json({ error: 'Thumbnail not found' });
      }

      // Check if user owns this thumbnail
      if (thumbnail.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const socialShares =
        await socialShareService.getSocialSharesByThumbnail(thumbnailId);

      return res.status(200).json({ socialShares });
    } catch (error) {
      console.error('Error fetching social shares for thumbnail:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get social sharing statistics
   */
  async getSocialShareStats(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await socialShareService.getSocialShareStats(req.user.id);

      return res.status(200).json({ stats });
    } catch (error) {
      console.error('Error fetching social share stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete a social share record
   */
  async deleteSocialShare(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const id = req.params.id as string;

      // Verify the social share belongs to the user
      const userShares = await socialShareService.getSocialSharesByUser(
        req.user.id,
        { }
      );
      
      const socialShare = userShares.find(share => share.id === id);

      if (!socialShare) {
        return res.status(404).json({ error: 'Social share not found' });
      }

      if (!id) {
        return res.status(400).json({ error: 'ID is required' });
      }

      await socialShareService.deleteSocialShare(id);

      return res.status(204).send();
    } catch (error) {
      console.error('Error deleting social share:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
