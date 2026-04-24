/**
 * LayerSortableList Component
 * 
 * Container component that provides the drag-drop context for sortable layers.
 * Uses @dnd-kit/react DragDropProvider with optimistic sorting.
 */
import React, { useCallback, useState } from 'react';
import { DragDropProvider } from '@dnd-kit/react';
import { isSortable, type SortableDraggable } from '@dnd-kit/dom/sortable';
import { buildLayerAnnouncement } from '../accessibility';
import type { LayerSortableListProps } from '../types';

/**
 * Context for passing drag state to children
 */
export interface LayerDragContextValue {
  isDraggingId: string | null;
}

export const LayerDragContext = React.createContext<LayerDragContextValue>({
  isDraggingId: null,
});

/**
 * Sortable list container for layers
 * 
 * @example
 * ```tsx
 * <LayerSortableList layerOrder={layerOrder} onReorder={onLayerReorder}>
 *   {layers.map((layer, index) => (
 *     <SortableLayerItem key={layer.id} id={layer.id} index={index}>
 *       <LayerContent layer={layer} />
 *     </SortableLayerItem>
 *   ))}
 * </LayerSortableList>
 * ```
 */
export const LayerSortableList: React.FC<LayerSortableListProps> = ({
  layerOrder,
  onReorder,
  children,
}) => {
  const [isDraggingId, setIsDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragStart = useCallback((event: any) => {
    const source = event.operation?.source;
    if (!source) return;
    
    const sourceId = String(source.id);
    setIsDraggingId(sourceId);
    
    const index = layerOrder.indexOf(sourceId);
    if (index !== -1) {
      setAnnouncement(
        buildLayerAnnouncement('pickup', `Layer ${index + 1}`, index + 1, layerOrder.length)
      );
    }
  }, [layerOrder]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleDragEnd = useCallback((event: any) => {
    setIsDraggingId(null);

    if (event.canceled) {
      setAnnouncement('Drag cancelled.');
      return;
    }

    const source = event.operation?.source;
    if (!source) return;

    if (isSortable(source)) {
      // Source is the draggable, which has initialIndex
      // Cast to SortableDraggable since drag source is always the draggable
      const sortableSource = source as SortableDraggable<Record<string, unknown>>;
      const initialIndex = sortableSource.initialIndex;
      const finalIndex = sortableSource.index;

      if (initialIndex !== finalIndex) {
        onReorder(initialIndex, finalIndex);
        setAnnouncement(
          buildLayerAnnouncement('drop', `Layer ${finalIndex + 1}`, finalIndex + 1, layerOrder.length)
        );
      } else {
        setAnnouncement('');
      }
    }
  }, [layerOrder.length, onReorder]);

  return (
    <LayerDragContext.Provider value={{ isDraggingId }}>
      <DragDropProvider
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {children}
        {/* ARIA live region for screen reader announcements */}
        <div 
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
          {announcement}
        </div>
      </DragDropProvider>
    </LayerDragContext.Provider>
  );
};
