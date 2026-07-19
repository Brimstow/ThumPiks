import React, { useState, useEffect } from 'react';
import { Camera, Check, AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { authFetch } from '../../utils/api';
import * as accountService from '../../services/account.service';
import type { ProfileData } from '../../services/account.service';

const ProfileTab: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

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

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!profileData) return;
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    if (!profileData) return;
    setIsProfileSaving(true);
    setProfileMessage(null);
    try {
      await accountService.updateProfile({ name: profileData.name, username: profileData.username });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
      fetchProfileData();
    } catch {
      setProfileMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) return;
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

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center py-12 text-slate-400">Failed to load profile data</div>;
  }

  return (
    <>
      {/* Profile Picture Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Profile Picture</h2>
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-semibold overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : profileData.avatarUrl ? (
                <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profileData.name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors">
              <Camera className="w-4 h-4 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>
          <div>
            <p className="text-sm text-slate-400 mb-2">Upload a new avatar. JPG, PNG or GIF. Max 5MB.</p>
            <button className="text-sm text-red-400 hover:text-red-300 transition-colors">Remove photo</button>
          </div>
        </div>
      </div>

      {/* Profile Info Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Personal Information</h2>
        {profileMessage && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${profileMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {profileMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {profileMessage.text}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input type="text" name="name" value={profileData.name} onChange={handleProfileChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
            <div className="relative">
              <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-24" />
              {profileData.emailVerified && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Verified</span>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
            <input type="text" name="username" value={profileData.username} onChange={handleProfileChange} placeholder="@username" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleProfileSave} disabled={isProfileSaving} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
            {isProfileSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      {/* Change Password Section */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Change Password</h2>
        <div className="space-y-4 max-w-md">
          {(['current', 'new', 'confirm'] as const).map(field => {
            const fieldKey = field === 'current' ? 'currentPassword' : field === 'new' ? 'newPassword' : 'confirmPassword';
            const label = field === 'current' ? 'Current Password' : field === 'new' ? 'New Password' : 'Confirm New Password';
            return (
              <div key={field}>
                <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
                <div className="relative">
                  <input
                    type={showPasswords[field] ? 'text' : 'password'}
                    value={passwordData[fieldKey]}
                    onChange={e => setPasswordData({ ...passwordData, [fieldKey]: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500 transition-colors pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPasswords[field] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {field === 'confirm' && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
                )}
              </div>
            );
          })}
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
  );
};

export default ProfileTab;
