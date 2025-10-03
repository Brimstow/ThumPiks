import { PrismaClient } from '@prisma/client';
import {
  ThumbnailCreatedEvent,
  SocialShareCompletedEvent,
} from './event-types'; // TODO: Use for analytics tracking
import { CacheService } from '../services/cache.service';

const prisma = new PrismaClient();
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
  private eventQueue: any[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.startBatchProcessor();
  }

  /**
   * Handle individual analytics tracking events
   */
  async handleAnalyticsEvent(event: any): Promise<void> {
    try {
      // Add to batch queue for efficient processing
      this.eventQueue.push(event);
      
      // Process immediately if queue is full, otherwise wait for timer
      if (this.eventQueue.length >= this.batchSize) {
        await this.flushEventQueue();
      }

      // Update real-time cache for instant dashboard updates
      await this.updateRealTimeCache(event);
      
      console.log(`📊 Analytics event queued: ${event.data.action} on ${event.data.resource}`);
    } catch (error) {
      console.error('❌ Error handling analytics event:', error);
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
          parameterCount: Object.keys(event.data.parameters || {}).length
        }
      };

      // Store in analytics table
      await this.createAnalyticsRecord(analyticsData);
      
      // Update user statistics cache
      await this.updateUserStatsCache(event.userId, 'thumbnails_created', 1);
      
      // Update project statistics if applicable
      if (event.data.projectId) {
        await this.updateProjectStatsCache(event.data.projectId, 'thumbnails_count', 1);
      }

      console.log(`📈 Thumbnail creation analytics processed: ${event.data.thumbnailId}`);
    } catch (error) {
      console.error('❌ Error processing thumbnail creation analytics:', error);
    }
  }

  /**
   * Handle social share completion events
   */
  async handleSocialShareCompleted(event: SocialShareCompletedEvent): Promise<void> {
    try {
      const analyticsData = {
        userId: event.userId,
        action: event.data.success ? 'social_share_success' : 'social_share_failed',
        resource: 'social_share',
        resourceId: event.data.shareId,
        timestamp: event.timestamp,
        metadata: {
          platform: event.data.platform,
          thumbnailId: event.data.thumbnailId,
          shareUrl: event.data.shareUrl,
          error: event.data.error
        }
      };

      await this.createAnalyticsRecord(analyticsData);
      
      // Update platform-specific statistics
      await this.updatePlatformStatsCache(
        event.userId, 
        event.data.platform, 
        event.data.success ? 'success' : 'failed'
      );

      console.log(`📱 Social share analytics processed: ${event.data.platform} - ${event.data.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Error processing social share analytics:', error);
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
    metadata: Record<string, any>;
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
      // If analytics table doesn't exist, log to console for now
      console.log(`📊 Analytics Record:`, {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId,
        metadata: data.metadata
      });
    }
  }

  /**
   * Update real-time cache for instant dashboard updates
   */
  private async updateRealTimeCache(event: any): Promise<void> {
    const cacheKey = `analytics:realtime:${event.userId}`;
    
    try {
      // Get current real-time data
      const currentData: {
        lastActivity: Date;
        recentActions: any[];
        counters: Record<string, number>;
      } = await cache.get(cacheKey) || {
        lastActivity: new Date(),
        recentActions: [],
        counters: {}
      };

      // Add this action to recent actions (keep last 10)
      currentData.recentActions = [
        {
          action: event.data.action,
          resource: event.data.resource,
          timestamp: event.timestamp,
          properties: event.data.properties
        },
        ...currentData.recentActions.slice(0, 9)
      ];

      // Update counters
      const counterKey = `${event.data.action}_${event.data.resource}`;
      currentData.counters[counterKey] = (currentData.counters[counterKey] || 0) + 1;
      currentData.lastActivity = event.timestamp;

      // Store back in cache for 1 hour
      await cache.set(cacheKey, currentData, 3600);
    } catch (error) {
      console.error('❌ Error updating real-time cache:', error);
    }
  }

  /**
   * Update user statistics cache
   */
  private async updateUserStatsCache(userId: string, stat: string, increment: number): Promise<void> {
    const cacheKey = `analytics:user_stats:${userId}`;
    
    try {
      const currentStats: Record<string, any> = await cache.get(cacheKey) || {};
      currentStats[stat] = (currentStats[stat] || 0) + increment;
      currentStats.lastUpdated = new Date();
      
      // Cache for 30 minutes
      await cache.set(cacheKey, currentStats, 1800);
    } catch (error) {
      console.error('❌ Error updating user stats cache:', error);
    }
  }

  /**
   * Update project statistics cache
   */
  private async updateProjectStatsCache(projectId: string, stat: string, increment: number): Promise<void> {
    const cacheKey = `analytics:project_stats:${projectId}`;
    
    try {
      const currentStats: Record<string, any> = await cache.get(cacheKey) || {};
      currentStats[stat] = (currentStats[stat] || 0) + increment;
      currentStats.lastUpdated = new Date();
      
      // Cache for 30 minutes
      await cache.set(cacheKey, currentStats, 1800);
    } catch (error) {
      console.error('❌ Error updating project stats cache:', error);
    }
  }

  /**
   * Update platform-specific statistics cache
   */
  private async updatePlatformStatsCache(userId: string, platform: string, result: 'success' | 'failed'): Promise<void> {
    const cacheKey = `analytics:platform_stats:${userId}`;
    
    try {
      const currentStats: Record<string, any> = await cache.get(cacheKey) || {};
      
      if (!currentStats[platform]) {
        currentStats[platform] = { success: 0, failed: 0 };
      }
      
      currentStats[platform][result] = (currentStats[platform][result] || 0) + 1;
      currentStats.lastUpdated = new Date();
      
      // Cache for 1 hour
      await cache.set(cacheKey, currentStats, 3600);
    } catch (error) {
      console.error('❌ Error updating platform stats cache:', error);
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
          metadata: event.data.properties || {}
        });
      }

      console.log(`📊 Batch processed ${eventsToProcess.length} analytics events`);
    } catch (error) {
      console.error('❌ Error flushing analytics event queue:', error);
      
      // Put events back in queue for retry
      this.eventQueue.unshift(...eventsToProcess);
    }
  }

  /**
   * Get real-time analytics for a user
   */
  async getRealTimeAnalytics(userId: string): Promise<any> {
    const cacheKey = `analytics:realtime:${userId}`;
    const userStatsKey = `analytics:user_stats:${userId}`;
    const platformStatsKey = `analytics:platform_stats:${userId}`;

    try {
      const [realTimeData, userStats, platformStats] = await Promise.all([
        cache.get(cacheKey),
        cache.get(userStatsKey),
        cache.get(platformStatsKey)
      ]);

      return {
        realTime: realTimeData || { recentActions: [], counters: {} },
        userStats: userStats || {},
        platformStats: platformStats || {},
        timestamp: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting real-time analytics:', error);
      return {
        realTime: { recentActions: [], counters: {} },
        userStats: {},
        platformStats: {},
        timestamp: new Date()
      };
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush any remaining events
    await this.flushEventQueue();
    
    console.log('🧹 Analytics handlers cleaned up');
  }
}

// Export singleton instance
export const analyticsHandlers = new AnalyticsEventHandlers();