import { useReducer, useCallback, useMemo } from 'react';
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
} from '../types/editor.types';

// Generate unique IDs
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

// Initial state
const createInitialState = (width = 1920, height = 1080): EditorState => ({
  layers: [],
  layerOrder: [],
  selection: { layerIds: [] },
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
  history: [],
  historyIndex: -1,
  isModified: false,
});

// Create history entry
const createHistoryEntry = (state: EditorState, action: string): HistoryEntry => ({
  id: generateId(),
  timestamp: Date.now(),
  action,
  layers: JSON.parse(JSON.stringify(state.layers)),
  selection: { ...state.selection },
});

// Reducer
function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'ADD_LAYER': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, `Add ${action.layer.type} layer`));
      
      return {
        ...state,
        layers: [...state.layers, action.layer],
        layerOrder: [...state.layerOrder, action.layer.id],
        selection: { layerIds: [action.layer.id] },
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      };
    }

    case 'REMOVE_LAYER': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Remove layer'));
      
      return {
        ...state,
        layers: state.layers.filter(l => l.id !== action.layerId),
        layerOrder: state.layerOrder.filter(id => id !== action.layerId),
        selection: {
          layerIds: state.selection.layerIds.filter(id => id !== action.layerId),
        },
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      };
    }

    case 'UPDATE_LAYER': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Update layer'));
      
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.layerId
            ? { ...layer, ...action.updates }
            : layer
        ),
        history: newHistory,
        historyIndex: newHistory.length - 1,
        isModified: true,
      };
    }

    case 'REORDER_LAYERS': {
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Reorder layers'));
      
      return {
        ...state,
        layerOrder: action.layerIds,
        history: newHistory,
        historyIndex: newHistory.length - 1,
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

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Group layers'));

      return {
        ...state,
        layers: [...updatedLayers, groupLayer],
        layerOrder: newOrder,
        selection: { layerIds: [groupId] },
        history: newHistory,
        historyIndex: newHistory.length - 1,
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

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Ungroup layers'));

      return {
        ...state,
        layers: updatedLayers,
        layerOrder: newOrder,
        selection: { layerIds: group.children },
        history: newHistory,
        historyIndex: newHistory.length - 1,
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

      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(createHistoryEntry(state, 'Duplicate layer'));

      return {
        ...state,
        layers: [...state.layers, duplicatedLayer],
        layerOrder: newOrder,
        selection: { layerIds: [newId] },
        history: newHistory,
        historyIndex: newHistory.length - 1,
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

    case 'UNDO': {
      if (state.historyIndex < 0) return state;
      const prevEntry = state.history[state.historyIndex];
      return {
        ...state,
        layers: prevEntry.layers,
        selection: prevEntry.selection,
        historyIndex: state.historyIndex - 1,
      };
    }

    case 'REDO': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextEntry = state.history[state.historyIndex + 1];
      return {
        ...state,
        layers: nextEntry.layers,
        selection: nextEntry.selection,
        historyIndex: state.historyIndex + 1,
      };
    }

    case 'RESET':
      return createInitialState();

    default:
      return state;
  }
}

// Hook
export function useEditorState(initialWidth?: number, initialHeight?: number) {
  const [state, dispatch] = useReducer(
    editorReducer,
    createInitialState(initialWidth, initialHeight)
  );

  // Layer helpers
  const addImageLayer = useCallback((src: string, name = 'Image') => {
    const layer: ImageLayer = {
      id: generateId(),
      name,
      type: 'image',
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
      textAlign: 'left',
      verticalAlign: 'top',
      fill: state.toolSettings.text.color,
      letterSpacing: 0,
      lineHeight: 1.4,
      textDecoration: 'none',
      textTransform: 'none',
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
  const selectLayer = useCallback((layerId: string, multi = false) => {
    if (multi) {
      const isSelected = state.selection.layerIds.includes(layerId);
      dispatch({
        type: 'SET_SELECTION',
        selection: {
          layerIds: isSelected
            ? state.selection.layerIds.filter(id => id !== layerId)
            : [...state.selection.layerIds, layerId],
        },
      });
    } else {
      dispatch({
        type: 'SET_SELECTION',
        selection: { layerIds: [layerId] },
      });
    }
  }, [state.selection.layerIds]);

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

  const canUndo = state.historyIndex >= 0;
  const canRedo = state.historyIndex < state.history.length - 1;

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
  };
}

export type UseEditorStateReturn = ReturnType<typeof useEditorState>;
