import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Monitor, Globe, Clock, RefreshCw } from 'lucide-react';
import * as accountService from '../../services/account.service';
import type { TwoFactorStatus, ActiveSession, LoginHistoryEntry } from '../../services/account.service';

const SecurityTab: React.FC = () => {
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loadingSecurity, setLoadingSecurity] = useState(false);

  useEffect(() => {
    fetchSecurityData();
  }, []);

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

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone'))
      return <Smartphone className="w-5 h-5 text-slate-400" />;
    return <Monitor className="w-5 h-5 text-slate-400" />;
  };

  if (loadingSecurity) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <>
      {/* Two-Factor Authentication */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-slate-100">Two-Factor Authentication</h2>
              {twoFactorStatus?.enabled ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Enabled</span>
              ) : (
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400">Disabled</span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {twoFactorStatus?.enabled
                ? `Authenticator app is set up. Last updated: ${twoFactorStatus.lastUpdated ? new Date(twoFactorStatus.lastUpdated).toLocaleDateString() : 'Never'}`
                : 'Add an extra layer of security to your account'}
            </p>
          </div>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors shrink-0">
            {twoFactorStatus?.enabled ? 'Manage 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Active Sessions</h2>
        <div className="space-y-3">
          {activeSessions.length > 0 ? activeSessions.map(session => (
            <div key={session.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <div className="flex items-center gap-4">
                {getDeviceIcon(session.device)}
                <div>
                  <p className="text-sm font-medium text-slate-200">{session.device}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Globe className="w-3 h-3" />
                    <span>{session.location || 'Unknown'}</span>
                    <span>&bull;</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(session.lastActivity).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {session.isCurrent ? (
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">Current</span>
              ) : (
                <button className="text-xs text-red-400 hover:text-red-300 transition-colors">Revoke</button>
              )}
            </div>
          )) : (
            <p className="text-sm text-slate-400 text-center py-4">No active sessions found</p>
          )}
        </div>
      </div>

      {/* Login History */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">Recent Login History</h2>
        <div className="space-y-2">
          {loginHistory.length > 0 ? loginHistory.slice(0, 10).map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-800/50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-400' : 'bg-red-400'}`} />
                <div>
                  <p className="text-sm text-slate-300">{entry.device || 'Unknown device'}</p>
                  <p className="text-xs text-slate-500">{entry.location || 'Unknown location'} &bull; {entry.ipAddress}</p>
                </div>
              </div>
              <span className="text-xs text-slate-500">{new Date(entry.timestamp).toLocaleDateString()}</span>
            </div>
          )) : (
            <p className="text-sm text-slate-400 text-center py-4">No login history available</p>
          )}
        </div>
      </div>
    </>
  );
};

export default SecurityTab;
