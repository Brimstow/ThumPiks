/**
 * useTemplateDragDrop Hook
 * 
 * Manages state for template-to-canvas drag-and-drop operations.
 * Tracks dragging state, provides handlers for drag events, and
 * generates accessibility announcements.
 */
import { useState, useCallback } from 'react';
import type { LayoutPreset, CompositionState } from '../../composition-templates/types';
import type { TemplateDragItem } from '../types';
import { isTemplateDragItem } from '../types';

/**
 * Configuration for the template drag-drop hook
 */
export interface UseTemplateDragDropConfig {
  /** Callback when a template is dropped on the canvas */
  onDropOnCanvas: (
    template: LayoutPreset,
    compositionState: CompositionState,
    dropPosition: { x: number; y: number }
  ) => void;
  /** Canvas dimensions for coordinate calculations */
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Return type for useTemplateDragDrop hook
 */
export interface UseTemplateDragDropReturn {
  /** Whether a template is currently being dragged */
  isDragging: boolean;
  /** The template currently being dragged, if any */
  draggingTemplate: LayoutPreset | null;
  /** The composition state of the dragging template */
  draggingCompositionState: CompositionState | null;
  /** Whether the drag is currently over the canvas */
  isOverCanvas: boolean;
  /** Current screen reader announcement */
  announcement: string;
  /** Handler for drag start event */
  handleDragStart: (event: unknown) => void;
  /** Handler for drag over canvas event */
  handleDragOverCanvas: (isOver: boolean) => void;
  /** Handler for drag end event */
  handleDragEnd: (event: unknown, canvasRect?: DOMRect | null, dropClientPosition?: { x: number; y: number } | null) => void;
}

/**
 * Hook for managing template-to-canvas drag-drop state
 * 
 * @param config - Configuration with drop callback and canvas dimensions
 * @returns Drag state and handlers
 * 
 * @example
 * ```tsx
 * const { isDragging, handleDragStart, handleDragEnd } = useTemplateDragDrop({
 *   onDropOnCanvas: (template, state, position) => {
 *     const layers = compositionToLayers(template, state);
 *     layers.forEach(layer => dispatch({ type: 'ADD_LAYER', layer }));
 *   },
 *   canvasWidth: 1920,
 *   canvasHeight: 1080,
 * });
 * ```
 */
export function useTemplateDragDrop(config: UseTemplateDragDropConfig): UseTemplateDragDropReturn {
  const { onDropOnCanvas, canvasWidth, canvasHeight } = config;

  const [isDragging, setIsDragging] = useState(false);
  const [draggingTemplate, setDraggingTemplate] = useState<LayoutPreset | null>(null);
  const [draggingCompositionState, setDraggingCompositionState] = useState<CompositionState | null>(null);
  const [isOverCanvas, setIsOverCanvas] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  /**
   * Handle drag start - called when a template begins dragging
   */
  const handleDragStart = useCallback((event: unknown) => {
    // Extract template data from event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dndEvent = event as any;
    const source = dndEvent?.operation?.source;
    
    if (!source) return;

    const data = source.data;
    if (isTemplateDragItem(data)) {
      setIsDragging(true);
      setDraggingTemplate(data.template);
      setDraggingCompositionState(data.compositionState);
      setAnnouncement(`Dragging template "${data.template.name}". Drop on canvas to add as layers.`);
    }
  }, []);

  /**
   * Handle drag over canvas state change
   */
  const handleDragOverCanvas = useCallback((isOver: boolean) => {
    setIsOverCanvas(isOver);
    if (isOver && draggingTemplate) {
      setAnnouncement(`Over canvas. Release to add "${draggingTemplate.name}" as layers.`);
    }
  }, [draggingTemplate]);

  /**
   * Handle drag end - finalize drop or cancel
   */
  const handleDragEnd = useCallback((
    event: unknown,
    canvasRect?: DOMRect | null,
    dropClientPosition?: { x: number; y: number } | null
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dndEvent = event as any;
    const source = dndEvent?.operation?.source;
    const canceled = dndEvent?.canceled;

    if (canceled) {
      setAnnouncement('Drag cancelled.');
      setIsDragging(false);
      setDraggingTemplate(null);
      setDraggingCompositionState(null);
      setIsOverCanvas(false);
      return;
    }

    if (!source) {
      setIsDragging(false);
      setDraggingTemplate(null);
      setDraggingCompositionState(null);
      setIsOverCanvas(false);
      return;
    }

    const data = source.data;
    
    if (isTemplateDragItem(data) && isOverCanvas && canvasRect && dropClientPosition) {
      // Calculate drop position relative to canvas
      // Convert from viewport coordinates to canvas coordinates
      const relativeX = dropClientPosition.x - canvasRect.left;
      const relativeY = dropClientPosition.y - canvasRect.top;
      
      // Scale to canvas coordinate space
      const scaleX = canvasWidth / canvasRect.width;
      const scaleY = canvasHeight / canvasRect.height;
      
      const canvasX = Math.floor(relativeX * scaleX);
      const canvasY = Math.floor(relativeY * scaleY);

      // Call the drop handler
      onDropOnCanvas(data.template, data.compositionState, { x: canvasX, y: canvasY });
      setAnnouncement(`Added "${data.template.name}" to canvas as ${data.template.slots.length + data.template.textSlots.length} layers.`);
    } else if (isTemplateDragItem(data)) {
      setAnnouncement('Template not dropped on canvas.');
    }

    setIsDragging(false);
    setDraggingTemplate(null);
    setDraggingCompositionState(null);
    setIsOverCanvas(false);
  }, [isOverCanvas, canvasWidth, canvasHeight, onDropOnCanvas]);

  return {
    isDragging,
    draggingTemplate,
    draggingCompositionState,
    isOverCanvas,
    announcement,
    handleDragStart,
    handleDragOverCanvas,
    handleDragEnd,
  };
}
