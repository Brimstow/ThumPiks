import React, { useState } from 'react';
import { Sun, Moon, Monitor, Download, Trash2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDarkMode } from '../../hooks/useDarkMode';
import { useOnboarding } from '../../features/onboarding';
import { authPost } from '../../utils/api';

const SettingsTab: React.FC = () => {
  const { logout } = useAuth();
  const { mode: colorMode, setMode: setColorMode } = useDarkMode();
  const { prefs, setQuickEditOverlayEnabled, resetOnboarding } = useOnboarding();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDataExport = async () => {
    setIsExporting(true);
    setExportMessage(null);
    try {
      const response = await authPost('/api/user/export', {});
      if (response.ok) {
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thumpiks-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setExportMessage({ type: 'success', text: 'Your data has been exported successfully!' });
      } else {
        const errorData = await response.json();
        setExportMessage({ type: 'error', text: errorData.message || (response.status === 429 ? 'You can only export once every 24 hours.' : 'Failed to export data. Please try again.') });
      }
    } catch {
      setExportMessage({ type: 'error', text: 'Network error. Please try again later.' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      const response = await authPost('/api/user/account', {});
      // Note: original code used authFetch with DELETE method
      if (response.ok) logout();
    } catch {
      // Error handling
    }
  };

  return (
    <>
      {/* App Preferences */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-6">App Preferences</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Appearance</label>
            <div className="flex gap-2">
              {[
                { value: 'light' as const, label: 'Light', icon: <Sun className="w-4 h-4" /> },
                { value: 'dark' as const, label: 'Dark', icon: <Moon className="w-4 h-4" /> },
                { value: 'system' as const, label: 'System', icon: <Monitor className="w-4 h-4" /> },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setColorMode(value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${colorMode === value ? 'border-blue-500 bg-blue-500/10 text-slate-100' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200'}`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-800" />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
            <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
              <option>English (US)</option><option>Spanish</option><option>French</option><option>German</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
            <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
              <option>Eastern Time (ET)</option><option>Pacific Time (PT)</option><option>Central European Time (CET)</option><option>UTC</option>
            </select>
          </div>
        </div>
      </div>

      {/* Thumbnail Defaults */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-6">Thumbnail Defaults</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Width (px)</label>
              <input type="number" defaultValue={1280} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Height (px)</label>
              <input type="number" defaultValue={720} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Default Style</label>
            <select className="w-full max-w-xs bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-blue-500">
              <option value="bold">Bold</option><option value="minimalist">Minimalist</option><option value="dramatic">Dramatic</option>
            </select>
          </div>
        </div>
      </div>

      {/* Privacy */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-100 mb-6">Privacy</h2>
        <div className="space-y-4">
          {[
            { id: 'profileVisible', title: 'Profile Visibility', description: 'Make your profile visible to other users' },
            { id: 'thumbnailsPublic', title: 'Thumbnails Public by Default', description: 'Make new thumbnails public when created' },
          ].map(item => (
            <div key={item.id} className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-200">{item.title}</p>
                <p className="text-xs text-slate-500">{item.description}</p>
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
        <h2 className="text-lg font-semibold text-slate-100 mb-6">Onboarding Preferences</h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-slate-200">Show Quick Edit Overlay</h3>
              <p className="text-sm text-slate-400 mt-1">Display the Quick Edit options overlay when you log in</p>
            </div>
            <button
              onClick={() => setQuickEditOverlayEnabled(!prefs.quickEditOverlayEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${prefs.quickEditOverlayEnabled ? 'bg-blue-600' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${prefs.quickEditOverlayEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          <div className="pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-slate-200">Reset Onboarding</h3>
                <p className="text-sm text-slate-400 mt-1">Clear all onboarding progress and show tutorials again</p>
              </div>
              <button
                onClick={() => { if (confirm('Are you sure? This will reset all onboarding progress including tours and tooltips.')) { resetOnboarding(); alert('Onboarding reset successfully! Changes will take effect on your next visit.'); } }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors"
              >Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Data */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 mb-2">Export Your Data</h2>
            <p className="text-sm text-slate-400">Download a copy of all your data including profile, thumbnails, projects, settings, and generation history. Available once every 24 hours.</p>
            {exportMessage && (
              <div className={`mt-3 p-3 rounded-lg flex items-center gap-2 text-sm ${exportMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {exportMessage.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {exportMessage.text}
              </div>
            )}
          </div>
          <button onClick={handleDataExport} disabled={isExporting} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shrink-0">
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {isExporting ? 'Exporting...' : 'Request Export'}
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-red-400 mb-2">Danger Zone</h2>
        <p className="text-sm text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</p>
        {showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-300">Type <span className="font-mono text-red-400">DELETE</span> to confirm:</p>
            <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} className="w-full max-w-xs bg-slate-800 border border-red-500/50 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-red-500" />
            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }} className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE'} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">Delete Account</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors">
            <Trash2 className="w-4 h-4" />Delete Account
          </button>
        )}
      </div>
    </>
  );
};

export default SettingsTab;
