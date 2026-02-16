import React from 'react';
import {
  Upload,
  RefreshCw,
  Trash2,
  PlusCircle,
  Clock,
  Aperture,
  Palette,
  Type,
  Megaphone,
  Image as ImageIcon,
  Layers,
  Sticker,
  Sparkles,
  Folder,
} from 'lucide-react';
import { BrandActivityItem, BrandCategoryType } from './types';

interface RecentBrandActivityProps {
  activityFeed: BrandActivityItem[];
  className?: string;
  maxItems?: number;
}

const actionIcons: Record<BrandActivityItem['action'], React.ElementType> = {
  uploaded: Upload,
  updated: RefreshCw,
  deleted: Trash2,
  created: PlusCircle,
};

const actionColors: Record<BrandActivityItem['action'], string> = {
  uploaded: 'text-blue-400 bg-blue-500/10',
  updated: 'text-amber-400 bg-amber-500/10',
  deleted: 'text-red-400 bg-red-500/10',
  created: 'text-emerald-400 bg-emerald-500/10',
};

const categoryIcons: Record<BrandCategoryType, React.ElementType> = {
  logos: Aperture,
  colors: Palette,
  fonts: Type,
  'brand-voice': Megaphone,
  photos: ImageIcon,
  graphics: Layers,
  icons: Sticker,
  styles: Sparkles,
  custom: Folder,
};

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const RecentBrandActivity: React.FC<RecentBrandActivityProps> = ({
  activityFeed,
  className = '',
  maxItems = 7,
}) => {
  const items = activityFeed.slice(0, maxItems);

  return (
    <div className={`bg-[#020818] border border-slate-800 rounded-2xl p-6 backdrop-blur ring-1 ring-slate-900/80 shadow-xl shadow-black/40 ${className}`}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-50">Recent Activity</h3>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5" />
          Brand changes
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="w-10 h-10 mx-auto text-slate-700 mb-2" />
          <p className="text-sm text-slate-500">No recent activity</p>
          <p className="text-xs text-slate-600 mt-1">Changes to your brand kit will appear here</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[17px] top-3 bottom-3 w-px bg-slate-800" />

          <div className="space-y-1">
            {items.map((item) => {
              const ActionIcon = actionIcons[item.action];
              const colorClass = actionColors[item.action];
              const CatIcon = categoryIcons[item.assetType];

              return (
                <div
                  key={item.id}
                  className="group flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-900/50 transition-colors relative"
                >
                  {/* Action Icon (timeline dot) */}
                  <div className={`w-[34px] h-[34px] rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                    <ActionIcon className="w-4 h-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center gap-2 mb-0.5">
                      <CatIcon className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-200 truncate">
                        {item.assetName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{item.description}</p>
                  </div>

                  {/* Time */}
                  <span className="text-[11px] text-slate-600 flex-shrink-0 pt-1">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentBrandActivity;
