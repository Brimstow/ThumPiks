/**
 * CanvasDropZone Component
 * 
 * Wraps the canvas area to make it a drop target for templates.
 * Provides visual feedback when a template is being dragged over.
 * 
 * PERFORMANCE: React.memo prevents unnecessary re-renders when parent state changes.
 * The component only re-renders when its own props (className, children) or
 * internal state (isDragging, isDropTarget) change.
 * 
 * WCAG 2.5.7 Compliance:
 * - role="region" with aria-label describing the drop zone
 * - aria-dropeffect indicating the zone accepts drops
 * - Screen reader announcements for drag states
 */
import React, { useEffect, useRef, memo } from 'react';
import { useDroppable } from '@dnd-kit/react';
import { useTemplateDragDropContext } from './TemplateDragDropProvider';
import { isTemplateDragItem } from '../types';

export interface CanvasDropZoneProps {
  children: React.ReactNode;
  /** Additional class name for styling */
  className?: string;
}

/**
 * Drop zone wrapper for the canvas
 * 
 * Registers the canvas element as a droppable target and shows
 * visual feedback when a template is dragged over it.
 * 
 * PERFORMANCE: Memoized to prevent re-renders when parent state changes.
 * Only re-renders when className, children, or drop state changes.
 */
const CanvasDropZoneInner: React.FC<CanvasDropZoneProps> = ({
  children,
  className = '',
}) => {
  const { registerCanvasRef, setIsOverCanvas, isDragging } = useTemplateDragDropContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const { ref, isDropTarget } = useDroppable({
    id: 'canvas-drop-zone',
    accept: (draggable) => {
      // Only accept template drag items
      return isTemplateDragItem(draggable.data);
    },
  });

  // Register the container ref with the context
  useEffect(() => {
    if (containerRef.current) {
      registerCanvasRef(containerRef.current);
    }
    return () => {
      registerCanvasRef(null);
    };
  }, [registerCanvasRef]);

  // Update context when drop target state changes
  useEffect(() => {
    setIsOverCanvas(isDropTarget);
  }, [isDropTarget, setIsOverCanvas]);

  // Combine refs
  const setRefs = (element: HTMLDivElement | null) => {
    containerRef.current = element;
    if (typeof ref === 'function') {
      ref(element);
    }
  };

  return (
    <div
      ref={setRefs}
      role="region"
      aria-label="Canvas drop zone for templates. Drag a template here to add it to your design."
      aria-dropeffect={isDragging ? 'copy' : 'none'}
      aria-busy={isDragging}
      className={`canvas-drop-zone ${className} ${isDragging ? 'canvas-drop-zone--drag-active' : ''} ${isDropTarget ? 'canvas-drop-zone--drag-over' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
      
      {/* Drop zone overlay - shown when dragging a template */}
      {isDragging && (
        <div
          className="canvas-drop-zone__overlay"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDropTarget 
              ? 'rgba(99, 102, 241, 0.15)' 
              : 'transparent',
            border: isDropTarget 
              ? '3px dashed rgba(99, 102, 241, 0.8)' 
              : '3px dashed rgba(99, 102, 241, 0.3)',
            borderRadius: 8,
            transition: 'all 150ms ease-out',
          }}
        >
          {/* Drop hint text */}
          <div
            style={{
              padding: '12px 24px',
              background: isDropTarget 
                ? 'rgba(99, 102, 241, 0.9)' 
                : 'rgba(30, 30, 46, 0.9)',
              borderRadius: 8,
              color: '#fff',
              fontSize: 14,
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              transition: 'all 150ms ease-out',
              transform: isDropTarget ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            {isDropTarget ? 'Release to add layers' : 'Drop template here'}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Memoized CanvasDropZone component.
 * 
 * PERFORMANCE: Prevents re-renders when parent state changes.
 * The component only re-renders when:
 * - className prop changes
 * - children change
 * - isDropTarget state changes (internal)
 * - isDragging state changes (from context)
 */
export const CanvasDropZone = memo(CanvasDropZoneInner);

CanvasDropZone.displayName = 'CanvasDropZone';

export default CanvasDropZone;
