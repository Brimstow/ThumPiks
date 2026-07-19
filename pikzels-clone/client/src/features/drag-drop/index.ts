/**
 * Drag-and-Drop Feature Module
 * 
 * Provides accessible drag-and-drop for layer reordering and
 * template-to-canvas drag-and-drop functionality.
 * Built on @dnd-kit/react v0.3.2 for React 19 compatibility.
 * 
 * ## Usage - Layer Reordering
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
 * ## Usage - Template to Canvas
 * 
 * ```tsx
 * import { TemplateDragDropProvider, CanvasDropZone, DraggableTemplateCard } from '@/features/drag-drop';
 * 
 * function Editor() {
 *   return (
 *     <TemplateDragDropProvider onDropTemplate={handleDrop} canvasWidth={1920} canvasHeight={1080}>
 *       <TemplatePicker />
 *       <CanvasDropZone>
 *         <CanvasEngine />
 *       </CanvasDropZone>
 *     </TemplateDragDropProvider>
 *   );
 * }
 * ```
 * 
 * @module features/drag-drop
 */

// Types
export type {
  LayerDragItem,
  TemplateDragItem,
  CanvasLayerDragItem,
  DragItemData,
  SortableLayersConfig,
  UseSortableLayersReturn,
  SortableLayerItemProps,
  LayerSortableListProps,
  DragHandleProps,
} from './types';

export { isTemplateDragItem, isLayerDragItem, isCanvasLayerDragItem } from './types';

// Accessibility utilities
export {
  buildLayerAnnouncement,
  buildTemplateAnnouncement,
  buildLayerRemovalAnnouncement,
  DRAG_KEYS,
  TEMPLATE_DRAG_INSTRUCTIONS,
  LAYER_DRAG_INSTRUCTIONS,
  KEYBOARD_MOVE_STEP,
  isPickupDropKey,
  isMoveUpKey,
  isMoveDownKey,
  isCancelKey,
} from './accessibility';
export type { DragEventType, TemplateDragEventType } from './accessibility';

// Hooks
export { useSortableLayers } from './hooks/useSortableLayers';
export { useTemplateDragDrop } from './hooks/useTemplateDragDrop';
export type { UseTemplateDragDropConfig, UseTemplateDragDropReturn } from './hooks/useTemplateDragDrop';
export { useDragDropFocus } from './hooks/useDragDropFocus';
export type { UseDragDropFocusConfig, UseDragDropFocusReturn } from './hooks/useDragDropFocus';

// Components - Layer Reordering
export { LayerSortableList, LayerDragContext } from './components/LayerSortableList';
export type { LayerDragContextValue } from './components/LayerSortableList';

export { SortableLayerItem, SortableItemContext, useSortableItemContext } from './components/SortableLayerItem';
export type { SortableItemContextValue } from './components/SortableLayerItem';

export { DragHandle, DragInstructions } from './components/DragHandle';

// Components - Template to Canvas
export { TemplateDragDropProvider, useTemplateDragDropContext } from './components/TemplateDragDropProvider';
export type { TemplateDragDropContextValue, TemplateDragDropProviderProps } from './components/TemplateDragDropProvider';

export { CanvasDropZone } from './components/CanvasDropZone';
export type { CanvasDropZoneProps } from './components/CanvasDropZone';

export { DraggableTemplateCard } from './components/DraggableTemplateCard';
export type { DraggableTemplateCardProps } from './components/DraggableTemplateCard';

// Components - Layer to Trash (Bidirectional drag)
export { TrashDropZone } from './components/TrashDropZone';
export type { TrashDropZoneProps } from './components/TrashDropZone';

export { DraggableLayerItem, LayerDragHandle } from './components/DraggableLayerItem';
export type { DraggableLayerItemProps, LayerDragHandleProps } from './components/DraggableLayerItem';

// Components - Template Reset (drag layer back to layouts panel)
export { TemplateResetDropZone } from './components/TemplateResetDropZone';
export type { TemplateResetDropZoneProps } from './components/TemplateResetDropZone';

// Components - Canvas Template Group Drag Handle (drag from canvas to layouts)
export { TemplateGroupDragHandle } from './components/TemplateGroupDragHandle';
export type { TemplateGroupDragHandleProps } from './components/TemplateGroupDragHandle';
