/**
 * AccountPage Component
 * Comprehensive account management with tabbed sections
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  CreditCard,
  Shield,
  Settings,
  Bell,
  Users,
  Plus,
  RefreshCw,
} from 'lucide-react';
import * as accountService from '../../services/account.service';
import ProfileTab from './ProfileTab';
import BillingTab from './BillingTab';
import SecurityTab from './SecurityTab';
import SettingsTab from './SettingsTab';

// ============================================
// TYPES
// ============================================

type AccountTab =
  | 'profile'
  | 'billing'
  | 'security'
  | 'notifications'
  | 'settings'
  | 'team';

interface NavItem {
  id: AccountTab;
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

// ============================================
// COMPONENT
// ============================================

const AccountPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Determine active tab from URL or default to profile
  const activeTab = (section as AccountTab) || 'profile';

  // Email preferences state (kept inline since notifications tab is small)
  const [emailPreferences, setEmailPreferences] = useState({
    marketingEmails: true,
    productUpdates: true,
    weeklyDigest: false,
    securityAlerts: true,
  });
  const [loadingEmailPrefs, setLoadingEmailPrefs] = useState(false);
  const [emailPrefsMessage, setEmailPrefsMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const navGroups: NavGroup[] = [
    {
      label: 'Account',
      items: [
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" />, description: 'Manage your profile' },
        { id: 'billing', label: 'Billing & Subscription', icon: <CreditCard className="w-4 h-4" />, description: 'Plans & payments' },
        { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" />, description: '2FA & sessions' },
        { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" />, description: 'Manage members' },
      ],
    },
    {
      label: 'Preferences',
      items: [
        { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, description: 'Alert settings' },
        { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" />, description: 'App preferences' },
      ],
    },
  ];

  const handleTabChange = (tab: AccountTab) => {
    navigate(`/dashboard/account/${tab}`);
  };

  // Fetch email preferences when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchEmailPreferences();
    }
  }, [activeTab]);

  const fetchEmailPreferences = async () => {
    setLoadingEmailPrefs(true);
    try {
      const preferences = await accountService.getEmailPreferences();
      setEmailPreferences(preferences);
    } catch (error) {
      console.error('Failed to fetch email preferences:', error);
    } finally {
      setLoadingEmailPrefs(false);
    }
  };

  const updateEmailPreference = async (key: string, value: boolean) => {
    setEmailPreferences(prev => ({ ...prev, [key]: value }));
    setEmailPrefsMessage(null);
    try {
      await accountService.updateEmailPreferences({ [key]: value });
      setEmailPrefsMessage({ type: 'success', text: 'Preferences updated successfully!' });
      setTimeout(() => setEmailPrefsMessage(null), 3000);
    } catch (error) {
      console.error('[EMAIL PREF] Failed:', error);
      setEmailPreferences(prev => ({ ...prev, [key]: !value }));
      setEmailPrefsMessage({ type: 'error', text: 'Failed to update preferences' });
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-1 sm:mb-2">
          Account Settings
        </h1>
        <p className="text-sm sm:text-base text-slate-400">
          Manage your account, billing, and preferences
        </p>
      </div>

      {/* Two-column layout: left sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 lg:items-start">
        {/* Left Sidebar Nav */}
        <nav className="hidden lg:flex flex-col w-56 shrink-0 sticky top-24 gap-6">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 px-3 mb-2">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map(item => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-[#2563ff] text-white'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-500'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Mobile horizontal tabs fallback */}
        <div className="flex lg:hidden gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 overflow-x-auto w-full shrink-0">
          {navGroups
            .flatMap(g => g.items)
            .map(item => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === item.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
        </div>

        {/* Content area */}
        <div className="flex-1 min-w-0 space-y-6">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'billing' && <BillingTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'settings' && <SettingsTab />}

          {/* NOTIFICATIONS TAB (small - kept inline) */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
                <h2 className="text-lg font-semibold text-slate-100">
                  Email Preferences
                </h2>
                {emailPrefsMessage && (
                  <div className={`text-sm px-3 py-1 rounded-lg ${emailPrefsMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {emailPrefsMessage.text}
                  </div>
                )}
              </div>
              {loadingEmailPrefs ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                </div>
              ) : (
                <div className="space-y-6">
                  {[
                    { id: 'marketingEmails', title: 'Marketing Emails', description: 'News, tips, and special offers from our team', enabled: emailPreferences.marketingEmails },
                    { id: 'productUpdates', title: 'Product Updates', description: 'New features, improvements, and product announcements', enabled: emailPreferences.productUpdates },
                    { id: 'weeklyDigest', title: 'Weekly Digest', description: 'Summary of your activity and platform highlights', enabled: emailPreferences.weeklyDigest },
                    { id: 'securityAlerts', title: 'Security Alerts', description: 'Important notifications about your account security', enabled: emailPreferences.securityAlerts },
                  ].map(pref => (
                    <div key={pref.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-200">{pref.title}</p>
                        <p className="text-xs text-slate-500">{pref.description}</p>
                      </div>
                      <button
                        onClick={() => updateEmailPreference(pref.id, !pref.enabled)}
                        className={`w-12 h-6 rounded-full relative transition-colors ${pref.enabled ? 'bg-blue-600' : 'bg-slate-700'}`}
                      >
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pref.enabled ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TEAM TAB (small - kept inline) */}
          {activeTab === 'team' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">Team Members</h2>
                  <p className="text-sm text-slate-400">Manage your team and collaboration settings</p>
                </div>
                <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" />Invite Member
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200">{user?.name || 'You'}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Owner</span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 sm:p-6 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-center">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-2">No team members yet</p>
                <p className="text-xs text-slate-500">Invite team members to collaborate on projects</p>
              </div>
            </div>
          )}
        </div>
        {/* end content area */}
      </div>
      {/* end two-column layout */}
    </div>
  );
};

export default AccountPage;
