/**
 * useDragDropFocus Hook
 * 
 * Manages focus after drag-drop operations for WCAG 2.5.7 compliance.
 * 
 * Focus management rules:
 * - After template drop on canvas: focus moves to layers panel (new layer)
 * - After layer removal: focus moves to next layer (or previous if last)
 * - After drag cancel: focus returns to original draggable element
 */
import { useCallback, useRef } from 'react';

export interface UseDragDropFocusConfig {
  /** ID of container element for layer items */
  layersPanelId?: string;
  /** Selector for layer item elements */
  layerItemSelector?: string;
}

export interface UseDragDropFocusReturn {
  /** Focus the layer at the given index */
  focusLayer: (index: number) => void;
  /** Focus the next layer after removal at given index */
  focusNextLayer: (removedIndex: number, totalLayers: number) => void;
  /** Store reference to draggable element before drag starts */
  storeDragSource: (element: HTMLElement | null) => void;
  /** Return focus to stored drag source (for cancel) */
  returnFocusToDragSource: () => void;
  /** Focus the layers panel header or first layer */
  focusLayersPanel: () => void;
}

/**
 * Hook for managing focus during and after drag-drop operations.
 * 
 * Ensures proper focus management per WCAG 2.5.7 requirements:
 * - Focus should move to a logical location after operations
 * - Users should not lose their place after completing an action
 * 
 * @example
 * ```tsx
 * const { focusNextLayer, storeDragSource, returnFocusToDragSource } = useDragDropFocus({
 *   layersPanelId: 'layers-panel',
 *   layerItemSelector: '[data-sortable-id]',
 * });
 * 
 * // Before drag starts
 * storeDragSource(dragHandleElement);
 * 
 * // After drop completes
 * focusNextLayer(removedIndex, remainingLayers.length);
 * 
 * // After drag cancel
 * returnFocusToDragSource();
 * ```
 */
export function useDragDropFocus(config: UseDragDropFocusConfig = {}): UseDragDropFocusReturn {
  const {
    layersPanelId = 'layers-panel',
    layerItemSelector = '[data-sortable-id]',
  } = config;

  // Store reference to drag source element for focus return
  const dragSourceRef = useRef<HTMLElement | null>(null);

  /**
   * Get all layer item elements from the layers panel
   */
  const getLayerElements = useCallback((): HTMLElement[] => {
    const panel = document.getElementById(layersPanelId);
    if (!panel) {
      // Fallback: try to find by class
      const fallbackPanel = document.querySelector('.layers-panel');
      if (!fallbackPanel) return [];
      return Array.from(fallbackPanel.querySelectorAll(layerItemSelector)) as HTMLElement[];
    }
    return Array.from(panel.querySelectorAll(layerItemSelector)) as HTMLElement[];
  }, [layersPanelId, layerItemSelector]);

  /**
   * Focus a focusable element within a layer item
   */
  const focusWithinLayer = useCallback((layerElement: HTMLElement) => {
    // Try to focus the drag handle first (most common interaction point)
    const dragHandle = layerElement.querySelector('[aria-label*="Drag"], .drag-handle, .layer-drag-handle');
    if (dragHandle && dragHandle instanceof HTMLElement) {
      dragHandle.focus();
      return true;
    }

    // Fallback: focus the layer item itself if focusable
    if (layerElement.tabIndex >= 0) {
      layerElement.focus();
      return true;
    }

    // Fallback: focus any button within the layer
    const button = layerElement.querySelector('button');
    if (button) {
      button.focus();
      return true;
    }

    return false;
  }, []);

  /**
   * Focus the layer at the given index
   */
  const focusLayer = useCallback((index: number) => {
    // Use requestAnimationFrame to wait for DOM updates
    requestAnimationFrame(() => {
      const layers = getLayerElements();
      if (layers.length === 0) return;

      // Clamp index to valid range
      const safeIndex = Math.max(0, Math.min(index, layers.length - 1));
      const targetLayer = layers[safeIndex];
      
      if (targetLayer) {
        focusWithinLayer(targetLayer);
      }
    });
  }, [getLayerElements, focusWithinLayer]);

  /**
   * Focus the next layer after a layer is removed
   * 
   * @param removedIndex - The index of the removed layer
   * @param totalLayers - The total number of layers remaining after removal
   */
  const focusNextLayer = useCallback((removedIndex: number, totalLayers: number) => {
    if (totalLayers === 0) {
      // No layers left, focus the layers panel
      focusLayersPanel();
      return;
    }

    // If removed was last layer, focus the new last layer
    // Otherwise, focus the layer that took the removed layer's place
    const newFocusIndex = removedIndex >= totalLayers ? totalLayers - 1 : removedIndex;
    focusLayer(newFocusIndex);
  }, [focusLayer]);

  /**
   * Store reference to the drag source element
   */
  const storeDragSource = useCallback((element: HTMLElement | null) => {
    dragSourceRef.current = element;
  }, []);

  /**
   * Return focus to the stored drag source element
   */
  const returnFocusToDragSource = useCallback(() => {
    if (dragSourceRef.current && document.body.contains(dragSourceRef.current)) {
      dragSourceRef.current.focus();
      dragSourceRef.current = null;
    }
  }, []);

  /**
   * Focus the layers panel header or first layer
   */
  const focusLayersPanel = useCallback(() => {
    requestAnimationFrame(() => {
      // Try to focus the layers panel title/header
      const panelHeader = document.querySelector('.layers-panel__header, .layers-panel__title');
      if (panelHeader && panelHeader instanceof HTMLElement && panelHeader.tabIndex >= 0) {
        panelHeader.focus();
        return;
      }

      // Fallback: focus first layer if exists
      const layers = getLayerElements();
      if (layers.length > 0) {
        focusWithinLayer(layers[0]);
        return;
      }

      // Last fallback: focus the add layer button
      const addButton = document.querySelector('.layers-panel__action[title="Add layer"]');
      if (addButton && addButton instanceof HTMLElement) {
        addButton.focus();
      }
    });
  }, [getLayerElements, focusWithinLayer]);

  return {
    focusLayer,
    focusNextLayer,
    storeDragSource,
    returnFocusToDragSource,
    focusLayersPanel,
  };
}

export default useDragDropFocus;
