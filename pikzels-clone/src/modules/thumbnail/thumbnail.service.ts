import { PrismaClient } from '@prisma/client';
import { CacheService } from '../../services/cache.service';
import { createHash } from 'crypto';
import { emitThumbnailCreated, emitAnalyticsEvent } from '../../events';
import { eventEmitter } from '../../events/event-emitter';
import { v4 as uuidv4 } from 'uuid';
import { getPrisma } from '../../utils/prisma-factory';
import { ThumbnailParametersSchema } from './types';
import {
  validateJsonColumn,
  safeParseJsonColumn,
} from '../../utils/json-validation';

// Default instances for production use
const defaultPrisma = getPrisma();
const defaultCache = CacheService.getInstance();

export interface ThumbnailServiceDependencies {
  prisma?: PrismaClient;
  cache?: CacheService;
  eventEmitter?: typeof eventEmitter;
  emitThumbnailCreated?: typeof emitThumbnailCreated;
  emitAnalyticsEvent?: typeof emitAnalyticsEvent;
}

export class ThumbnailService {
  private prisma: PrismaClient;
  private cache: CacheService;
  private eventEmitter: typeof eventEmitter;
  private emitThumbnailCreated: typeof emitThumbnailCreated;
  private emitAnalyticsEvent: typeof emitAnalyticsEvent;

