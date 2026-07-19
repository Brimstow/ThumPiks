/**
 * Drag-and-Drop Feature Types
 * 
 * Domain types for layer reordering drag-drop functionality
 * and template-to-canvas drag-drop functionality.
 */

import type { LayoutPreset, CompositionState } from '../composition-templates/types';

/**
 * Data transferred when dragging a layer item
 */
export interface LayerDragItem {
  /** Unique layer ID */
  id: string;
  /** Current index in layer order */
  index: number;
  /** Item type discriminator */
  type: 'layer';
}

/**
 * Data transferred when dragging a canvas layer to trash/removal zone.
 * Extends LayerDragItem with additional metadata for group operations.
 */
export interface CanvasLayerDragItem {
  /** Item type discriminator */
  type: 'canvas-layer';
  /** Unique layer ID */
  layerId: string;
  /** Layer name for display */
  layerName: string;
  /** Layer type (image, text, shape, etc.) */
  layerType: string;
  /** Group ID if this layer was created from a template drop */
  groupId?: string;
}

/**
 * Data transferred when dragging a composition template
 */
export interface TemplateDragItem {
  /** Item type discriminator */
  type: 'template';
  /** The template being dragged */
  template: LayoutPreset;
  /** Current composition state (filled slots) */
  compositionState: CompositionState;
}

/**
 * Union type for all drag item types
 */
export type DragItemData = LayerDragItem | TemplateDragItem | CanvasLayerDragItem;

/**
 * Type guard for template drag items
 */
export function isTemplateDragItem(data: unknown): data is TemplateDragItem {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as { type: string }).type === 'template'
  );
}

/**
 * Type guard for layer drag items
 */
export function isLayerDragItem(data: unknown): data is LayerDragItem {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as { type: string }).type === 'layer'
  );
}

/**
 * Type guard for canvas layer drag items (for trash/removal)
 */
export function isCanvasLayerDragItem(data: unknown): data is CanvasLayerDragItem {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    (data as { type: string }).type === 'canvas-layer'
  );
}

/**
 * Configuration for the sortable layers hook
 */
export interface SortableLayersConfig {
  /** Array of layer IDs in render order */
  layerOrder: string[];
  /** Callback when layers are reordered */
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/**
 * Return type for useSortableLayers hook
 */
export interface UseSortableLayersReturn {
  /** ID of currently dragging layer, null if not dragging */
  isDraggingId: string | null;
  /** Current screen reader announcement */
  announcement: string;
  /** Handler for drag end event - call to finalize reorder */
  handleDragEnd: () => void;
}

/**
 * Props for sortable layer item component
 */
export interface SortableLayerItemProps {
  /** Unique layer ID */
  id: string;
  /** Index in layer order */
  index: number;
  /** Layer item content */
  children: React.ReactNode;
}

/**
 * Props for layer sortable list container
 */
export interface LayerSortableListProps {
  /** Array of layer IDs in render order */
  layerOrder: string[];
  /** Callback when reorder completes */
  onReorder: (fromIndex: number, toIndex: number) => void;
  /** Layer items */
  children: React.ReactNode;
}

/**
 * Props for drag handle component
 */
export interface DragHandleProps {
  /** Whether this handle's item is currently being dragged */
  isDragging: boolean;
  /** Optional aria-label override */
  ariaLabel?: string;
}

/**
 * Minimal type for @dnd-kit drag events.
 * Uses structural compatibility to accept DragStartEvent/DragEndEvent/DragMoveEvent.
 */
export interface DndEvent {
  operation: {
    source: {
      id: string | number;
      data: unknown;
    } | null;
    target?: {
      id: string | number;
      data: unknown;
    } | null;
    position?: {
      current?: { x: number; y: number };
    };
  };
  canceled?: boolean;
}
