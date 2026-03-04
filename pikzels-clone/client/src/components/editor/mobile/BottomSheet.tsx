/**
 * BottomSheet Component
 * Reusable bottom sheet container using vaul drawer
 * Provides snap points and gesture-based dismissal for mobile UI
 */

import React from 'react';
import { Drawer } from 'vaul';
import { X } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Snap point: collapsed (10%), half (50%), full (90%) */
  snapPoint?: 'collapsed' | 'half' | 'full';
  /** Whether to show the close button */
  showCloseButton?: boolean;
  /** Additional className for content */
  className?: string;
}

const SNAP_HEIGHTS = {
  collapsed: '10%',
  half: '50%',
  full: '90%',
} as const;

export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  snapPoint = 'half',
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Drawer.Content
          className={cn(
            'fixed bottom-0 left-0 right-0 z-50',
            'bg-[#1a1a2e] rounded-t-2xl',
            'flex flex-col',
            'focus:outline-none',
            className
          )}
          style={{ 
            height: SNAP_HEIGHTS[snapPoint],
            maxHeight: '90vh',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-gray-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-700/50">
            <Drawer.Title className="text-lg font-semibold text-white">
              {title}
            </Drawer.Title>
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'w-12 h-12 flex items-center justify-center',
                  'rounded-full',
                  'text-gray-400 hover:text-white',
                  'hover:bg-gray-700/50',
                  'transition-colors',
                  'touch-manipulation'  // Optimize for touch
                )}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

export default BottomSheet;
