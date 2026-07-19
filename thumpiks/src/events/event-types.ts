// Event Types for Thumbnail Maker Event-Driven Architecture
// This defines all events that can occur in our system

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, unknown>;
}

// Thumbnail Events
export interface ThumbnailCreatedEvent extends BaseEvent {
  type: 'thumbnail.created';
  data: {
    thumbnailId: string;
    projectId?: string;
    filePath: string;
    parameters: Record<string, unknown>;
    size: number;
  };
}

export interface ThumbnailUpdatedEvent extends BaseEvent {
  type: 'thumbnail.updated';
  data: {
    thumbnailId: string;
    changes: Record<string, unknown>;
    previousVersion?: string;
  };
}

export interface ThumbnailDeletedEvent extends BaseEvent {
  type: 'thumbnail.deleted';
  data: {
    thumbnailId: string;
    filePath: string;
    softDelete?: boolean;
  };
}

// Project Events
export interface ProjectCreatedEvent extends BaseEvent {
  type: 'project.created';
  data: {
    projectId: string;
    name: string;
    description?: string;
  };
}

export interface ProjectUpdatedEvent extends BaseEvent {
  type: 'project.updated';
  data: {
    projectId: string;
    changes: Record<string, unknown>;
  };
}

// Analytics Events
export interface AnalyticsTrackingEvent extends BaseEvent {
  type: 'analytics.track';
  data: {
    action: string;
    resource: string;
    resourceId: string;
    properties?: Record<string, unknown>;
  };
}

// User Events
export interface UserActionEvent extends BaseEvent {
  type: 'user.action';
  data: {
    action: string;
    resource: string;
    duration?: number;
    success: boolean;
  };
}

// Union type of all events
export type AppEvent = 
  | ThumbnailCreatedEvent
  | ThumbnailUpdatedEvent
  | ThumbnailDeletedEvent
  | ProjectCreatedEvent
  | ProjectUpdatedEvent
  | AnalyticsTrackingEvent
  | UserActionEvent;

// Event Handler Type
export type EventHandler<T extends AppEvent = AppEvent> = (event: T) => Promise<void> | void;

// Event Subscription Interface
export interface EventSubscription {
  eventType: string;
  handler: EventHandler;
  priority?: number; // Higher number = higher priority
}