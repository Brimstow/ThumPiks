/**
 * Admin Notification Types
 *
 * Query/response interfaces for admin notification inbox endpoints.
 */

export interface AdminNotificationListQuery {
  page?: number | undefined;
  limit?: number | undefined;
  type?: string | undefined;
  priority?: string | undefined;
  isRead?: boolean | undefined;
}

export interface AdminNotificationRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
}

export interface AdminNotificationListResponse {
  notifications: AdminNotificationRecord[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}
