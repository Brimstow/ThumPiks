/**
 * DragHandle Component
 * 
 * Accessible drag handle for sortable items.
 * Provides keyboard navigation support for WCAG 2.5.7 compliance.
 * 
 * Features:
 * - Focusable button element
 * - aria-grabbed state attribute
 * - aria-describedby referencing instructions
 * - Visual focus indicators
 */
import React, { useContext } from 'react';
import { SortableItemContext } from './SortableLayerItem';
import type { DragHandleProps } from '../types';
import { LAYER_DRAG_INSTRUCTIONS } from '../accessibility';

/**
 * Grip icon for drag handle
 */
const GripIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
    style={{ width: '16px', height: '16px' }}
  >
    <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Accessible drag handle component
 * 
 * Must be used inside a SortableLayerItem to function correctly.
 * Connects to @dnd-kit/react's handleRef for drag activation.
 * 
 * @example
 * ```tsx
 * <SortableLayerItem id={layer.id} index={index}>
 *   <DragHandle />
 *   <span>{layer.name}</span>
 * </SortableLayerItem>
 * ```
 */
export const DragHandle: React.FC<DragHandleProps> = ({
  isDragging: isDraggingProp,
  ariaLabel = 'Drag to reorder layer',
}) => {
  const sortableContext = useContext(SortableItemContext);
  
  // Use prop if provided, otherwise fall back to context
  const isDragging = isDraggingProp ?? sortableContext?.isDragging ?? false;
  const handleRef = sortableContext?.handleRef;

  return (
    <button
      ref={handleRef as React.RefObject<HTMLButtonElement>}
      type="button"
      aria-label={ariaLabel}
      aria-grabbed={isDragging}
      aria-describedby="drag-instructions"
      className={`drag-handle ${isDragging ? 'drag-handle--active' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        padding: '4px',
        border: 'none',
        background: 'transparent',
        color: isDragging ? 'var(--editor-accent-primary, #3b82f6)' : 'var(--editor-text-muted, #9ca3af)',
        cursor: isDragging ? 'grabbing' : 'grab',
        borderRadius: 'var(--editor-radius-sm, 4px)',
        transition: 'color 150ms ease, background 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!isDragging) {
          e.currentTarget.style.background = 'var(--editor-bg-light, rgba(255,255,255,0.1))';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <GripIcon />
    </button>
  );
};

/**
 * Screen reader instructions for drag handle
 * Include this once in your app, hidden from visual users
 */
export const DragInstructions: React.FC = () => (
  <div 
    id="drag-instructions" 
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
    {LAYER_DRAG_INSTRUCTIONS}
  </div>
);
