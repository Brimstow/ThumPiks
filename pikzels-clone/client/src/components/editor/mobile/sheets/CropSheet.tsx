/**
 * CropSheet Component
 * Bottom sheet for crop tool with aspect ratio presets
 * Includes: 16:9 (YouTube), 9:16 (Shorts), 1:1 (Square), Custom
 */

import React, { useState } from 'react';
import { Monitor, Smartphone, Square, Maximize2, RotateCw, Grid3X3 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { BottomSheet } from '../BottomSheet';
import { CROP_PRESETS, type CropPreset } from '../types';

interface CropSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPreset: string | null;
  onPresetSelect: (preset: CropPreset) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onRotate90: () => void;
}

// Icon mapping for presets
function getPresetIcon(id: string) {
  switch (id) {
    case 'youtube':
      return <Monitor size={20} />;
    case 'shorts':
      return <Smartphone size={20} />;
    case 'square':
      return <Square size={20} />;
    case 'free':
      return <Maximize2 size={20} />;
    default:
      return <Square size={20} />;
  }
}

export function CropSheet({
  isOpen,
  onClose,
  selectedPreset,
  onPresetSelect,
  showGrid,
  onToggleGrid,
  onRotate90,
}: CropSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Crop"
      snapPoint="half"
    >
      <div className="space-y-6">
        {/* Aspect Ratio Presets */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Aspect Ratio
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {CROP_PRESETS.map((preset) => {
              const isSelected = selectedPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => onPresetSelect(preset)}
                  className={cn(
                    // Base - 48px minimum height
                    'flex flex-col items-center justify-center',
                    'min-h-[72px] p-3',
                    'rounded-xl',
                    'transition-all duration-200',
                    'touch-manipulation',
                    // State
                    isSelected
                      ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                      : 'bg-gray-800 border-2 border-transparent text-gray-300 hover:bg-gray-700'
                  )}
                >
                  {getPresetIcon(preset.id)}
                  <span className="text-xs mt-2 font-medium">
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Grid and Rotate Options */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Options
          </h3>
          <div className="flex gap-3">
            {/* Grid toggle */}
            <button
              onClick={onToggleGrid}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'min-h-[48px] p-3',
                'rounded-xl',
                'transition-all duration-200',
                'touch-manipulation',
                showGrid
                  ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                  : 'bg-gray-800 border-2 border-transparent text-gray-300 hover:bg-gray-700'
              )}
            >
              <Grid3X3 size={20} />
              <span className="text-sm font-medium">Grid</span>
            </button>

            {/* Rotate 90 */}
            <button
              onClick={onRotate90}
              className={cn(
                'flex-1 flex items-center justify-center gap-2',
                'min-h-[48px] p-3',
                'rounded-xl',
                'bg-gray-800 border-2 border-transparent text-gray-300',
                'hover:bg-gray-700',
                'transition-all duration-200',
                'touch-manipulation'
              )}
            >
              <RotateCw size={20} />
              <span className="text-sm font-medium">Rotate</span>
            </button>
          </div>
        </section>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          Pinch to resize crop area on canvas
        </p>
      </div>
    </BottomSheet>
  );
}

export default CropSheet;
