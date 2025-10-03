import { PrismaClient } from '@prisma/client';
import { CacheService } from '../../services/cache.service';
import { createHash } from 'crypto';
import { emitThumbnailCreated, emitAnalyticsEvent } from '../../events';
import { eventEmitter } from '../../events/event-emitter';

const prisma = new PrismaClient();
const cache = CacheService.getInstance();

export class ThumbnailService {
  async createThumbnail(data: {
    title: string;
    imageUrl: string;
    prompt: string;
    parameters: any;
    projectId: string;
    userId: string;
  }) {
    const thumbnail = await prisma.thumbnail.create({
      data,
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail created event
    await emitThumbnailCreated(
      data.userId,
      thumbnail.id,
      data.projectId,
      data.imageUrl,
      data.parameters,
      JSON.stringify(data.parameters).length // Approximate size
    );

    // Invalidate related caches
    await this.invalidateUserThumbnailsCache(data.userId);
    await this.invalidateProjectCache(data.projectId);

    console.log(`🎨 Thumbnail created: ${thumbnail.id} for user ${data.userId}`);
    return thumbnail;
  }

  async getThumbnailsByUser(
    userId: string,
    filters?: {
      search?: string;
      projectId?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      style?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    // Create cache key based on user ID and filters
    const filterHash = createHash('md5')
      .update(JSON.stringify(filters || {}))
      .digest('hex');
    const cacheKey = `thumbnails:user:${userId}:${filterHash}`;

    // Use cache-aside pattern
    return cache.getOrSet(
      cacheKey,
      async () => {
        // Build where clause for filtering
        const where: any = { userId };

        // Apply project filter
        if (filters?.projectId) {
          where.projectId = filters.projectId;
        }

        // Apply search filter (title or prompt)
        if (filters?.search) {
          where.OR = [
            { title: { contains: filters.search, mode: 'insensitive' } },
            { prompt: { contains: filters.search, mode: 'insensitive' } },
          ];
        }

        // Apply date range filter
        if (filters?.dateFrom || filters?.dateTo) {
          where.createdAt = {};
          if (filters.dateFrom) {
            where.createdAt.gte = filters.dateFrom;
          }
          if (filters.dateTo) {
            where.createdAt.lte = filters.dateTo;
          }
        }

        // Apply style filter (from parameters)
        if (filters?.style) {
          where.parameters = {
            path: ['style'],
            equals: filters.style,
          };
        }

        // Build orderBy clause for sorting
        let orderBy: any = { createdAt: 'desc' }; // default sort
        if (filters?.sortBy) {
          // Map allowed sort fields to prevent injection
          const allowedSortFields = ['createdAt', 'title', 'prompt'];
          const sortField = allowedSortFields.includes(filters.sortBy)
            ? filters.sortBy
            : 'createdAt';
          orderBy = { [sortField]: filters.sortOrder || 'desc' };
        }

        return prisma.thumbnail.findMany({
          where,
          include: {
            project: true,
          },
          orderBy,
        });
      },
      300 // Cache for 5 minutes
    );
  }

  async getThumbnailById(id: string) {
    const cacheKey = `thumbnail:${id}`;
    
    return cache.getOrSet(
      cacheKey,
      async () => {
        return prisma.thumbnail.findUnique({
          where: { id },
          include: {
            project: true,
          },
        });
      },
      600 // Cache for 10 minutes (individual thumbnails change less frequently)
    );
  }

  async updateThumbnail(
    id: string,
    data: Partial<{
      title: string;
      imageUrl: string;
      prompt: string;
      parameters: any;
    }>
  ) {
    // Get thumbnail info for cache invalidation
    const existingThumbnail = await prisma.thumbnail.findUnique({
      where: { id },
      select: { userId: true, projectId: true },
    });

    const thumbnail = await prisma.thumbnail.update({
      where: { id },
      data,
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail updated event
    if (existingThumbnail) {
      await eventEmitter.createAndEmit(
        'thumbnail.updated',
        existingThumbnail.userId,
        {
          thumbnailId: id,
          changes: data,
          previousVersion: JSON.stringify(existingThumbnail)
        }
      );

      // Emit analytics event for the update
      await emitAnalyticsEvent(
        existingThumbnail.userId,
        'thumbnail_updated',
        'thumbnail',
        id,
        {
          fieldsChanged: Object.keys(data),
          hasTitle: !!data.title,
          hasParameters: !!data.parameters
        }
      );
    }

    // Invalidate caches
    await cache.del(`thumbnail:${id}`);
    if (existingThumbnail) {
      await this.invalidateUserThumbnailsCache(existingThumbnail.userId);
      await this.invalidateProjectCache(existingThumbnail.projectId);
    }

    console.log(`🔄 Thumbnail updated: ${id}`);
    return thumbnail;
  }

  async deleteThumbnail(id: string) {
    // Get thumbnail info for cache invalidation and events
    const existingThumbnail = await prisma.thumbnail.findUnique({
      where: { id },
      select: { userId: true, projectId: true, imageUrl: true },
    });

    const thumbnail = await prisma.thumbnail.delete({
      where: { id },
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail deleted event
    if (existingThumbnail) {
      await eventEmitter.createAndEmit(
        'thumbnail.deleted',
        existingThumbnail.userId,
        {
          thumbnailId: id,
          filePath: existingThumbnail.imageUrl
        }
      );

      // Emit analytics event for the deletion
      await emitAnalyticsEvent(
        existingThumbnail.userId,
        'thumbnail_deleted',
        'thumbnail',
        id,
        {
          projectId: existingThumbnail.projectId
        }
      );
    }

    // Invalidate caches
    await cache.del(`thumbnail:${id}`);
    if (existingThumbnail) {
      await this.invalidateUserThumbnailsCache(existingThumbnail.userId);
      await this.invalidateProjectCache(existingThumbnail.projectId);
    }

    console.log(`🗑️ Thumbnail deleted: ${id}`);
    return thumbnail;
  }

  async setThumbnailAsFeatured(thumbnailId: string, projectId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await prisma.thumbnail.findUnique({
      where: { id: thumbnailId },
      select: { id: true, projectId: true, userId: true }
    });

    if (!thumbnail || thumbnail.projectId !== projectId) {
      throw new Error('Thumbnail does not belong to this project');
    }

    // Set this thumbnail as featured for the project
    await prisma.project.update({
      where: { id: projectId },
      data: {
        featuredThumbnailId: thumbnailId,
      },
    });

    // 🚀 EVENT-DRIVEN: Emit analytics event for featured thumbnail
    await emitAnalyticsEvent(
      thumbnail.userId,
      'thumbnail_featured',
      'thumbnail',
      thumbnailId,
      {
        projectId: projectId
      }
    );

    console.log(`⭐ Thumbnail set as featured: ${thumbnailId} in project ${projectId}`);
    return thumbnail;
  }

  // Cache invalidation helper methods
  private async invalidateUserThumbnailsCache(userId: string) {
    // Delete all cache keys that start with the user thumbnail pattern
    const pattern = `thumbnails:user:${userId}:*`;
    await cache.delPattern(pattern);
  }

  private async invalidateProjectCache(projectId: string) {
    // Invalidate project-related caches if needed
    await cache.del(`project:${projectId}`);
  }
}
