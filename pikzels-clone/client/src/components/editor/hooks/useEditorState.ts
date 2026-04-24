import { useReducer, useCallback, useMemo, useRef, useEffect } from 'react';
import { useEditorStore, type EditorStore } from '../../../stores/editorStore';
import type {
  EditorState,
  EditorAction,
  Layer,
  ToolType,
  ToolSettings,
  Selection,
  HistoryEntry,
  BlendMode,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  DrawingLayer,
  GroupLayer,
  AdjustmentState,
  SmartSelectionState,
} from '../types/editor.types';
import { DEFAULT_ADJUSTMENTS, DEFAULT_SMART_SELECTION } from '../types/editor.types';

// Type for any Zustand store hook created by our factory
type EditorStoreHook = typeof useEditorStore;

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Maximum history entries to prevent memory growth (esp. with base64 image data)
const MAX_HISTORY = 50;

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
    colorStart: '#000000',
    colorEnd: '#ffffff',
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

// Initial state — history[0] holds the initial snapshot so undo can return to it
// Can optionally restore from persisted state
const createInitialState = (
  width = 1920, 
  height = 1080,
  persistedState?: Partial<EditorState>
): EditorState => {
  // If we have persisted state with layers, use it
  if (persistedState?.layers && persistedState.layers.length > 0) {
    const layers = persistedState.layers;
    const layerOrder = persistedState.layerOrder || layers.map(l => l.id);
    const selection = persistedState.selection || { layerIds: [] };
    const adjustments = persistedState.adjustments || { ...DEFAULT_ADJUSTMENTS };
    const canvas = persistedState.canvas || {
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
    };
    const toolSettings = persistedState.toolSettings || initialToolSettings;
    const activeTool = persistedState.activeTool || 'select';
    const smartSelection = persistedState.smartSelection || { ...DEFAULT_SMART_SELECTION };
    
    // Reconstruct history with current state as the base
    const initialSnapshot = createHistoryEntry('Restored state', layers, layerOrder, selection, adjustments);

    return {
      layers,
      layerOrder,
      selection,
      activeTool,
      toolSettings,
      canvas,
      history: [initialSnapshot],
      historyIndex: 0,
      isModified: false, // Restored state starts as unmodified
      adjustments,
      smartSelection,
    };
  }

  // Default: create fresh state
  const layers: Layer[] = [];
  const layerOrder: string[] = [];
  const selection: Selection = { layerIds: [] };
  const adjustments: AdjustmentState = { ...DEFAULT_ADJUSTMENTS };
  const smartSelection: SmartSelectionState = { ...DEFAULT_SMART_SELECTION };

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
  };
};

// Create history entry — snapshots the RESULT state after an action
const createHistoryEntry = (
  action: string,
  layers: Layer[],
  layerOrder: string[],
  selection: Selection,
  adjustments: AdjustmentState,
): HistoryEntry => ({
  id: generateId(),
  timestamp: Date.now(),
  action,
  layers: JSON.parse(JSON.stringify(layers)),
  layerOrder: [...layerOrder],
  selection: { ...selection },
  adjustments: { ...adjustments },
});

// Push a history entry storing the NEW state, capped at MAX_HISTORY.
// Truncates any redo-future beyond the current index before pushing.
const pushHistory = (
  state: EditorState,
  actionLabel: string,
  newLayers: Layer[],
  newLayerOrder: string[],
  newSelection: Selection,
  newAdjustments: AdjustmentState,
): { history: HistoryEntry[]; historyIndex: number } => {
  // During a batch, skip pushing history entries — one consolidated entry is pushed on BATCH_END
  if (state.batchInProgress) {
    return { history: state.history, historyIndex: state.historyIndex };
  }
  let newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(
    createHistoryEntry(actionLabel, newLayers, newLayerOrder, newSelection, newAdjustments),
  );
  if (newHistory.length > MAX_HISTORY) {
    newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
  }
  return { history: newHistory, historyIndex: newHistory.length - 1 };
};

