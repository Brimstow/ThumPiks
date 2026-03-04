/**
 * AdjustmentsSheet Component
 * Bottom sheet with simplified sliders for brightness, contrast, saturation
 * Large thumb sliders for easier touch interaction
 */

import React, { useCallback } from 'react';
import { Sun, Contrast, Droplets, RotateCcw } from 'lucide-react';
import * as Slider from '@radix-ui/react-slider';
import { cn } from '../../../../lib/utils';
import { BottomSheet } from '../BottomSheet';
import { MOBILE_ADJUSTMENTS, type AdjustmentSliderConfig } from '../types';
import type { AdjustmentState } from '../../types/editor.types';

interface AdjustmentsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  adjustments: Pick<AdjustmentState, 'brightness' | 'contrast' | 'saturation'>;
  onAdjustmentChange: (key: keyof Pick<AdjustmentState, 'brightness' | 'contrast' | 'saturation'>, value: number) => void;
  onReset: () => void;
}

// Icon mapping for adjustments
function getAdjustmentIcon(id: string) {
  switch (id) {
    case 'brightness':
      return <Sun size={20} />;
    case 'contrast':
      return <Contrast size={20} />;
    case 'saturation':
      return <Droplets size={20} />;
    default:
      return <Sun size={20} />;
  }
}

function AdjustmentSlider({
  config,
  value,
  onChange,
}: {
  config: AdjustmentSliderConfig;
  value: number;
  onChange: (value: number) => void;
}) {
  const handleValueChange = useCallback((values: number[]) => {
    onChange(values[0]);
  }, [onChange]);

  const isDefault = value === config.default;

  return (
    <div className="space-y-2">
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-300">
          {getAdjustmentIcon(config.id)}
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <span className={cn(
          'text-sm font-mono',
          isDefault ? 'text-gray-500' : 'text-blue-400'
        )}>
          {value}
        </span>
      </div>

      {/* Slider */}
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-12"
        value={[value]}
        onValueChange={handleValueChange}
        min={config.min}
        max={config.max}
        step={config.step}
      >
        <Slider.Track className="bg-gray-700 relative grow rounded-full h-2">
          <Slider.Range className="absolute bg-blue-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb
          className={cn(
            'block w-8 h-8 bg-white rounded-full',
            'shadow-lg shadow-black/30',
            'hover:bg-gray-100',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'touch-manipulation'
          )}
          aria-label={config.label}
        />
      </Slider.Root>
    </div>
  );
}

export function AdjustmentsSheet({
  isOpen,
  onClose,
  adjustments,
  onAdjustmentChange,
  onReset,
}: AdjustmentsSheetProps) {
  // Check if any adjustments are modified
  const isModified = MOBILE_ADJUSTMENTS.some(
    config => adjustments[config.id] !== config.default
  );

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Adjustments"
      snapPoint="half"
    >
      <div className="space-y-6">
        {/* Sliders */}
        <div className="space-y-6">
          {MOBILE_ADJUSTMENTS.map((config) => (
            <AdjustmentSlider
              key={config.id}
              config={config}
              value={adjustments[config.id]}
              onChange={(value) => onAdjustmentChange(config.id, value)}
            />
          ))}
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={!isModified}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'min-h-[48px] p-3',
            'rounded-xl',
            'transition-all duration-200',
            'touch-manipulation',
            isModified
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              : 'bg-gray-800/50 text-gray-500 cursor-not-allowed'
          )}
        >
          <RotateCcw size={20} />
          <span className="font-medium">Reset All</span>
        </button>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          Changes apply in real-time to the preview
        </p>
      </div>
    </BottomSheet>
  );
}

export default AdjustmentsSheet;
