// Event Types for Thumbnail Maker Event-Driven Architecture
// This defines all events that can occur in our system

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, any>;
}

// Thumbnail Events
export interface ThumbnailCreatedEvent extends BaseEvent {
  type: 'thumbnail.created';
  data: {
    thumbnailId: string;
    projectId?: string;
    filePath: string;
    parameters: Record<string, any>;
    size: number;
  };
}

export interface ThumbnailUpdatedEvent extends BaseEvent {
  type: 'thumbnail.updated';
  data: {
    thumbnailId: string;
    changes: Record<string, any>;
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
    changes: Record<string, any>;
  };
}

// Social Sharing Events
export interface SocialShareRequestedEvent extends BaseEvent {
  type: 'social.share.requested';
  data: {
    thumbnailId: string;
    platforms: string[];
    shareId: string;
  };
}

export interface SocialShareCompletedEvent extends BaseEvent {
  type: 'social.share.completed';
  data: {
    shareId: string;
    thumbnailId: string;
    platform: string;
    success: boolean;
    shareUrl?: string;
    error?: string;
  };
}

// Analytics Events
export interface AnalyticsTrackingEvent extends BaseEvent {
  type: 'analytics.track';
  data: {
    action: string;
    resource: string;
    resourceId: string;
    properties?: Record<string, any>;
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
  | SocialShareRequestedEvent
  | SocialShareCompletedEvent
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