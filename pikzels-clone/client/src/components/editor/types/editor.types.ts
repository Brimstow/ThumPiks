/**
 * Thumbnail Studio Editor Types
 * Professional-grade canvas editor type definitions
 */

// ============================================
// BLEND MODES
// ============================================
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

// ============================================
// LAYER TYPES
// ============================================
export type LayerType = 'image' | 'shape' | 'text' | 'group' | 'adjustment' | 'drawing';

export interface LayerEffect {
  id: string;
  type: 'shadow' | 'glow' | 'blur' | 'stroke' | 'bevel';
  enabled: boolean;
  settings: Record<string, number | string | boolean>;
}

export interface LayerMask {
  id: string;
  enabled: boolean;
  inverted: boolean;
  imageData?: string;
}

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  skewY: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: LayerTransform;
  effects: LayerEffect[];
  mask?: LayerMask;
  parentId?: string; // For grouped layers
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  filters: ImageFilters;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shapeType: 'rectangle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'arrow' | 'custom';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number;
  points?: { x: number; y: number }[];
  sides?: number; // For polygons
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  content: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle: 'normal' | 'italic';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  verticalAlign: 'top' | 'middle' | 'bottom';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  letterSpacing: number;
  lineHeight: number;
  textDecoration: 'none' | 'underline' | 'line-through';
  textTransform: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  children: string[]; // Layer IDs
  collapsed: boolean;
}

export interface AdjustmentLayer extends BaseLayer {
  type: 'adjustment';
  adjustmentType: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'levels' | 'curves';
  settings: Record<string, number | number[]>;
}

export interface DrawingLayer extends BaseLayer {
  type: 'drawing';
  paths: DrawingPath[];
}

export type Layer = ImageLayer | ShapeLayer | TextLayer | GroupLayer | AdjustmentLayer | DrawingLayer;

// ============================================
// DRAWING
// ============================================
export interface DrawingPath {
  id: string;
  points: { x: number; y: number; pressure?: number }[];
  color: string;
  lineWidth: number;
  opacity: number;
  blendMode: BlendMode;
  smoothing: number;
}

// ============================================
// IMAGE FILTERS
// ============================================
export interface ImageFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  sharpen: number;
  noise: number;
  sepia: number;
  grayscale: number;
  invert: number;
}

// ============================================
// TOOLS
// ============================================
export type ToolType =
  | 'select'
  | 'move'
  | 'brush'
  | 'eraser'
  | 'pen'
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'text'
  | 'eyedropper'
  | 'fill'
  | 'crop'
  | 'hand'
  | 'zoom';

export interface ToolSettings {
  brush: {
    size: number;
    hardness: number;
    opacity: number;
    flow: number;
    color: string;
    blendMode: BlendMode;
  };
  eraser: {
    size: number;
    hardness: number;
    opacity: number;
  };
  shape: {
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    color: string;
  };
}

// ============================================
// CANVAS STATE
// ============================================
export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  panX: number;
  panY: number;
  backgroundColor: string;
  showGrid: boolean;
  showGuides: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

export interface Selection {
  layerIds: string[];
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// ============================================
// HISTORY
// ============================================
export interface HistoryEntry {
  id: string;
  timestamp: number;
  action: string;
  layers: Layer[];
  selection: Selection;
}

// ============================================
// EDITOR STATE
// ============================================
export interface EditorState {
  layers: Layer[];
  layerOrder: string[]; // Layer IDs in render order (bottom to top)
  selection: Selection;
  activeTool: ToolType;
  toolSettings: ToolSettings;
  canvas: CanvasState;
  history: HistoryEntry[];
  historyIndex: number;
  isModified: boolean;
}

// ============================================
// AI PROMPT
// ============================================
export interface AIPrompt {
  id: string;
  text: string;
  style: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  guidance?: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
}

export interface AIGenerationResult {
  id: string;
  prompt: AIPrompt;
  imageUrl: string;
  timestamp: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
}

// ============================================
// EDITOR ACTIONS
// ============================================
export type EditorAction =
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'REMOVE_LAYER'; layerId: string }
  | { type: 'UPDATE_LAYER'; layerId: string; updates: Partial<Layer> }
  | { type: 'REORDER_LAYERS'; layerIds: string[] }
  | { type: 'GROUP_LAYERS'; layerIds: string[] }
  | { type: 'UNGROUP_LAYER'; groupId: string }
  | { type: 'DUPLICATE_LAYER'; layerId: string }
  | { type: 'MERGE_LAYERS'; layerIds: string[] }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'UPDATE_TOOL_SETTINGS'; settings: Partial<ToolSettings> }
  | { type: 'SET_CANVAS'; canvas: Partial<CanvasState> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

// ============================================
// COMPONENT PROPS
// ============================================
export interface ThumbnailStudioProps {
  thumbnailId?: string;
  initialImage?: string;
  onSave?: (data: { layers: Layer[]; preview: string }) => void;
  onClose?: () => void;
}

export interface CanvasEngineProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  onLayerSelect: (layerId: string) => void;
}

export interface ToolsPanelProps {
  activeTool: ToolType;
  toolSettings: ToolSettings;
  onToolSelect: (tool: ToolType) => void;
  onSettingsChange: (settings: Partial<ToolSettings>) => void;
}

export interface LayersPanelProps {
  layers: Layer[];
  layerOrder: string[];
  selection: Selection;
  onLayerSelect: (layerId: string, multi?: boolean) => void;
  onLayerVisibilityToggle: (layerId: string) => void;
  onLayerLockToggle: (layerId: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
  onLayerDelete: (layerId: string) => void;
  onLayerDuplicate: (layerId: string) => void;
  onLayerUpdate: (layerId: string, updates: Partial<Layer>) => void;
  onAddLayer: (type: LayerType) => void;
  onGroupLayers: () => void;
  onUngroupLayer: (groupId: string) => void;
  onMergeLayers: () => void;
}

export interface AIPromptPanelProps {
  onGenerate: (prompt: AIPrompt) => void;
  history: AIGenerationResult[];
  isGenerating: boolean;
  onSelectResult: (result: AIGenerationResult) => void;
}

export interface PropertiesPanelProps {
  selectedLayers: Layer[];
  onUpdateLayer: (layerId: string, updates: Partial<Layer>) => void;
}
