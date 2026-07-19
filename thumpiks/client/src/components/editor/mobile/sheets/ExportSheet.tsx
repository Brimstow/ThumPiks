/**
 * ExportSheet Component
 * Bottom sheet for export with platform presets and file size enforcement
 * Auto-applies YouTube 2MB limit when selected
 */

import React, { useState, useMemo } from 'react';
import { Youtube, Music2, Instagram, Settings2, Download, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { BottomSheet } from '../BottomSheet';
import { EXPORT_PLATFORMS, type ExportPlatform, type ExportPlatformConfig } from '../types';

interface ExportSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (platform: ExportPlatformConfig, quality: number) => Promise<void>;
  estimatedSize: number;  // in bytes
  isExporting: boolean;
}

// Icon mapping for platforms
function getPlatformIcon(id: ExportPlatform) {
  switch (id) {
    case 'youtube':
      return <Youtube size={24} />;
    case 'tiktok':
      return <Music2 size={24} />;
    case 'instagram':
      return <Instagram size={24} />;
    case 'custom':
      return <Settings2 size={24} />;
    default:
      return <Download size={24} />;
  }
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function ExportSheet({
  isOpen,
  onClose,
  onExport,
  estimatedSize,
  isExporting,
}: ExportSheetProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<ExportPlatform>('youtube');
  const [quality, setQuality] = useState(90);  // 0-100

  // Get selected platform config
  const platformConfig = useMemo(() => 
    EXPORT_PLATFORMS.find(p => p.id === selectedPlatform) || EXPORT_PLATFORMS[0],
    [selectedPlatform]
  );

  // Check if estimated size exceeds limit
  const isOverLimit = estimatedSize > platformConfig.maxSize;

  // Handle export
  const handleExport = async () => {
    await onExport(platformConfig, quality);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Export"
      snapPoint="full"
    >
      <div className="space-y-6">
        {/* Platform Selection */}
        <section>
          <h3 className="text-sm font-medium text-gray-400 mb-3">
            Platform
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {EXPORT_PLATFORMS.map((platform) => {
              const isSelected = selectedPlatform === platform.id;
              return (
                <button
                  key={platform.id}
                  onClick={() => setSelectedPlatform(platform.id)}
                  disabled={isExporting}
                  className={cn(
                    'flex flex-col items-center justify-center',
                    'min-h-[72px] p-3',
                    'rounded-xl',
                    'transition-all duration-200',
                    'touch-manipulation',
                    isSelected
                      ? 'bg-blue-500/20 border-2 border-blue-500 text-blue-400'
                      : 'bg-gray-800 border-2 border-transparent text-gray-300 hover:bg-gray-700',
                    isExporting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {getPlatformIcon(platform.id)}
                  <span className="text-xs mt-2 font-medium">
                    {platform.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Platform Info */}
        <section className="p-4 bg-gray-800/50 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Dimensions</span>
            <span className="text-sm text-white font-mono">
              {platformConfig.dimensions.width} x {platformConfig.dimensions.height}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Max Size</span>
            <span className="text-sm text-white font-mono">
              {formatBytes(platformConfig.maxSize)}
            </span>
          </div>
        </section>

        {/* Quality Slider */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">
              Quality
            </h3>
            <span className="text-sm text-white font-mono">{quality}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            disabled={isExporting}
            className={cn(
              'w-full h-2 rounded-full appearance-none cursor-pointer',
              'bg-gray-700',
              '[&::-webkit-slider-thumb]:appearance-none',
              '[&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-8',
              '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white',
              '[&::-webkit-slider-thumb]:shadow-lg',
              isExporting && 'opacity-50'
            )}
          />
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </section>

        {/* File Size Estimate */}
        <section className={cn(
          'p-4 rounded-xl',
          isOverLimit
            ? 'bg-orange-500/10 border border-orange-500/30'
            : 'bg-gray-800/50'
        )}>
          <div className="flex items-center gap-3">
            {isOverLimit ? (
              <AlertTriangle size={20} className="text-orange-400 flex-shrink-0" />
            ) : (
              <Check size={20} className="text-green-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Estimated Size</span>
                <span className={cn(
                  'text-sm font-mono font-medium',
                  isOverLimit ? 'text-orange-400' : 'text-green-400'
                )}>
                  {formatBytes(estimatedSize)}
                </span>
              </div>
              {isOverLimit && (
                <p className="text-xs text-orange-400 mt-1">
                  Reduce quality to meet {platformConfig.label} limit
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            'w-full flex items-center justify-center gap-2',
            'min-h-[56px] p-4',
            'rounded-xl',
            'font-medium text-white',
            'transition-all duration-200',
            'touch-manipulation',
            isExporting
              ? 'bg-blue-600/50 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700'
          )}
        >
          {isExporting ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span>Exporting...</span>
            </>
          ) : (
            <>
              <Download size={20} />
              <span>Export for {platformConfig.label}</span>
            </>
          )}
        </button>

        {/* Help text */}
        <p className="text-xs text-gray-500 text-center">
          {selectedPlatform === 'youtube' 
            ? 'YouTube thumbnails are limited to 2MB'
            : 'Optimized for ' + platformConfig.label + ' requirements'
          }
        </p>
      </div>
    </BottomSheet>
  );
}

export default ExportSheet;
