/**
 * Editor Store
 * Persists canvas editor state across navigation
 * Works alongside useEditorState for backward compatibility
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  Layer,
  Selection,
  ToolType,
  ToolSettings,
  CanvasState,
  AdjustmentState,
  SmartSelectionState,
  HistoryEntry,
  BlendMode,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  DrawingLayer,
  GroupLayer,
} from '../components/editor/types/editor.types';
import {
  DEFAULT_ADJUSTMENTS,
  DEFAULT_SMART_SELECTION,
} from '../components/editor/types/editor.types';
import {
  getEditorMode,
  setEditorMode as persistEditorMode,
  type EditorMode,
} from '../components/ui/CollapsibleSection';

// ============================================
// CONSTANTS
// ============================================

const MAX_HISTORY = 50;

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Initial tool settings
const initialToolSettings: ToolSettings = {
  brush: {
    size: 20,
    hardness: 80,
    opacity: 100,
    flow: 100,
    color: '#ffffff',
    blendMode: 'normal',
  },
  eraser: {
    size: 20,
    hardness: 80,
    opacity: 100,
  },
  clone: {
    size: 20,
    hardness: 80,
    opacity: 100,
    sourceX: 0,
    sourceY: 0,
  },
  gradient: {
    type: 'linear',
    colorStart: '#ffffff',
    colorEnd: '#000000',
    angle: 0,
  },
  shape: {
    fill: '#3b82f6',
    stroke: '#1e40af',
    strokeWidth: 2,
    cornerRadius: 0,
  },
  text: {
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 600,
    color: '#ffffff',
  },
};

// ============================================
// TYPES
// ============================================

interface EditorStoreState {
  // Core state
  layers: Layer[];
  layerOrder: string[];
  selection: Selection;
  activeTool: ToolType;
  toolSettings: ToolSettings;
  canvas: CanvasState;
  adjustments: AdjustmentState;
  smartSelection: SmartSelectionState;
  
  // Editor mode (Simple/Pro toggle for Grandma Test compliance)
  editorMode: EditorMode;
  
  // History
  history: HistoryEntry[];
  historyIndex: number;
  isModified: boolean;
  
  // Session metadata
  projectId: string | null;
  lastSaved: number | null;
}

interface EditorStoreActions {
  // Layer operations
  addLayer: (layer: Layer) => string;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  reorderLayers: (layerIds: string[]) => void;
  groupLayers: (layerIds: string[]) => void;
  ungroupLayer: (groupId: string) => void;
  duplicateLayer: (layerId: string) => string | null;
  
  // Selection
  setSelection: (selection: Selection) => void;
  selectLayer: (layerId: string, multi?: boolean) => void;
  clearSelection: () => void;
  
  // Tools
  setTool: (tool: ToolType) => void;
  updateToolSettings: (settings: Partial<ToolSettings>) => void;
  
  // Canvas
  setCanvas: (canvas: Partial<CanvasState>) => void;
  
  // Adjustments
  updateAdjustments: (updates: Partial<AdjustmentState>) => void;
  
  // Smart selection
  setSmartSelection: (selection: Partial<SmartSelectionState>) => void;
  clearSmartSelection: () => void;
  
  // Editor mode
  setEditorMode: (mode: EditorMode) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  
  // Save state
  markSaved: () => void;
  setProjectId: (id: string | null) => void;
  
  // Reset
  reset: (width?: number, height?: number) => void;
  
  // Clear canvas (preserves dimensions/settings)
  clearCanvas: () => void;
  
  // Layer helpers
  addImageLayer: (src: string, name?: string, locked?: boolean) => string;
  addTextLayer: (content?: string, x?: number, y?: number) => string;
  addShapeLayer: (shapeType: ShapeLayer['shapeType'], x?: number, y?: number, width?: number, height?: number) => string;
  addDrawingLayer: () => string;
  
  // Computed getters
  getSelectedLayers: () => Layer[];
  getOrderedLayers: () => Layer[];
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Sync from useEditorState reducer (for persistence bridge)
  syncFromReducer: (state: Partial<EditorStoreState>) => void;
}

export type EditorStore = EditorStoreState & EditorStoreActions;

// ============================================
// HELPERS
// ============================================

const createHistoryEntry = (
  action: string,
  layers: Layer[],
  layerOrder: string[],
  selection: Selection,
  adjustments: AdjustmentState
): HistoryEntry => ({
  id: generateId(),
  timestamp: Date.now(),
  action,
  layers: JSON.parse(JSON.stringify(layers)),
  layerOrder: [...layerOrder],
  selection: { ...selection },
  adjustments: { ...adjustments },
});

const createInitialState = (width = 1920, height = 1080): EditorStoreState => {
  const layers: Layer[] = [];
  const layerOrder: string[] = [];
  const selection: Selection = { layerIds: [] };
  const adjustments: AdjustmentState = { ...DEFAULT_ADJUSTMENTS };
  const smartSelection: SmartSelectionState = { ...DEFAULT_SMART_SELECTION };
  const editorMode: EditorMode = getEditorMode(); // Read from localStorage

  const initialSnapshot = createHistoryEntry('Initial state', layers, layerOrder, selection, adjustments);

  return {
    layers,
    layerOrder,
    selection,
    activeTool: 'select',
    toolSettings: initialToolSettings,
    canvas: {
      width,
      height,
      zoom: 0.5,
      panX: 0,
      panY: 0,
      backgroundColor: '#1a1a2e',
      showGrid: false,
      showGuides: true,
      snapToGrid: false,
      gridSize: 20,
    },
    history: [initialSnapshot],
    historyIndex: 0,
    isModified: false,
    adjustments,
    smartSelection,
    editorMode,
    projectId: null,
    lastSaved: null,
  };
};

// ============================================
// STORE FACTORY
// ============================================

export function createEditorStore(storageKey: string) {
  return create<EditorStore>()(
    persist(
      (set, get) => ({
        ...createInitialState(),

      // ============================================
      // LAYER OPERATIONS
      // ============================================

      addLayer: (layer) => {
        const state = get();
        const newLayers = [...state.layers, layer];
        const newLayerOrder = [...state.layerOrder, layer.id];
        const newSelection = { layerIds: [layer.id] };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry(`Add ${layer.type} layer`, newLayers, newLayerOrder, newSelection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: newLayers,
          layerOrder: newLayerOrder,
          selection: newSelection,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });

        return layer.id;
      },

      removeLayer: (layerId) => {
        const state = get();
        const newLayers = state.layers.filter((l) => l.id !== layerId);
        const newLayerOrder = state.layerOrder.filter((id) => id !== layerId);
        const newSelection = {
          layerIds: state.selection.layerIds.filter((id) => id !== layerId),
        };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Remove layer', newLayers, newLayerOrder, newSelection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: newLayers,
          layerOrder: newLayerOrder,
          selection: newSelection,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      updateLayer: (layerId, updates) => {
        const state = get();
        const newLayers = state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, ...updates } as Layer : layer
        );

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Update layer', newLayers, state.layerOrder, state.selection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: newLayers,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      reorderLayers: (layerIds) => {
        const state = get();

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Reorder layers', state.layers, layerIds, state.selection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layerOrder: layerIds,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      groupLayers: (layerIds) => {
        if (layerIds.length < 2) return;

        const state = get();
        const groupId = generateId();
        const groupLayer: GroupLayer = {
          id: groupId,
          name: 'Group',
          type: 'group',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          transform: {
            x: 0,
            y: 0,
            width: state.canvas.width,
            height: state.canvas.height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
          },
          effects: [],
          children: layerIds,
          collapsed: false,
        };

        const updatedLayers = state.layers.map((layer) =>
          layerIds.includes(layer.id) ? { ...layer, parentId: groupId } : layer
        );

        const firstIndex = Math.min(...layerIds.map((id) => state.layerOrder.indexOf(id)));
        const newOrder = state.layerOrder.filter((id) => !layerIds.includes(id));
        newOrder.splice(firstIndex, 0, groupId);

        const newLayers = [...updatedLayers, groupLayer];
        const newSelection = { layerIds: [groupId] };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Group layers', newLayers, newOrder, newSelection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: newLayers,
          layerOrder: newOrder,
          selection: newSelection,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      ungroupLayer: (groupId) => {
        const state = get();
        const group = state.layers.find((l) => l.id === groupId) as GroupLayer;
        if (!group || group.type !== 'group') return;

        const updatedLayers = state.layers
          .filter((l) => l.id !== groupId)
          .map((layer) => (layer.parentId === groupId ? { ...layer, parentId: undefined } : layer));

        const groupIndex = state.layerOrder.indexOf(groupId);
        const newOrder = state.layerOrder.filter((id) => id !== groupId);
        newOrder.splice(groupIndex, 0, ...group.children);

        const newSelection = { layerIds: group.children };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Ungroup layers', updatedLayers, newOrder, newSelection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: updatedLayers,
          layerOrder: newOrder,
          selection: newSelection,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      duplicateLayer: (layerId) => {
        const state = get();
        const layer = state.layers.find((l) => l.id === layerId);
        if (!layer) return null;

        const newId = generateId();
        const duplicatedLayer = {
          ...JSON.parse(JSON.stringify(layer)),
          id: newId,
          name: `${layer.name} Copy`,
        };

        const layerIndex = state.layerOrder.indexOf(layerId);
        const newOrder = [...state.layerOrder];
        newOrder.splice(layerIndex + 1, 0, newId);

        const newLayers = [...state.layers, duplicatedLayer];
        const newSelection = { layerIds: [newId] };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Duplicate layer', newLayers, newOrder, newSelection, state.adjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          layers: newLayers,
          layerOrder: newOrder,
          selection: newSelection,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });

        return newId;
      },

      // ============================================
      // SELECTION
      // ============================================

      setSelection: (selection) => set({ selection }),

      selectLayer: (layerId, multi = false) => {
        const state = get();
        if (multi) {
          const isSelected = state.selection.layerIds.includes(layerId);
          set({
            selection: {
              layerIds: isSelected
                ? state.selection.layerIds.filter((id) => id !== layerId)
                : [...state.selection.layerIds, layerId],
            },
          });
        } else {
          set({ selection: { layerIds: [layerId] } });
        }
      },

      clearSelection: () => set({ selection: { layerIds: [] } }),

      // ============================================
      // TOOLS
      // ============================================

      setTool: (tool) => set({ activeTool: tool }),

      updateToolSettings: (settings) =>
        set((state) => ({
          toolSettings: { ...state.toolSettings, ...settings },
        })),

      // ============================================
      // CANVAS
      // ============================================

      setCanvas: (canvas) =>
        set((state) => ({
          canvas: { ...state.canvas, ...canvas },
        })),

      // ============================================
      // ADJUSTMENTS
      // ============================================

      updateAdjustments: (updates) => {
        const state = get();
        const newAdjustments = { ...state.adjustments, ...updates };

        let newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(createHistoryEntry('Update adjustments', state.layers, state.layerOrder, state.selection, newAdjustments));
        if (newHistory.length > MAX_HISTORY) {
          newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
        }

        set({
          adjustments: newAdjustments,
          history: newHistory,
          historyIndex: newHistory.length - 1,
          isModified: true,
        });
      },

      // ============================================
      // SMART SELECTION
      // ============================================

      setSmartSelection: (selection) =>
        set((state) => ({
          smartSelection: { ...state.smartSelection, ...selection },
        })),

      clearSmartSelection: () => set({ smartSelection: { ...DEFAULT_SMART_SELECTION } }),

      // ============================================
      // HISTORY
      // ============================================

      undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return;

        const prevEntry = state.history[state.historyIndex - 1];
        set({
          layers: JSON.parse(JSON.stringify(prevEntry.layers)),
          layerOrder: [...prevEntry.layerOrder],
          selection: { ...prevEntry.selection },
          adjustments: { ...prevEntry.adjustments },
          historyIndex: state.historyIndex - 1,
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;

        const nextEntry = state.history[state.historyIndex + 1];
        set({
          layers: JSON.parse(JSON.stringify(nextEntry.layers)),
          layerOrder: [...nextEntry.layerOrder],
          selection: { ...nextEntry.selection },
          adjustments: { ...nextEntry.adjustments },
          historyIndex: state.historyIndex + 1,
        });
      },

      // ============================================
      // SAVE STATE
      // ============================================

      markSaved: () => set({ isModified: false, lastSaved: Date.now() }),

      setProjectId: (id) => set({ projectId: id }),

      // ============================================
      // RESET
      // ============================================

      reset: (width = 1920, height = 1080) => set(createInitialState(width, height)),

      // ============================================
      // CLEAR CANVAS (preserves dimensions/settings)
      // ============================================

      clearCanvas: () => {
        const state = get();
        const emptyLayers: Layer[] = [];
        const emptyLayerOrder: string[] = [];
        const emptySelection: Selection = { layerIds: [] };
        const freshAdjustments: AdjustmentState = { ...DEFAULT_ADJUSTMENTS };
        const initialSnapshot = createHistoryEntry('Clear canvas', emptyLayers, emptyLayerOrder, emptySelection, freshAdjustments);

        set({
          layers: emptyLayers,
          layerOrder: emptyLayerOrder,
          selection: emptySelection,
          activeTool: 'select',
          // canvas preserved (dimensions, zoom, pan, bg, grid)
          // toolSettings preserved
          adjustments: freshAdjustments,
          smartSelection: { ...DEFAULT_SMART_SELECTION },
          history: [initialSnapshot],
          historyIndex: 0,
          isModified: true,
        });
      },

      // ============================================
      // EDITOR MODE
      // ============================================

      setEditorMode: (mode) => {
        persistEditorMode(mode); // Persist to localStorage
        set({ editorMode: mode });
      },

      // ============================================
      // LAYER HELPERS
      // ============================================

      addImageLayer: (src, name = 'Image', locked = false) => {
        const state = get();
        const layer: ImageLayer = {
          id: generateId(),
          name,
          type: 'image',
          visible: true,
          locked,
          opacity: 100,
          blendMode: 'normal',
          transform: {
            x: 0,
            y: 0,
            width: state.canvas.width,
            height: state.canvas.height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
          },
          effects: [],
          src,
          originalWidth: state.canvas.width,
          originalHeight: state.canvas.height,
          filters: {
            brightness: 100,
            contrast: 100,
            saturation: 100,
            hue: 0,
            blur: 0,
            sharpen: 0,
            noise: 0,
            sepia: 0,
            grayscale: 0,
            invert: 0,
          },
        };
        return get().addLayer(layer);
      },

      addTextLayer: (content = 'Text', x = 100, y = 100) => {
        const state = get();
        const layer: TextLayer = {
          id: generateId(),
          name: content.slice(0, 20),
          type: 'text',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          transform: {
            x,
            y,
            width: 400,
            height: 100,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
          },
          effects: [],
          content,
          fontFamily: state.toolSettings.text.fontFamily,
          fontSize: state.toolSettings.text.fontSize,
          fontWeight: state.toolSettings.text.fontWeight,
          fontStyle: 'normal',
          textAlign: 'left',
          verticalAlign: 'top',
          fill: state.toolSettings.text.color,
          letterSpacing: 0,
          lineHeight: 1.4,
          textDecoration: 'none',
          textTransform: 'none',
        };
        return get().addLayer(layer);
      },

      addShapeLayer: (shapeType, x = 100, y = 100, width = 200, height = 200) => {
        const state = get();
        const layer: ShapeLayer = {
          id: generateId(),
          name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
          type: 'shape',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          transform: {
            x,
            y,
            width,
            height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
          },
          effects: [],
          shapeType,
          fill: state.toolSettings.shape.fill,
          stroke: state.toolSettings.shape.stroke,
          strokeWidth: state.toolSettings.shape.strokeWidth,
          cornerRadius: state.toolSettings.shape.cornerRadius,
        };
        return get().addLayer(layer);
      },

      addDrawingLayer: () => {
        const state = get();
        const layer: DrawingLayer = {
          id: generateId(),
          name: 'Drawing',
          type: 'drawing',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          transform: {
            x: 0,
            y: 0,
            width: state.canvas.width,
            height: state.canvas.height,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            skewX: 0,
            skewY: 0,
          },
          effects: [],
          paths: [],
        };
        return get().addLayer(layer);
      },

      // ============================================
      // COMPUTED GETTERS
      // ============================================

      getSelectedLayers: () => {
        const state = get();
        return state.layers.filter((l) => state.selection.layerIds.includes(l.id));
      },

      getOrderedLayers: () => {
        const state = get();
        return state.layerOrder.map((id) => state.layers.find((l) => l.id === id)!).filter(Boolean);
      },

      canUndo: () => get().historyIndex > 0,

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // ============================================
      // SYNC FROM REDUCER (persistence bridge)
      // ============================================

      syncFromReducer: (reducerState) => {
        // Only sync if there are meaningful changes
        const currentState = get();
        
        // Skip if no layers (empty state shouldn't overwrite persisted data)
        if (!reducerState.layers || reducerState.layers.length === 0) {
          // But if current state also has no layers, allow sync of other properties
          if (currentState.layers.length === 0) {
            set({
              activeTool: reducerState.activeTool ?? currentState.activeTool,
              toolSettings: reducerState.toolSettings ?? currentState.toolSettings,
              canvas: reducerState.canvas ?? currentState.canvas,
              adjustments: reducerState.adjustments ?? currentState.adjustments,
              smartSelection: reducerState.smartSelection ?? currentState.smartSelection,
              isModified: reducerState.isModified ?? currentState.isModified,
            });
          }
          return;
        }
        
        // Full sync when we have layers
        set({
          layers: reducerState.layers,
          layerOrder: reducerState.layerOrder ?? currentState.layerOrder,
          selection: reducerState.selection ?? currentState.selection,
          activeTool: reducerState.activeTool ?? currentState.activeTool,
          toolSettings: reducerState.toolSettings ?? currentState.toolSettings,
          canvas: reducerState.canvas ?? currentState.canvas,
          adjustments: reducerState.adjustments ?? currentState.adjustments,
          smartSelection: reducerState.smartSelection ?? currentState.smartSelection,
          isModified: reducerState.isModified ?? currentState.isModified,
          // Don't sync history - let reducer manage its own history
          // Store just needs enough to restore state on remount
        });
      },
    }),
    {
      name: storageKey,
      storage: createJSONStorage(() => {
        // Wrap sessionStorage to silently swallow QuotaExceededError
        // Large base64 layer images (decompose, generate) can exceed the 5MB quota.
        // On overflow we skip persisting rather than crashing the editor.
        return {
          getItem: (name: string) => sessionStorage.getItem(name),
          setItem: (name: string, value: string) => {
            try {
              sessionStorage.setItem(name, value);
            } catch {
              // QuotaExceededError: state too large (e.g. base64 decomposed layers).
              // Editor remains fully functional — state lives in memory only.
            }
          },
          removeItem: (name: string) => sessionStorage.removeItem(name),
        };
      }),
      partialize: (state) => ({
        // Persist essential state only. Skip `history` — it duplicates full layer
        // snapshots (including base64 blobs) and quickly exceeds the 5MB quota.
        // If the payload still overflows, the try/catch on setItem silently skips
        // persistence and the editor continues working from in-memory state.
        layers: state.layers,
        layerOrder: state.layerOrder,
        selection: state.selection,
        activeTool: state.activeTool,
        toolSettings: state.toolSettings,
        canvas: state.canvas,
        adjustments: state.adjustments,
        smartSelection: state.smartSelection,
        editorMode: state.editorMode,
        // history intentionally excluded — too large when layers contain base64
        historyIndex: state.historyIndex,
        isModified: state.isModified,
        projectId: state.projectId,
        lastSaved: state.lastSaved,
      }),
    }
  )
  );
}

// ============================================
// STORE INSTANCES
// ============================================

/** Main editor store — used by ThumbnailStudio and MobileEditor */
export const useEditorStore = createEditorStore('thumpiks-editor-state');

/** Preset editor store — isolated state for PresetEditor */
export const usePresetEditorStore = createEditorStore('thumpiks-preset-editor-state');

// ============================================
// SELECTORS
// ============================================

export const selectLayers = (state: EditorStore) => state.layers;
export const selectLayerOrder = (state: EditorStore) => state.layerOrder;
export const selectSelection = (state: EditorStore) => state.selection;
export const selectActiveTool = (state: EditorStore) => state.activeTool;
export const selectCanvas = (state: EditorStore) => state.canvas;
export const selectAdjustments = (state: EditorStore) => state.adjustments;
export const selectIsModified = (state: EditorStore) => state.isModified;
export const selectEditorMode = (state: EditorStore) => state.editorMode;
