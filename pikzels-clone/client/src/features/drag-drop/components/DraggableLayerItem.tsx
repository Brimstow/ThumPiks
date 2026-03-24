/**
 * DraggableLayerItem Component
 * 
 * Makes a layer item draggable for removal operations (drag to trash zone).
 * This is separate from the sortable layer reordering in the layers panel.
 * Used within the TemplateDragDropProvider context.
 * 
 * WCAG 2.5.7 Compliance:
 * - Focusable elements for keyboard navigation
 * - aria-label describing the item and action
 * - aria-grabbed state attribute
 * - Visual focus indicators
 */
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/react';
import type { CanvasLayerDragItem } from '../types';
import type { Layer } from '../../../components/editor/types/editor.types';

export interface DraggableLayerItemProps {
  /** The layer this item represents */
  layer: Layer;
  /** Child content (usually the layer row UI) */
  children: React.ReactNode;
  /** Whether dragging is disabled */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Draggable wrapper for layer items in the layers panel.
 * 
 * Enables layers to be dragged to the trash zone for removal.
 * Works alongside the existing sortable layer reordering.
 */
export const DraggableLayerItem: React.FC<DraggableLayerItemProps> = ({
  layer,
  children,
  disabled = false,
  className = '',
}) => {
  const dragData: CanvasLayerDragItem = {
    type: 'canvas-layer',
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    groupId: layer.groupId,
  };

  const { ref, isDragging } = useDraggable({
    id: `draggable-layer-${layer.id}`,
    data: dragData,
    disabled: disabled || layer.locked,
  });

  const isDisabled = disabled || layer.locked;

  return (
    <div
      ref={ref}
      className={`draggable-layer-item ${className} ${isDragging ? 'draggable-layer-item--dragging' : ''}`}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDisabled ? 'default' : 'grab',
        touchAction: 'none',
      }}
      aria-label={`Layer: ${layer.name}. ${isDisabled ? 'Locked.' : 'Drag to trash zone to remove.'}`}
      aria-grabbed={isDragging}
    >
      {children}
    </div>
  );
};

/**
 * Alternative: A draggable handle that can be added to any layer row.
 * Users can grab this handle to drag layers to the trash zone.
 */
export interface LayerDragHandleProps {
  /** The layer this handle represents */
  layer: Layer;
  /** Whether dragging is disabled */
  disabled?: boolean;
}

export const LayerDragHandle: React.FC<LayerDragHandleProps> = ({
  layer,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  const dragData: CanvasLayerDragItem = {
    type: 'canvas-layer',
    layerId: layer.id,
    layerName: layer.name,
    layerType: layer.type,
    groupId: layer.groupId,
  };

  const { ref, isDragging } = useDraggable({
    id: `layer-drag-handle-${layer.id}`,
    data: dragData,
    disabled: disabled || layer.locked,
  });

  const isDisabled = disabled || layer.locked;

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      className={`layer-drag-handle ${isDragging ? 'layer-drag-handle--dragging' : ''} ${isFocused ? 'layer-drag-handle--focused' : ''}`}
      aria-disabled={isDisabled || undefined}
      aria-label={`Remove ${layer.name}. ${isDisabled ? 'Layer is locked.' : 'Drag to trash zone to remove.'}`}
      aria-grabbed={isDragging}
      aria-describedby="drag-instructions"
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        padding: 0,
        background: 'transparent',
        border: 'none',
        borderRadius: 4,
        cursor: isDisabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        color: isDisabled 
          ? 'var(--editor-text-muted, rgba(255,255,255,0.3))' 
          : 'var(--editor-text-secondary, rgba(255,255,255,0.6))',
        opacity: isDragging ? 0.5 : 1,
        outline: isFocused ? '2px solid var(--editor-accent, #6366f1)' : 'none',
        outlineOffset: '1px',
        transition: 'color 150ms, background 150ms, outline 150ms',
        touchAction: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.background = 'var(--editor-bg-light, rgba(255,255,255,0.1))';
          e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = isDisabled 
          ? 'var(--editor-text-muted, rgba(255,255,255,0.3))' 
          : 'var(--editor-text-secondary, rgba(255,255,255,0.6))';
      }}
      title={isDisabled ? 'Layer is locked' : 'Drag to trash to remove'}
    >
      {/* Trash icon when hovered, grip dots otherwise */}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    </div>
  );
};

export default DraggableLayerItem;
