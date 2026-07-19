import {
  ThumbnailCreatedEvent,
  AnalyticsTrackingEvent,
} from './event-types';
import { CacheService } from '../services/cache.service';
import { getPrisma } from '../utils/prisma-factory';
import { logger } from '../utils/logger';

const prisma = getPrisma();
const cache = CacheService.getInstance();

/**
 * Advanced Analytics Event Handlers
 *
 * These handlers process analytics events in real-time and provide:
 * - Real-time analytics data processing
 * - Smart data aggregation and caching
 * - Performance-optimized database operations
 * - Batch processing for high-volume events
 */
export class AnalyticsEventHandlers {
  private eventQueue: AnalyticsTrackingEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    if (!this.isTestEnvironment()) {
      this.startBatchProcessor();
    }
  }

  private isTestEnvironment(): boolean {
    return process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
  }

  /**
   * Handle individual analytics tracking events
   */
  async handleAnalyticsEvent(event: AnalyticsTrackingEvent): Promise<void> {
    try {
      // Add to batch queue for efficient processing
      this.eventQueue.push(event);

      // Process immediately if queue is full, otherwise wait for timer
      if (this.eventQueue.length >= this.batchSize) {
        await this.flushEventQueue();
      }

      // Update real-time cache for instant dashboard updates
      await this.updateRealTimeCache(event);

      logger.info('Analytics event queued', { action: event.data.action, resource: event.data.resource });
    } catch (error) {
      logger.error('Error handling analytics event', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Handle thumbnail creation events for analytics
   */
  async handleThumbnailCreated(event: ThumbnailCreatedEvent): Promise<void> {
    try {
      const analyticsData = {
        userId: event.userId,
        action: 'thumbnail_created',
        resource: 'thumbnail',
        resourceId: event.data.thumbnailId,
        timestamp: event.timestamp,
        metadata: {
          projectId: event.data.projectId,
          hasProject: !!event.data.projectId,
          fileSize: event.data.size,
          parameters: event.data.parameters,
          parameterCount: Object.keys(event.data.parameters || {}).length,
        },
      };

      // Store in analytics table
      await this.createAnalyticsRecord(analyticsData);

      // Update user statistics cache
      await this.updateUserStatsCache(event.userId, 'thumbnails_created', 1);

      // Update project statistics if applicable
      if (event.data.projectId) {
        await this.updateProjectStatsCache(
          event.data.projectId,
          'thumbnails_count',
          1
        );
      }

      logger.info('Thumbnail creation analytics processed', { thumbnailId: event.data.thumbnailId });
    } catch (error) {
      logger.error('Error processing thumbnail creation analytics', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Create analytics record in database
   */
  private async createAnalyticsRecord(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    timestamp: Date;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    try {
      // For now, we'll store analytics data as JSON in a simple table
      // In production, you might want a dedicated analytics database
      await prisma.$executeRaw`
        INSERT INTO analytics_events (user_id, action, resource, resource_id, timestamp, metadata)
        VALUES (${data.userId}, ${data.action}, ${data.resource}, ${data.resourceId}, ${data.timestamp}, ${JSON.stringify(data.metadata)})
        ON CONFLICT DO NOTHING
      `;
    } catch (error) {
      // If analytics table doesn't exist, log structured data
      logger.debug('Analytics record (table unavailable)', {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        metadata: data.metadata,
      });
    }
  }

  /**
   * Update real-time cache for instant dashboard updates
   */
  private async updateRealTimeCache(event: AnalyticsTrackingEvent): Promise<void> {
    const cacheKey = `analytics:realtime:${event.userId}`;

    try {
      interface RecentAction { action: string; resource: string; timestamp: Date; properties?: Record<string, unknown> }
      // Get current real-time data
      const currentData: {
        lastActivity: Date;
        recentActions: RecentAction[];
        counters: Record<string, number>;
      } = (await cache.get(cacheKey) as { lastActivity: Date; recentActions: RecentAction[]; counters: Record<string, number> }) || {
        lastActivity: new Date(),
        recentActions: [],
        counters: {},
      };

      // Add this action to recent actions (keep last 10)
      currentData.recentActions = [
        {
          action: event.data.action,
          resource: event.data.resource,
          timestamp: event.timestamp,
          ...(event.data.properties && { properties: event.data.properties as Record<string, unknown> }),
        },
        ...currentData.recentActions.slice(0, 9),
      ];

      // Update counters
      const counterKey = `${event.data.action}_${event.data.resource}`;
      currentData.counters[counterKey] =
        (currentData.counters[counterKey] || 0) + 1;
      currentData.lastActivity = event.timestamp;

      // Store back in cache for 1 hour
      await cache.set(cacheKey, currentData, 3600);
    } catch (error) {
      logger.error('Error updating real-time cache', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Update user statistics cache
   */
  private async updateUserStatsCache(
    userId: string,
    stat: string,
    increment: number
  ): Promise<void> {
    const cacheKey = `analytics:user_stats:${userId}`;

    try {
      const currentStats: Record<string, unknown> =
        (await cache.get(cacheKey)) || {};
      currentStats[stat] = (currentStats[stat] as number || 0) + increment;
      currentStats.lastUpdated = new Date();

      // Cache for 30 minutes
      await cache.set(cacheKey, currentStats, 1800);
    } catch (error) {
      logger.error('Error updating user stats cache', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Update project statistics cache
   */
  private async updateProjectStatsCache(
    projectId: string,
    stat: string,
    increment: number
  ): Promise<void> {
    const cacheKey = `analytics:project_stats:${projectId}`;

    try {
      const currentStats: Record<string, unknown> =
        (await cache.get(cacheKey)) || {};
      currentStats[stat] = (currentStats[stat] as number || 0) + increment;
      currentStats.lastUpdated = new Date();

      // Cache for 30 minutes
      await cache.set(cacheKey, currentStats, 1800);
    } catch (error) {
      logger.error('Error updating project stats cache', error instanceof Error ? error : undefined);
    }
  }

  /**
   * Batch processor for analytics events
   */
  private startBatchProcessor(): void {
    this.flushTimer = setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEventQueue();
      }
    }, this.flushInterval);
    this.flushTimer.unref?.();
  }

  /**
   * Flush the event queue to database
   */
  private async flushEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToProcess = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Process events in batch
      for (const event of eventsToProcess) {
        await this.createAnalyticsRecord({
          userId: event.userId,
          action: event.data.action,
          resource: event.data.resource,
          resourceId: event.data.resourceId,
          timestamp: event.timestamp,
          metadata: event.data.properties || {},
        });
      }

      logger.info('Batch processed analytics events', { count: eventsToProcess.length });
    } catch (error) {
      logger.error('Error flushing analytics event queue', error instanceof Error ? error : undefined);

      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToProcess);
    }
  }

  /**
   * Get real-time analytics for a user
   */
  async getRealTimeAnalytics(userId: string): Promise<Record<string, unknown>> {
    const cacheKey = `analytics:realtime:${userId}`;
    const userStatsKey = `analytics:user_stats:${userId}`;

    try {
      const [realTimeData, userStats] = await Promise.all([
        cache.get(cacheKey),
        cache.get(userStatsKey),
      ]);

      return {
        realTime: realTimeData || { recentActions: [], counters: {} },
        userStats: userStats || {},
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('Error getting real-time analytics', error instanceof Error ? error : undefined);
      return {
        realTime: { recentActions: [], counters: {} },
        userStats: {},
        timestamp: new Date(),
      };
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush any remaining events
    await this.flushEventQueue();

    logger.info('Analytics handlers cleaned up');
  }
}

// Export singleton instance
export const analyticsHandlers = new AnalyticsEventHandlers();
