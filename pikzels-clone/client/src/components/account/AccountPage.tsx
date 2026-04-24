/**
 * AccountPage Component
 * Comprehensive account management with tabbed sections
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOnboarding } from '../../features/onboarding';
import { useDarkMode } from '../../hooks/useDarkMode';
import { usePricingData } from '../../hooks/usePricingData';
import type { PricingPlan } from '../../hooks/usePricingData';
import { authFetch, authPost } from '../../utils/api';
import * as accountService from '../../services/account.service';
import type {
  ProfileData,
  SubscriptionTier,
  TwoFactorStatus,
  ActiveSession,
  LoginHistoryEntry,
  EmailPreferences,
  UserSettings,
  TeamMember,
} from '../../services/account.service';
import {
  User,
  CreditCard,
  Shield,
  Settings,
  Bell,
  Users,
  Download,
  Trash2,
  Camera,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  ChevronRight,
  Crown,
  Zap,
  Star,
  RefreshCw,
  Mail,
  Lock,
  Key,
  LogOut,
  Plus,
  X,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';

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

// ---------------------------------------------------------------------------
// Helper: derive a human-readable feature list from a PricingPlan object.
// Keeps the billing tab display in sync with the backend config automatically.
// ---------------------------------------------------------------------------
function buildFeatureStrings(plan: PricingPlan): string[] {
  const f = plan.features;
  const entries: string[] = [];

  // Headline credit count (use displayThumbnails for user-friendly number)
  entries.push(`${plan.displayThumbnails} AI thumbnails/month`);

  // Resolution
  if (f.resolution) entries.push(`${f.resolution} resolution`);

  // Watermark
  if (f.watermark) {
    entries.push(
      f.watermarkFreeExports === 1
        ? '1 watermark-free export/month'
        : 'Includes watermark'
    );
  } else {
    entries.push('No watermark');
  }

  // Face swap
  if (typeof f.faceSwap === 'number') {
    entries.push(
      f.faceSwap === -1
        ? 'Unlimited face swaps'
        : `Face swap (${f.faceSwap}/month)`
    );
  }

  // Analytics
  if (f.analytics) entries.push('Analytics & CTR tracking');

  // A/B testing
  if (f.abTesting === true) {
    entries.push('Unlimited A/B testing');
  } else if (typeof f.abTesting === 'number' && f.abTesting > 0) {
    entries.push(`A/B testing (${f.abTesting} variants)`);
  }

  // Support
  if (f.support && f.support !== 'Community')
    entries.push(`${f.support} support`);

  // Extras
  if (f.customTemplates) entries.push('Custom templates');
  if (f.earlyAccess) entries.push('Early access to new features');
  if (f.privateModeDefault) entries.push('All generations private');

  return entries;
}

const AccountPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode: colorMode, setMode: setColorMode } = useDarkMode();
  const { prefs, setQuickEditOverlayEnabled, resetOnboarding } =
    useOnboarding();

  // Determine active tab from URL or default to profile
  const activeTab = (section as AccountTab) || 'profile';

  // Profile state - Real API data
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionTier | null>(
    null
  );
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // Security state - Real API data
  const [twoFactorStatus, setTwoFactorStatus] =
    useState<TwoFactorStatus | null>(null);
  const [loadingSecurity, setLoadingSecurity] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Data export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Billing state
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);

  // Email preferences state
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
        {
          id: 'profile',
          label: 'Profile',
          icon: <User className="w-4 h-4" />,
          description: 'Manage your profile',
        },
        {
          id: 'billing',
          label: 'Billing & Subscription',
          icon: <CreditCard className="w-4 h-4" />,
          description: 'Plans & payments',
        },
        {
          id: 'security',
          label: 'Security',
          icon: <Shield className="w-4 h-4" />,
          description: '2FA & sessions',
        },
        {
          id: 'team',
          label: 'Team',
          icon: <Users className="w-4 h-4" />,
          description: 'Manage members',
        },
      ],
    },
    {
      label: 'Preferences',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell className="w-4 h-4" />,
          description: 'Alert settings',
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: <Settings className="w-4 h-4" />,
          description: 'App preferences',
        },
      ],
    },
  ];

  const handleTabChange = (tab: AccountTab) => {
    navigate(`/dashboard/account/${tab}`);
  };

  // Fetch billing data when billing tab is active
  useEffect(() => {
    if (activeTab === 'billing') {
      fetchBillingData();
      fetchCurrentSubscription();
    } else if (activeTab === 'notifications') {
      fetchEmailPreferences();
    }
  }, [activeTab]);

  const handleProfileChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!profileData) return;
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    if (!profileData) return;

    setIsProfileSaving(true);
    setProfileMessage(null);

    try {
      await accountService.updateProfile({
        name: profileData.name,
        username: profileData.username,
      });
      setProfileMessage({
        type: 'success',
        text: 'Profile updated successfully!',
      });
      // Refresh profile data
      fetchProfileData();
    } catch (error) {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return;
    }

    setIsPasswordSaving(true);

    try {
      const response = await authFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({
          // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
          currentPassword: passwordData.currentPassword,
          // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setProfileMessage({
          type: 'success',
          text: 'Password updated successfully!',
        });
      } else {
        const data = await response.json();
        setProfileMessage({
          type: 'error',
          text: data.error || 'Failed to update password',
        });
      }
    } catch {
      setProfileMessage({
        type: 'error',
        text: 'Network error. Please try again.',
      });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleDataExport = async () => {
    setIsExporting(true);
    setExportMessage(null);

    try {
      const response = await authPost('/api/user/export', {});

      if (response.ok) {
        const data = await response.json();
        // Create a downloadable JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thumpiks-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportMessage({
          type: 'success',
          text: 'Your data has been exported successfully!',
        });
      } else {
        const errorData = await response.json();
        if (response.status === 429) {
          setExportMessage({
            type: 'error',
            text:
              errorData.message || 'You can only export once every 24 hours.',
          });
        } else {
          setExportMessage({
            type: 'error',
            text:
              errorData.message || 'Failed to export data. Please try again.',
          });
        }
      }
    } catch {
      setExportMessage({
        type: 'error',
        text: 'Network error. Please try again later.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    try {
      const response = await authFetch('/api/user/account', {
        method: 'DELETE',
      });

      if (response.ok) {
        logout();
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to delete account' });
    }
  };

  const fetchBillingData = async () => {
    if (activeTab !== 'billing') return;

    setLoadingBilling(true);
    try {
      // Fetch payment methods
      const pmResponse = await authFetch('/api/billing/payment-methods');
      if (pmResponse.ok) {
        const pmData = await pmResponse.json();
        setPaymentMethods(pmData.paymentMethods || []);
      }

      // Fetch billing history
      const historyResponse = await authFetch('/api/billing/history');
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setBillingHistory(historyData.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setLoadingBilling(false);
    }
  };

  const handleManagePaymentMethods = async () => {
    try {
      const response = await authPost('/api/billing/portal', {
        returnUrl: window.location.href,
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Failed to create billing portal session:', error);
    }
  };

  const fetchEmailPreferences = async () => {
    if (activeTab !== 'notifications') return;

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

  // ---------------------------------------------------------------------------
  // Plan metadata — sourced from the backend via usePricingData() (DRY).
  // The hook is module-level cached, so this adds zero extra network requests
  // if PricingPage or DashboardLayout already fetched it this session.
  // ---------------------------------------------------------------------------
  const { plans: pricingPlans } = usePricingData();

  /** Look up a plan from the pricing API by its ID (e.g. 'free', 'pro'). */
  const findPlan = (planType: string): PricingPlan | undefined =>
    pricingPlans.find(p => p.id === planType);

  const getPlanDisplayName = (planType: string): string => {
    return findPlan(planType)?.name ?? planType;
  };

  const getPlanPrice = (planType: string, billingCycle: string): number => {
    const plan = findPlan(planType);
    if (!plan) return 0;
    return billingCycle === 'annual'
      ? Math.round(plan.annualPrice / 12) // show per-month equivalent
      : plan.monthlyPrice;
  };

  const getPlanFeatures = (planType: string): string[] => {
    const plan = findPlan(planType);
    if (!plan) return ['AI thumbnail generation'];
    return buildFeatureStrings(plan);
  };

  const updateEmailPreference = async (key: string, value: boolean) => {
    console.log('[EMAIL PREF] Toggling:', key, 'to', value);

    // Optimistic update
    setEmailPreferences(prev => ({ ...prev, [key]: value }));
    setEmailPrefsMessage(null);

    try {
      await accountService.updateEmailPreferences({ [key]: value });
      setEmailPrefsMessage({
        type: 'success',
        text: 'Preferences updated successfully!',
      });
      setTimeout(() => setEmailPrefsMessage(null), 3000);
    } catch (error) {
      console.error('[EMAIL PREF] Failed:', error);
      // Revert on failure
      setEmailPreferences(prev => ({ ...prev, [key]: !value }));
      setEmailPrefsMessage({
        type: 'error',
        text: 'Failed to update preferences',
      });
    }
  };

  const fetchCurrentSubscription = async () => {
    if (activeTab !== 'billing') return;

    try {
      const response = await authFetch('/api/subscription/current');
      if (response.ok) {
        const data = await response.json();
        setCurrentSubscription(data);
      }
    } catch (error) {
      console.error('Failed to fetch current subscription:', error);
    }
  };

  // Fallback plan data if no real subscription — uses API-sourced free plan
  const freePlan = findPlan('free');
  const subscriptionPlan = currentSubscription
    ? {
        name: getPlanDisplayName(currentSubscription.planType),
        price: getPlanPrice(
          currentSubscription.planType,
          currentSubscription.billingCycle || 'monthly'
        ),
        billingCycle: currentSubscription.billingCycle || 'monthly',
        credits:
          currentSubscription.creditsBalance + currentSubscription.creditsUsed,
        creditsUsed: currentSubscription.creditsUsed,
        renewalDate: new Date(currentSubscription.periodEnd)
          .toISOString()
          .split('T')[0],
        features: getPlanFeatures(currentSubscription.planType),
      }
    : {
        name: freePlan?.name ?? 'Free',
        price: 0,
        billingCycle: 'monthly',
        credits: freePlan?.credits ?? 150,
        creditsUsed: 0,
        renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        features: freePlan
          ? buildFeatureStrings(freePlan)
          : ['AI thumbnail generation', '720p resolution'],
      };

  const invoices = [
    { id: 'INV-001', date: '2025-01-27', amount: 29, status: 'paid' },
    { id: 'INV-002', date: '2024-12-27', amount: 29, status: 'paid' },
    { id: 'INV-003', date: '2024-11-27', amount: 29, status: 'paid' },
  ];

  // ============================================
  // API DATA FETCHING
  // ============================================

  // Fetch profile data
  useEffect(() => {
    if (activeTab === 'profile') {
      fetchProfileData();
      fetchSubscriptionData();
    }
  }, [activeTab]);

  // Fetch security data
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityData();
    }
  }, [activeTab]);

  const fetchProfileData = async () => {
    setLoadingProfile(true);
    try {
      const data = await accountService.getProfile();
      setProfileData(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchSubscriptionData = async () => {
    setLoadingSubscription(true);
    try {
      const data = await accountService.getSubscription();
      setSubscription(data);
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const fetchSecurityData = async () => {
    setLoadingSecurity(true);
    try {
      const [twoFA, sessions, history] = await Promise.all([
        accountService.get2FAStatus(),
        accountService.getActiveSessions(),
        accountService.getLoginHistory(20),
      ]);
      setTwoFactorStatus(twoFA);
      setActiveSessions(sessions);
      setLoginHistory(history);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoadingSecurity(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

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
                      <span
                        className={isActive ? 'text-white' : 'text-slate-500'}
                      >
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
          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <>
              {loadingProfile ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : profileData ? (
                <>
                  {/* Profile Picture Section */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">
                      Profile Picture
                    </h2>
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold overflow-hidden">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : profileData.avatarUrl ? (
                            <img
                              src={profileData.avatarUrl}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            profileData.name?.charAt(0)?.toUpperCase() || 'U'
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors">
                          <Camera className="w-4 h-4 text-white" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                          />
                        </label>
                      </div>
                      <div>
                        <p className="text-sm text-slate-400 mb-2">
                          Upload a new avatar. JPG, PNG or GIF. Max 5MB.
                        </p>
                        <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                          Remove photo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Profile Info Section */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">
                      Personal Information
                    </h2>

                    {profileMessage && (
                      <div
                        className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                          profileMessage.type === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {profileMessage.type === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {profileMessage.text}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={handleProfileChange}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Email
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            name="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-24"
                          />
                          {profileData.emailVerified && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                              Verified
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          name="username"
                          value={profileData.username}
                          onChange={handleProfileChange}
                          placeholder="@username"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleProfileSave}
                        disabled={isProfileSaving}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProfileSaving && (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        )}
                        Save Changes
                      </button>
                    </div>
                  </div>

                  {/* Change Password Section */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">
                      Change Password
                    </h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={passwordData.currentPassword}
                            onChange={e =>
                              setPasswordData({
                                ...passwordData,
                                currentPassword: e.target.value,
                              })
                            } // secretlint-disable-line @secretlint/secretlint-rule-pattern
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                current: !showPasswords.current,
                              })
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          >
                            {showPasswords.current ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.new ? 'text' : 'password'}
                            value={passwordData.newPassword}
                            onChange={e =>
                              setPasswordData({
                                ...passwordData,
                                newPassword: e.target.value,
                              })
                            } // secretlint-disable-line @secretlint/secretlint-rule-pattern
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                new: !showPasswords.new,
                              })
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          >
                            {showPasswords.new ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? 'text' : 'password'}
                            value={passwordData.confirmPassword}
                            onChange={e =>
                              setPasswordData({
                                ...passwordData,
                                confirmPassword: e.target.value,
                              })
                            } // secretlint-disable-line @secretlint/secretlint-rule-pattern
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords({
                                ...showPasswords,
                                confirm: !showPasswords.confirm,
                              })
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {passwordData.confirmPassword &&
                          passwordData.newPassword !==
                            passwordData.confirmPassword && (
                            <p className="mt-1 text-sm text-red-400">
                              Passwords do not match
                            </p>
                          )}
                      </div>
                      <button
                        onClick={handlePasswordChange}
                        disabled={
                          isPasswordSaving ||
                          !passwordData.currentPassword ||
                          !passwordData.newPassword ||
                          passwordData.newPassword !==
                            passwordData.confirmPassword
                        }
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isPasswordSaving && (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        )}
                        Update Password
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  Failed to load profile data
                </div>
              )}
            </>
          )}

          {/* BILLING TAB */}
          {activeTab === 'billing' && (
            <>
              {/* Current Plan */}
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">
                        Current Plan
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {subscriptionPlan.name}
                    </h2>
                    <p className="text-slate-400">
                      ${subscriptionPlan.price}/month • Renews on{' '}
                      {subscriptionPlan.renewalDate}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => navigate('/dashboard/pricing')}
                      className="px-3 sm:px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Change Plan
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/credits')}
                      className="px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      <span className="hidden sm:inline">Manage</span> Credits
                    </button>
                  </div>
                </div>

                {/* Credits Usage - Click to view details */}
                <button
                  onClick={() => navigate('/dashboard/credits')}
                  className="w-full bg-slate-900/50 rounded-xl p-4 hover:bg-slate-800/50 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-slate-300">
                        Credits Usage
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">
                        {subscriptionPlan.creditsUsed} /{' '}
                        {subscriptionPlan.credits} used
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{
                        width: `${(subscriptionPlan.creditsUsed / subscriptionPlan.credits) * 100}%`,
                      }}
                    />
                  </div>
                </button>

                {/* Features */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {subscriptionPlan.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-sm text-slate-300"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <h2 className="text-lg font-semibold text-slate-100">
                    Payment Methods
                  </h2>
                  <button
                    onClick={handleManagePaymentMethods}
                    className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Manage Payment Methods</span>
                    <span className="sm:hidden">Manage</span>
                  </button>
                </div>

                {loadingBilling ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                  </div>
                ) : paymentMethods.length > 0 ? (
                  <div className="space-y-3">
                    {paymentMethods.map(pm => (
                      <div
                        key={pm.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-12 h-8 rounded flex items-center justify-center ${
                              pm.card.brand === 'visa'
                                ? 'bg-gradient-to-r from-blue-600 to-blue-400'
                                : pm.card.brand === 'mastercard'
                                  ? 'bg-gradient-to-r from-red-600 to-orange-500'
                                  : 'bg-gradient-to-r from-slate-600 to-slate-500'
                            }`}
                          >
                            <span className="text-white text-xs font-bold uppercase">
                              {pm.card.brand}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-200">
                              •••• •••• •••• {pm.card.last4}
                            </p>
                            <p className="text-xs text-slate-500">
                              Expires {pm.card.expMonth}/{pm.card.expYear}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {pm.isDefault && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                              Default
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm mb-4">
                      No payment methods on file
                    </p>
                    <button
                      onClick={handleManagePaymentMethods}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Add Payment Method
                    </button>
                  </div>
                )}
              </div>

              {/* Billing History */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-4">
                  Billing History
                </h2>
                {loadingBilling ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-500" />
                  </div>
                ) : billingHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">
                            Description
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">
                            Date
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">
                            Amount
                          </th>
                          <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">
                            Status
                          </th>
                          <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map(item => (
                          <tr
                            key={item.id}
                            className="border-b border-slate-800/50"
                          >
                            <td className="py-3 text-sm text-slate-200">
                              {item.description}
                            </td>
                            <td className="py-3 text-sm text-slate-400">
                              {new Date(item.date).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-sm text-slate-200">
                              ${(item.amount / 100).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <span
                                className={`text-xs px-2 py-1 rounded-full capitalize ${
                                  item.status === 'paid' ||
                                  item.status === 'completed'
                                    ? 'bg-green-500/20 text-green-400'
                                    : item.status === 'pending'
                                      ? 'bg-yellow-500/20 text-yellow-400'
                                      : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              {item.invoiceUrl && (
                                <a
                                  href={item.invoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-400 hover:text-blue-300"
                                >
                                  Download
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Download className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-400 text-sm">
                      No billing history yet
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <>
              {loadingSecurity ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
                </div>
              ) : (
                <>
                  {/* Two-Factor Authentication */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                          <h2 className="text-lg font-semibold text-slate-100">
                            Two-Factor Authentication
                          </h2>
                          <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs font-medium rounded-full border border-amber-500/30">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 mb-4">
                          Add an extra layer of security to your account by
                          requiring a verification code.
                        </p>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${twoFactorStatus?.enabled ? 'bg-green-400' : 'bg-slate-600'}`}
                          />
                          <span
                            className={`text-sm ${twoFactorStatus?.enabled ? 'text-green-400' : 'text-slate-500'}`}
                          >
                            {twoFactorStatus?.enabled
                              ? 'Enabled'
                              : 'Not enabled'}
                          </span>
                        </div>
                      </div>
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-slate-700 text-slate-400 cursor-not-allowed"
                      >
                        Enable
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">
                      We're working on bringing 2FA to ThumPiks. Stay tuned for
                      updates.
                    </p>
                  </div>

                  {/* Active Sessions */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <h2 className="text-lg font-semibold text-slate-100">
                        Active Sessions
                      </h2>
                      <button className="text-sm text-red-400 hover:text-red-300 transition-colors whitespace-nowrap">
                        Log out all devices
                      </button>
                    </div>

                    {activeSessions.length > 0 ? (
                      <div className="space-y-3">
                        {activeSessions.map(session => (
                          <div
                            key={session.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-800/50 rounded-xl border border-slate-700"
                          >
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                                {session.device.includes('iPhone') ||
                                session.device.includes('Android') ? (
                                  <Smartphone className="w-5 h-5" />
                                ) : (
                                  <Monitor className="w-5 h-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-200">
                                    {session.device}
                                  </p>
                                  {session.isCurrent && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                  <Globe className="w-3 h-3" />
                                  {session.location}
                                  <span>•</span>
                                  <Clock className="w-3 h-3" />
                                  {new Date(
                                    session.lastActivity
                                  ).toLocaleString()}
                                </div>
                              </div>
                            </div>
                            {!session.isCurrent && (
                              <button
                                onClick={() =>
                                  accountService
                                    .terminateSession(session.id)
                                    .then(fetchSecurityData)
                                }
                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        No active sessions found
                      </div>
                    )}
                  </div>

                  {/* Login History */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-100 mb-4">
                      Recent Login Activity
                    </h2>
                    {loginHistory.length > 0 ? (
                      <div className="space-y-3">
                        {loginHistory.map(login => (
                          <div
                            key={login.id}
                            className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  login.success
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {login.success ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <p className="text-sm text-slate-200">
                                  {login.device}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {login.ipAddress} • {login.location}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(login.timestamp).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        No login history available
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
                <h2 className="text-lg font-semibold text-slate-100">
                  Email Preferences
                </h2>
                {emailPrefsMessage && (
                  <div
                    className={`text-sm px-3 py-1 rounded-lg ${
                      emailPrefsMessage.type === 'success'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
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
                    {
                      id: 'marketingEmails',
                      title: 'Marketing Emails',
                      description:
                        'News, tips, and special offers from our team',
                      enabled: emailPreferences.marketingEmails,
                    },
                    {
                      id: 'productUpdates',
                      title: 'Product Updates',
                      description:
                        'New features, improvements, and product announcements',
                      enabled: emailPreferences.productUpdates,
                    },
                    {
                      id: 'weeklyDigest',
                      title: 'Weekly Digest',
                      description:
                        'Summary of your activity and platform highlights',
                      enabled: emailPreferences.weeklyDigest,
                    },
                    {
                      id: 'securityAlerts',
                      title: 'Security Alerts',
                      description:
                        'Important notifications about your account security',
                      enabled: emailPreferences.securityAlerts,
                    },
                  ].map(pref => (
                    <div
                      key={pref.id}
                      className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {pref.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {pref.description}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          updateEmailPreference(pref.id, !pref.enabled)
                        }
                        className={`w-12 h-6 rounded-full relative transition-colors ${
                          pref.enabled ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            pref.enabled ? 'right-1' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <>
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">
                  App Preferences
                </h2>

                <div className="space-y-6">
                  {/* Appearance */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-3">
                      Appearance
                    </label>
                    <div className="flex gap-2">
                      {[
                        {
                          value: 'light' as const,
                          label: 'Light',
                          icon: <Sun className="w-4 h-4" />,
                        },
                        {
                          value: 'dark' as const,
                          label: 'Dark',
                          icon: <Moon className="w-4 h-4" />,
                        },
                        {
                          value: 'system' as const,
                          label: 'System',
                          icon: <Monitor className="w-4 h-4" />,
                        },
                      ].map(({ value, label, icon }) => {
                        const active = colorMode === value;
                        return (
                          <button
                            key={value}
                            onClick={() => setColorMode(value)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                              active
                                ? 'border-blue-500 bg-blue-500/10 text-slate-100'
                                : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                            }`}
                          >
                            {icon}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-slate-800" />
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Language
                    </label>
                    <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
                      <option>English (US)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Timezone
                    </label>
                    <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
                      <option>Eastern Time (ET)</option>
                      <option>Pacific Time (PT)</option>
                      <option>Central European Time (CET)</option>
                      <option>UTC</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Thumbnail Defaults */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">
                  Thumbnail Defaults
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Default Width (px)
                      </label>
                      <input
                        type="number"
                        defaultValue={1280}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Default Height (px)
                      </label>
                      <input
                        type="number"
                        defaultValue={720}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Default Style
                    </label>
                    <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
                      <option value="bold">Bold</option>
                      <option value="minimalist">Minimalist</option>
                      <option value="dramatic">Dramatic</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Privacy */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">
                  Privacy
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      id: 'profileVisible',
                      title: 'Profile Visibility',
                      description: 'Make your profile visible to other users',
                    },
                    {
                      id: 'thumbnailsPublic',
                      title: 'Thumbnails Public by Default',
                      description: 'Make new thumbnails public when created',
                    },
                  ].map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-200">
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>
                      <button className="w-12 h-6 rounded-full relative transition-colors bg-slate-700">
                        <span className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-all" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Onboarding Preferences */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-6">
                  Onboarding Preferences
                </h2>

                <div className="space-y-6">
                  {/* Quick Edit Overlay Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-slate-200">
                        Show Quick Edit Overlay
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">
                        Display the Quick Edit options overlay when you log in
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setQuickEditOverlayEnabled(
                          !prefs.quickEditOverlayEnabled
                        )
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        prefs.quickEditOverlayEnabled
                          ? 'bg-blue-600'
                          : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          prefs.quickEditOverlayEnabled
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Reset Onboarding Button */}
                  <div className="pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-slate-200">
                          Reset Onboarding
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                          Clear all onboarding progress and show tutorials again
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure? This will reset all onboarding progress including tours and tooltips.'
                            )
                          ) {
                            resetOnboarding();
                            alert(
                              'Onboarding reset successfully! Changes will take effect on your next visit.'
                            );
                          }
                        }}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Export Data */}
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-100 mb-2">
                      Export Your Data
                    </h2>
                    <p className="text-sm text-slate-400">
                      Download a copy of all your data including profile,
                      thumbnails, projects, settings, and generation history.
                      Available once every 24 hours.
                    </p>
                    {exportMessage && (
                      <div
                        className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${
                          exportMessage.type === 'success'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {exportMessage.type === 'success' ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {exportMessage.text}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleDataExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0"
                  >
                    {isExporting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isExporting ? 'Exporting...' : 'Request Export'}
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-red-400 mb-2">
                  Danger Zone
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </p>

                {showDeleteConfirm ? (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-300">
                      Type{' '}
                      <span className="font-mono text-red-400">DELETE</span> to
                      confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      className="w-full max-w-xs bg-slate-800 border border-red-500/50 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-red-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        Delete Account
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Account
                  </button>
                )}
              </div>
            </>
          )}

          {/* TEAM TAB */}
          {activeTab === 'team' && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Team Members
                  </h2>
                  <p className="text-sm text-slate-400">
                    Manage your team and collaboration settings
                  </p>
                </div>
                <button className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                  <Plus className="w-4 h-4" />
                  Invite Member
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
                        <p className="text-sm font-medium text-slate-200">
                          {user?.name || 'You'}
                        </p>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                          Owner
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 sm:p-6 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-center">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400 mb-2">
                  No team members yet
                </p>
                <p className="text-xs text-slate-500">
                  Invite team members to collaborate on projects
                </p>
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
