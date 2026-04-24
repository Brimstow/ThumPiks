/**
 * TemplateDragDropProvider Component
 * 
 * Provides drag-drop context for template-to-canvas operations AND
 * canvas layer-to-trash operations (bidirectional drag support).
 * Separate from the layer reordering DragDropProvider to avoid conflicts.
 * Includes DragOverlay for visual feedback during drag.
 * 
 * WCAG 2.5.7 Compliance:
 * - Keyboard navigation: Space/Enter to pick, Arrow keys to move, Enter to drop, Escape to cancel
 * - Screen reader announcements via aria-live regions
 * - Non-dragging alternatives provided via click-to-place fallback
 */
import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import { DragDropProvider, DragOverlay } from '@dnd-kit/react';
import type { LayoutPreset, CompositionState } from '../../composition-templates/types';
import { useTemplateDragDrop, type UseTemplateDragDropReturn } from '../hooks/useTemplateDragDrop';
import { isTemplateDragItem, isCanvasLayerDragItem, type CanvasLayerDragItem } from '../types';
import {
  buildTemplateAnnouncement,
  buildLayerRemovalAnnouncement,
  TEMPLATE_DRAG_INSTRUCTIONS,
} from '../accessibility';

/**
 * Context value for template drag-drop state
 */
export interface TemplateDragDropContextValue {
  /** Whether a template is currently being dragged */
  isDragging: boolean;
  /** The template being dragged */
  draggingTemplate: LayoutPreset | null;
  /** Whether the drag is over the canvas drop zone */
  isOverCanvas: boolean;
  /** Register the canvas element as drop target */
  registerCanvasRef: (ref: HTMLElement | null) => void;
  /** Notify when drag enters/leaves canvas */
  setIsOverCanvas: (isOver: boolean) => void;
  /** Whether a canvas layer is being dragged (for trash zone) */
  isDraggingLayer: boolean;
  /** The canvas layer being dragged */
  draggingLayer: CanvasLayerDragItem | null;
  /** Whether a layer drag is over the trash zone */
  isOverTrash: boolean;
  /** Notify when layer drag enters/leaves trash zone */
  setIsOverTrash: (isOver: boolean) => void;
  /** Whether a layer drag is over the reset zone (layouts panel) */
  isOverReset: boolean;
  /** Notify when layer drag enters/leaves reset zone */
  setIsOverReset: (isOver: boolean) => void;
  /** Click-to-place: add a template to canvas at default position */
  addTemplateToCanvas: (template: LayoutPreset, compositionState: CompositionState) => void;
  /** Current screen reader announcement (for external access) */
  announcement: string;
}

const TemplateDragDropContext = createContext<TemplateDragDropContextValue>({
  isDragging: false,
  draggingTemplate: null,
  isOverCanvas: false,
  registerCanvasRef: () => {},
  setIsOverCanvas: () => {},
  isDraggingLayer: false,
  draggingLayer: null,
  isOverTrash: false,
  setIsOverTrash: () => {},
  isOverReset: false,
  setIsOverReset: () => {},
  addTemplateToCanvas: () => {},
  announcement: '',
});

/**
 * Hook to access template drag-drop context
 */
export const useTemplateDragDropContext = () => useContext(TemplateDragDropContext);

/**
 * Props for TemplateDragDropProvider
 */
export interface TemplateDragDropProviderProps {
  children: React.ReactNode;
  /** Callback when template is dropped on canvas */
  onDropTemplate: (
    template: LayoutPreset,
    compositionState: CompositionState,
    dropPosition: { x: number; y: number }
  ) => void;
  /** Callback when a layer is dropped on the trash zone */
  onDropLayerToTrash?: (layerId: string, groupId?: string) => void;
  /** Canvas width for coordinate calculations */
  canvasWidth: number;
  /** Canvas height for coordinate calculations */
  canvasHeight: number;
}

/**
 * Template preview shown in DragOverlay
 * 
 * PERFORMANCE: React.memo prevents re-renders when parent state changes.
 * The preview only re-renders when the template itself changes.
 * Uses lightweight rendering - only shows template name to minimize DOM complexity.
 */
