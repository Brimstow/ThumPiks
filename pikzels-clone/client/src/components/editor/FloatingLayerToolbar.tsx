/**
 * FloatingLayerToolbar
 * 
 * Contextual toolbar that appears near selected layers, providing
 * quick AI actions (Remove BG, Enhance, Upscale, etc.)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useBackendAI, BackendAIOperation } from '../../hooks/useBackendAI';
import type { Layer, ImageLayer } from './types/editor.types';
import Tooltip from '../ui/Tooltip';

// ============================================
// TYPES
// ============================================

interface FloatingLayerToolbarProps {
  selectedLayers: Layer[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface AIAction {
  id: BackendAIOperation;
  label: string;
  icon: React.ReactNode;
  creditCost: number;
  requiresImage: boolean;
}

// ============================================
// ICONS (inline SVGs for minimal dependencies)
// ============================================

const Icons = {
  RemoveBg: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
    </svg>
  ),
  Enhance: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Upscale: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  ),
  Inpaint: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M12 19l7-7 3 3-7 7-3-3z" />
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
      <path d="M2 2l7.586 7.586" />
      <circle cx="11" cy="11" r="2" />
    </svg>
  ),
  FaceSwap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="9" cy="9" r="6" />
      <path d="M15 9a6 6 0 1 1 0 12" strokeDasharray="3 2" />
      <path d="M12 15l4-4 4 4" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

// ============================================
// AI ACTIONS CONFIG
// ============================================

const AI_ACTIONS: AIAction[] = [
  {
    id: 'remove-background',
    label: 'Remove BG',
    icon: <Icons.RemoveBg />,
    creditCost: 1,
    requiresImage: true,
  },
  {
    id: 'enhance',
    label: 'Enhance',
    icon: <Icons.Enhance />,
    creditCost: 1,
    requiresImage: true,
  },
  {
    id: 'upscale',
    label: 'Upscale',
    icon: <Icons.Upscale />,
    creditCost: 2,
    requiresImage: true,
  },
];

// ============================================
// COMPONENT
// ============================================

export const FloatingLayerToolbar: React.FC<FloatingLayerToolbarProps> = ({
  selectedLayers,
  onUpdateLayer,
  canvasContainerRef,
}) => {
  const { callBackendAI, isLoading, progress } = useBackendAI();
  const [activeOperation, setActiveOperation] = useState<BackendAIOperation | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);

  // Get the first selected image layer (AI ops only work on images)
  const selectedImageLayer = useMemo(() => {
    return selectedLayers.find((layer): layer is ImageLayer => layer.type === 'image');
  }, [selectedLayers]);

  // Calculate toolbar position based on layer bounds
  // Positioned ABOVE the layer to avoid overlapping with ContextualToolbar (which appears below)
  const toolbarPosition = useMemo(() => {
    if (!selectedImageLayer || !canvasContainerRef.current) {
      return null;
    }

    const container = canvasContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    // Get layer transform for positioning
    const { transform } = selectedImageLayer;
    
    // Calculate position relative to canvas container
    const layerCenterX = transform.x + transform.width / 2;

    // Toolbar dimensions (approximate)
    const toolbarWidth = 280;
    const toolbarHeight = 50;

    // Calculate initial position - ABOVE the layer (avoids ContextualToolbar below)
    let left = layerCenterX - toolbarWidth / 2;
    let top = transform.y - toolbarHeight - 12;

    // Viewport clamping - keep toolbar within container bounds
    const padding = 10;
    
    // Clamp horizontal
    if (left < padding) {
      left = padding;
    } else if (left + toolbarWidth > containerRect.width - padding) {
      left = containerRect.width - toolbarWidth - padding;
    }

    // If no room above, fall back to further below the layer (below ContextualToolbar)
    if (top < padding) {
      const contextualToolbarHeight = 48; // approximate height of ContextualToolbar
      top = transform.y + transform.height + contextualToolbarHeight + 24;
    }

    // Final safety clamp
    top = Math.max(padding, Math.min(top, containerRect.height - toolbarHeight - padding));

    return { left, top };
  }, [selectedImageLayer, canvasContainerRef]);

  // Handle AI operation
  const handleAIAction = useCallback(async (action: AIAction) => {
    if (!selectedImageLayer || isLoading) return;

    setActiveOperation(action.id);

    try {
      const request: Record<string, unknown> = {
        image: selectedImageLayer.src,
      };

      // Add operation-specific parameters
      if (action.id === 'upscale') {
        request.scale = 2;
      }

      const results = await callBackendAI(action.id, request);

      if (results && results.length > 0) {
        // Update the layer with the new image
        onUpdateLayer(selectedImageLayer.id, {
          src: results[0],
        } as Partial<ImageLayer>);
      }
    } catch (error) {
      console.error(`AI ${action.id} failed:`, error);
      // Error is handled by useBackendAI hook
    } finally {
      setActiveOperation(null);
    }
  }, [selectedImageLayer, isLoading, callBackendAI, onUpdateLayer]);

  // Don't render if no image layer selected or position can't be calculated
  if (!selectedImageLayer || !toolbarPosition) {
    return null;
  }

  return (
    <div
      className="floating-toolbar"
      style={{
        position: 'absolute',
        left: toolbarPosition.left,
        top: toolbarPosition.top,
        zIndex: 200,
      }}
    >
      {AI_ACTIONS.map((action) => {
        const isActive = activeOperation === action.id;
        const isDisabled = isLoading || !action.requiresImage;

        return (
          <div key={action.id} className="floating-toolbar__btn-wrapper">
            <Tooltip content={`${action.label} (${action.creditCost} credit${action.creditCost > 1 ? 's' : ''})`} side="top">
            <button
              className={`floating-toolbar__btn ${isActive ? 'floating-toolbar__btn--active' : ''}`}
              onClick={() => handleAIAction(action)}
              onMouseEnter={() => setHoveredAction(action.id)}
              onMouseLeave={() => setHoveredAction(null)}
              disabled={isDisabled}
            >
              {isActive ? <Icons.Loader /> : action.icon}
              <span className="floating-toolbar__btn-label">{action.label}</span>
            </button>
            </Tooltip>
          </div>
        );
      })}

      {/* Progress indicator */}
      {isLoading && (
        <div className="floating-toolbar__progress">
          <div 
            className="floating-toolbar__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(FloatingLayerToolbar);
