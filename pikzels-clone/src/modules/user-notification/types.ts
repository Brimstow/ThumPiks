/**
 * User Notification Types
 *
 * Types and constants for per-user notification system.
 */

export const USER_NOTIFICATION_TYPES = [
  'thumbnail_ready',
  'thumbnail_failed',
  'credits_low',
  'credits_depleted',
  'billing_success',
  'billing_failed',
  'subscription_changed',
  'security_login',
  'security_password_changed',
  'system',
] as const;

export type UserNotificationType = (typeof USER_NOTIFICATION_TYPES)[number];

export interface CreateUserNotificationInput {
  userId: string;
  type: UserNotificationType | string;
  title: string;
  message: string;
  priority?: string | undefined;
  actionUrl?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  expiresAt?: Date | undefined;
}

export interface UserNotificationRecord {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  readAt: Date | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  expiresAt: Date | null;
}

export interface UserNotificationListQuery {
  page?: number | undefined;
  limit?: number | undefined;
  type?: string | undefined;
  isRead?: boolean | undefined;
}

export interface UserNotificationListResponse {
  notifications: UserNotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}
