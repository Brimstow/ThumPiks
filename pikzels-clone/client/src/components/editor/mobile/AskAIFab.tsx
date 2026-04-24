/**
 * AskAIFab Component
 * Floating Action Button for quick access to Ask AI feature
 * Positioned above the bottom toolbar, always visible
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface AskAIFabProps {
  onClick: () => void;
  isActive: boolean;
  disabled?: boolean;
}

export function AskAIFab({ onClick, isActive, disabled = false }: AskAIFabProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label="Ask AI"
      aria-pressed={isActive}
      className={cn(
        // Position - above bottom toolbar, right side
        'fixed right-4 z-40',
        'bottom-20',  // 64px (toolbar) + 16px gap
        
        // Size - large touch target
        'w-14 h-14',
        
        // Shape and styling
        'rounded-full',
        'flex items-center justify-center',
        'shadow-lg shadow-black/30',
        
        // Animation
        'transition-all duration-300',
        'active:scale-95',
        
        // Touch optimization
        'touch-manipulation',
        
        // State-based styling
        isActive
          ? 'bg-blue-500 text-white shadow-blue-500/30'
          : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white',
        
        // Hover effect (for devices that support it)
        'hover:shadow-xl hover:scale-105',
        
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
      )}
    >
      <Sparkles 
        size={24} 
        className={cn(
          'transition-transform duration-300',
          isActive && 'rotate-12'
        )} 
      />
      
      {/* Pulse animation when not active */}
      {!isActive && !disabled && (
        <span className="absolute inset-0 rounded-full bg-white/20 animate-ping" />
      )}
    </button>
  );
}

export default AskAIFab;
