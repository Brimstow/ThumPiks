/**
 * useSortableLayers Hook
 * 
 * Provides state management for sortable layer list using @dnd-kit/react.
 * Tracks current drag state and generates accessibility announcements.
 */
import { useState, useCallback } from 'react';
import { buildLayerAnnouncement } from '../accessibility';
import type { SortableLayersConfig, UseSortableLayersReturn } from '../types';

/**
 * Hook for managing sortable layers state
 * 
 * @param config - Configuration with layer order and reorder callback
 * @returns Drag state and handlers
 * 
 * @example
 * ```tsx
 * const { isDraggingId, announcement } = useSortableLayers({
 *   layerOrder,
 *   onReorder: handleLayerReorder
 * });
 * ```
 */
export function useSortableLayers(config: SortableLayersConfig): UseSortableLayersReturn {
  const { layerOrder, onReorder } = config;
  
  const [isDraggingId, setIsDraggingId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');
  const [pendingReorder, setPendingReorder] = useState<{
    fromIndex: number;
    toIndex: number;
  } | null>(null);

  /**
   * Handle drag start - called when a layer begins dragging
   */
  const handleDragStart = useCallback((layerId: string, layerName: string) => {
    setIsDraggingId(layerId);
    const index = layerOrder.indexOf(layerId);
    setAnnouncement(
      buildLayerAnnouncement('pickup', layerName, index + 1, layerOrder.length)
    );
  }, [layerOrder]);

  /**
   * Handle drag over - called when dragging over a new position
   */
  const handleDragOver = useCallback((layerName: string, newIndex: number) => {
    setAnnouncement(
      buildLayerAnnouncement('move', layerName, newIndex + 1, layerOrder.length)
    );
  }, [layerOrder.length]);

  /**
   * Handle drag end - finalize reorder
   */
  const handleDragEnd = useCallback(() => {
    if (pendingReorder) {
      onReorder(pendingReorder.fromIndex, pendingReorder.toIndex);
      setPendingReorder(null);
    }
    setIsDraggingId(null);
    // Announcement for drop is handled by the component
  }, [pendingReorder, onReorder]);

  /**
   * Handle drag cancel - return to original position
   */
  const handleDragCancel = useCallback((layerName: string, originalIndex: number) => {
    setIsDraggingId(null);
    setPendingReorder(null);
    setAnnouncement(
      buildLayerAnnouncement('cancel', layerName, originalIndex + 1, layerOrder.length)
    );
  }, [layerOrder.length]);

  /**
   * Set pending reorder - store indices for finalization
   */
  const setPendingReorderIndices = useCallback((fromIndex: number, toIndex: number) => {
    setPendingReorder({ fromIndex, toIndex });
  }, []);

  return {
    isDraggingId,
    announcement,
    handleDragEnd,
    // Internal handlers exposed via context
    _internal: {
      handleDragStart,
      handleDragOver,
      handleDragCancel,
      setPendingReorderIndices,
      setAnnouncement,
    }
  } as UseSortableLayersReturn;
}
