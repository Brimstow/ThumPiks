/**
 * NotificationsDropdown Component
 * Dropdown panel for viewing and managing notifications
 *
 * UPDATED: Now uses useNotifications hook with real API + SSE
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Tooltip from '../ui/Tooltip';
import {
  Bell,
  CheckCheck,
  X,
  Zap,
  CreditCard,
  Shield,
  Image,
  Settings,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  useNotifications,
  formatRelativeTime,
  getNotificationCategory,
  type NotificationCategory,
} from '@/hooks/useNotifications';

const NotificationsDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Use the real notifications hook
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markRead,
    markAllRead,
    deleteNotification,
    isMarkingAllRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const getNotificationIcon = (category: NotificationCategory) => {
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
  };

  const handleNotificationClick = (notification: {
    id: string;
    isRead: boolean;
    actionUrl: string | null;
  }) => {
    // Mark as read if not already
    if (!notification.isRead) {
      markRead(notification.id);
    }

    // Navigate if action URL exists
    if (notification.actionUrl) {
      setIsOpen(false);
      navigate(notification.actionUrl);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllRead();
  };

  const handleClearNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <Tooltip content="Notifications" side="bottom">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-slate-50 transition-colors"
          aria-label="Notifications"
          aria-expanded={isOpen}
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-900" />
          )}
        </button>
      </Tooltip>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-rose-500/20 text-rose-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                {isMarkingAllRead ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 text-slate-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-slate-400">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <AlertCircle className="w-10 h-10 text-rose-500/60 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Failed to load notifications</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const category = getNotificationCategory(notification.type);
                return (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full flex items-start gap-3 p-4 hover:bg-slate-800/50 transition-colors text-left group ${
                      !notification.isRead ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                      {getNotificationIcon(category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            notification.isRead ? 'text-slate-300' : 'text-slate-100'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <button
                          onClick={(e) => handleClearNotification(notification.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-700 rounded transition-all"
                        >
                          <X className="w-3 h-3 text-slate-500" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/dashboard/notifications');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <span>View all notifications</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
