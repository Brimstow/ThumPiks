/**
 * useNotifications Hook
 *
 * Fetches user notifications via TanStack Query and subscribes to SSE
 * for real-time updates using the invalidation pattern.
 *
 * HOW IT WORKS:
 * 1. TanStack Query fetches notifications from REST API
 * 2. Native EventSource connects to SSE endpoint
 * 3. When SSE receives "invalidate" event, Query refetches
 * 4. UI automatically updates with fresh data
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authGet, authPatch, authPost, authDelete } from '@/utils/api';
import config from '@/config/environment';
import { useAuth } from '@/contexts/AuthContext';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

export interface UserNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  isRead: boolean;
  readAt: string | null;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  expiresAt: string | null;
}

interface NotificationsResponse {
  notifications: UserNotification[];
  unreadCount: number;
  total: number;
  page: number;
  limit: number;
}

interface UnreadCountResponse {
  unreadCount: number;
}

export interface NotificationFilters {
  isRead?: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// API Functions
// ═══════════════════════════════════════════════════════════════════

async function fetchNotifications(
  page = 1,
  limit = 20,
  filters?: NotificationFilters,
): Promise<NotificationsResponse> {
  let url = `/api/notifications?page=${page}&limit=${limit}`;
  if (typeof filters?.isRead === 'boolean') {
    url += `&isRead=${filters.isRead}`;
  }
  const response = await authGet(url);
  if (!response.ok) {
    throw new Error('Failed to fetch notifications');
  }
  return response.json();
}

async function fetchUnreadCount(): Promise<number> {
  const response = await authGet('/api/notifications/unread-count');
  if (!response.ok) {
    throw new Error('Failed to fetch unread count');
  }
  const data: UnreadCountResponse = await response.json();
  return data.unreadCount;
}

async function markNotificationRead(id: string): Promise<void> {
  const response = await authPatch(`/api/notifications/${id}/read`, {});
  if (!response.ok) {
    throw new Error('Failed to mark notification as read');
  }
}

async function markAllNotificationsRead(): Promise<void> {
  const response = await authPost('/api/notifications/mark-all-read', {});
  if (!response.ok) {
    throw new Error('Failed to mark all notifications as read');
  }
}

async function deleteNotificationApi(id: string): Promise<void> {
  const response = await authDelete(`/api/notifications/${id}`);
  if (!response.ok) {
    throw new Error('Failed to delete notification');
  }
}

async function bulkDeleteNotificationsApi(ids: string[]): Promise<void> {
  const response = await authPost('/api/notifications/bulk-delete', { ids });
  if (!response.ok) {
    throw new Error('Failed to bulk delete notifications');
  }
}

// ═══════════════════════════════════════════════════════════════════
// SSE Connection Hook
// ═══════════════════════════════════════════════════════════════════

function useNotificationSSE(onInvalidate: () => void, isAuthenticated: boolean) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      return;
    }
    let mounted = true;

    const connect = () => {
      if (!mounted) return;

      // Build SSE URL
      const sseUrl = `${config.apiBaseUrl}/api/notifications/stream`;

      // Native EventSource with credentials (sends HttpOnly cookies)
      const es = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = es;

      es.addEventListener('invalidate', () => {
        // SSE tells us to refetch — trigger Query invalidation
        onInvalidate();
      });

      es.addEventListener('reconnect', () => {
        // Server wants us to reconnect (max duration reached)
        es.close();
        reconnectTimeoutRef.current = setTimeout(connect, 1000);
      });

      es.onerror = () => {
        // Connection lost — attempt reconnect after delay
        es.close();
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      mounted = false;
      eventSourceRef.current?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [onInvalidate, isAuthenticated]);
}

// ═══════════════════════════════════════════════════════════════════
// Main Hook
// ═══════════════════════════════════════════════════════════════════

export function useNotifications(page = 1, limit = 20, filters?: NotificationFilters) {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Fetch notifications list (query key includes filter for per-tab caching)
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['notifications', page, limit, filters?.isRead ?? 'all'],
    queryFn: () => fetchNotifications(page, limit, filters),
    staleTime: 30_000, // 30 seconds — SSE will invalidate when needed
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
  });

  // Fetch unread count (separate for badge updates)
  const {
    data: unreadCount,
    refetch: refetchUnreadCount,
  } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: fetchUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: isAuthenticated,
  });

  // Invalidation callback for SSE
  const handleInvalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
  }, [queryClient]);

  // Connect to SSE for real-time updates
  useNotificationSSE(handleInvalidate, isAuthenticated);

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Delete notification
  const deleteMutation = useMutation({
    mutationFn: deleteNotificationApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Bulk delete notifications
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteNotificationsApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  return {
    // Data
    notifications: data?.notifications ?? [],
    unreadCount: unreadCount ?? data?.unreadCount ?? 0,
    total: data?.total ?? 0,
    page: data?.page ?? page,
    limit: data?.limit ?? limit,

    // State
    isLoading,
    error,

    // Actions
    markRead: (id: string) => markReadMutation.mutate(id),
    markAllRead: () => markAllReadMutation.mutate(),
    deleteNotification: (id: string) => deleteMutation.mutate(id),
    bulkDelete: (ids: string[]) => bulkDeleteMutation.mutate(ids),
    refetch,
    refetchUnreadCount,

    // Mutation states
    isMarkingRead: markReadMutation.isPending,
    isMarkingAllRead: markAllReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Format relative time
// ═══════════════════════════════════════════════════════════════════

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? '' : 's'} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════════
// Helper: Map notification type to UI category
// ═══════════════════════════════════════════════════════════════════

export type NotificationCategory = 'credit' | 'billing' | 'security' | 'thumbnail' | 'system';

export function getNotificationCategory(type: string): NotificationCategory {
  if (type.startsWith('credits_') || type === 'credits_low' || type === 'credits_depleted' || type === 'credits_purchased') {
    return 'credit';
  }
  if (type.startsWith('subscription_') || type.includes('billing') || type.includes('payment')) {
    return 'billing';
  }
  if (type.includes('security') || type.includes('login') || type.includes('password')) {
    return 'security';
  }
  if (type.startsWith('thumbnail_')) {
    return 'thumbnail';
  }
  return 'system';
}
