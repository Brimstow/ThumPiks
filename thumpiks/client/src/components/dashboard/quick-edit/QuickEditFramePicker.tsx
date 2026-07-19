import React from 'react';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Grid,
  RefreshCw,
} from 'lucide-react';
import type { VideoFrame, FrameRateLimitInfo } from '../../../services/quickEditService';

interface QuickEditFramePickerProps {
  videoFrames: VideoFrame[];
  videoTitle: string;
  selectedFrameIdx: number | null;
  currentCycleIndex: number;
  totalCycles: number;
  rateLimitInfo: FrameRateLimitInfo | null;
  isRegenerating: boolean;
  onFrameSelect: (idx: number) => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  onCycleNavigation: (direction: 'prev' | 'next') => void;
  onBack: () => void;
}

const QuickEditFramePicker: React.FC<QuickEditFramePickerProps> = ({
  videoFrames,
  videoTitle,
  selectedFrameIdx,
  currentCycleIndex,
  totalCycles,
  rateLimitInfo,
  isRegenerating,
  onFrameSelect,
  onConfirm,
  onRegenerate,
  onCycleNavigation,
  onBack,
}) => (
  <div className="max-w-5xl mx-auto px-4 py-6">
    <div className="flex items-center justify-between mb-6">
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h2 className="text-2xl font-bold text-white">Pick a frame</h2>
        {videoTitle && (
          <p className="text-gray-400 text-sm mt-1 truncate max-w-lg">
            {videoTitle}
          </p>
        )}
      </div>
      <button
        onClick={onConfirm}
        disabled={selectedFrameIdx === null}
        className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500
                   text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-2"
      >
        <Check className="w-4 h-4" />
        Use This Frame
      </button>
    </div>

    {/* Regenerate + Cycle Navigation Bar */}
    <div className="flex items-center justify-between mb-4 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        {/* Cycle navigation */}
        {totalCycles > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onCycleNavigation('prev')}
              disabled={currentCycleIndex <= 0}
              className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600 text-gray-300
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous cycle"
              aria-label="Previous cycle"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-gray-400 text-xs font-medium px-1 tabular-nums">
              {currentCycleIndex + 1} / {totalCycles}
            </span>
            <button
              onClick={() => onCycleNavigation('next')}
              disabled={currentCycleIndex >= totalCycles - 1}
              className="p-1.5 rounded-lg bg-gray-700/60 hover:bg-gray-600 text-gray-300
                         disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next cycle"
              aria-label="Next cycle"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Regenerate button */}
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                     bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/30
                     text-amber-400 text-sm font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Extract new frames with different timestamps"
          aria-label="Extract new frames with different timestamps"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
          />
          {isRegenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Rate limit info */}
      {rateLimitInfo && rateLimitInfo.dailyLimit !== -1 && (
        <div className="text-gray-500 text-xs">
          {rateLimitInfo.dailyUsed}/{rateLimitInfo.dailyLimit} extractions
          today
        </div>
      )}
    </div>

    {videoFrames.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Grid className="w-12 h-12 mb-3" />
        <p>No frames available</p>
      </div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {videoFrames.map((frame, idx) => (
          <button
            key={frame.url}
            onClick={() => onFrameSelect(idx)}
            className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-200
              aspect-video bg-gray-900
              ${
                selectedFrameIdx === idx
                  ? 'border-purple-500 ring-2 ring-purple-500/30 scale-[1.02]'
                  : 'border-gray-700/50 hover:border-gray-500'
              }`}
          >
            <img
              src={frame.url}
              alt={frame.label}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={e => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />

            {/* Selection indicator */}
            {selectedFrameIdx === idx && (
              <div
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-purple-500
                              flex items-center justify-center shadow-lg"
              >
                <Check className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Label badge */}
            <div
              className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent
                            px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <p className="text-white text-xs font-medium truncate">
                {frame.label}
              </p>
            </div>
          </button>
        ))}
      </div>
    )}

    {/* Bottom confirm bar (mobile friendly) */}
    {selectedFrameIdx !== null && (
      <div
        className="mt-6 flex items-center justify-between bg-gray-800/60 border border-gray-700/50
                      rounded-xl px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <img
            src={videoFrames[selectedFrameIdx].url}
            alt="Selected frame"
            className="w-16 h-10 rounded-lg object-cover border border-gray-600"
          />
          <div>
            <p className="text-white text-sm font-medium">
              {videoFrames[selectedFrameIdx].label}
            </p>
            {videoFrames[selectedFrameIdx].width && (
              <p className="text-gray-500 text-xs">
                {videoFrames[selectedFrameIdx].width} ×{' '}
                {videoFrames[selectedFrameIdx].height}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={onConfirm}
          className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500
                     text-white font-medium transition-colors flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          Continue to Edit
        </button>
      </div>
    )}
  </div>
);

export default QuickEditFramePicker;
