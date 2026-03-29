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
// SLOT METADATA (Composition Template Upload Zones)
// ============================================

/**
 * Metadata from a CompositionSlot stored on placeholder layers.
 * Enables upload zones on the canvas and proper ImageLayer configuration when filled.
 */
export interface SlotMetadata {
  slotId: string;
  templateId: string;
  label: string;
  role: 'primary' | 'secondary' | 'background' | 'accent' | 'text';
  fit: 'cover' | 'contain' | 'fill' | 'none';
  blendMode: BlendMode;
  opacity: number;
  mask: string;
  maskPath?: string;
  filter?: string;
  autoRemoveBg: boolean;
  required: boolean;
}

// ============================================
// LAYER TYPES
// ============================================
export type LayerType = 'image' | 'shape' | 'text' | 'group' | 'adjustment' | 'drawing' | 'ai-effect';

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
  /** Shared ID for layers created from the same template drop (Phase 3 bidirectional drag support) */
  groupId?: string;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string;
  originalWidth: number;
  originalHeight: number;
  filters: ImageFilters;
  /** Present when this image was placed into a composition slot upload zone */
  slotMetadata?: SlotMetadata;
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
  /** Present when this shape is a composition slot upload zone placeholder */
  slotMetadata?: SlotMetadata;
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
  textShadow?: string;
  backgroundColor?: string;
  backgroundPadding?: number;
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

/** Type guard: checks if a layer is a composition slot upload zone (unfilled placeholder) */
export function isUploadZoneLayer(layer: Layer): layer is ShapeLayer & { slotMetadata: SlotMetadata } {
  return layer.type === 'shape' && 'slotMetadata' in layer && (layer as ShapeLayer).slotMetadata != null;
}

/** Type guard: checks if a layer is a filled upload zone (image with slot metadata for revert) */
export function isFilledUploadZone(layer: Layer): layer is ImageLayer & { slotMetadata: SlotMetadata } {
  return layer.type === 'image' && 'slotMetadata' in layer && (layer as ImageLayer).slotMetadata != null;
}

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
// GLOBAL ADJUSTMENTS (for quick photo corrections)
// ============================================
/**
 * Global adjustment state for the editor.
 * Applied to entire canvas export or selected base layer.
 * Separate from per-layer ImageFilters for quick corrections.
 */
export interface AdjustmentState {
  brightness: number;        // 0-200, default 100
  contrast: number;          // 0-200, default 100
  saturation: number;        // 0-200, default 100
  hue: number;               // 0-360, default 0
  blur: number;              // 0-20, default 0
  sharpenEnabled: boolean;   // default false (CSS has no native sharpen)
  sharpenStrength: 'light' | 'medium' | 'strong'; // SVG filter presets
  rotation: number;          // 0-360, default 0
  flipHorizontal: boolean;   // default false
  flipVertical: boolean;     // default false
  filter: string;            // 'none' | 'vintage' | 'blackwhite' | 'sepia' | 'vibrant' | 'cool' | 'warm'
  watermark?: WatermarkState;
}

/**
 * User-controlled watermark for branding/attribution.
 * SEPARATE from system watermark (freemium tier enforcement - see QUEST_freemium_watermark.md)
 */
export interface WatermarkState {
  enabled: boolean;
  type: 'text' | 'image';
  content: string;           // user's text or uploaded logo URL
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;           // 0-100, default 50
  size: number;              // percentage of canvas width, default 20
}

/** Default adjustment values */
export const DEFAULT_ADJUSTMENTS: AdjustmentState = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  blur: 0,
  sharpenEnabled: false,
  sharpenStrength: 'medium',
  rotation: 0,
  flipHorizontal: false,
  flipVertical: false,
  filter: 'none',
};