const TemplatePreview = React.memo<{ template: LayoutPreset }>(({ template }) => {
  return (
    <div
      style={{
        width: 180,
        height: 101,
        background: 'var(--editor-bg-medium, #2a2a3e)',
        borderRadius: 8,
        border: '2px solid var(--editor-accent, #6366f1)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      {/* Lightweight wireframe preview - dangerouslySetInnerHTML is acceptable here
          because wireframeSvg comes from trusted template data, and this component
          is already memoized to prevent re-renders */}
      <div
        style={{
          width: '100%',
          height: '70%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--editor-bg-dark, #1a1a2e)',
        }}
        dangerouslySetInnerHTML={{ __html: template.wireframeSvg }}
      />
      {/* Template name */}
      <div
        style={{
          padding: '6px 8px',
          fontSize: 11,
          fontWeight: 500,
          color: 'var(--editor-text-primary, #fff)',
          textAlign: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {template.name}
      </div>
    </div>
  );
});

TemplatePreview.displayName = 'TemplatePreview';

/**
 * Layer preview shown in DragOverlay when dragging a canvas layer
 * 
 * PERFORMANCE: React.memo prevents re-renders when parent state changes.
 * The preview only re-renders when the layer data changes.
 */
const LayerPreview = React.memo<{ layer: CanvasLayerDragItem }>(({ layer }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--editor-bg-medium, #2a2a3e)',
        borderRadius: 8,
        border: '2px solid rgba(239, 68, 68, 0.6)',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
        pointerEvents: 'none',
        willChange: 'transform',
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(239, 68, 68, 0.9)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--editor-text-primary, #fff)',
          maxWidth: 150,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {layer.layerName}
      </div>
      {layer.groupId && (
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            background: 'rgba(99, 102, 241, 0.3)',
            borderRadius: 4,
            color: 'rgba(255, 255, 255, 0.8)',
          }}
        >
          Template
        </span>
      )}
    </div>
  );
});

LayerPreview.displayName = 'LayerPreview';

/**
 * Provider component for template-to-canvas and layer-to-trash drag-drop
 */
