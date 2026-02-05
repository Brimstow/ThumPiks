/**
 * AccountDropdown Component
 * Dropdown menu for account-related actions accessible from the header
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  CreditCard,
  Shield,
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Crown,
  Bell,
  HelpCircle,
  Download,
  Users,
} from 'lucide-react';

interface AccountDropdownProps {
  className?: string;
}

const AccountDropdown: React.FC<AccountDropdownProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user, logout, isAuthenticated, loading } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowLogoutConfirm(false);
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
        setShowLogoutConfirm(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleLogoutConfirm = () => {
    setIsOpen(false);
    setShowLogoutConfirm(false);
    logout();
  };

  const menuItems = [
    {
      group: 'Account',
      items: [
        { icon: User, label: 'Profile', path: '/dashboard/account/profile', description: 'Manage your profile' },
        { icon: CreditCard, label: 'Billing & Subscription', path: '/dashboard/account/billing', description: 'Plans & payments' },
        { icon: Shield, label: 'Security', path: '/dashboard/account/security', description: '2FA & sessions' },
      ],
    },
    {
      group: 'Preferences',
      items: [
        { icon: Bell, label: 'Notifications', path: '/dashboard/account/notifications', description: 'Alert settings' },
        { icon: Settings, label: 'Settings', path: '/dashboard/account/settings', description: 'App preferences' },
        { icon: Users, label: 'Team', path: '/dashboard/account/team', description: 'Collaboration' },
      ],
    },
    {
      group: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', path: '/dashboard/help', description: 'Get support' },
        { icon: Download, label: 'Export Data', path: '/dashboard/account/export', description: 'Download your data' },
      ],
    },
  ];

  // Show loading state while checking authentication
  if (loading) {
    return (
      <button
        disabled
        className={`p-2 rounded-lg text-slate-600 cursor-not-allowed ${className}`}
        aria-label="Loading..."
      >
        <User className="w-5 h-5" />
      </button>
    );
  }

  // Only show login button if NOT loading and NOT authenticated
  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className={`p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-all ${className}`}
        aria-label="Sign in"
      >
        <User className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button - matches original header icon style */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex p-2 rounded-lg hover:bg-slate-800/80 text-slate-400 hover:text-slate-50 transition-all"
        aria-label="Account menu"
        aria-expanded={isOpen}
      >
        <User className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold">
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">
                <Crown className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Pro</span>
              </div>
            </div>
            
            {/* Credits Display */}
            <div className="mt-3 flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-slate-300">Credits remaining</span>
              </div>
              <span className="text-sm font-semibold text-slate-100">90 / 100</span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2 max-h-[400px] overflow-y-auto">
            {menuItems.map((group, groupIndex) => (
              <div key={group.group}>
                {groupIndex > 0 && <div className="my-2 mx-4 border-t border-slate-800" />}
                <div className="px-4 py-1.5">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    {group.group}
                  </span>
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-800/70 transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-700 transition-colors">
                      <item.icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                        {item.label}
                      </p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Logout Section */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/50">
            {showLogoutConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400 flex-1">Are you sure?</span>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogoutConfirm}
                  className="px-3 py-1.5 text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors group"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span className="text-sm font-medium">Log out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountDropdown;
