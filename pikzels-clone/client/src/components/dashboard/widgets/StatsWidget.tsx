import React, { useEffect, useState } from 'react';
import { Loader2, Image, MousePointer2, Layout, Eye, FolderOpen, TrendingUp } from 'lucide-react';
import { authGet } from '../../../utils/api';

interface UserStats {
  thumbnailsCreated: number;
  clickThroughRate: number;
  templatesUsed: number;
  totalViews: number;
  projectsCount: number;
  recentActivity: number;
}

export const StatsWidget: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUserStats();
  }, []);

  const fetchUserStats = async () => {
    try {
      const response = await authGet('/api/analytics/stats');

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching user stats:', err);
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 flex flex-col">
      <h3 className="text-lg font-semibold text-slate-50 mb-4">Your Stats</h3>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center flex-1 flex items-center justify-center text-slate-400">
          <p>{error}</p>
        </div>
      ) : !stats ? (
        <div className="text-center flex-1 flex items-center justify-center text-slate-400">
          <p>No stats available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 flex-1">
          {/* Thumbnails Created */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-5 h-5 text-blue-400" />
              <p className="text-sm text-slate-400">Thumbnails</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {formatNumber(stats.thumbnailsCreated)}
            </p>
          </div>

          {/* Click-Through Rate */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <MousePointer2 className="w-5 h-5 text-green-400" />
              <p className="text-sm text-slate-400">CTR</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {stats.clickThroughRate > 0 ? formatPercentage(stats.clickThroughRate) : '—'}
            </p>
          </div>

          {/* Templates Used */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <Layout className="w-5 h-5 text-purple-400" />
              <p className="text-sm text-slate-400">Templates</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {formatNumber(stats.templatesUsed)}
            </p>
          </div>

          {/* Total Views */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-5 h-5 text-orange-400" />
              <p className="text-sm text-slate-400">Views</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {stats.totalViews > 0 ? formatNumber(stats.totalViews) : '—'}
            </p>
          </div>

          {/* Projects Count */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <FolderOpen className="w-5 h-5 text-cyan-400" />
              <p className="text-sm text-slate-400">Projects</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {formatNumber(stats.projectsCount)}
            </p>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800/50 rounded-lg p-4 flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <p className="text-sm text-slate-400">This Week</p>
            </div>
            <p className="text-3xl font-bold text-slate-50">
              {stats.recentActivity > 0 ? formatNumber(stats.recentActivity) : '—'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