  constructor(dependencies: ThumbnailServiceDependencies = {}) {
    this.prisma = dependencies.prisma || defaultPrisma;
    this.cache = dependencies.cache || defaultCache;
    this.eventEmitter = dependencies.eventEmitter || eventEmitter;
    this.emitThumbnailCreated =
      dependencies.emitThumbnailCreated || emitThumbnailCreated;
    this.emitAnalyticsEvent =
      dependencies.emitAnalyticsEvent || emitAnalyticsEvent;
  }
  async createThumbnail(data: {
    title: string;
    imageUrl: string;
    prompt: string;
    parameters: any;
    projectId: string;
    userId: string;
    storagePublicId?: string;
    storageProvider?: string;
    originalImageUrl?: string;
    originalPublicId?: string;
  }) {
    // Validate parameters JSON before writing
    validateJsonColumn(
      ThumbnailParametersSchema,
      data.parameters,
      'Thumbnail.parameters'
    );

    const thumbnail = await this.prisma.thumbnail.create({
      data: {
        id: uuidv4(),
        ...data,
        storageProvider: data.storageProvider || 'cloudinary',
      },
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail created event
    await this.emitThumbnailCreated(
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

    console.log(
      `🎨 Thumbnail created: ${thumbnail.id} for user ${data.userId}`
    );
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
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Build where clause for filtering (exclude soft-deleted)
        const where: any = { userId, deletedAt: null };

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

        return this.prisma.thumbnail.findMany({
          where,
          include: {
            Project_Thumbnail_projectIdToProject: true,
          },
          orderBy,
        });
      },
      300 // Cache for 5 minutes
    );
  }

  async getThumbnailById(id: string, includeDeleted = false) {
    const cacheKey = `thumbnail:${id}`;

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const thumbnail = await this.prisma.thumbnail.findUnique({
          where: { id },
          include: {
            Project_Thumbnail_projectIdToProject: true,
          },
        });

        // Filter out soft-deleted unless explicitly requested
        if (thumbnail && thumbnail.deletedAt && !includeDeleted) {
          return null;
        }

        return thumbnail;
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
      storagePublicId: string;
      storageProvider: string;
      projectId: string;
    }>
  ) {
    // Validate parameters JSON if it's being updated
    if (data.parameters !== undefined) {
      validateJsonColumn(
        ThumbnailParametersSchema,
        data.parameters,
        'Thumbnail.parameters'
      );
    }

    // Get thumbnail info for cache invalidation
    const existingThumbnail = await this.prisma.thumbnail.findUnique({
      where: { id },
      select: { userId: true, projectId: true },
    });

    const thumbnail = await this.prisma.thumbnail.update({
      where: { id },
      data,
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail updated event
    if (existingThumbnail) {
      await this.eventEmitter.createAndEmit(
        'thumbnail.updated',
        existingThumbnail.userId,
        {
          thumbnailId: id,
          changes: data,
          previousVersion: JSON.stringify(existingThumbnail),
        }
      );

      // Emit analytics event for the update
      await this.emitAnalyticsEvent(
        existingThumbnail.userId,
        'thumbnail_updated',
        'thumbnail',
        id,
        {
          fieldsChanged: Object.keys(data),
          hasTitle: !!data.title,
          hasParameters: !!data.parameters,
        }
      );
    }

    // Invalidate caches
    await this.cache.del(`thumbnail:${id}`);
    if (existingThumbnail) {
      await this.invalidateUserThumbnailsCache(existingThumbnail.userId);
      await this.invalidateProjectCache(existingThumbnail.projectId);
      // If projectId changed, also invalidate the NEW project's cache
      if (data.projectId && data.projectId !== existingThumbnail.projectId) {
        await this.invalidateProjectCache(data.projectId);
      }
    }

    console.log(`🔄 Thumbnail updated: ${id}`);
    return thumbnail;
  }

  async deleteThumbnail(id: string) {
    // Soft-delete: mark with deletedAt timestamp instead of removing
    const existingThumbnail = await this.prisma.thumbnail.findUnique({
      where: { id },
      select: {
        userId: true,
        projectId: true,
        imageUrl: true,
        storagePublicId: true,
      },
    });

    const thumbnail = await this.prisma.thumbnail.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // 🚀 EVENT-DRIVEN: Emit thumbnail deleted event
    if (existingThumbnail) {
      await this.eventEmitter.createAndEmit(
        'thumbnail.deleted',
        existingThumbnail.userId,
        {
          thumbnailId: id,
          filePath: existingThumbnail.imageUrl,
          softDelete: true,
        }
      );

      // Emit analytics event for the deletion
      await this.emitAnalyticsEvent(
        existingThumbnail.userId,
        'thumbnail_deleted',
        'thumbnail',
        id,
        {
          projectId: existingThumbnail.projectId,
          softDelete: true,
        }
      );
    }

    // Invalidate caches
    await this.cache.del(`thumbnail:${id}`);
    if (existingThumbnail) {
      await this.invalidateUserThumbnailsCache(existingThumbnail.userId);
      await this.invalidateProjectCache(existingThumbnail.projectId);
    }

    console.log(`🗑️ Thumbnail soft-deleted: ${id} (recoverable for 30 days)`);
    return thumbnail;
  }

  async restoreThumbnail(id: string) {
    const thumbnail = await this.prisma.thumbnail.update({
      where: { id },
      data: { deletedAt: null },
    });

    // Invalidate caches
    await this.cache.del(`thumbnail:${id}`);
    await this.invalidateUserThumbnailsCache(thumbnail.userId);
    await this.invalidateProjectCache(thumbnail.projectId);

    console.log(`♻️ Thumbnail restored: ${id}`);
    return thumbnail;
  }

  async hardDeleteThumbnail(id: string) {
    // Permanently delete from DB and storage — only for thumbnails past grace period
    const existingThumbnail = await this.prisma.thumbnail.findUnique({
      where: { id },
      select: {
        userId: true,
        projectId: true,
        imageUrl: true,
        storagePublicId: true,
        deletedAt: true,
      },
    });

    if (!existingThumbnail) {
      throw new Error('Thumbnail not found');
    }

    // Safety: only hard-delete if already soft-deleted
    if (!existingThumbnail.deletedAt) {
      throw new Error('Thumbnail must be soft-deleted first');
    }

    // Delete from storage provider
    if (existingThumbnail.storagePublicId) {
      try {
        const { getStorageService } = await import('../storage');
        await getStorageService().delete(existingThumbnail.storagePublicId);
        console.log(
          `☁️ Storage asset deleted: ${existingThumbnail.storagePublicId}`
        );
      } catch (storageError) {
        console.warn(
          'Storage deletion failed (asset may already be removed):',
          storageError
        );
      }
    }

    // Permanently remove from DB
    const thumbnail = await this.prisma.thumbnail.delete({
      where: { id },
    });

    // Invalidate caches
    await this.cache.del(`thumbnail:${id}`);
    if (existingThumbnail) {
      await this.invalidateUserThumbnailsCache(existingThumbnail.userId);
      await this.invalidateProjectCache(existingThumbnail.projectId);
    }

    console.log(`💀 Thumbnail permanently deleted: ${id}`);
    return thumbnail;
  }

  async getDeletedThumbnails(userId: string) {
    return this.prisma.thumbnail.findMany({
      where: {
        userId,
        deletedAt: { not: null },
      },
      orderBy: { deletedAt: 'desc' },
    });
  }

  async recategorizeThumbnail(id: string, platform: string, userId: string) {
    const thumbnail = await this.prisma.thumbnail.findUnique({
      where: { id },
      select: { id: true, userId: true, projectId: true, parameters: true },
    });

    if (!thumbnail) {
      throw new Error('Thumbnail not found');
    }
    if (thumbnail.userId !== userId) {
      throw new Error('Not authorized');
    }

    const currentParams =
      safeParseJsonColumn(
        ThumbnailParametersSchema,
        thumbnail.parameters,
        'Thumbnail.parameters'
      ) || {};
    const updatedParams = { ...currentParams, platform };

    const updated = await this.prisma.thumbnail.update({
      where: { id },
      data: { parameters: updatedParams },
    });

    // Invalidate caches
    await this.cache.del(`thumbnail:${id}`);
    await this.invalidateUserThumbnailsCache(userId);

    console.log(`🔀 Thumbnail recategorized: ${id} → ${platform}`);
    return updated;
  }

  async setThumbnailAsFeatured(thumbnailId: string, projectId: string) {
    // First verify that the thumbnail belongs to this project
    const thumbnail = await this.prisma.thumbnail.findUnique({
      where: { id: thumbnailId },
      select: { id: true, projectId: true, userId: true },
    });

    if (thumbnail?.projectId !== projectId) {
      throw new Error('Thumbnail does not belong to this project');
    }

    // Set this thumbnail as featured for the project
    await this.prisma.project.update({
      where: { id: projectId },
      data: {
        featuredThumbnailId: thumbnailId,
      },
    });

    // 🚀 EVENT-DRIVEN: Emit analytics event for featured thumbnail
    await this.emitAnalyticsEvent(
      thumbnail.userId,
      'thumbnail_featured',
      'thumbnail',
      thumbnailId,
      {
        projectId: projectId,
      }
    );

    console.log(
      `⭐ Thumbnail set as featured: ${thumbnailId} in project ${projectId}`
    );
    return thumbnail;
  }

  async bulkMoveThumbnails(
    thumbnailIds: string[],
    targetProjectId: string,
    userId: string
  ) {
    // Get existing thumbnails to find affected source projects
    const existingThumbnails = await this.prisma.thumbnail.findMany({
      where: {
        id: { in: thumbnailIds },
        userId,
        deletedAt: null,
      },
      select: { id: true, projectId: true },
    });

    if (existingThumbnails.length === 0) {
      throw new Error('No valid thumbnails found');
    }

    // Collect unique source project IDs for cache invalidation
    const sourceProjectIds = [
      ...new Set(existingThumbnails.map(t => t.projectId)),
    ];

    // Batch update all thumbnails to the new project
    const result = await this.prisma.thumbnail.updateMany({
      where: {
        id: { in: existingThumbnails.map(t => t.id) },
        userId,
      },
      data: { projectId: targetProjectId },
    });

    // Invalidate caches for all affected projects + user thumbnails
    await this.invalidateUserThumbnailsCache(userId);
    await this.invalidateProjectCache(targetProjectId);
    for (const pid of sourceProjectIds) {
      await this.invalidateProjectCache(pid);
    }

    // Invalidate individual thumbnail caches
    for (const tid of existingThumbnails.map(t => t.id)) {
      await this.cache.del(`thumbnail:${tid}`);
    }

    console.log(
      `📦 Bulk moved ${result.count} thumbnails to project ${targetProjectId}`
    );
    return { count: result.count, movedIds: existingThumbnails.map(t => t.id) };
  }

  // Cache invalidation helper methods
  private async invalidateUserThumbnailsCache(userId: string) {
    // Delete all cache keys that start with the user thumbnail pattern
    const pattern = `thumbnails:user:${userId}:*`;
    await this.cache.delPattern(pattern);
  }

  private async invalidateProjectCache(projectId: string) {
    // Invalidate project-related caches if needed
    await this.cache.del(`project:${projectId}`);
  }
}
