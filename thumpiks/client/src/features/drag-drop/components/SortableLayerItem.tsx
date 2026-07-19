/**
 * SortableLayerItem Component
 * 
 * Wrapper component that makes a layer item sortable via drag-and-drop.
 * Uses @dnd-kit/react useSortable hook.
 */
import React, { useContext } from 'react';
import { useSortable } from '@dnd-kit/react/sortable';
import { LayerDragContext } from './LayerSortableList';
import type { SortableLayerItemProps } from '../types';

/**
 * Context for passing sortable state to children (like DragHandle)
 */
export interface SortableItemContextValue {
  isDragging: boolean;
  handleRef: React.RefCallback<Element> | React.RefObject<Element>;
}

export const SortableItemContext = React.createContext<SortableItemContextValue | null>(null);

/**
 * Sortable wrapper for individual layer items
 * 
 * @example
 * ```tsx
 * <SortableLayerItem id={layer.id} index={index}>
 *   <div className="layer-item">
 *     <DragHandle />
 *     <span>{layer.name}</span>
 *   </div>
 * </SortableLayerItem>
 * ```
 */
export const SortableLayerItem: React.FC<SortableLayerItemProps> = ({
  id,
  index,
  children,
}) => {
  const { ref, handleRef, isDragSource } = useSortable({ id, index });
  const { isDraggingId } = useContext(LayerDragContext);
  
  // isDragging is true when THIS item is being dragged
  const isDragging = isDraggingId === id || isDragSource;

  return (
    <SortableItemContext.Provider value={{ isDragging, handleRef }}>
      <div
        ref={ref}
        data-sortable-id={id}
        data-sortable-index={index}
        style={{
          // Provide visual feedback during drag
          opacity: isDragging ? 0.5 : 1,
          transform: isDragging ? 'scale(1.02)' : 'scale(1)',
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
      >
        {children}
      </div>
    </SortableItemContext.Provider>
  );
};

/**
 * Hook to access sortable item context from child components
 */
export function useSortableItemContext(): SortableItemContextValue | null {
  return useContext(SortableItemContext);
}