// ============================================
// TOOLS
// ============================================
export type ToolType =
  | 'select'
  | 'smart-select'    // SAM-based AI object selection
  | 'move'
  | 'brush'
  | 'eraser'
  | 'pen'
  | 'clone'           // Clone stamp tool for object removal
  | 'gradient'        // Gradient fill tool
  | 'rectangle'
  | 'ellipse'
  | 'polygon'
  | 'line'
  | 'text'
  | 'eyedropper'
  | 'fill'
  | 'crop'
  | 'hand'
  | 'zoom'
  | 'replace-object'; // AI object replacement tool

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
  clone: {
    size: number;
    hardness: number;
    opacity: number;
    sourceX: number;
    sourceY: number;
  };
  gradient: {
    type: 'linear' | 'radial';
    colorStart: string;
    colorEnd: string;
    angle: number;
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
  layerOrder: string[];
  selection: Selection;
  adjustments: AdjustmentState;
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
  adjustments: AdjustmentState; // Global adjustments for quick photo corrections
  smartSelection: SmartSelectionState; // AI-powered object selection state
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
  | { type: 'REMOVE_LAYERS_BATCH'; layerIds: string[] }
  | { type: 'REMOVE_LAYERS_BY_GROUP'; groupId: string }
  | { type: 'UPDATE_LAYER'; layerId: string; updates: Partial<Layer> }
  | { type: 'UPDATE_LAYER_SILENT'; layerId: string; updates: Partial<Layer> }
  | { type: 'MOVE_GROUP_SILENT'; moves: Array<{ layerId: string; x: number; y: number }> }
  | { type: 'REORDER_LAYERS'; layerIds: string[] }
  | { type: 'GROUP_LAYERS'; layerIds: string[] }
  | { type: 'UNGROUP_LAYER'; groupId: string }
  | { type: 'DUPLICATE_LAYER'; layerId: string }
  | { type: 'MERGE_LAYERS'; layerIds: string[] }
  | { type: 'SET_SELECTION'; selection: Selection }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'UPDATE_TOOL_SETTINGS'; settings: Partial<ToolSettings> }
  | { type: 'SET_CANVAS'; canvas: Partial<CanvasState> }
  | { type: 'UPDATE_ADJUSTMENTS'; updates: Partial<AdjustmentState> }
  | { type: 'SET_SMART_SELECTION'; selection: Partial<SmartSelectionState> }
  | { type: 'CLEAR_SMART_SELECTION' }
  | { type: 'FILL_UPLOAD_ZONE'; layerId: string; imageSrc: string; imageWidth: number; imageHeight: number }
  | { type: 'CLEAR_UPLOAD_ZONE'; layerId: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' }
  | { type: 'CLEAR_CANVAS' }
  | { type: 'RESET' };

// ============================================
// COMPONENT PROPS
// ============================================
export interface ThumbnailStudioProps {
  thumbnailId?: string;
  initialImage?: string;
  thumbnailData?: {
    id: string;
    title?: string;
    imageUrl: string;
    parameters?: {
      edits?: Partial<AdjustmentState>;
      [key: string]: unknown;
    };
  };
  platformPreset?: {
    platform: string;
    width: number;
    height: number;
    name: string;
  };
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

// ============================================
// CUTTING-EDGE FEATURES (Phase 2)
// ============================================

/**
 * Smart Selection State (SAM-based object selection)
 * Enables AI-powered object detection and pixel-perfect selections
 */
export interface SmartSelectionState {
  active: boolean;
  mask: string | null;  // base64 encoded mask data
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  mode: 'replace' | 'add' | 'subtract';
  confidence: number;   // 0-1, how confident the selection is
}

export const DEFAULT_SMART_SELECTION: SmartSelectionState = {
  active: false,
  mask: null,
  bounds: null,
  mode: 'replace',
  confidence: 0,
};

/**
 * AI Effect Layer - Non-destructive AI operations
 * Stores original + AI result as separate data for reversibility
 */
export interface AIEffectLayer extends BaseLayer {
  type: 'ai-effect';
  effectType: 'bg-removal' | 'upscale' | 'enhance' | 'inpaint' | 'expand' | 'face-swap';
  originalLayerId: string;        // Reference to source layer
  aiMask?: string;                // base64 mask data (for bg removal, inpaint) - renamed to avoid conflict
  result?: string;                // base64 result data
  settings: {
    enabled: boolean;
    opacity: number;              // 0-100
    feather?: number;             // Edge feathering for masks
    prompt?: string;              // For generative operations
    negativePrompt?: string;
  };
}

/**
 * Face detection result for attention heatmap
 */
export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  landmarks?: {
    leftEye: { x: number; y: number };
    rightEye: { x: number; y: number };
    nose: { x: number; y: number };
    mouth: { x: number; y: number };
  };
}

/**
 * Attention Heatmap Data
 * Calculated from face detection, text positions, and contrast analysis
 */
export interface AttentionData {
  faces: FaceDetection[];
  textRegions: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    weight: number;           // Attention weight 0-1
  }>;
  contrastHotspots: Array<{
    x: number;
    y: number;
    radius: number;
    weight: number;
  }>;
  overallScore: number;       // 0-100
  suggestions: string[];      // Actionable improvement tips
}

export const DEFAULT_ATTENTION_DATA: AttentionData = {
  faces: [],
  textRegions: [],
  contrastHotspots: [],
  overallScore: 0,
  suggestions: [],
};

/**
 * Platform Preview Types
 * Shows how thumbnail appears on different platforms with UI chrome
 */
