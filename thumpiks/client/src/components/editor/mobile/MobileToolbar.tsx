/**
 * MobileToolbar Component
 * Bottom navigation bar with 4 tabs: Crop | AI | Adjust | Export
 * Large touch targets (48px minimum) per Apple/Google HIG
 */

import React from 'react';
import { Crop, Sparkles, SlidersHorizontal, Download } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { MobileToolTab } from './types';

interface MobileToolbarProps {
  activeTab: MobileToolTab | null;
  onTabChange: (tab: MobileToolTab) => void;
  disabled?: boolean;
}

interface TabConfig {
  id: MobileToolTab;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabConfig[] = [
  { id: 'crop', label: 'Crop', icon: <Crop size={24} /> },
  { id: 'ai', label: 'AI', icon: <Sparkles size={24} /> },
  { id: 'adjust', label: 'Adjust', icon: <SlidersHorizontal size={24} /> },
  { id: 'export', label: 'Export', icon: <Download size={24} /> },
];

export function MobileToolbar({
  activeTab,
  onTabChange,
  disabled = false,
}: MobileToolbarProps) {
  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'bg-[#1a1a2e] border-t border-gray-700/50',
        'safe-area-bottom'  // Respect iOS safe areas (notch/home indicator)
      )}
    >
      <div className="flex items-center justify-around h-16">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && onTabChange(tab.id)}
              disabled={disabled}
              className={cn(
                // Base styles - 48px minimum touch target
                'flex flex-col items-center justify-center',
                'min-w-[64px] min-h-[48px] py-2 px-3',
                'rounded-lg',
                'transition-all duration-200',
                'touch-manipulation',
                // State styles
                isActive
                  ? 'text-blue-400 bg-blue-500/10'
                  : 'text-gray-400 hover:text-gray-200',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={cn(
                'transition-transform duration-200',
                isActive && 'scale-110'
              )}>
                {tab.icon}
              </span>
              <span className={cn(
                'text-xs mt-1 font-medium',
                isActive ? 'text-blue-400' : 'text-gray-500'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default MobileToolbar;
