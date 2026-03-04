/**
 * AIToolsSheet Component
 * Bottom sheet for AI tools: Remove Background, Enhance, Upscale
 * Shows progress during processing with loading states
 */

import React from 'react';
import { Eraser, Sparkles, Maximize, Loader2, Check, AlertCircle } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { BottomSheet } from '../BottomSheet';
import { MOBILE_AI_TOOLS, type MobileAITool, type ProcessingState } from '../types';

interface AIToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onToolSelect: (tool: MobileAITool) => void;
  processingState: ProcessingState;
}

// Icon mapping for AI tools
function getToolIcon(id: MobileAITool, isProcessing: boolean) {
  if (isProcessing) {
    return <Loader2 size={24} className="animate-spin" />;
  }
  switch (id) {
    case 'remove-bg':
      return <Eraser size={24} />;
    case 'enhance':
      return <Sparkles size={24} />;
    case 'upscale':
      return <Maximize size={24} />;
    default:
      return <Sparkles size={24} />;
  }
}

export function AIToolsSheet({
  isOpen,
  onClose,
  onToolSelect,
  processingState,
}: AIToolsSheetProps) {
  const { isProcessing, tool: activeTool, progress, error } = processingState;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="AI Tools"
      snapPoint="half"
    >
      <div className="space-y-4">
        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            <AlertCircle size={20} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* AI Tools Grid */}
        <div className="space-y-3">
          {MOBILE_AI_TOOLS.map((toolConfig) => {
            const isActive = activeTool === toolConfig.id;
            const isDisabled = isProcessing && !isActive;

            return (
              <button
                key={toolConfig.id}
                onClick={() => !isDisabled && onToolSelect(toolConfig.id)}
                disabled={isDisabled}
                className={cn(
                  // Base - large touch target
                  'w-full flex items-center gap-4',
                  'min-h-[72px] p-4',
                  'rounded-xl',
                  'transition-all duration-200',
                  'touch-manipulation',
                  'text-left',
                  // State
                  isActive && isProcessing
                    ? 'bg-blue-500/20 border-2 border-blue-500'
                    : 'bg-gray-800 border-2 border-transparent hover:bg-gray-700',
                  isDisabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  isActive && isProcessing
                    ? 'bg-blue-500/30 text-blue-400'
                    : 'bg-gray-700 text-gray-300'
                )}>
                  {getToolIcon(toolConfig.id, isActive && isProcessing)}
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h4 className="font-medium text-white">
                    {toolConfig.label}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {toolConfig.description}
                  </p>
                  
                  {/* Progress bar */}
                  {isActive && isProcessing && (
                    <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status indicator */}
                {isActive && isProcessing && (
                  <span className="text-xs text-blue-400">
                    {progress}%
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Processing message */}
        {isProcessing && (
          <p className="text-xs text-gray-500 text-center">
            Processing may take a few seconds...
          </p>
        )}

        {/* Help text */}
        {!isProcessing && (
          <p className="text-xs text-gray-500 text-center">
            Tap a tool to apply it to your image
          </p>
        )}
      </div>
    </BottomSheet>
  );
}

export default AIToolsSheet;
