/**
 * NotificationsPage Component
 *
 * Dedicated full-page view for viewing and managing all notifications.
 * Features: filter tabs (All/Unread/Read), pagination, bulk selection + delete.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  X,
  Zap,
  CreditCard,
  Shield,
  Image,
  Settings,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  SquareCheck,
} from 'lucide-react';
import {
  useNotifications,
  formatRelativeTime,
  getNotificationCategory,
  type NotificationCategory,
  type NotificationFilters,
} from '@/hooks/useNotifications';

// ═══════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════

type TabId = 'all' | 'unread' | 'read';

interface Tab {
  id: TabId;
  label: string;
  getCount: (total: number, unreadCount: number) => number;
}

const TABS: Tab[] = [
  { id: 'all', label: 'All', getCount: (total) => total },
  { id: 'unread', label: 'Unread', getCount: (_total, unread) => unread },
  { id: 'read', label: 'Read', getCount: (total, unread) => total - unread },
];

const ITEMS_PER_PAGE = 20;

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

function tabToFilter(tab: TabId): NotificationFilters | undefined {
  if (tab === 'unread') return { isRead: false };
  if (tab === 'read') return { isRead: true };
  return undefined;
}

function getNotificationIcon(category: NotificationCategory) {
  switch (category) {
    case 'credit':
      return <Zap className="w-4 h-4 text-yellow-400" />;
    case 'billing':
      return <CreditCard className="w-4 h-4 text-green-400" />;
    case 'security':
      return <Shield className="w-4 h-4 text-blue-400" />;
    case 'thumbnail':
      return <Image className="w-4 h-4 text-purple-400" />;
    case 'system':
    default:
      return <Settings className="w-4 h-4 text-slate-400" />;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();

  // Local state
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Derive filter from active tab
  const filters = tabToFilter(activeTab);

  // Fetch notifications with current filters + pagination
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    error,
    markRead,
    markAllRead,
    deleteNotification,
    bulkDelete,
    isMarkingAllRead,
    isBulkDeleting,
  } = useNotifications(currentPage, ITEMS_PER_PAGE, filters);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Reset page and selection when switching tabs
  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSelectedIds(new Set());
    setBulkSelectMode(false);
  }, []);

  // Auto-fix empty page after bulk delete
  useEffect(() => {
    if (!isLoading && notifications.length === 0 && currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  }, [isLoading, notifications.length, currentPage]);

  // Escape exits bulk select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && bulkSelectMode) {
        setBulkSelectMode(false);
        setSelectedIds(new Set());
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [bulkSelectMode]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelectedIds(new Set(notifications.map((n) => n.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
    setBulkSelectMode(false);
  };

  // Notification click — mark read + navigate if actionUrl
  const handleNotificationClick = (notification: {
    id: string;
    isRead: boolean;
    actionUrl: string | null;
  }) => {
    if (bulkSelectMode) {
      toggleSelection(notification.id);
      return;
    }
    if (!notification.isRead) {
      markRead(notification.id);
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  // Pagination range text
  const rangeStart = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, total);

  return (
    <div className="min-h-[60vh]">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold text-slate-100 tracking-tight">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="px-2.5 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-400 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!bulkSelectMode && notifications.length > 0 && (
            <button
              onClick={() => setBulkSelectMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
            >
              <SquareCheck className="w-4 h-4" />
              Select
            </button>
          )}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllRead()}
              disabled={isMarkingAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isMarkingAllRead ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-800 mb-6">
        {TABS.map((tab) => {
          const count = tab.getCount(total, unreadCount);
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.label} ({count})
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk Action Toolbar */}
      {bulkSelectMode && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-300">
              {selectedIds.size} selected
            </span>
            <button
              onClick={selectAllOnPage}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Select all on page
            </button>
            <button
              onClick={deselectAll}
              className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Deselect all
            </button>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {isBulkDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                Delete selected
              </button>
            )}
            <button
              onClick={() => {
                setBulkSelectMode(false);
                setSelectedIds(new Set());
              }}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-slate-500 animate-spin mb-3" />
          <p className="text-sm text-slate-400">Loading notifications...</p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-10 h-10 text-rose-500/60 mb-3" />
          <p className="text-sm text-slate-400 mb-4">Failed to load notifications</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty States */}
      {!isLoading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-800 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
            {activeTab === 'unread' ? (
              <CheckCheck className="w-8 h-8 text-slate-500" />
            ) : (
              <Bell className="w-8 h-8 text-slate-500" />
            )}
          </div>
          <h3 className="text-lg font-medium text-slate-200 mb-2">
            {activeTab === 'all' && 'No notifications yet'}
            {activeTab === 'unread' && 'All caught up!'}
            {activeTab === 'read' && 'No read notifications'}
          </h3>
          <p className="text-sm text-slate-400 max-w-md text-center">
            {activeTab === 'all' &&
              'Notifications about your thumbnails, credits, and account will appear here.'}
            {activeTab === 'unread' &&
              "You've read all your notifications."}
            {activeTab === 'read' &&
              'Notifications you\'ve read will appear here.'}
          </p>
        </div>
      )}

      {/* Notification List */}
      {!isLoading && !error && notifications.length > 0 && (
        <div className="flex flex-col gap-1">
          {notifications.map((notification) => {
            const category = getNotificationCategory(notification.type);
            const isSelected = selectedIds.has(notification.id);

            return (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl transition-colors text-left group ${
                  !notification.isRead
                    ? 'bg-slate-800/30 hover:bg-slate-800/50'
                    : 'hover:bg-slate-800/30'
                } ${isSelected ? 'ring-1 ring-blue-500/50 bg-blue-500/5' : ''}`}
              >
                {/* Checkbox (bulk mode) */}
                {bulkSelectMode && (
                  <div className="flex items-center pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(notification.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                  </div>
                )}

                {/* Icon */}
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  {getNotificationIcon(category)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p
                        className={`text-sm truncate ${
                          notification.isRead
                            ? 'font-medium text-slate-300'
                            : 'font-semibold text-slate-100'
                        }`}
                      >
                        {notification.title}
                      </p>
                      {notification.priority === 'high' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-orange-500/20 text-orange-400 rounded shrink-0">
                          HIGH
                        </span>
                      )}
                    </div>

                    {/* Hover actions */}
                    {!bulkSelectMode && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markRead(notification.id);
                          }}
                          className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
                          title={notification.isRead ? 'Already read' : 'Mark as read'}
                        >
                          {notification.isRead ? (
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                          className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
                          title="Delete"
                        >
                          <X className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    {formatRelativeTime(notification.createdAt)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.isRead && !bulkSelectMode && (
                  <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !error && total > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-800">
          <p className="text-sm text-slate-400">
            Showing {rangeStart}-{rangeEnd} of {total} notifications
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-sm text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
