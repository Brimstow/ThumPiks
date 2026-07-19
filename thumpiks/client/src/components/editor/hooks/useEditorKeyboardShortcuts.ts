import { useEffect } from 'react';
import type { ToolType } from '../types/editor.types';

interface UseEditorKeyboardShortcutsOptions {
  dispatch: (action: any) => void;
  canUndo: boolean;
  canRedo: boolean;
  clearSelection: () => void;
  selectionLayerIds: string[];
  layers: Array<{ id: string; type: string; children?: string[] }>;
  layerOrder: string[];
  handleSave: () => void;
  handleExport: () => void;
  handleClearCanvas: () => void;
  setIsFullCanvas: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useEditorKeyboardShortcuts({
  dispatch,
  canUndo,
  canRedo,
  clearSelection,
  selectionLayerIds,
  layers,
  layerOrder,
  handleSave,
  handleExport,
  handleClearCanvas,
  setIsFullCanvas,
}: UseEditorKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isMod = e.ctrlKey || e.metaKey;

      // Tool shortcuts
      if (!isMod) {
        const toolMap: Record<string, ToolType> = {
          'v': 'select',
          'w': 'smart-select',
          'm': 'move',
          'b': 'brush',
          'e': 'eraser',
          'p': 'pen',
          'k': 'clone',
          'j': 'gradient',
          'r': 'rectangle',
          'o': 'ellipse',
          'g': 'polygon',
          'l': 'line',
          't': 'text',
          'i': 'eyedropper',
          'f': 'fill',
          'c': 'crop',
          'h': 'hand',
          'z': 'zoom',
        };

        if (toolMap[e.key.toLowerCase()]) {
          dispatch({ type: 'SET_TOOL', tool: toolMap[e.key.toLowerCase()] });
          return;
        }
      }

      // Modifier shortcuts
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo) dispatch({ type: 'REDO' });
            } else {
              if (canUndo) dispatch({ type: 'UNDO' });
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo) dispatch({ type: 'REDO' });
            break;
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'n':
            if (e.shiftKey) {
              e.preventDefault();
              handleClearCanvas();
            }
            break;
          case 'g':
            e.preventDefault();
            if (selectionLayerIds.length > 1) {
              dispatch({ type: 'GROUP_LAYERS', layerIds: selectionLayerIds });
            }
            break;
          case 'd':
            e.preventDefault();
            selectionLayerIds.forEach(id => {
              const layer = layers.find(l => l.id === id);
              if (layer) {
                dispatch({ type: 'DUPLICATE_LAYER', layerId: id });
              }
            });
            break;
          case 'a':
            e.preventDefault();
            if (e.shiftKey) {
              clearSelection();
            } else {
              dispatch({
                type: 'SET_SELECTION',
                selection: { layerIds: layers.map(l => l.id) },
              });
            }
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case '[':
            e.preventDefault();
            if (selectionLayerIds.length > 0 && layerOrder.length > 1) {
              const selectedId = selectionLayerIds[0];
              const currentIndex = layerOrder.indexOf(selectedId);
              if (currentIndex < layerOrder.length - 1) {
                const newOrder = [...layerOrder];
                [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
                dispatch({ type: 'REORDER_LAYERS', layerIds: newOrder });
              }
            }
            break;
          case ']':
            e.preventDefault();
            if (selectionLayerIds.length > 0 && layerOrder.length > 1) {
              const selectedId = selectionLayerIds[0];
              const currentIndex = layerOrder.indexOf(selectedId);
              if (currentIndex > 0) {
                const newOrder = [...layerOrder];
                [newOrder[currentIndex], newOrder[currentIndex - 1]] = [newOrder[currentIndex - 1], newOrder[currentIndex]];
                dispatch({ type: 'REORDER_LAYERS', layerIds: newOrder });
              }
            }
            break;
        }
      }

      // Shift+modifier shortcuts
      if (isMod && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'g':
            e.preventDefault();
            if (selectionLayerIds.length === 1) {
              const selectedId = selectionLayerIds[0];
              const group = layers.find(l => l.type === 'group' && (l as any).children?.includes(selectedId));
              if (group) {
                dispatch({ type: 'UNGROUP_LAYER', groupId: group.id });
              }
            }
            break;
          case '[':
            e.preventDefault();
            if (selectionLayerIds.length > 0) {
              const selectedIds = selectionLayerIds.filter(id => layerOrder.includes(id));
              const otherLayers = layerOrder.filter(id => !selectedIds.includes(id));
              dispatch({ type: 'REORDER_LAYERS', layerIds: [...otherLayers, ...selectedIds] });
            }
            break;
          case ']':
            e.preventDefault();
            if (selectionLayerIds.length > 0) {
              const selectedIds = selectionLayerIds.filter(id => layerOrder.includes(id));
              const otherLayers = layerOrder.filter(id => !selectedIds.includes(id));
              dispatch({ type: 'REORDER_LAYERS', layerIds: [...selectedIds, ...otherLayers] });
            }
            break;
        }
      }

      // Other shortcuts
      if (e.key === 'Escape') {
        clearSelection();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        selectionLayerIds.forEach(id => {
          dispatch({ type: 'REMOVE_LAYER', layerId: id });
        });
      }
      if (e.key === 'F11') {
        e.preventDefault();
        setIsFullCanvas(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndo, canRedo, clearSelection, selectionLayerIds, layers, layerOrder, handleSave, handleExport, handleClearCanvas, setIsFullCanvas]);
}
