/**
 * AskAISheet Component
 * Bottom sheet for natural language AI commands on mobile
 * Users can type prompts like "Add bold text" or "Remove background"
 */

import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Loader2, X, Lightbulb } from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { BottomSheet } from '../BottomSheet';

// Suggested prompts for quick selection
const SUGGESTED_PROMPTS = [
  'Add bold white text',
  'Remove background',
  'Make it dramatic',
  'Enhance quality',
  'Upscale 2x',
  'Add shadow effect',
];

interface AskAISheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isProcessing: boolean;
}

export function AskAISheet({
  isOpen,
  onClose,
  onSubmit,
  isProcessing,
}: AskAISheetProps) {
  const [prompt, setPrompt] = useState('');
  const [recentPrompts, setRecentPrompts] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when sheet opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to let sheet animate in
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    if (!isOpen) {
      setPrompt('');
    }
  }, [isOpen]);

  // Handle submit
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    const trimmedPrompt = prompt.trim();
    
    // Add to recent prompts (keep last 5)
    setRecentPrompts(prev => {
      const filtered = prev.filter(p => p !== trimmedPrompt);
      return [trimmedPrompt, ...filtered].slice(0, 5);
    });

    await onSubmit(trimmedPrompt);
    setPrompt('');
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
    inputRef.current?.focus();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Ask AI"
      snapPoint="half"
    >
      <div className="flex flex-col h-full">
        {/* Input area */}
        <form onSubmit={handleSubmit} className="mb-4">
          <div className={cn(
            'flex items-center gap-2 p-3',
            'bg-gray-800 rounded-xl',
            'border-2 border-gray-700',
            'focus-within:border-blue-500 transition-colors'
          )}>
            <Sparkles size={20} className="text-blue-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to do..."
              disabled={isProcessing}
              className={cn(
                'flex-1 bg-transparent',
                'text-white placeholder-gray-500',
                'text-base outline-none',
                'min-h-[44px]'  // Touch-friendly height
              )}
            />
            {prompt && !isProcessing && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="p-1 text-gray-500 hover:text-gray-300"
              >
                <X size={18} />
              </button>
            )}
            <button
              type="submit"
              disabled={!prompt.trim() || isProcessing}
              className={cn(
                'w-10 h-10 rounded-full',
                'flex items-center justify-center',
                'transition-all duration-200',
                prompt.trim() && !isProcessing
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-700 text-gray-500'
              )}
            >
              {isProcessing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </form>

        {/* Suggested prompts */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={16} className="text-yellow-500" />
            <span className="text-sm text-gray-400">Try saying...</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
                disabled={isProcessing}
                className={cn(
                  'px-3 py-2 rounded-full',
                  'bg-gray-800 text-gray-300',
                  'text-sm',
                  'hover:bg-gray-700 active:bg-gray-600',
                  'transition-colors',
                  'touch-manipulation',
                  isProcessing && 'opacity-50'
                )}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        {/* Recent prompts */}
        {recentPrompts.length > 0 && (
          <div>
            <span className="text-sm text-gray-500 mb-2 block">Recent</span>
            <div className="flex flex-col gap-1">
              {recentPrompts.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(recent)}
                  disabled={isProcessing}
                  className={cn(
                    'px-3 py-2 rounded-lg',
                    'bg-gray-800/50 text-gray-400',
                    'text-sm text-left',
                    'hover:bg-gray-800 active:bg-gray-700',
                    'transition-colors',
                    'touch-manipulation'
                  )}
                >
                  {recent}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Processing indicator */}
        {isProcessing && (
          <div className="mt-auto pt-4 flex items-center justify-center gap-2 text-blue-400">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Processing your request...</span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

export default AskAISheet;
