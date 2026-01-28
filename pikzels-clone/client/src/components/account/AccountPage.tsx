/**
 * AccountPage Component
 * Comprehensive account management with tabbed sections
 */

import React, { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type AccountTab = 'profile' | 'billing' | 'security' | 'notifications' | 'settings' | 'team' | 'export';

interface TabConfig {
  id: AccountTab;
  label: string;
  icon: React.ReactNode;
}

// ============================================
// COMPONENT
// ============================================

const AccountPage: React.FC = () => {
  const { section } = useParams<{ section?: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Determine active tab from URL or default to profile
  const activeTab = (section as AccountTab) || 'profile';
  
  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    username: '',
    bio: '',
    website: '',
  });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
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
  
  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [show2FASetup, setShow2FASetup] = useState(false);
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const tabs: TabConfig[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
    { id: 'team', label: 'Team', icon: <Users className="w-4 h-4" /> },
  ];

  const handleTabChange = (tab: AccountTab) => {
    navigate(`/dashboard/account/${tab}`);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    setIsProfileSaving(true);
    setProfileMessage(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      });
      
      if (response.ok) {
        setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        const data = await response.json();
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Network error. Please try again.' });
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
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      
      if (response.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setProfileMessage({ type: 'success', text: 'Password updated successfully!' });
      } else {
        const data = await response.json();
        setProfileMessage({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        logout();
      }
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to delete account' });
    }
  };

  // Mock data
  const subscriptionPlan = {
    name: 'Professional',
    price: 29,
    billingCycle: 'monthly',
    credits: 100,
    creditsUsed: 10,
    renewalDate: '2025-02-27',
    features: ['Unlimited thumbnails', 'AI Generation', 'Priority support', 'Team collaboration'],
  };

  const invoices = [
    { id: 'INV-001', date: '2025-01-27', amount: 29, status: 'paid' },
    { id: 'INV-002', date: '2024-12-27', amount: 29, status: 'paid' },
    { id: 'INV-003', date: '2024-11-27', amount: 29, status: 'paid' },
  ];

  const sessions = [
    { id: '1', device: 'Chrome on Windows', location: 'New York, US', lastActive: '2 minutes ago', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'New York, US', lastActive: '1 hour ago', current: false },
    { id: '3', device: 'Firefox on MacOS', location: 'Los Angeles, US', lastActive: '2 days ago', current: false },
  ];

  const loginHistory = [
    { id: '1', device: 'Chrome on Windows', ip: '192.168.1.1', location: 'New York, US', time: '2 minutes ago', success: true },
    { id: '2', device: 'Safari on iPhone', ip: '192.168.1.2', location: 'New York, US', time: '1 hour ago', success: true },
    { id: '3', device: 'Unknown', ip: '10.0.0.1', location: 'Unknown', time: '3 hours ago', success: false },
  ];

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">Account Settings</h1>
        <p className="text-slate-400">Manage your account, billing, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/50 rounded-xl border border-slate-800 mb-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <>
            {/* Profile Picture Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Profile Picture</h2>
              <div className="flex items-center gap-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-semibold overflow-hidden">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || 'U'
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Personal Information</h2>
              
              {profileMessage && (
                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  profileMessage.type === 'success' 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {profileMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {profileMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={profileData.name}
                    onChange={handleProfileChange}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleProfileChange}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-24"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                      Verified
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={profileData.username}
                    onChange={handleProfileChange}
                    placeholder="@username"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Website</label>
                  <input
                    type="url"
                    name="website"
                    value={profileData.website}
                    onChange={handleProfileChange}
                    placeholder="https://yourwebsite.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleProfileChange}
                    placeholder="Tell us about yourself..."
                    rows={3}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleProfileSave}
                  disabled={isProfileSaving}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProfileSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Change Password</h2>
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
                  )}
                </div>
                <button
                  onClick={handlePasswordChange}
                  disabled={isPasswordSaving || !passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isPasswordSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            </div>
          </>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <>
            {/* Current Plan */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-yellow-400" />
                    <span className="text-xs font-medium text-yellow-400 uppercase tracking-wider">Current Plan</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">{subscriptionPlan.name}</h2>
                  <p className="text-slate-400">
                    ${subscriptionPlan.price}/month • Renews on {subscriptionPlan.renewalDate}
                  </p>
                </div>
                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors">
                  Change Plan
                </button>
              </div>

              {/* Credits Usage */}
              <div className="bg-slate-900/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-slate-300">Credits Usage</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {subscriptionPlan.creditsUsed} / {subscriptionPlan.credits} used
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${(subscriptionPlan.creditsUsed / subscriptionPlan.credits) * 100}%` }}
                  />
                </div>
              </div>

              {/* Features */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {subscriptionPlan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Payment Methods</h2>
                <button className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  <Plus className="w-4 h-4" />
                  Add new
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">VISA</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-200">•••• •••• •••• 4242</p>
                      <p className="text-xs text-slate-500">Expires 12/26</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Default</span>
                    <button className="text-slate-400 hover:text-slate-200">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Billing History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Billing History</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Invoice</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Date</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Amount</th>
                      <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Status</th>
                      <th className="text-right text-xs font-medium text-slate-500 uppercase tracking-wider py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="border-b border-slate-800/50">
                        <td className="py-3 text-sm text-slate-200">{invoice.id}</td>
                        <td className="py-3 text-sm text-slate-400">{invoice.date}</td>
                        <td className="py-3 text-sm text-slate-200">${invoice.amount}.00</td>
                        <td className="py-3">
                          <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 capitalize">
                            {invoice.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button className="text-sm text-blue-400 hover:text-blue-300">
                            Download
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* SECURITY TAB */}
        {activeTab === 'security' && (
          <>
            {/* Two-Factor Authentication */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 mb-2">Two-Factor Authentication</h2>
                  <p className="text-sm text-slate-400 mb-4">
                    Add an extra layer of security to your account by requiring a verification code.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${is2FAEnabled ? 'bg-green-400' : 'bg-slate-600'}`} />
                    <span className={`text-sm ${is2FAEnabled ? 'text-green-400' : 'text-slate-500'}`}>
                      {is2FAEnabled ? 'Enabled' : 'Not enabled'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShow2FASetup(!show2FASetup)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    is2FAEnabled
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-blue-600 text-white hover:bg-blue-500'
                  }`}
                >
                  {is2FAEnabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              {show2FASetup && !is2FAEnabled && (
                <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <p className="text-sm text-slate-300 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  <div className="w-40 h-40 bg-white rounded-lg mb-4 flex items-center justify-center">
                    <span className="text-slate-900 text-xs">QR Code</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit code"
                    className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors mb-3"
                  />
                  <button
                    onClick={() => {
                      setIs2FAEnabled(true);
                      setShow2FASetup(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-500 transition-colors"
                  >
                    Verify & Enable
                  </button>
                </div>
              )}
            </div>

            {/* Active Sessions */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">Active Sessions</h2>
                <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                  Log out all devices
                </button>
              </div>
              
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400">
                        {session.device.includes('iPhone') ? <Smartphone className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-200">{session.device}</p>
                          {session.current && (
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
                          {session.lastActive}
                        </div>
                      </div>
                    </div>
                    {!session.current && (
                      <button className="text-sm text-red-400 hover:text-red-300 transition-colors">
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Login History */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Login Activity</h2>
              <div className="space-y-3">
                {loginHistory.map((login) => (
                  <div key={login.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        login.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {login.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-200">{login.device}</p>
                        <p className="text-xs text-slate-500">{login.ip} • {login.location}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">{login.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* NOTIFICATIONS TAB */}
        {activeTab === 'notifications' && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-6">Notification Preferences</h2>
            
            <div className="space-y-6">
              {[
                { id: 'email', title: 'Email Notifications', description: 'Receive updates via email', enabled: true },
                { id: 'marketing', title: 'Marketing Emails', description: 'News, tips, and special offers', enabled: false },
                { id: 'security', title: 'Security Alerts', description: 'Get notified about security events', enabled: true },
                { id: 'billing', title: 'Billing Alerts', description: 'Payment confirmations and reminders', enabled: true },
                { id: 'product', title: 'Product Updates', description: 'New features and improvements', enabled: true },
              ].map((pref) => (
                <div key={pref.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{pref.title}</p>
                    <p className="text-xs text-slate-500">{pref.description}</p>
                  </div>
                  <button
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
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-100 mb-6">App Preferences</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                  <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
                    <option>English (US)</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                  <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
                    <option>Eastern Time (ET)</option>
                    <option>Pacific Time (PT)</option>
                    <option>Central European Time (CET)</option>
                    <option>UTC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Export Data */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 mb-2">Export Your Data</h2>
                  <p className="text-sm text-slate-400">
                    Download a copy of all your data including thumbnails, projects, and settings.
                  </p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors">
                  <Download className="w-4 h-4" />
                  Request Export
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
              <p className="text-sm text-slate-400 mb-4">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              
              {showDeleteConfirm ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-300">
                    Type <span className="font-mono text-red-400">DELETE</span> to confirm:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
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
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100">Team Members</h2>
                <p className="text-sm text-slate-400">Manage your team and collaboration settings</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors">
                <Plus className="w-4 h-4" />
                Invite Member
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex items-center gap-4">
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

            <div className="mt-8 p-6 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400 mb-2">No team members yet</p>
              <p className="text-xs text-slate-500">Invite team members to collaborate on projects</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountPage;
