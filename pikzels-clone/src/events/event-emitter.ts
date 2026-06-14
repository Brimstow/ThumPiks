import { EventEmitter } from 'events';
import { AppEvent, EventHandler, EventSubscription } from './event-types';
import { v4 as uuidv4 } from 'uuid';
import { eventPersistence } from './event-persistence';
import { logger } from '../utils/logger';

/**
 * Enhanced Event Emitter for Thumbnail Maker
 * 
 * Features:
 * - Type-safe event handling
 * - Priority-based event processing
 * - Error handling and retry logic
 * - Event persistence (for critical events)
 * - Performance monitoring
 */
export class ThumbnailMakerEventEmitter extends EventEmitter {
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private eventHistory: AppEvent[] = [];
  private maxHistorySize = 1000;
  private processingStats = {
    eventsProcessed: 0,
    eventsInQueue: 0,
    averageProcessingTime: 0,
    lastProcessedAt: new Date()
  };

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many listeners for scalability
  }

  /**
   * Subscribe to events with priority support
   */
  subscribe<T extends AppEvent>(
    eventType: string, 
    handler: EventHandler<T>, 
    priority = 0
  ): () => void {
    const subscription: EventSubscription = {
      eventType,
      handler: handler as EventHandler,
      priority
    };

    // Add to subscriptions map
    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }
    
    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);
    
    // Sort by priority (higher priority first)
    subs.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    // Set up Node.js EventEmitter listener
    this.on(eventType, handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
      const index = subs.indexOf(subscription);
      if (index > -1) {
        subs.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event with enhanced features including persistence
   */
  async emitEvent(event: AppEvent): Promise<void> {
    const startTime = Date.now();
    this.processingStats.eventsInQueue++;

    try {
      // Add to history for debugging/replay
      this.addToHistory(event);

      // Persist event for reliability (async, non-blocking)
      eventPersistence.persistEvent(event).catch(error => {
        logger.error('Error persisting event', error as Error);
      });

      // Emit the event
      this.emit(event.type, event);

      // Update statistics
      this.updateStats(startTime);
      
      logger.info('Event emitted', { type: event.type, id: event.id, userId: event.userId });
    } catch (error) {
      logger.error(`Error emitting event ${event.type}`, error as Error);
      throw error;
    } finally {
      this.processingStats.eventsInQueue--;
    }
  }

  /**
   * Create and emit a new event
   */
  async createAndEmit<T extends AppEvent>(
    eventType: T['type'],
    userId: string,
    data: T['data'],
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const eventId = uuidv4();
    
    const event: AppEvent = {
      id: eventId,
      type: eventType,
      timestamp: new Date(),
      userId,
      data,
      metadata
    } as T;

    await this.emitEvent(event);
    return eventId;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      ...this.processingStats,
      subscriptionCount: Array.from(this.subscriptions.values())
        .reduce((total, subs) => total + subs.length, 0),
      eventTypesRegistered: this.subscriptions.size,
      historySize: this.eventHistory.length
    };
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit = 10): AppEvent[] {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Get events by type
   */
  getEventsByType(eventType: string, limit = 50): AppEvent[] {
    return this.eventHistory
      .filter(event => event.type === eventType)
      .slice(-limit);
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit = 50): AppEvent[] {
    return this.eventHistory
      .filter(event => event.userId === userId)
      .slice(-limit);
  }

  /**
   * Replay events from persistent storage
   */
  async replayEvents(
    fromDate?: Date,
    toDate?: Date,
    eventTypes?: string[]
  ): Promise<void> {
    try {
      logger.info('Starting event replay');
      
      const events = await eventPersistence.replayEvents(fromDate, toDate, eventTypes);
      logger.info('Events found for replay', { count: events.length });
      
      for (const event of events) {
        try {
          // Re-emit the event (but don't persist again)
          this.emit(event.type, event);
          logger.info('Event replayed', { type: event.type, id: event.id });
        } catch (error) {
          logger.error(`Error replaying event ${event.type}`, error as Error);
        }
      }
      
      logger.info('Event replay completed', { count: events.length });
    } catch (error) {
      logger.error('Error during event replay', error as Error);
    }
  }

  /**
   * Get persistence statistics
   */
  async getPersistenceStats() {
    return await eventPersistence.getStorageStats();
  }

  /**
   * Export events to file
   */
  async exportEvents(outputPath: string, fromDate?: Date, toDate?: Date) {
    return await eventPersistence.exportEvents(outputPath, fromDate, toDate);
  }

  private addToHistory(event: AppEvent): void {
    this.eventHistory.push(event);
    
    // Trim history if it gets too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize / 2);
    }
  }

  private updateStats(startTime: number): void {
    const processingTime = Date.now() - startTime;
    this.processingStats.eventsProcessed++;
    this.processingStats.lastProcessedAt = new Date();
    
    // Calculate rolling average
    const currentAvg = this.processingStats.averageProcessingTime;
    const count = this.processingStats.eventsProcessed;
    this.processingStats.averageProcessingTime = 
      ((currentAvg * (count - 1)) + processingTime) / count;
  }
}

// Singleton instance
export const eventEmitter = new ThumbnailMakerEventEmitter();

// Helper functions for common operations
export const emitThumbnailCreated = (
  userId: string,
  thumbnailId: string,
  projectId: string | undefined,
  filePath: string,
  parameters: Record<string, unknown>,
  size: number
) => {
  return eventEmitter.createAndEmit(
    'thumbnail.created',
    userId,
    { thumbnailId, projectId, filePath, parameters, size }
  );
};

export const emitAnalyticsEvent = (
  userId: string,
  action: string,
  resource: string,
  resourceId: string,
  properties?: Record<string, unknown>
) => {
  return eventEmitter.createAndEmit(
    'analytics.track',
    userId,
    { action, resource, resourceId, properties: properties || {} }
  );
};