/**
 * Drag-and-Drop Feature Types
 * 
 * Domain types for layer reordering drag-drop functionality.
 */

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
