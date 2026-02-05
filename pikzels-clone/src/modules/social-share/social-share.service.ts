import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../utils/prisma-factory';

const prisma = getPrisma();

export class SocialShareService {
  /**
   * Create a social share record
   */
  async createSocialShare(data: {
    thumbnailId: string;
    userId: string;
    platform: string;
    status: string;
    shareUrl?: string;
    shareId?: string;
    errorMessage?: string;
    engagement?: any;
  }) {
    return prisma.socialShare.create({
      data: {
        id: uuidv4(),
        ...data,
      },
    });
  }

  /**
   * Get social shares by user
   */
  async getSocialSharesByUser(
    userId: string,
    filters?: {
      platform?: string;
      status?: string;
      thumbnailId?: string;
    }
  ) {
    const where: any = { userId };

    if (filters?.platform) {
      where.platform = filters.platform;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.thumbnailId) {
      where.thumbnailId = filters.thumbnailId;
    }

    return prisma.socialShare.findMany({
      where,
      include: {
        Thumbnail: true,
        User: true,
      },
      orderBy: {
        sharedAt: 'desc',
      },
    });
  }

  /**
   * Get social shares by thumbnail
   */
  async getSocialSharesByThumbnail(thumbnailId: string) {
    return prisma.socialShare.findMany({
      where: { thumbnailId },
      orderBy: {
        sharedAt: 'desc',
      },
    });
  }

  /**
   * Update a social share record
   */
  async updateSocialShare(
    id: string,
    data: Partial<{
      status: string;
      shareUrl: string;
      shareId: string;
      errorMessage: string;
      engagement: any;
    }>
  ) {
    return prisma.socialShare.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a social share record
   */
  async deleteSocialShare(id: string) {
    return prisma.socialShare.delete({
      where: { id },
    });
  }

  /**
   * Get social sharing statistics
   */
  async getSocialShareStats(userId: string) {
    const shares = await prisma.socialShare.findMany({
      where: { userId },
      select: {
        platform: true,
        status: true,
      },
    });

    // Group by platform and status
    const stats: Record<string, any> = {};

    shares.forEach(share => {
      if (!stats[share.platform]) {
        stats[share.platform] = {
          total: 0,
          success: 0,
          failed: 0,
          pending: 0,
        };
      }

      stats[share.platform].total++;
      stats[share.platform][share.status]++;
    });

    return stats;
  }
}
