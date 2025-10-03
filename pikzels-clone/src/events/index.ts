// Event System Exports
// This file provides a clean interface to the event system

export * from './event-types';
export * from './event-emitter';
export * from './event-registry';
export * from './event-persistence';

// Re-export commonly used functions for convenience
export {
  eventEmitter,
  emitThumbnailCreated,
  emitAnalyticsEvent,
  emitSocialShareRequested
} from './event-emitter';

export { eventRegistry } from './event-registry';
export { eventPersistence } from './event-persistence';