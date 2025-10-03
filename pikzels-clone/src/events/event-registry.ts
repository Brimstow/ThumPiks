import { eventEmitter } from './event-emitter';
import { AppEvent } from './event-types';
import { analyticsHandlers } from './analytics-handlers';
import { socialShareHandlers } from './social-share-handlers';

/**
 * Event Handler Registry
 * Manages registration and initialization of all event handlers
 */
export class EventHandlerRegistry {
  private handlers: Map<string, Function[]> = new Map();
  private initialized = false;

  /**
   * Register an event handler
   */
  register(eventType: string, handler: Function, priority = 0): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler);
    
    // Subscribe to the event emitter
    eventEmitter.subscribe(eventType, handler as any, priority);
    
    console.log(`📝 Registered handler for ${eventType} (priority: ${priority})`);
  }

  /**
   * Initialize all event handlers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('⚠️  Event handlers already initialized');
      return;
    }

    console.log('🚀 Initializing event handlers...');

    // Register analytics handlers
    this.registerAnalyticsHandlers();
    
    // Register social sharing handlers
    this.registerSocialSharingHandlers();
    
    // Register cleanup handlers
    this.registerCleanupHandlers();

    this.initialized = true;
    console.log('✅ Event handlers initialized successfully');
  }

  /**
   * Get enhanced stats including analytics and social share handlers
   */
  getStats() {
    const stats = { totalHandlers: 0, eventTypes: 0 };
    
    for (const [eventType, handlers] of this.handlers) {
      stats.totalHandlers += handlers.length;
      stats.eventTypes++;
      // Use eventType for logging during development
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Event type: ${eventType} has ${handlers.length} handlers`);
      }
    }

    return {
      ...stats,
      handlers: Array.from(this.handlers.keys()),
      emitterStats: eventEmitter.getStats(),
      analyticsHandlers: {
        initialized: true,
        batchProcessing: true
      },
      socialShareHandlers: {
        initialized: true,
        retryLogic: true,
        platforms: ['twitter', 'facebook', 'linkedin', 'pinterest']
      }
    };
  }

  /**
   * Get real-time analytics for a user
   */
  async getRealTimeAnalytics(userId: string) {
    return await analyticsHandlers.getRealTimeAnalytics(userId);
  }

  /**
   * Get social share status
   */
  async getShareStatus(userId: string, shareId: string) {
    return await socialShareHandlers.getShareStatus(userId, shareId);
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(userId: string) {
    return await socialShareHandlers.getPlatformStats(userId);
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    await analyticsHandlers.cleanup();
    await socialShareHandlers.cleanup();
    console.log('🧼 Event registry cleaned up');
  }

  private registerAnalyticsHandlers(): void {
    // Handle thumbnail creation analytics
    this.register('thumbnail.created', async (event: AppEvent) => {
      console.log(`📊 Analytics: Thumbnail created - ${(event as any).data.thumbnailId}`);
      
      // Use enhanced analytics handler
      await analyticsHandlers.handleThumbnailCreated(event as any);
    }, 10);

    // Handle project creation analytics
    this.register('project.created', async (event: AppEvent) => {
      console.log(`📊 Analytics: Project created - ${(event as any).data.projectId}`);
      
      await eventEmitter.createAndEmit(
        'analytics.track',
        event.userId,
        {
          action: 'project_created',
          resource: 'project',
          resourceId: (event as any).data.projectId,
          properties: {
            hasDescription: !!(event as any).data.description
          }
        }
      );
    }, 10);

    // Handle social sharing analytics with enhanced handlers
    this.register('social.share.completed', async (event: AppEvent) => {
      const shareEvent = event as any;
      console.log(`📊 Analytics: Social share ${shareEvent.data.success ? 'completed' : 'failed'} - ${shareEvent.data.platform}`);
      
      // Use enhanced analytics handler
      await analyticsHandlers.handleSocialShareCompleted(shareEvent);
    }, 10);

    // Handle general analytics tracking events
    this.register('analytics.track', async (event: AppEvent) => {
      const analyticsEvent = event as any;
      
      // Process with enhanced analytics handler
      await analyticsHandlers.handleAnalyticsEvent(analyticsEvent);
      
      console.log(`📈 Enhanced analytics processed: ${analyticsEvent.data.action} on ${analyticsEvent.data.resource}`);
    }, 1);
  }

  private registerSocialSharingHandlers(): void {
    // Handle social share requests with enhanced processing
    this.register('social.share.requested', async (event: AppEvent) => {
      const shareEvent = event as any;
      console.log(`📤 Processing enhanced social share request: ${shareEvent.data.shareId}`);
      
      // Use enhanced social share handler
      await socialShareHandlers.handleSocialShareRequest(shareEvent);
    }, 5);
  }

  private registerCleanupHandlers(): void {
    // Handle thumbnail deletion cleanup
    this.register('thumbnail.deleted', async (event: AppEvent) => {
      const deleteEvent = event as any;
      console.log(`🧹 Cleanup: Thumbnail deleted - ${deleteEvent.data.thumbnailId}`);
      
      // This is where file system cleanup, cache invalidation, etc. would happen
      // For now, just log
      console.log(`🗑️  Would cleanup file: ${deleteEvent.data.filePath}`);
    }, 1);

    // Handle analytics cleanup/aggregation
    this.register('analytics.track', async (event: AppEvent) => {
      const analyticsEvent = event as any;
      
      // This would typically batch analytics events for efficient processing
      console.log(`📈 Analytics tracked: ${analyticsEvent.data.action} on ${analyticsEvent.data.resource}`);
    }, 1);
  }
}

// Singleton instance
export const eventRegistry = new EventHandlerRegistry();