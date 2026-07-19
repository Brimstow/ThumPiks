/**
 * DraggableTemplateCard Component
 * 
 * A draggable wrapper for template cards in the template picker.
 * Enables templates to be dragged and dropped onto the canvas.
 * 
 * WCAG 2.5.7 Compliance:
 * - Focusable with keyboard (tabindex="0" via explicit tabIndex prop)
 * - role="button" with aria-roledescription="draggable template"
 * 
 * NOTE: Uses <div role="button"> instead of <button> because @dnd-kit/dom's
 * PointerSensor default preventActivation calls isInteractiveElement() which
 * matches any element.closest('button:not([disabled])'), blocking drag activation
 * when the pointer target is a child of the draggable button.
 * - aria-label describing the template
 * - aria-grabbed state attribute
 * - aria-describedby referencing instructions
 * - Visual focus indicators
 * - "Add to Canvas" button as click-to-place fallback
 */
import React, { useState } from 'react';
import { useDraggable } from '@dnd-kit/react';
import type { LayoutPreset, CompositionState } from '../../composition-templates/types';
import type { TemplateDragItem } from '../types';
import { useTemplateDragDropContext } from './TemplateDragDropProvider';
import Tooltip from '../../../components/ui/Tooltip';

export interface DraggableTemplateCardProps {
  /** The template this card represents */
  template: LayoutPreset;
  /** Current composition state for this template (filled slots) */
  compositionState: CompositionState;
  /** Whether this template is selected in the picker */
  isSelected?: boolean;
  /** Whether this template is hovered */
  isHovered?: boolean;
  /** Click handler for selection */
  onClick?: () => void;
  /** Mouse enter handler */
  onMouseEnter?: () => void;
  /** Mouse leave handler */
  onMouseLeave?: () => void;
  /** Child content (usually the card UI) */
  children: React.ReactNode;
  /** Whether dragging is disabled (e.g., template is incomplete) */
  disabled?: boolean;
  /** Show "Add to Canvas" button (click-to-place fallback) */
  showAddButton?: boolean;
  /** Custom handler for adding to canvas (overrides context method) */
  onAddToCanvas?: (template: LayoutPreset, compositionState: CompositionState) => void;
}

/**
 * Draggable wrapper for template cards
 * 
 * Wraps template card content and makes it draggable via @dnd-kit.
 * The card can still be clicked for selection when not dragging.
 * 
 * Includes "Add to Canvas" button as WCAG 2.5.7 non-dragging alternative.
 */
export const DraggableTemplateCard: React.FC<DraggableTemplateCardProps> = ({
  template,
  compositionState,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
  disabled = false,
  showAddButton = true,
  onAddToCanvas,
}) => {
  const { addTemplateToCanvas } = useTemplateDragDropContext();
  const [isFocused, setIsFocused] = useState(false);

  const dragData: TemplateDragItem = {
    type: 'template',
    template,
    compositionState,
  };

  const { ref, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: dragData,
    disabled,
  });

  // Handle "Add to Canvas" button click
  const handleAddToCanvas = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAddToCanvas) {
      onAddToCanvas(template, compositionState);
    } else {
      addTemplateToCanvas(template, compositionState);
    }
  };

  // Build descriptive aria-label
  const ariaLabel = `Template: ${template.name}. ` +
    `${template.slots.length} image slot${template.slots.length !== 1 ? 's' : ''}, ` +
    `${template.textSlots.length} text slot${template.textSlots.length !== 1 ? 's' : ''}. ` +
    'Drag to canvas or press Enter to add. Unfilled slots become placeholders.';

  // Build tooltip content for the template card
  const cardTooltipContent = disabled
    ? 'Fill all required slots to use this template'
    : (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <strong>{template.name}</strong>
        {template.description && <span style={{ opacity: 0.85 }}>{template.description}</span>}
        <span style={{ opacity: 0.7, fontSize: 11 }}>
          {template.slots.length} image slot{template.slots.length !== 1 ? 's' : ''}
          {template.textSlots.length > 0 && `, ${template.textSlots.length} text slot${template.textSlots.length !== 1 ? 's' : ''}`}
        </span>
        <span style={{ opacity: 0.6, fontSize: 10 }}>Drag onto canvas or click + to add</span>
      </span>
    );

  return (
    <div
      className={`comp-picker-card-wrapper ${isFocused ? 'comp-picker-card-wrapper--focused' : ''}`}
      style={{ position: 'relative' }}
    >
      <Tooltip content={cardTooltipContent} side="right" sideOffset={8} delayDuration={500}>
        <div
          ref={ref}
          role="button"
          tabIndex={disabled ? -1 : 0}
          draggable={false}
          aria-roledescription="draggable template"
          aria-label={ariaLabel}
          aria-grabbed={isDragging}
          aria-describedby="template-drag-instructions"
          aria-pressed={isSelected}
          aria-disabled={disabled || undefined}
          className={`comp-picker-card ${isSelected ? 'comp-picker-card--selected' : ''} ${isHovered ? 'comp-picker-card--hover' : ''} ${isDragging ? 'comp-picker-card--dragging' : ''} ${isFocused ? 'comp-picker-card--focused' : ''}`}
          onClick={onClick}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && onClick) {
              e.preventDefault();
              onClick();
            }
          }}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onDragStart={(e) => e.preventDefault()}
          style={{
            opacity: isDragging ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
            outline: isFocused ? '2px solid var(--editor-accent, #6366f1)' : undefined,
            outlineOffset: '2px',
            touchAction: 'none',
          }}
        >
          {children}
        </div>
      </Tooltip>

      {/* "Add to Canvas" button - WCAG 2.5.7 non-dragging alternative */}
      {showAddButton && !disabled && (
        <Tooltip content="Add this template to the canvas" side="top" sideOffset={4} delayDuration={300}>
          <button
            type="button"
            className="comp-picker-card__add-btn"
            onClick={handleAddToCanvas}
            aria-label={`Add ${template.name} template to canvas`}
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              width: 24,
              height: 24,
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--editor-accent, #6366f1)',
              border: 'none',
              borderRadius: 4,
              color: '#fff',
              cursor: 'pointer',
              opacity: isHovered || isFocused ? 1 : 0,
              transform: isHovered || isFocused ? 'scale(1)' : 'scale(0.9)',
              transition: 'opacity 150ms ease, transform 150ms ease',
              zIndex: 10,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </Tooltip>
      )}
    </div>
  );
};

export default DraggableTemplateCard;
