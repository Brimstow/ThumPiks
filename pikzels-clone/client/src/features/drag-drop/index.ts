/**
 * Drag-and-Drop Feature Module
 * 
 * Provides accessible drag-and-drop for layer reordering.
 * Built on @dnd-kit/react v0.3.2 for React 19 compatibility.
 * 
 * ## Usage
 * 
 * ```tsx
 * import { LayerSortableList, SortableLayerItem, DragHandle } from '@/features/drag-drop';
 * 
 * function LayersList({ layers, layerOrder, onReorder }) {
 *   return (
 *     <LayerSortableList layerOrder={layerOrder} onReorder={onReorder}>
 *       {layers.map((layer, index) => (
 *         <SortableLayerItem key={layer.id} id={layer.id} index={index}>
 *           <div className="layer-item">
 *             <DragHandle />
 *             <span>{layer.name}</span>
 *           </div>
 *         </SortableLayerItem>
 *       ))}
 *     </LayerSortableList>
 *   );
 * }
 * ```
 * 
 * @module features/drag-drop
 */

// Types
export type {
  LayerDragItem,
  SortableLayersConfig,
  UseSortableLayersReturn,
  SortableLayerItemProps,
  LayerSortableListProps,
  DragHandleProps,
} from './types';

// Accessibility utilities
export {
  buildLayerAnnouncement,
  DRAG_KEYS,
  isPickupDropKey,
  isMoveUpKey,
  isMoveDownKey,
  isCancelKey,
} from './accessibility';
export type { DragEventType } from './accessibility';

// Hooks
export { useSortableLayers } from './hooks/useSortableLayers';

// Components
export { LayerSortableList, LayerDragContext } from './components/LayerSortableList';
export type { LayerDragContextValue } from './components/LayerSortableList';

export { SortableLayerItem, SortableItemContext, useSortableItemContext } from './components/SortableLayerItem';
export type { SortableItemContextValue } from './components/SortableLayerItem';

export { DragHandle, DragInstructions } from './components/DragHandle';