export type PlatformPreview = 'none' | 'youtube' | 'youtube-shorts' | 'twitch' | 'tiktok' | 'instagram';
export type DevicePreview = 'desktop' | 'mobile' | 'tablet';

export interface PlatformPreviewConfig {
  platform: PlatformPreview;
  device: DevicePreview;
  showDuration: boolean;      // YouTube duration badge
  showPlayButton: boolean;    // Center play button overlay
  showTitle: boolean;         // Title preview below
  durationText: string;       // e.g., "10:30"
  titleText: string;          // Video title preview
}

export const DEFAULT_PLATFORM_PREVIEW: PlatformPreviewConfig = {
  platform: 'none',
  device: 'desktop',
  showDuration: true,
  showPlayButton: false,
  showTitle: true,
  durationText: '10:30',
  titleText: 'Video Title Preview',
};

/**
 * Smart Guide Types
 * AI-informed positioning guides based on thumbnail psychology
 */
export type SmartGuideType = 
  | 'face-zone'           // Optimal face positioning
  | 'text-safe'           // Safe zones for text
  | 'platform-danger'     // Platform UI overlap zones
  | 'thirds'              // Rule of thirds
  | 'golden'              // Golden ratio
  | 'center'              // Center lines
  | 'attention';          // High-attention zones

export interface SmartGuide {
  id: string;
  type: SmartGuideType;
  position: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  label: string;
  priority: 'high' | 'medium' | 'low';
  color: string;
  visible: boolean;
}

export interface SmartGuidesState {
  enabled: boolean;
  showFaceZones: boolean;
  showTextSafe: boolean;
  showPlatformDanger: boolean;
  showThirds: boolean;
  showGolden: boolean;
  snapToGuides: boolean;
  guides: SmartGuide[];
}

export const DEFAULT_SMART_GUIDES: SmartGuidesState = {
  enabled: false,
  showFaceZones: true,
  showTextSafe: true,
  showPlatformDanger: true,
  showThirds: true,
  showGolden: false,
  snapToGuides: true,
  guides: [],
};

/**
 * Contextual Quick Actions
 * Actions available based on current selection/layer type
 */
export type QuickActionType =
  | 'remove-bg'
  | 'upscale'
  | 'enhance'
  | 'replace'
  | 'expand'
  | 'inpaint'
  | 'face-swap'
  | 'ai-rewrite'
  | 'restyle'
  | 'animate'
  | 'effects'
  | 'decompose';

export interface QuickAction {
  id: QuickActionType;
  label: string;
  icon: string;
  enabled: boolean;
  loading: boolean;
  tooltip: string;
}

/**
 * Generative Expand State
 * For AI-powered canvas extension (outpainting)
 */
export interface GenerativeExpandState {
  active: boolean;
  direction: 'top' | 'right' | 'bottom' | 'left' | null;
  amount: number;             // Pixels to expand
  prompt: string;             // Optional guidance prompt
  originalBounds: {
    width: number;
    height: number;
  } | null;
}

export const DEFAULT_GENERATIVE_EXPAND: GenerativeExpandState = {
  active: false,
  direction: null,
  amount: 0,
  prompt: '',
  originalBounds: null,
};

// Update Layer type to include AI Effect Layer
export type LayerWithAI = Layer | AIEffectLayer;

// ============================================
// EXTENDED EDITOR STATE
// ============================================

/**
 * Extended editor state with cutting-edge features
 */
export interface ExtendedEditorState extends EditorState {
  smartSelection: SmartSelectionState;
  attentionData: AttentionData;
  platformPreview: PlatformPreviewConfig;
  smartGuides: SmartGuidesState;
  generativeExpand: GenerativeExpandState;
  showAttentionHeatmap: boolean;
}

/**
 * Extended editor actions for new features
 */
export type ExtendedEditorAction =
  | EditorAction
  | { type: 'SET_SMART_SELECTION'; selection: Partial<SmartSelectionState> }
  | { type: 'CLEAR_SMART_SELECTION' }
  | { type: 'SET_ATTENTION_DATA'; data: AttentionData }
  | { type: 'SET_PLATFORM_PREVIEW'; config: Partial<PlatformPreviewConfig> }
  | { type: 'SET_SMART_GUIDES'; guides: Partial<SmartGuidesState> }
  | { type: 'TOGGLE_ATTENTION_HEATMAP' }
  | { type: 'SET_GENERATIVE_EXPAND'; expand: Partial<GenerativeExpandState> }
  | { type: 'ADD_AI_EFFECT_LAYER'; layer: AIEffectLayer }
  | { type: 'UPDATE_AI_EFFECT'; layerId: string; updates: Partial<AIEffectLayer['settings']> };
