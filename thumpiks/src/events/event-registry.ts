import { eventEmitter } from './event-emitter';
import { AppEvent, ThumbnailCreatedEvent, ThumbnailDeletedEvent, ProjectCreatedEvent, AnalyticsTrackingEvent } from './event-types';
import { analyticsHandlers } from './analytics-handlers';
import { logger } from '../utils/logger';

/**
 * Event Handler Registry
 * Manages registration and initialization of all event handlers
 */
export class EventHandlerRegistry {
  private handlers: Map<string, ((...args: unknown[]) => unknown)[]> = new Map();
  private initialized = false;

  /**
   * Register an event handler
   */
  register(eventType: string, handler: (event: AppEvent) => Promise<void> | void, priority = 0): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType)!.push(handler as (...args: unknown[]) => unknown);
    
    // Subscribe to the event emitter
    eventEmitter.subscribe(eventType, handler as (event: AppEvent) => Promise<void> | void, priority);
    
    logger.info('Registered event handler', { eventType, priority });
  }

  /**
   * Initialize all event handlers
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Event handlers already initialized');
      return;
    }

    logger.info('Initializing event handlers');

    // Register analytics handlers
    this.registerAnalyticsHandlers();
    
    // Register cleanup handlers
    this.registerCleanupHandlers();

    this.initialized = true;
    logger.info('Event handlers initialized successfully');
  }

  /**
   * Get enhanced stats including analytics handlers
   */
  getStats() {
    const stats = { totalHandlers: 0, eventTypes: 0 };
    
    for (const [eventType, handlers] of this.handlers) {
      stats.totalHandlers += handlers.length;
      stats.eventTypes++;
      // Use eventType for logging during development
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Event type handler count', { eventType, handlerCount: handlers.length });
      }
    }

    return {
      ...stats,
      handlers: Array.from(this.handlers.keys()),
      emitterStats: eventEmitter.getStats(),
      analyticsHandlers: {
        initialized: true,
        batchProcessing: true
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
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    await analyticsHandlers.cleanup();
    logger.info('Event registry cleaned up');
  }

  private registerAnalyticsHandlers(): void {
    // Handle thumbnail creation analytics
    this.register('thumbnail.created', async (event: AppEvent) => {
      const e = event as ThumbnailCreatedEvent;
      logger.info('Analytics: Thumbnail created', { thumbnailId: e.data.thumbnailId });
      await analyticsHandlers.handleThumbnailCreated(e);
    }, 10);

    // Handle project creation analytics
    this.register('project.created', async (event: AppEvent) => {
      const e = event as ProjectCreatedEvent;
      logger.info('Analytics: Project created', { projectId: e.data.projectId });
      await eventEmitter.createAndEmit(
        'analytics.track',
        event.userId,
        {
          action: 'project_created',
          resource: 'project',
          resourceId: e.data.projectId,
          properties: {
            hasDescription: !!(e.data as unknown as { description?: string }).description
          }
        }
      );
    }, 10);

    // Handle general analytics tracking events
    this.register('analytics.track', async (event: AppEvent) => {
      const analyticsEvent = event as AnalyticsTrackingEvent;
      await analyticsHandlers.handleAnalyticsEvent(analyticsEvent);
      logger.info('Enhanced analytics processed', { action: analyticsEvent.data.action, resource: analyticsEvent.data.resource });
    }, 1);
  }

  private registerCleanupHandlers(): void {
    // Handle thumbnail deletion cleanup
    this.register('thumbnail.deleted', async (event: AppEvent) => {
      const deleteEvent = event as ThumbnailDeletedEvent;
      logger.info('Cleanup: Thumbnail deleted', { thumbnailId: deleteEvent.data.thumbnailId });
      logger.debug('Would cleanup file', { filePath: deleteEvent.data.filePath });
    }, 1);

    // Handle analytics cleanup/aggregation
    this.register('analytics.track', async (event: AppEvent) => {
      const analyticsEvent = event as AnalyticsTrackingEvent;
      logger.info('Analytics tracked', { action: analyticsEvent.data.action, resource: analyticsEvent.data.resource });
    }, 1);
  }
}

// Singleton instance
export const eventRegistry = new EventHandlerRegistry();
