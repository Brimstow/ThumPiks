import React, { useState, useEffect } from 'react';
import { HardDrive, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL } from '../../../config/environment';

interface StorageInfo {
  usedGB: number;
  totalGB: number;
  autoSave: boolean;
}

interface StorageIndicatorProps {
  className?: string;
}

export const StorageIndicator: React.FC<StorageIndicatorProps> = ({ className = '' }) => {
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/user/storage`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch storage info');
      }

      const data = await response.json();
      setStorage(data);

    } catch (err: any) {
      console.error('Error fetching storage info:', err);
      setError(err.message || 'Failed to load storage info');

      // Development: Graceful fallback to mock data
      if (process.env.NODE_ENV !== 'production') {
        console.log('Using mock storage data in development');
        setStorage(getMockStorage());
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoSave = async () => {
    if (!storage) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/user/settings/auto-save`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !storage.autoSave })
      });

      if (!response.ok) throw new Error('Failed to update auto-save');

      setStorage({ ...storage, autoSave: !storage.autoSave });
    } catch (err) {
      console.error('Error toggling auto-save:', err);
    }
  };

  const storagePercentage = storage ? (storage.usedGB / storage.totalGB) * 100 : 0;

  return (
    <div className={`bg-slate-900/50 border border-slate-800 rounded-2xl p-6 ${className}`}>
      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && process.env.NODE_ENV === 'production' && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-400 font-medium">{error}</p>
            <button
              onClick={fetchStorageInfo}
              className="text-xs text-red-300 hover:text-red-200 underline mt-1"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Storage content */}
      {!loading && storage && (
        <div className="space-y-4">
          {/* Storage bar */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300">
                {storage.usedGB} GB / {storage.totalGB} GB
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-500"
              style={{ width: `${storagePercentage}%` }}
            />
          </div>

          {/* Toggle buttons */}
          <div className="flex items-center justify-between gap-4 pt-2">
            {/* Auto-save toggle */}
            <button
              onClick={handleToggleAutoSave}
              className="flex items-center gap-2 group"
            >
              <div className="relative">
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    storage.autoSave ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      storage.autoSave ? 'translate-x-4' : ''
                    }`}
                  />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                  Auto-save
                </span>
                <span className="text-[10px] text-slate-600">
                  Saves canvas edits automatically
                </span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Mock data helper (development fallback only)
function getMockStorage(): StorageInfo {
  return {
    usedGB: 0,
    totalGB: 100,
    autoSave: true
  };
}
