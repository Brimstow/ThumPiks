/**
 * TemplateResetDropZone Component
 *
 * A wrapper drop zone for the Layouts panel that accepts dragged template layers.
 * When a layer that belongs to a template group is dropped here, it removes
 * the entire template group from the canvas — effectively "returning" the template.
 *
 * The actual drop handling is done by TemplateDragDropProvider.onDragEnd,
 * which checks isOverResetRef and calls onDropLayerToTrash with the groupId.
 *
 * PERFORMANCE: React.memo prevents unnecessary re-renders.
 *
 * WCAG compliance:
 * - role="region" with aria-label
 * - aria-dropeffect="move"
 * - Screen reader announcements via context
 */
import React, { useEffect, memo } from 'react';
import { useDroppable } from '@dnd-kit/react';
import { isCanvasLayerDragItem } from '../types';
import { useTemplateDragDropContext } from './TemplateDragDropProvider';

export interface TemplateResetDropZoneProps {
  children: React.ReactNode;
}

/**
 * Reset zone that wraps the Layouts tab content.
 * Only accepts canvas-layer drags that have a groupId (template layers).
 */
const TemplateResetDropZoneInner: React.FC<TemplateResetDropZoneProps> = ({ children }) => {
  const { isDraggingLayer, draggingLayer, setIsOverReset } = useTemplateDragDropContext();

  // Only accept canvas-layer drags with a groupId (template layers)
  const { ref, isDropTarget } = useDroppable({
    id: 'template-reset-drop-zone',
    accept: (draggable) => {
      if (!isCanvasLayerDragItem(draggable.data)) return false;
      return draggable.data.groupId != null;
    },
  });

  // Notify context when drag enters/leaves reset zone
  useEffect(() => {
    setIsOverReset(isDropTarget);
  }, [isDropTarget, setIsOverReset]);

  // Whether a valid template layer is being dragged (show visual feedback)
  const showFeedback = isDraggingLayer && draggingLayer?.groupId != null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={showFeedback
        ? `Layouts panel. Drop "${draggingLayer?.layerName || 'layer'}" here to remove template from canvas.`
        : 'Layouts panel'
      }
      aria-dropeffect={showFeedback ? 'move' : 'none'}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {children}

      {/* Overlay feedback when dragging a valid template layer */}
      {showFeedback && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 8,
            border: isDropTarget
              ? '2.5px solid rgba(99, 102, 241, 0.9)'
              : '2px dashed rgba(99, 102, 241, 0.5)',
            background: isDropTarget
              ? 'rgba(99, 102, 241, 0.12)'
              : 'rgba(99, 102, 241, 0.04)',
            pointerEvents: 'none',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 150ms ease-out',
          }}
        >
          {/* Return icon */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isDropTarget ? 'rgba(99, 102, 241, 0.95)' : 'rgba(99, 102, 241, 0.6)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isDropTarget ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 150ms ease-out, stroke 150ms ease-out',
            }}
          >
            <polyline points="9 14 4 9 9 4" />
            <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
          </svg>

          <span
            style={{
              color: isDropTarget ? 'rgba(99, 102, 241, 0.95)' : 'rgba(99, 102, 241, 0.7)',
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              transition: 'color 150ms ease-out',
              userSelect: 'none',
            }}
          >
            {isDropTarget
              ? 'Release to remove template'
              : 'Drop here to remove from canvas'}
          </span>
        </div>
      )}
    </div>
  );
};

export const TemplateResetDropZone = memo(TemplateResetDropZoneInner);
TemplateResetDropZone.displayName = 'TemplateResetDropZone';

export default TemplateResetDropZone;
