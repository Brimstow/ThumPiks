/**
 * Account Service - Frontend API client
 * Handles all account-related API requests
 */

import { authFetch } from '../utils/api';

// ============================================
// TYPES
// ============================================

export interface ProfileData {
  name: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
  settings: Record<string, unknown> | null;
}

export interface SubscriptionTier {
  tier: 'free' | 'starter' | 'pro' | 'ultimate';
  creditsUsed: number;
  creditsTotal: number;
  creditsRemaining: number;
}

export interface TwoFactorStatus {
  enabled: boolean;
  secret?: string;
  qrCode?: string;
}

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  ipAddress: string;
  lastActivity: Date;
  loginAt: Date;
  isCurrent: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  device: string;
  ipAddress: string;
  location: string;
  timestamp: Date;
  success: boolean;
}

export interface EmailPreferences {
  marketingEmails: boolean;
  productUpdates: boolean;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

export interface UserSettings {
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  dateFormat: string;
  timeFormat: '12h' | '24h';
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar: string | null;
  joinedAt: Date;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

// ============================================
// PROFILE API
// ============================================

export const getProfile = async (): Promise<ProfileData> => {
  const response = await authFetch('/api/account/profile');
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
};

export const updateProfile = async (data: Partial<Pick<ProfileData, 'name' | 'username'>>): Promise<void> => {
  const response = await authFetch('/api/account/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update profile');
  }
};

export const getSubscription = async (): Promise<SubscriptionTier> => {
  const response = await authFetch('/api/account/subscription');
  if (!response.ok) {
    throw new Error('Failed to fetch subscription');
  }
  return response.json();
};

// ============================================
// SECURITY API
// ============================================

export const get2FAStatus = async (): Promise<TwoFactorStatus> => {
  const response = await authFetch('/api/account/security/2fa');
  if (!response.ok) {
    throw new Error('Failed to fetch 2FA status');
  }
  return response.json();
};

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
  const response = await authFetch('/api/account/security/sessions');
  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }
  return response.json();
};

export const terminateSession = async (sessionId: string): Promise<void> => {
  const response = await authFetch(`/api/account/security/sessions/${sessionId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to terminate session');
  }
};

export const getLoginHistory = async (limit = 20): Promise<LoginHistoryEntry[]> => {
  const response = await authFetch(`/api/account/security/history?limit=${limit}`);
  if (!response.ok) {
    throw new Error('Failed to fetch login history');
  }
  return response.json();
};

// ============================================
// NOTIFICATION API
// ============================================

export const getEmailPreferences = async (): Promise<EmailPreferences> => {
  const response = await authFetch('/api/account/notifications/preferences');
  if (!response.ok) {
    throw new Error('Failed to fetch email preferences');
  }
  return response.json();
};

export const updateEmailPreferences = async (preferences: Partial<EmailPreferences>): Promise<void> => {
  const response = await authFetch('/api/account/notifications/preferences', {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
  if (!response.ok) {
    throw new Error('Failed to update email preferences');
  }
};

// ============================================
// SETTINGS API
// ============================================

export const getUserSettings = async (): Promise<UserSettings> => {
  const response = await authFetch('/api/account/settings');
  if (!response.ok) {
    throw new Error('Failed to fetch user settings');
  }
  return response.json();
};

export const updateUserSettings = async (settings: Partial<UserSettings>): Promise<void> => {
  const response = await authFetch('/api/account/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  if (!response.ok) {
    throw new Error('Failed to update user settings');
  }
};

// ============================================
// TEAM API
// ============================================

export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const response = await authFetch('/api/account/team/members');
  if (!response.ok) {
    throw new Error('Failed to fetch team members');
  }
  return response.json();
};

export const getTeamInvitations = async (): Promise<TeamInvitation[]> => {
  const response = await authFetch('/api/account/team/invitations');
  if (!response.ok) {
    throw new Error('Failed to fetch team invitations');
  }
  return response.json();
};
