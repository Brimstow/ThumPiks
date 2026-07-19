/**
 * Contextual Quick Actions Toolbar
 * 
 * A floating toolbar that appears when layers are selected,
 * showing context-relevant AI actions based on layer type.
 * 
 * Inspired by Adobe Photoshop's Contextual Task Bar (2024-2025)
 */

import React, { useMemo, useCallback, useState } from 'react';
import type { Layer, ImageLayer, TextLayer, ShapeLayer, QuickAction, QuickActionType } from '../types/editor.types';

// ============================================
// ICONS
// ============================================

const Icons = {
  RemoveBg: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" /><path d="m5 11 9 9" />
    </svg>
  ),
  Upscale: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  Enhance: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Replace: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  Expand: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <polyline points="21 3 14 10" />
      <polyline points="3 21 10 14" />
    </svg>
  ),
  Inpaint: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </svg>
  ),
  FaceSwap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  ),
  Restyle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" />
    </svg>
  ),
  Effects: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Decompose: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z" />
      <path d="M7 7h.01" />
    </svg>
  ),
  Loader: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
};

// ============================================
// TYPES
// ============================================

interface ContextualToolbarProps {
  selectedLayers: Layer[];
  layerBounds: { x: number; y: number; width: number; height: number } | null;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  onAction: (action: QuickActionType, layerId: string) => void;
  loadingActions: Set<string>;  // Set of action IDs currently loading
}

// ============================================
// ACTION DEFINITIONS
// ============================================

const IMAGE_ACTIONS: QuickAction[] = [
  { id: 'remove-bg', label: 'Remove BG', icon: 'RemoveBg', enabled: true, loading: false, tooltip: 'Remove background with AI' },
  { id: 'upscale', label: 'Upscale', icon: 'Upscale', enabled: true, loading: false, tooltip: 'Upscale image 2x or 4x' },
  { id: 'enhance', label: 'Enhance', icon: 'Enhance', enabled: true, loading: false, tooltip: 'AI image enhancement' },
  { id: 'replace', label: 'Replace', icon: 'Replace', enabled: true, loading: false, tooltip: 'Replace object with AI' },
  { id: 'expand', label: 'Expand', icon: 'Expand', enabled: true, loading: false, tooltip: 'Generatively expand image' },
  { id: 'decompose', label: 'Decompose', icon: 'Decompose', enabled: true, loading: false, tooltip: 'Split image into layers (3 credits)' },
];

const TEXT_ACTIONS: QuickAction[] = [
  { id: 'ai-rewrite', label: 'AI Rewrite', icon: 'Sparkles', enabled: true, loading: false, tooltip: 'Generate click-worthy alternatives' },
  { id: 'restyle', label: 'Restyle', icon: 'Restyle', enabled: true, loading: false, tooltip: 'AI text styling' },
  { id: 'effects', label: 'Effects', icon: 'Effects', enabled: true, loading: false, tooltip: 'Add text effects' },
];

const SHAPE_ACTIONS: QuickAction[] = [
  { id: 'effects', label: 'Effects', icon: 'Effects', enabled: true, loading: false, tooltip: 'Add shape effects' },
];

// ============================================
// COMPONENT
// ============================================

const ContextualToolbar: React.FC<ContextualToolbarProps> = ({
  selectedLayers,
  layerBounds,
  canvasZoom,
  canvasPan,
  onAction,
  loadingActions,
}) => {
  // Don't show if no layers selected or no bounds
  if (selectedLayers.length === 0 || !layerBounds) {
    return null;
  }

  // Determine available actions based on selected layer type
  const actions = useMemo(() => {
    if (selectedLayers.length > 1) {
      // Multiple selection - show common actions only
      return [];
    }

    const layer = selectedLayers[0];
    switch (layer.type) {
      case 'image':
        return IMAGE_ACTIONS;
      case 'text':
        return TEXT_ACTIONS;
      case 'shape':
        return SHAPE_ACTIONS;
      default:
        return [];
    }
  }, [selectedLayers]);

  // Calculate toolbar position (below layer bounds)
  const toolbarStyle = useMemo(() => {
    const x = layerBounds.x + layerBounds.width / 2;
    const y = layerBounds.y + layerBounds.height + 12;
    
    return {
      position: 'absolute' as const,
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translateX(-50%)',
      zIndex: 1000,
    };
  }, [layerBounds]);

  const handleAction = useCallback((actionId: QuickActionType) => {
    if (selectedLayers.length === 1) {
      onAction(actionId, selectedLayers[0].id);
    }
  }, [selectedLayers, onAction]);

  // Get icon component by name
  const getIcon = (iconName: string, loading: boolean) => {
    if (loading) return <Icons.Loader />;
    const IconComponent = Icons[iconName as keyof typeof Icons];
    return IconComponent ? <IconComponent /> : null;
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="contextual-toolbar" style={toolbarStyle}>
      <div className="contextual-toolbar__inner">
        {actions.map((action) => {
          const isLoading = loadingActions.has(action.id);
          return (
            <button
              key={action.id}
              className={`contextual-toolbar__action ${isLoading ? 'loading' : ''}`}
              onClick={() => handleAction(action.id)}
              disabled={!action.enabled || isLoading}
              title={action.tooltip}
            >
              {getIcon(action.icon, isLoading)}
              <span className="contextual-toolbar__label">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(ContextualToolbar);