export const TemplateDragDropProvider: React.FC<TemplateDragDropProviderProps> = ({
  children,
  onDropTemplate,
  onDropLayerToTrash,
  canvasWidth,
  canvasHeight,
}) => {
  const canvasRef = useRef<HTMLElement | null>(null);
  const lastDropPosition = useRef<{ x: number; y: number } | null>(null);

  // State for canvas layer drags (for trash zone)
  const [isDraggingLayer, setIsDraggingLayer] = useState(false);
  const [draggingLayer, setDraggingLayer] = useState<CanvasLayerDragItem | null>(null);
  const [layerAnnouncement, setLayerAnnouncement] = useState('');
  const [isOverTrash, setIsOverTrashState] = useState(false);
  const [isOverReset, setIsOverResetState] = useState(false);
  
  // Polite announcements for position updates (less urgent)
  const [politeAnnouncement, setPoliteAnnouncement] = useState('');
  
  // Track trash/reset state in ref to access in onDragEnd without stale closure
  const isOverTrashRef = useRef(false);
  const isOverResetRef = useRef(false);
  const draggingLayerRef = useRef<CanvasLayerDragItem | null>(null);

  const {
    isDragging,
    draggingTemplate,
    isOverCanvas,
    announcement,
    handleDragStart: handleTemplateDragStart,
    handleDragOverCanvas,
    handleDragEnd: handleTemplateDragEnd,
  } = useTemplateDragDrop({
    onDropOnCanvas: onDropTemplate,
    canvasWidth,
    canvasHeight,
  });

  const registerCanvasRef = useCallback((ref: HTMLElement | null) => {
    canvasRef.current = ref;
  }, []);

  const setIsOverCanvas = useCallback((isOver: boolean) => {
    handleDragOverCanvas(isOver);
  }, [handleDragOverCanvas]);

  // Set isOverTrash and sync to ref
  const setIsOverTrash = useCallback((isOver: boolean) => {
    setIsOverTrashState(isOver);
    isOverTrashRef.current = isOver;
    if (isOver && draggingLayerRef.current) {
      setPoliteAnnouncement(
        buildTemplateAnnouncement('over-trash', draggingLayerRef.current.layerName)
      );
    }
  }, []);

  // Set isOverReset and sync to ref
  const setIsOverReset = useCallback((isOver: boolean) => {
    setIsOverResetState(isOver);
    isOverResetRef.current = isOver;
    if (isOver && draggingLayerRef.current) {
      setPoliteAnnouncement(
        'Over layouts panel. Release to remove template layers from canvas.'
      );
    }
  }, []);

  // Handle drag start - detect template vs layer drags
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = useCallback((event: any) => {
    const source = event?.operation?.source;
    if (!source?.data) return;

    if (isTemplateDragItem(source.data)) {
      handleTemplateDragStart(event);
    } else if (isCanvasLayerDragItem(source.data)) {
      setIsDraggingLayer(true);
      setDraggingLayer(source.data);
      draggingLayerRef.current = source.data;
      const layerCount = source.data.groupId ? undefined : 1;
      setLayerAnnouncement(
        buildTemplateAnnouncement('pickup', source.data.layerName, layerCount)
      );
    }
  }, [handleTemplateDragStart]);

  // Handle drag end with canvas rect and position
  const onDragEnd = useCallback((event: unknown) => {
    // Handle template drag end
    const canvasRect = canvasRef.current?.getBoundingClientRect() ?? null;
    handleTemplateDragEnd(event, canvasRect, lastDropPosition.current);
    lastDropPosition.current = null;

    // Handle layer drag end - check if dropped on trash zone or reset zone
    if (draggingLayerRef.current) {
      const layer = draggingLayerRef.current;
      
      if (isOverTrashRef.current && onDropLayerToTrash) {
        // Layer was dropped on trash zone - pass groupId so the handler can
        // decide whether to remove just this layer or the entire template group
        onDropLayerToTrash(layer.layerId, layer.groupId);
        setLayerAnnouncement(
          buildLayerRemovalAnnouncement(layer.layerName, false)
        );
      } else if (isOverResetRef.current && onDropLayerToTrash && layer.groupId) {
        // Layer was dropped on reset zone (layouts panel) - remove the template group
        onDropLayerToTrash(layer.layerId, layer.groupId);
        setLayerAnnouncement(
          'Template layers removed from canvas.'
        );
      } else {
        setLayerAnnouncement(
          buildTemplateAnnouncement('cancel', layer.layerName)
        );
      }
      
      // Reset layer drag state
      setIsDraggingLayer(false);
      setDraggingLayer(null);
      draggingLayerRef.current = null;
      setIsOverTrashState(false);
      isOverTrashRef.current = false;
      setIsOverResetState(false);
      isOverResetRef.current = false;
      setPoliteAnnouncement('');
    }
  }, [handleTemplateDragEnd, onDropLayerToTrash]);

  // Throttle ref for onDragMove - prevents excessive position updates
  // PERFORMANCE: Limits position updates to 16ms (one frame at 60fps)
  const lastDragMoveTime = useRef(0);
  const THROTTLE_MS = 16; // ~60fps

  // Track mouse position during drag for drop coordinates
  // PERFORMANCE: Throttled to 16ms to prevent excessive updates during drag
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onDragMove = useCallback((event: any) => {
    // Throttle check - skip if called too frequently
    const now = Date.now();
    if (now - lastDragMoveTime.current < THROTTLE_MS) {
      return;
    }
    lastDragMoveTime.current = now;

    // Check if source is a template drag
    const source = event?.operation?.source;
    if (source?.data && isTemplateDragItem(source.data)) {
      // Get current pointer position from the event
      // Use Math.floor for integer coordinates (better rendering performance)
      const position = event?.operation?.position?.current;
      if (position) {
        lastDropPosition.current = {
          x: Math.floor(position.x),
          y: Math.floor(position.y),
        };
      }
    }
  }, []);

  /**
   * Click-to-place fallback: Add template to canvas at center position.
   * This is the WCAG 2.5.7 non-dragging alternative.
   */
  const addTemplateToCanvas = useCallback((template: LayoutPreset, compositionState: CompositionState) => {
    // Calculate center position
    const centerX = Math.floor(canvasWidth / 2);
    const centerY = Math.floor(canvasHeight / 2);
    
    // Call the drop handler with center position
    onDropTemplate(template, compositionState, { x: centerX, y: centerY });
    
    // Announce for screen readers
    const layerCount = template.slots.length + template.textSlots.length;
    setLayerAnnouncement(
      buildTemplateAnnouncement('drop-canvas', template.name, layerCount)
    );
  }, [canvasWidth, canvasHeight, onDropTemplate]);

  // Combine announcements - prefer assertive (layer/template operations) over polite
  const combinedAnnouncement = announcement || layerAnnouncement || politeAnnouncement;

  const contextValue: TemplateDragDropContextValue = {
    isDragging,
    draggingTemplate,
    isOverCanvas,
    registerCanvasRef,
    setIsOverCanvas,
    isDraggingLayer,
    draggingLayer,
    isOverTrash,
    setIsOverTrash,
    isOverReset,
    setIsOverReset,
    addTemplateToCanvas,
    announcement: combinedAnnouncement,
  };

  return (
    <TemplateDragDropContext.Provider value={contextValue}>
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        onDragMove={onDragMove}
      >
        {children}
        
        {/* DragOverlay for template preview */}
        <DragOverlay>
          {isDragging && draggingTemplate && (
            <TemplatePreview template={draggingTemplate} />
          )}
          {isDraggingLayer && draggingLayer && (
            <LayerPreview layer={draggingLayer} />
          )}
        </DragOverlay>

        {/* ARIA live region for assertive announcements (drag start/end) */}
        <div
          role="status"
          aria-live="assertive"
          aria-atomic="true"
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
          {announcement || layerAnnouncement}
        </div>

        {/* ARIA live region for polite announcements (position updates) */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
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
          {politeAnnouncement}
        </div>

        {/* Hidden instructions for screen readers - referenced by aria-describedby */}
        <div
          id="template-drag-instructions"
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
          {TEMPLATE_DRAG_INSTRUCTIONS}
        </div>
      </DragDropProvider>
    </TemplateDragDropContext.Provider>
  );
};
