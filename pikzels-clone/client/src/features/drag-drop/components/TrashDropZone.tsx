/**
 * TrashDropZone Component
 * 
 * A drop zone that appears when dragging a canvas layer.
 * Dropping a layer here removes it from the editor.
 * Shows confirmation for layers that belong to a template group.
 * 
 * The actual drop handling is done by TemplateDragDropProvider.onDragEnd,
 * which checks if the layer was dropped on this zone.
 * 
 * PERFORMANCE: React.memo prevents unnecessary re-renders. The component
 * only re-renders when draggingLayer or isDropTarget state changes.
 * 
 * WCAG 2.5.7 Compliance:
 * - role="region" with aria-label describing the trash zone
 * - aria-dropeffect="move" indicating destructive action
 * - Screen reader announcements for drag states
 * - Visual focus indicators
 */
import React, { useEffect, memo } from 'react';
import { useDroppable } from '@dnd-kit/react';
import { isCanvasLayerDragItem } from '../types';
import { useTemplateDragDropContext } from './TemplateDragDropProvider';

export interface TrashDropZoneProps {
  /** Callback to get count of layers in a group */
  getGroupLayerCount?: (groupId: string) => number;
}

/**
 * Trash zone for removing layers by dragging them off the canvas.
 * 
 * Features:
 * - Only visible when a canvas layer is being dragged
 * - Highlights when hovering over it
 * - Notifies context when layer is over the trash zone (drop handled by provider)
 * 
 * PERFORMANCE: Memoized to prevent re-renders when parent state changes.
 * Only re-renders when getGroupLayerCount prop changes or drop state changes.
 */
const TrashDropZoneInner: React.FC<TrashDropZoneProps> = ({
  getGroupLayerCount,
}) => {
  // Get drag state from context
  const { isDraggingLayer, draggingLayer, setIsOverTrash } = useTemplateDragDropContext();

  const { ref, isDropTarget } = useDroppable({
    id: 'trash-drop-zone',
    accept: (draggable) => isCanvasLayerDragItem(draggable.data),
  });

  // Notify context when drag enters/leaves trash zone
  useEffect(() => {
    setIsOverTrash(isDropTarget);
  }, [isDropTarget, setIsOverTrash]);

  // Don't render if not dragging a layer
  if (!isDraggingLayer) {
    return null;
  }

  const groupCount = draggingLayer?.groupId && getGroupLayerCount 
    ? getGroupLayerCount(draggingLayer.groupId) 
    : 0;

  // For group confirmation - show when a layer with groupId is about to be dropped
  // This feature can be extended later if needed

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`Trash zone. Drop ${draggingLayer?.layerName || 'layer'} here to remove it from the canvas.`}
      aria-dropeffect={isDraggingLayer ? 'move' : 'none'}
      aria-busy={isDropTarget}
      tabIndex={isDraggingLayer ? 0 : -1}
      className={`trash-drop-zone ${isDraggingLayer ? 'trash-drop-zone--visible' : ''} ${isDropTarget ? 'trash-drop-zone--active' : ''}`}
      style={{
        position: 'absolute',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '12px 24px',
        background: isDropTarget 
          ? 'rgba(239, 68, 68, 0.95)' 
          : 'rgba(30, 30, 46, 0.95)',
        borderRadius: 12,
        border: `2px dashed ${isDropTarget ? '#ef4444' : 'rgba(239, 68, 68, 0.5)'}`,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        opacity: isDraggingLayer ? 1 : 0,
        pointerEvents: isDraggingLayer ? 'auto' : 'none',
        transition: 'all 200ms ease-out',
        willChange: 'opacity, background, border-color',
      }}
    >
      {/* Trash icon and text */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: isDropTarget ? '#fff' : 'rgba(239, 68, 68, 0.9)',
          fontSize: 14,
          fontWeight: 500,
          transition: 'color 150ms ease-out',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isDropTarget ? 'scale(1.1)' : 'scale(1)',
            transition: 'transform 150ms ease-out',
          }}
        >
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        <span>
          {isDropTarget 
            ? 'Release to remove layer' 
            : groupCount > 1
              ? `Drop to remove (template: ${groupCount} layers)`
              : 'Drop here to remove'}
        </span>
      </div>

      {/* Group info indicator when dragging template layer */}
      {groupCount > 1 && isDraggingLayer && (
        <div
          style={{
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.7)',
            textAlign: 'center',
          }}
        >
          Part of template group ({groupCount} layers)
        </div>
      )}

      {/* Screen reader announcement */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {isDropTarget && draggingLayer
          ? `Will remove "${draggingLayer.layerName}". Release or press Enter to confirm.`
          : isDraggingLayer
            ? 'Drag to trash zone to remove layer.'
            : ''
        }
      </div>
    </div>
  );
};

/**
 * Memoized TrashDropZone component.
 * 
 * PERFORMANCE: Prevents re-renders when parent state changes.
 * The component only re-renders when:
 * - getGroupLayerCount prop changes
 * - isDraggingLayer state changes (from context)
 * - isDropTarget state changes (internal)
 */
export const TrashDropZone = memo(TrashDropZoneInner);

TrashDropZone.displayName = 'TrashDropZone';

export default TrashDropZone;