// Reducer
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_LAYER': {
      const newLayers = [...state.layers, action.layer];
      const newLayerOrder = [...state.layerOrder, action.layer.id];
      const newSelection = { layerIds: [action.layer.id] };
      const hist = pushHistory(state, `Add ${action.layer.type} layer`, newLayers, newLayerOrder, newSelection, state.adjustments);
      
      return {
        ...state,
        layers: newLayers,
        layerOrder: newLayerOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'REMOVE_LAYER': {
      const newLayers = state.layers.filter(l => l.id !== action.layerId);
      const newLayerOrder = state.layerOrder.filter(id => id !== action.layerId);
      const newSelection = {
        layerIds: state.selection.layerIds.filter(id => id !== action.layerId),
      };
      const hist = pushHistory(state, 'Remove layer', newLayers, newLayerOrder, newSelection, state.adjustments);
      
      return {
        ...state,
        layers: newLayers,
        layerOrder: newLayerOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'REMOVE_LAYERS_BATCH': {
      // Remove multiple layers in a single history entry (for undo/redo)
      const idsToRemove = new Set(action.layerIds);
      const newLayers = state.layers.filter(l => !idsToRemove.has(l.id));
      const newLayerOrder = state.layerOrder.filter(id => !idsToRemove.has(id));
      const newSelection = {
        layerIds: state.selection.layerIds.filter(id => !idsToRemove.has(id)),
      };
      const hist = pushHistory(
        state, 
        `Remove ${action.layerIds.length} layers`, 
        newLayers, 
        newLayerOrder, 
        newSelection, 
        state.adjustments
      );
      
      return {
        ...state,
        layers: newLayers,
        layerOrder: newLayerOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'REMOVE_LAYERS_BY_GROUP': {
      // Remove all layers sharing a groupId (for template group removal)
      const layersToRemove = state.layers
        .filter(l => l.groupId === action.groupId)
        .map(l => l.id);
      
      if (layersToRemove.length === 0) return state;

      const idsToRemove = new Set(layersToRemove);
      const newLayers = state.layers.filter(l => !idsToRemove.has(l.id));
      const newLayerOrder = state.layerOrder.filter(id => !idsToRemove.has(id));
      const newSelection = {
        layerIds: state.selection.layerIds.filter(id => !idsToRemove.has(id)),
      };
      const hist = pushHistory(
        state, 
        `Remove template group (${layersToRemove.length} layers)`, 
        newLayers, 
        newLayerOrder, 
        newSelection, 
        state.adjustments
      );
      
      return {
        ...state,
        layers: newLayers,
        layerOrder: newLayerOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'UPDATE_LAYER': {
      const newLayers = state.layers.map(layer =>
        layer.id === action.layerId
          ? { ...layer, ...action.updates } as Layer
          : layer
      );
      const hist = pushHistory(state, 'Update layer', newLayers, state.layerOrder, state.selection, state.adjustments);
      
      return {
        ...state,
        layers: newLayers,
        ...hist,
        isModified: true,
      };
    }

    case 'UPDATE_LAYER_SILENT': {
      // Same as UPDATE_LAYER but NO history push — used for real-time typing
      const newLayers = state.layers.map(layer =>
        layer.id === action.layerId
          ? { ...layer, ...action.updates } as Layer
          : layer
      );
      return { ...state, layers: newLayers };
    }

    case 'MOVE_GROUP_SILENT': {
      // Move all layers in a group by a delta — no history push, used for real-time group dragging
      const moveMap = new Map<string, { x: number; y: number }>(
        action.moves.map((m: { layerId: string; x: number; y: number }) => [m.layerId, m])
      );
      const newLayers = state.layers.map(layer => {
        const move = moveMap.get(layer.id);
        if (!move) return layer;
        return { ...layer, transform: { ...layer.transform, x: move.x, y: move.y } };
      });
      return { ...state, layers: newLayers };
    }

    case 'REORDER_LAYERS': {
      const hist = pushHistory(state, 'Reorder layers', state.layers, action.layerIds, state.selection, state.adjustments);
      
      return {
        ...state,
        layerOrder: action.layerIds,
        ...hist,
        isModified: true,
      };
    }

    case 'GROUP_LAYERS': {
      if (action.layerIds.length < 2) return state;
      
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
        children: action.layerIds,
        collapsed: false,
      };

      // Update children to reference parent
      const updatedLayers = state.layers.map(layer =>
        action.layerIds.includes(layer.id)
          ? { ...layer, parentId: groupId }
          : layer
      );

      // Insert group at position of first selected layer, remove children from order
      const firstIndex = Math.min(
        ...action.layerIds.map(id => state.layerOrder.indexOf(id))
      );
      const newOrder = state.layerOrder.filter(id => !action.layerIds.includes(id));
      newOrder.splice(firstIndex, 0, groupId);

      const newLayers = [...updatedLayers, groupLayer];
      const newSelection = { layerIds: [groupId] };
      const hist = pushHistory(state, 'Group layers', newLayers, newOrder, newSelection, state.adjustments);

      return {
        ...state,
        layers: newLayers,
        layerOrder: newOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'UNGROUP_LAYER': {
      const group = state.layers.find(l => l.id === action.groupId) as GroupLayer;
      if (!group || group.type !== 'group') return state;

      // Remove parent reference from children
      const updatedLayers = state.layers
        .filter(l => l.id !== action.groupId)
        .map(layer =>
          layer.parentId === action.groupId
            ? { ...layer, parentId: undefined }
            : layer
        );

      // Insert children at group position
      const groupIndex = state.layerOrder.indexOf(action.groupId);
      const newOrder = state.layerOrder.filter(id => id !== action.groupId);
      newOrder.splice(groupIndex, 0, ...group.children);

      const newSelection = { layerIds: group.children };
      const hist = pushHistory(state, 'Ungroup layers', updatedLayers, newOrder, newSelection, state.adjustments);

      return {
        ...state,
        layers: updatedLayers,
        layerOrder: newOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'DUPLICATE_LAYER': {
      const layer = state.layers.find(l => l.id === action.layerId);
      if (!layer) return state;

      const newId = generateId();
      const duplicatedLayer = {
        ...JSON.parse(JSON.stringify(layer)),
        id: newId,
        name: `${layer.name} Copy`,
      };

      const layerIndex = state.layerOrder.indexOf(action.layerId);
      const newOrder = [...state.layerOrder];
      newOrder.splice(layerIndex + 1, 0, newId);

      const newLayers = [...state.layers, duplicatedLayer];
      const newSelection = { layerIds: [newId] };
      const hist = pushHistory(state, 'Duplicate layer', newLayers, newOrder, newSelection, state.adjustments);

      return {
        ...state,
        layers: newLayers,
        layerOrder: newOrder,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'MERGE_LAYERS': {
      // For simplicity, we just group them - actual merging would require canvas rendering
      if (action.layerIds.length < 2) return state;
      return editorReducer(state, { type: 'GROUP_LAYERS', layerIds: action.layerIds });
    }

    case 'SET_SELECTION':
      return {
        ...state,
        selection: action.selection,
      };

    case 'SET_TOOL':
      return {
        ...state,
        activeTool: action.tool,
      };

    case 'UPDATE_TOOL_SETTINGS':
      return {
        ...state,
        toolSettings: {
          ...state.toolSettings,
          ...action.settings,
        },
      };

    case 'SET_CANVAS':
      return {
        ...state,
        canvas: {
          ...state.canvas,
          ...action.canvas,
        },
      };

    case 'UPDATE_ADJUSTMENTS': {
      const newAdjustments = {
        ...state.adjustments,
        ...action.updates,
      };
      const hist = pushHistory(state, 'Update adjustments', state.layers, state.layerOrder, state.selection, newAdjustments);
      
      return {
        ...state,
        adjustments: newAdjustments,
        ...hist,
        isModified: true,
      };
    }

    case 'FILL_UPLOAD_ZONE': {
      // Find the placeholder ShapeLayer with slotMetadata
      const layerIndex = state.layers.findIndex(l => l.id === action.layerId);
      if (layerIndex === -1) return state;
      const existing = state.layers[layerIndex];
      if (existing.type !== 'shape' || !(existing as ShapeLayer).slotMetadata) return state;

      const meta = (existing as ShapeLayer).slotMetadata!;

      // Create replacement ImageLayer with same id (keeps layerOrder intact)
      const imageLayer: ImageLayer = {
        id: existing.id,
        name: `${meta.label}`,
        type: 'image',
        visible: existing.visible,
        locked: existing.locked,
        opacity: meta.opacity,
        blendMode: meta.blendMode as BlendMode,
        transform: { ...existing.transform },
        effects: [],
        src: action.imageSrc,
        originalWidth: action.imageWidth,
        originalHeight: action.imageHeight,
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
        slotMetadata: meta,
        ...(existing.groupId ? { groupId: existing.groupId } : {}),
      };

      // Replace in-place (same index)
      const newLayers = [...state.layers];
      newLayers[layerIndex] = imageLayer;
      const newSelection = { layerIds: [existing.id] };
      const hist = pushHistory(state, `Fill: ${meta.label}`, newLayers, state.layerOrder, newSelection, state.adjustments);

      return {
        ...state,
        layers: newLayers,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'CLEAR_UPLOAD_ZONE': {
      // Find the filled ImageLayer with slotMetadata
      const layerIndex = state.layers.findIndex(l => l.id === action.layerId);
      if (layerIndex === -1) return state;
      const existing = state.layers[layerIndex];
      if (existing.type !== 'image' || !(existing as ImageLayer).slotMetadata) return state;

      const meta = (existing as ImageLayer).slotMetadata!;

      // Rebuild placeholder ShapeLayer
      const placeholderLayer: ShapeLayer = {
        id: existing.id,
        name: `📷 ${meta.label} (drop image)`,
        type: 'shape',
        visible: existing.visible,
        locked: existing.locked,
        opacity: 100,
        blendMode: 'normal',
        transform: { ...existing.transform },
        effects: [],
        shapeType: 'rectangle',
        fill: 'rgba(99, 102, 241, 0.1)',
        stroke: '#6366f1',
        strokeWidth: 2,
        cornerRadius: 4,
        slotMetadata: meta,
        ...(existing.groupId ? { groupId: existing.groupId } : {}),
      };

      // Replace in-place
      const newLayers = [...state.layers];
      newLayers[layerIndex] = placeholderLayer;
      const newSelection = { layerIds: [existing.id] };
      const hist = pushHistory(state, `Clear: ${meta.label}`, newLayers, state.layerOrder, newSelection, state.adjustments);

      return {
        ...state,
        layers: newLayers,
        selection: newSelection,
        ...hist,
        isModified: true,
      };
    }

    case 'BATCH_START': {
      // If already in a batch, auto-end the previous one first
      if (state.batchInProgress) {
        const hist = pushHistory(
          { ...state, batchInProgress: false },
          state.batchLabel || 'AI batch',
          state.layers,
          state.layerOrder,
          state.selection,
          state.adjustments,
        );
        return {
          ...state,
          ...hist,
          batchInProgress: true,
          batchLabel: action.label,
        };
      }
      return {
        ...state,
        batchInProgress: true,
        batchLabel: action.label,
      };
    }

    case 'BATCH_END': {
      if (!state.batchInProgress) return state;
      // Push a single consolidated history entry for the entire batch
      let newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(
        createHistoryEntry(
          state.batchLabel || 'AI batch',
          state.layers,
          state.layerOrder,
          state.selection,
          state.adjustments,
        ),
      );
      if (newHistory.length > MAX_HISTORY) {
        newHistory = newHistory.slice(newHistory.length - MAX_HISTORY);
      }
      return {
        ...state,
        batchInProgress: false,
        batchLabel: undefined,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      };
    }

    case 'UNDO': {
      if (state.historyIndex <= 0) return state; // Can't undo past initial state
      const prevEntry = state.history[state.historyIndex - 1];
      return {
        ...state,
        layers: JSON.parse(JSON.stringify(prevEntry.layers)),
        layerOrder: [...prevEntry.layerOrder],
        selection: { ...prevEntry.selection },
        adjustments: { ...prevEntry.adjustments },
        historyIndex: state.historyIndex - 1,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextEntry = state.history[state.historyIndex + 1];
      return {
        ...state,
        layers: JSON.parse(JSON.stringify(nextEntry.layers)),
        layerOrder: [...nextEntry.layerOrder],
        selection: { ...nextEntry.selection },
        adjustments: { ...nextEntry.adjustments },
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'MARK_SAVED':
      return { ...state, isModified: false };

    case 'SET_SMART_SELECTION':
      return {
        ...state,
        smartSelection: {
          ...state.smartSelection,
          ...action.selection,
        },
      };

    case 'CLEAR_SMART_SELECTION':
      return {
        ...state,
        smartSelection: { ...DEFAULT_SMART_SELECTION },
      };

    case 'CLEAR_CANVAS': {
      // Preserve canvas dimensions/settings and tool settings, clear everything else
      const emptyLayers: Layer[] = [];
      const emptyLayerOrder: string[] = [];
      const emptySelection: Selection = { layerIds: [] };
      const freshAdjustments: AdjustmentState = { ...DEFAULT_ADJUSTMENTS };
      const freshSmartSelection: SmartSelectionState = { ...DEFAULT_SMART_SELECTION };
      const initialSnapshot = createHistoryEntry('Clear canvas', emptyLayers, emptyLayerOrder, emptySelection, freshAdjustments);

      return {
        ...state,
        layers: emptyLayers,
        layerOrder: emptyLayerOrder,
        selection: emptySelection,
        activeTool: 'select',
        // canvas is preserved (dimensions, zoom, pan, bg, grid)
        // toolSettings is preserved
        adjustments: freshAdjustments,
        smartSelection: freshSmartSelection,
        history: [initialSnapshot],
        historyIndex: 0,
        isModified: true,
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// Hook
export function useEditorState(
  initialWidth?: number,
  initialHeight?: number,
  options?: { store?: EditorStoreHook }
) {
  // Get persisted state from Zustand store (if any)
  const storeHook = options?.store ?? useEditorStore;
  const store = storeHook();
  const persistedState = useMemo(() => ({
    layers: store.layers,
    layerOrder: store.layerOrder,
    selection: store.selection,
    activeTool: store.activeTool,
    toolSettings: store.toolSettings,
    canvas: store.canvas,
    adjustments: store.adjustments,
    smartSelection: store.smartSelection,
  }), []); // Only read once on mount
  
  // Track if we've initialized from persisted state
  const hasInitializedRef = useRef(false);
  
  const [state, dispatch] = useReducer(
    editorReducer,
    undefined,
    () => {
      // Check if there's meaningful persisted state (has layers)
      if (persistedState.layers && persistedState.layers.length > 0 && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        return createInitialState(initialWidth, initialHeight, persistedState);
      }
      return createInitialState(initialWidth, initialHeight);
    }
  );

  // Sync state changes back to Zustand store for persistence
  // Debounce to avoid excessive writes on rapid changes
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Skip initial sync to avoid overwriting persisted state
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    
    // Debounce sync to store
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      store.syncFromReducer({
        layers: state.layers,
        layerOrder: state.layerOrder,
        selection: state.selection,
        activeTool: state.activeTool,
        toolSettings: state.toolSettings,
        canvas: state.canvas,
        adjustments: state.adjustments,
        smartSelection: state.smartSelection,
        isModified: state.isModified,
      });
    }, 300); // 300ms debounce
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state.layers, state.layerOrder, state.selection, state.activeTool, 
      state.toolSettings, state.canvas, state.adjustments, state.smartSelection,
      state.isModified, store]);

  // Layer helpers
  const addImageLayer = useCallback((src: string, name = 'Image', locked = false) => {
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
    dispatch({ type: 'ADD_LAYER', layer });
    return layer.id;
  }, [state.canvas.width, state.canvas.height]);

  const addTextLayer = useCallback((content = 'Text', x = 100, y = 100) => {
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
      textAlign: 'center',
      verticalAlign: 'top',
      fill: state.toolSettings.text.color,
      letterSpacing: 0,
      lineHeight: 1.4,
      textDecoration: 'none',
      textTransform: 'none',
      textShadow: '',
      backgroundColor: '',
      backgroundPadding: 8,
    };
    dispatch({ type: 'ADD_LAYER', layer });
    return layer.id;
  }, [state.toolSettings.text]);

  const addShapeLayer = useCallback((
    shapeType: ShapeLayer['shapeType'],
    x = 100,
    y = 100,
    width = 200,
    height = 200
  ) => {
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
    dispatch({ type: 'ADD_LAYER', layer });
    return layer.id;
  }, [state.toolSettings.shape]);

  const addDrawingLayer = useCallback(() => {
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
    dispatch({ type: 'ADD_LAYER', layer });
    return layer.id;
  }, [state.canvas.width, state.canvas.height]);

  // Selection helpers
  // Use refs to avoid creating new callback references on every selection change,
  // which would cascade re-renders to all children receiving selectLayer as a prop
  const selectionRef = useRef(state.selection.layerIds);
  selectionRef.current = state.selection.layerIds;
  
  const selectLayer = useCallback((layerId: string, multi = false) => {
    if (multi) {
      const currentIds = selectionRef.current;
      const isSelected = currentIds.includes(layerId);
      dispatch({
        type: 'SET_SELECTION',
        selection: {
          layerIds: isSelected
            ? currentIds.filter(id => id !== layerId)
            : [...currentIds, layerId],
        },
      });
    } else {
      dispatch({
        type: 'SET_SELECTION',
        selection: { layerIds: [layerId] },
      });
    }
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'SET_SELECTION', selection: { layerIds: [] } });
  }, []);

  // Computed values
  const selectedLayers = useMemo(
    () => state.layers.filter(l => state.selection.layerIds.includes(l.id)),
    [state.layers, state.selection.layerIds]
  );

  const orderedLayers = useMemo(
    () => state.layerOrder.map(id => state.layers.find(l => l.id === id)!).filter(Boolean),
    [state.layers, state.layerOrder]
  );

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  // Adjustment helpers
  const updateAdjustments = useCallback((updates: Partial<AdjustmentState>) => {
    dispatch({ type: 'UPDATE_ADJUSTMENTS', updates });
  }, []);

  // Smart Selection helpers
  const setSmartSelection = useCallback((selection: Partial<SmartSelectionState>) => {
    dispatch({ type: 'SET_SMART_SELECTION', selection });
  }, []);

  const clearSmartSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SMART_SELECTION' });
  }, []);

  const updateSelectionMode = useCallback((mode: SmartSelectionState['mode']) => {
    dispatch({ type: 'SET_SMART_SELECTION', selection: { mode } });
  }, []);

  // Mark as saved (reset isModified flag)
  const markSaved = useCallback(() => {
    dispatch({ type: 'MARK_SAVED' });
  }, []);

  // Clear canvas — removes all layers/history but preserves canvas dimensions and tool settings
  // JJ: Sync immediately (not debounced) to the Zustand store so that navigating away
  // before the 300ms debounce fires doesn't leave stale layers in sessionStorage.
  const clearCanvas = useCallback(() => {
    dispatch({ type: 'CLEAR_CANVAS' });
    // Flush the empty state to the persistent store RIGHT NOW.
    // Without this, the 300ms-debounced sync effect may not fire before unmount,
    // and the old layers (with the image base64) survive in sessionStorage.
    store.syncFromReducer({
      layers: [],
      layerOrder: [],
      selection: { layerIds: [] },
      activeTool: 'select',
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      smartSelection: { ...DEFAULT_SMART_SELECTION },
      isModified: true,
    });
  }, [store]);

  return {
    state,
    dispatch,
    // Layer operations
    addImageLayer,
    addTextLayer,
    addShapeLayer,
    addDrawingLayer,
    // Selection
    selectLayer,
    clearSelection,
    selectedLayers,
    // Computed
    orderedLayers,
    canUndo,
    canRedo,
    // Adjustments
    updateAdjustments,
    // Smart Selection
    setSmartSelection,
    clearSmartSelection,
    updateSelectionMode,
    smartSelection: state.smartSelection,
    // Save state
    markSaved,
    isModified: state.isModified,
    // Clear canvas
    clearCanvas,
  };
}

export type UseEditorStateReturn = ReturnType<typeof useEditorState>;
