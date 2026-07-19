import React from 'react';
import {
  Aperture,
  Palette,
  Type,
  Image as ImageIcon,
  Layers,
  Sparkles,
} from 'lucide-react';
import { BrandUsageStat, BrandCategoryType } from './types';

interface BrandUsageOverviewProps {
  usageStats: BrandUsageStat[];
  className?: string;
}

const categoryIcons: Partial<Record<BrandCategoryType, React.ElementType>> = {
  logos: Aperture,
  colors: Palette,
  fonts: Type,
  photos: ImageIcon,
  graphics: Layers,
  styles: Sparkles,
};

const categoryColors: Partial<Record<BrandCategoryType, string>> = {
  logos: 'text-blue-400',
  colors: 'text-purple-400',
  fonts: 'text-emerald-400',
  photos: 'text-amber-400',
  graphics: 'text-indigo-400',
  styles: 'text-orange-400',
};

const barColors: Partial<Record<BrandCategoryType, string>> = {
  logos: 'bg-blue-500',
  colors: 'bg-purple-500',
  fonts: 'bg-emerald-500',
  photos: 'bg-amber-500',
  graphics: 'bg-indigo-500',
  styles: 'bg-orange-500',
};

const BrandUsageOverview: React.FC<BrandUsageOverviewProps> = ({ usageStats, className = '' }) => {
  return (
    <div className={`bg-[#020818] border border-slate-800 rounded-2xl p-6 backdrop-blur ring-1 ring-slate-900/80 shadow-xl shadow-black/40 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-50">Brand Usage</h3>
        <span className="text-xs text-slate-500 font-medium">Across all thumbnails</span>
      </div>

      <div className="space-y-4">
        {usageStats.map((stat, index) => {
          const Icon = categoryIcons[stat.assetType] || Layers;
          const iconColor = categoryColors[stat.assetType] || 'text-slate-400';
          const barColor = barColors[stat.assetType] || 'bg-slate-500';

          return (
            <div key={index} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                  <span className="text-sm font-medium text-slate-200 truncate">
                    {stat.assetName}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500">
                    {stat.usageCount} design{stat.usageCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 w-10 text-right">
                    {stat.usagePercentage}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
                  style={{ width: `${stat.usagePercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {usageStats.length === 0 && (
        <div className="text-center py-8">
          <Layers className="w-10 h-10 mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">No usage data yet</p>
          <p className="text-xs text-slate-600 mt-1">Start creating thumbnails with your brand assets</p>
        </div>
      )}
    </div>
  );
};

export default BrandUsageOverview;
