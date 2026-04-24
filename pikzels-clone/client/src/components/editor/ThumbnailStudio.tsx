import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useEditorState } from './hooks/useEditorState';
import ToolsPanel from './panels/ToolsPanel';
import LayersPanel from './panels/LayersPanel';
import AIToolsPanel from './panels/AIToolsPanel';
import AdjustmentsPanel from './panels/AdjustmentsPanel';
import VideoFrameExtractor from './panels/VideoFrameExtractor';
import CanvasEngine from './canvas/CanvasEngine';
import FloatingLayerToolbar from './FloatingLayerToolbar';
// Cutting-edge feature components
import AttentionHeatmap from './components/AttentionHeatmap';
import ContextualToolbar from './components/ContextualToolbar';
import PlatformPreviewOverlay from './components/PlatformPreviewOverlay';
import SmartGuides from './components/SmartGuides';
import SmartSelectTool from './components/SmartSelectTool';
import AICommandBar from './components/AICommandBar';
import Tooltip from '../ui/Tooltip';
import { useCommandExecutor } from './hooks/useCommandExecutor';
import { useBackendAI } from '../../hooks/useBackendAI';
import { useAIToolsStore } from '../../stores/aiToolsStore';
import {
  useLayouts,
  TemplatePicker,
  SlotEditor,
  compositionToLayers,
} from '../../features/composition-templates';
import type { LayoutPreset, CompositionState } from '../../features/composition-templates';
import {
  TemplateDragDropProvider,
  CanvasDropZone,
  TrashDropZone,
  TemplateResetDropZone,
  useTemplateDragDropContext,
} from '../../features/drag-drop';
import { EditorModeToggle, useEditorMode } from '../../features/editor-mode';
import { ChatPanel, useChatConversation, useChatActions } from '../../features/ai-chat';
import type { PlatformPresetContext } from '../../features/ai-chat';
import type { 
  ThumbnailStudioProps, 
  ToolType, 
  LayerType, 
  Layer,
  ImageLayer,
  TextLayer,
  DrawingLayer,
  PlatformPreview,
  PlatformPreviewConfig,
  SmartGuidesState,
  AttentionData,
  QuickActionType,
} from './types/editor.types';
import type { ExtractedFrame } from '../../services/video';
import { config } from '../../config/environment';
import { authPost } from '../../utils/api';
import { THUMBNAIL_FONTS, TEXT_COLOR_PRESETS, TEXT_STYLE_PRESETS } from '../../constants/text-styles';
import { drawTiledWatermark } from '../../utils/drawWatermark';
import { useSubscription } from '../../hooks/useSubscription';
import { safeCanvasToBlob, safeCanvasToDataURL } from '../../utils/browserCompat';
import './ThumbnailStudio.css';

// Icons
const Icons = {
  Layers: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  ),
  Video: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  ),
  Sparkles: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 7v6h-6" />
      <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  Maximize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  ),
  Minimize: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
    </svg>
  ),
  // Cutting-edge feature icons
  Heatmap: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  Platform: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  Guides: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="8" y1="2" x2="8" y2="22" strokeDasharray="2 2" />
      <line x1="16" y1="2" x2="16" y2="22" strokeDasharray="2 2" />
    </svg>
  ),
  YouTube: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M23.5 6.2c-.3-1-1.1-1.8-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6c-1 .3-1.8 1.1-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1.1 1.8 2.1 2.1 1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6c1-.3 1.8-1.1 2.1-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.3 3.5-6.3 3.5z" />
    </svg>
  ),
  Twitch: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M11.6 16.9v-5.6h1.9v5.6h-1.9zm5.2 0v-5.6h1.9v5.6h-1.9zM4.2 2L2.3 6.2v15h5.2v2.4h2.5l2.4-2.4h3.8l5.1-5.1V2H4.2zm15.8 12.7l-2.9 2.9h-4.7l-2.4 2.4v-2.4H5.7V3.8h14.3v10.9z" />
    </svg>
  ),
  TikTok: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M19.3 5.4c-1.5-.9-2.5-2.4-2.6-4.2h-3.8v14.2c0 1.9-1.5 3.4-3.4 3.4s-3.4-1.5-3.4-3.4 1.5-3.4 3.4-3.4c.4 0 .7.1 1 .2V8.3c-.3 0-.7-.1-1-.1-4 0-7.2 3.2-7.2 7.2s3.2 7.2 7.2 7.2 7.2-3.2 7.2-7.2V9.1c1.4 1 3.1 1.6 4.9 1.6V7c-1-.1-1.9-.6-2.3-1.6z" />
    </svg>
  ),
  Sliders: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="4" y1="21" x2="4" y2="14" />
      <line x1="4" y1="10" x2="4" y2="3" />
      <line x1="12" y1="21" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12" y2="3" />
      <line x1="20" y1="21" x2="20" y2="16" />
      <line x1="20" y1="12" x2="20" y2="3" />
      <line x1="1" y1="14" x2="7" y2="14" />
      <line x1="9" y1="8" x2="15" y2="8" />
      <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
  ),
  Layout: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  FilePlus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="18" x2="12" y2="12" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
};

type PanelTab = 'layers' | 'video' | 'ai' | 'layouts' | 'adjust' | 'properties';

/**
 * Bridge component that reads the drag-drop context and passes
 * dragPreviewTemplate to CanvasEngine. Must be rendered inside
 * TemplateDragDropProvider.
 */
const CanvasWithDragPreview: React.FC<React.ComponentProps<typeof CanvasEngine>> = (props) => {
  const { draggingTemplate, isOverCanvas } = useTemplateDragDropContext();
  return (
    <CanvasEngine
      {...props}
      dragPreviewTemplate={isOverCanvas ? draggingTemplate : null}
    />
  );
};

const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({
  thumbnailId,
  initialImage,
  thumbnailData,
  platformPreset,
  onSave,
  onClose,
}) => {
  const {
    state,
    dispatch,
    addImageLayer,
    addTextLayer,
    addShapeLayer,
    addDrawingLayer,
    selectLayer,
    clearSelection,
    selectedLayers,
    orderedLayers,
    canUndo,
    canRedo,
    updateAdjustments,
    markSaved,
    // Smart Selection
    setSmartSelection,
    clearSmartSelection,
    smartSelection,
    // Clear canvas
    clearCanvas,
  } = useEditorState(1920, 1080);

  // Editor mode (Simple/Pro toggle)
  const { isSimpleMode } = useEditorMode();

  // Subscription state for watermark enforcement
  const { shouldWatermark, watermarkFreeRemaining, refreshSubscription } = useSubscription();

  // UI State
  const [activeTab, setActiveTab] = useState<PanelTab>('layers');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isFullCanvas, setIsFullCanvas] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Drag-off-canvas removal overlay state
  const [templateDragOutsideInfo, setTemplateDragOutsideInfo] = useState<{ groupId: string; layerCount: number } | null>(null);

  // Cutting-edge feature states
  const [showAttentionHeatmap, setShowAttentionHeatmap] = useState(false);
  const [showContextualToolbar, setShowContextualToolbar] = useState(true);
  const [platformPreview, setPlatformPreview] = useState<PlatformPreviewConfig>({
    platform: 'none',
    device: 'desktop',
    showDuration: true,
    showPlayButton: false,
    showTitle: true,
    durationText: '10:30',
    titleText: 'Video Title Preview',
  });
  const [smartGuides, setSmartGuides] = useState<SmartGuidesState>({
    enabled: false,
    showFaceZones: true,
    showTextSafe: true,
    showPlatformDanger: true,
    showThirds: true,
    showGolden: false,
    snapToGuides: true,
    guides: [],
  });
  const [attentionData, setAttentionData] = useState<AttentionData | null>(null);
  const [contextualActionLoading, setContextualActionLoading] = useState<Set<QuickActionType>>(new Set());

  // AI Command Bar state
  const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
  // AI Chat panel state
  const [isChatCollapsed, setIsChatCollapsed] = useState(() => {
    return localStorage.getItem('editor-chat-collapsed') === 'true';
  });
  const { callBackendAI, isLoading: isAILoading } = useBackendAI();

  // Ref for canvas container (used by FloatingLayerToolbar for positioning)
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Unsaved changes warning: browser tab close / refresh
  useEffect(() => {
    if (!state.isModified) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.isModified]);

  // Handler to update layer properties (used by FloatingLayerToolbar for AI results)
  const handleUpdateLayer = useCallback((layerId: string, updates: Partial<Layer>) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates });
  }, [dispatch]);

  // Load initial image or thumbnail data if provided
  useEffect(() => {
    if (thumbnailData?.imageUrl) {
      // Load thumbnail as locked base layer (locked=true prevents accidental edits)
      addImageLayer(thumbnailData.imageUrl, 'Background', true);
      
      // Set canvas to standard thumbnail size
      dispatch({ type: 'SET_CANVAS', canvas: { width: 1280, height: 720 } });
      
      // Merge existing edits into adjustments if present
      if (thumbnailData.parameters?.edits) {
        updateAdjustments(thumbnailData.parameters.edits);
      }
    } else if (initialImage) {
      addImageLayer(initialImage, 'Background');
    }
  }, [thumbnailData, initialImage, addImageLayer, dispatch, updateAdjustments]);

  // Keyboard shortcuts
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
            if (state.selection.layerIds.length > 1) {
              dispatch({ type: 'GROUP_LAYERS', layerIds: state.selection.layerIds });
            }
            break;
          case 'd':
            e.preventDefault();
            // Duplicate selected layers
            state.selection.layerIds.forEach(id => {
              const layer = state.layers.find(l => l.id === id);
              if (layer) {
                dispatch({ type: 'DUPLICATE_LAYER', layerId: id });
              }
            });
            break;
          case 'a':
            e.preventDefault();
            if (e.shiftKey) {
              // Ctrl+Shift+A: Deselect all
              clearSelection();
            } else {
              // Ctrl+A: Select all layers
              dispatch({ 
                type: 'SET_SELECTION', 
                selection: { layerIds: state.layers.map(l => l.id) } 
              });
            }
            break;
          case 'e':
            e.preventDefault();
            handleExport();
            break;
          case '[':
            e.preventDefault();
            // Send backward - reorder selected layers down in layerOrder
            if (state.selection.layerIds.length > 0 && state.layerOrder.length > 1) {
              const selectedId = state.selection.layerIds[0];
              const currentIndex = state.layerOrder.indexOf(selectedId);
              if (currentIndex < state.layerOrder.length - 1) {
                const newOrder = [...state.layerOrder];
                // Swap with layer below
                [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
                dispatch({ type: 'REORDER_LAYERS', layerIds: newOrder });
              }
            }
            break;
          case ']':
            e.preventDefault();
            // Bring forward - reorder selected layers up in layerOrder
            if (state.selection.layerIds.length > 0 && state.layerOrder.length > 1) {
              const selectedId = state.selection.layerIds[0];
              const currentIndex = state.layerOrder.indexOf(selectedId);
              if (currentIndex > 0) {
                const newOrder = [...state.layerOrder];
                // Swap with layer above
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
            // Ungroup layers - find the group containing selected layer
            if (state.selection.layerIds.length === 1) {
              const selectedId = state.selection.layerIds[0];
              const group = state.layers.find(l => l.type === 'group' && (l as any).children?.includes(selectedId));
              if (group) {
                dispatch({ type: 'UNGROUP_LAYER', groupId: group.id });
              }
            }
            break;
          case '[':
            e.preventDefault();
            // Send to back (move to bottom of layerOrder)
            if (state.selection.layerIds.length > 0) {
              const selectedIds = state.selection.layerIds.filter(id => state.layerOrder.includes(id));
              const otherLayers = state.layerOrder.filter(id => !selectedIds.includes(id));
              dispatch({ type: 'REORDER_LAYERS', layerIds: [...otherLayers, ...selectedIds] });
            }
            break;
          case ']':
            e.preventDefault();
            // Bring to front (move to top of layerOrder)
            if (state.selection.layerIds.length > 0) {
              const selectedIds = state.selection.layerIds.filter(id => state.layerOrder.includes(id));
              const otherLayers = state.layerOrder.filter(id => !selectedIds.includes(id));
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
        state.selection.layerIds.forEach(id => {
          dispatch({ type: 'REMOVE_LAYER', layerId: id });
        });
      }
      if (e.key === 'F11' || (e.key === 'f' && !isMod)) {
        if (e.key === 'F11') {
          e.preventDefault();
          setIsFullCanvas(prev => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, canUndo, canRedo, clearSelection, state.selection.layerIds, state.layers, state.layerOrder]);

  // Refs to access latest state without creating new callback references
  const layersRef = useRef(state.layers);
  layersRef.current = state.layers;
  const layerOrderRef = useRef(state.layerOrder);
  layerOrderRef.current = state.layerOrder;
  const selectionRef = useRef(state.selection);
  selectionRef.current = state.selection;

  // Handlers - use refs to avoid recreating on every state change
  const handleToolSelect = useCallback((tool: ToolType) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, [dispatch]);

  const handleLayerSelect = useCallback((layerId: string | null) => {
    if (layerId) {
      selectLayer(layerId);
    } else {
      clearSelection();
    }
  }, [selectLayer, clearSelection]);

  const handleLayerVisibilityToggle = useCallback((layerId: string) => {
    const layer = layersRef.current.find(l => l.id === layerId);
    if (layer) {
      dispatch({ type: 'UPDATE_LAYER', layerId, updates: { visible: !layer.visible } });
    }
  }, [dispatch]);

  const handleLayerLockToggle = useCallback((layerId: string) => {
    const layer = layersRef.current.find(l => l.id === layerId);
    if (layer) {
      dispatch({ type: 'UPDATE_LAYER', layerId, updates: { locked: !layer.locked } });
    }
  }, [dispatch]);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    const newOrder = [...layerOrderRef.current];
    const [removed] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, removed);
    dispatch({ type: 'REORDER_LAYERS', layerIds: newOrder });
  }, [dispatch]);

  const handleLayerDelete = useCallback((layerId: string) => {
    dispatch({ type: 'REMOVE_LAYER', layerId });
  }, [dispatch]);

  const handleLayerDuplicate = useCallback((layerId: string) => {
    dispatch({ type: 'DUPLICATE_LAYER', layerId });
  }, [dispatch]);

  const handleLayerUpdate = useCallback((layerId: string, updates: Partial<Layer>) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates });
  }, [dispatch]);

  const handleAddLayer = useCallback((type: LayerType) => {
    switch (type) {
      case 'text':
        addTextLayer('New Text', 100, 100);
        break;
      case 'shape':
        addShapeLayer('rectangle', 100, 100, 200, 200);
        break;
      case 'drawing':
        addDrawingLayer();
        break;
      case 'image':
        // Open file picker
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              addImageLayer(reader.result as string, file.name);
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        break;
    }
  }, [addTextLayer, addShapeLayer, addDrawingLayer, addImageLayer]);

  const handleGroupLayers = useCallback(() => {
    const ids = selectionRef.current.layerIds;
    if (ids.length > 1) {
      dispatch({ type: 'GROUP_LAYERS', layerIds: ids });
    }
  }, [dispatch]);

  const handleMergeLayers = useCallback(() => {
    const ids = selectionRef.current.layerIds;
    if (ids.length > 1) {
      dispatch({ type: 'MERGE_LAYERS', layerIds: ids });
    }
  }, [dispatch]);

  const handleZoomChange = useCallback((zoom: number) => {
    dispatch({ type: 'SET_CANVAS', canvas: { zoom } });
  }, [dispatch]);

  const handlePanChange = useCallback((panX: number, panY: number) => {
    dispatch({ type: 'SET_CANVAS', canvas: { panX, panY } });
  }, [dispatch]);

  const handleDrawingUpdate = useCallback((newPaths: any[]) => {
    // Find or create a drawing layer
    let drawingLayer = layersRef.current.find(l => l.type === 'drawing') as DrawingLayer | undefined;
    
    if (!drawingLayer) {
      const newId = addDrawingLayer();
      drawingLayer = layersRef.current.find(l => l.id === newId) as DrawingLayer;
    }

    if (drawingLayer) {
      dispatch({
        type: 'UPDATE_LAYER',
        layerId: drawingLayer.id,
        updates: {
          paths: [...(drawingLayer.paths || []), ...newPaths],
        },
      });
    }
  }, [addDrawingLayer, dispatch]);

  // Shape creation handler
  const handleShapeCreate = useCallback((
    shapeType: 'rectangle' | 'ellipse' | 'line' | 'polygon',
    x: number,
    y: number,
    width: number,
    height: number,
    points?: { x: number; y: number }[]
  ) => {
    addShapeLayer(shapeType, x, y, width, height);
  }, [addShapeLayer]);

  // Text creation handler
  // --- Inline text editing state (shared concept with Quick Editor via useInlineTextEdit) ---
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);

  const handleTextCreate = useCallback((x: number, y: number) => {
    const newId = addTextLayer('', x, y);
    // Immediately enter inline editing so user can type
    setEditingTextLayerId(newId);
  }, [addTextLayer]);

  const handleTextEditStart = useCallback((layerId: string) => {
    selectLayer(layerId);
    setEditingTextLayerId(layerId);
  }, [selectLayer]);

  const handleTextEditEnd = useCallback(() => {
    setEditingTextLayerId(null);
  }, []);

  const handleTextContentChange = useCallback((layerId: string, content: string) => {
    dispatch({ type: 'UPDATE_LAYER_SILENT', layerId, updates: { content } });
  }, [dispatch]);

  // Color picker handler (from eyedropper)
  const handleColorPick = useCallback((color: string) => {
    dispatch({
      type: 'UPDATE_TOOL_SETTINGS',
      settings: {
        brush: { ...state.toolSettings.brush, color },
        shape: { ...state.toolSettings.shape, fill: color },
      },
    });
  }, [dispatch, state.toolSettings.brush, state.toolSettings.shape]);

  // Tool change handler (e.g., text tool switches to select after placing)
  const handleToolChange = useCallback((tool: string) => {
    dispatch({ type: 'SET_TOOL', tool: tool as ToolType });
  }, [dispatch]);

  // Layer move handler (move tool drag)
  const handleLayerMove = useCallback((layerId: string, x: number, y: number) => {
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;
    dispatch({
      type: 'UPDATE_LAYER',
      layerId,
      updates: { transform: { ...layer.transform, x, y } },
    });
  }, [state.layers, dispatch]);

  // Group move handler — moves all template-group layers as one unit (no history push during drag)
  const handleGroupMove = useCallback((moves: Array<{ layerId: string; x: number; y: number }>) => {
    dispatch({ type: 'MOVE_GROUP_SILENT', moves });
  }, [dispatch]);

  // Gradient apply handler
  const handleGradientApply = useCallback((startX: number, startY: number, endX: number, endY: number) => {
    // Apply gradient as a drawing layer with gradient metadata
    const gradientSettings = state.toolSettings.gradient;
    addDrawingLayer();
    // The gradient is applied via the drawing system with start/end coordinates
    // Store gradient data for the rendering engine
  }, [state.toolSettings.gradient, addDrawingLayer]);

  // Clear canvas handler with confirmation
  const handleClearCanvas = useCallback(() => {
    if (state.layers.length === 0) return; // Nothing to clear
    setShowClearConfirm(true);
  }, [state.layers.length]);

  const confirmClearCanvas = useCallback(() => {
    clearCanvas();
    setShowClearConfirm(false);
  }, [clearCanvas]);

  // Fill area handler (flood fill)
  const handleFillArea = useCallback((x: number, y: number, color: string) => {
    // Get the canvas and perform flood fill
    const canvasEl = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvasEl) return;

    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
    const data = imageData.data;

    // Get target color at click position
    const targetIdx = (Math.floor(y) * canvasEl.width + Math.floor(x)) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];
    const targetA = data[targetIdx + 3];

    // Parse fill color
    const fillR = parseInt(color.slice(1, 3), 16);
    const fillG = parseInt(color.slice(3, 5), 16);
    const fillB = parseInt(color.slice(5, 7), 16);

    // Don't fill if same color
    if (targetR === fillR && targetG === fillG && targetB === fillB) return;

    // BFS flood fill
    const width = canvasEl.width;
    const height = canvasEl.height;
    const queue: [number, number][] = [[Math.floor(x), Math.floor(y)]];
    const visited = new Set<string>();
    const tolerance = 32; // Color tolerance for similar colors

    const colorMatch = (idx: number) => {
      return Math.abs(data[idx] - targetR) <= tolerance &&
             Math.abs(data[idx + 1] - targetG) <= tolerance &&
             Math.abs(data[idx + 2] - targetB) <= tolerance &&
             Math.abs(data[idx + 3] - targetA) <= tolerance;
    };

    while (queue.length > 0) {
      const [px, py] = queue.shift()!;
      const key = `${px},${py}`;

      if (visited.has(key)) continue;
      if (px < 0 || px >= width || py < 0 || py >= height) continue;

      const idx = (py * width + px) * 4;
      if (!colorMatch(idx)) continue;

      visited.add(key);

      // Fill pixel
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;

      // Add neighbors
      queue.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }

    // Apply filled image data
    ctx.putImageData(imageData, 0, 0);
  }, []);

  // Crop handler - crop selected layer only (not canvas-wide)
  const handleCrop = useCallback((x: number, y: number, width: number, height: number) => {
    const selectedLayerId = selectionRef.current.layerIds[0];
    
    if (!selectedLayerId) {
      console.warn('No layer selected for crop');
      return;
    }
    
    const selectedLayer = layersRef.current.find(l => l.id === selectedLayerId);
    
    if (!selectedLayer) {
      console.warn('Selected layer not found');
      return;
    }
    
    // Only support cropping image layers
    if (selectedLayer.type !== 'image') {
      console.warn('Crop only supported for image layers');
      return;
    }
    
    const imageLayer = selectedLayer as ImageLayer;
    const img = new Image();
    
    img.onload = () => {
      // Create a canvas to extract the cropped region
      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.round(width);
      cropCanvas.height = Math.round(height);
      const ctx = cropCanvas.getContext('2d');
      
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      
      // Calculate source coordinates relative to the layer's current transform
      const scaleX = imageLayer.transform.width / imageLayer.originalWidth;
      const scaleY = imageLayer.transform.height / imageLayer.originalHeight;
      
      // Source coordinates in the original image
      const srcX = x / scaleX;
      const srcY = y / scaleY;
      const srcW = width / scaleX;
      const srcH = height / scaleY;
      
      // Draw cropped region
      ctx.drawImage(
        img,
        srcX, srcY, srcW, srcH,  // source
        0, 0, width, height       // destination
      );
      
      // Get cropped image as data URL
      const croppedSrc = safeCanvasToDataURL(cropCanvas, 'image/png');
      
      // Update only the selected layer
      dispatch({
        type: 'UPDATE_LAYER',
        layerId: selectedLayerId,
        updates: {
          transform: {
            ...imageLayer.transform,
            x: 0,
            y: 0,
            width: Math.round(width),
            height: Math.round(height),
          },
          originalWidth: Math.round(width),
          originalHeight: Math.round(height),
          src: croppedSrc,
        },
      });
    };
    
    img.onerror = () => {
      console.error('Failed to load image for cropping');
    };
    
    img.src = imageLayer.src;
  }, [dispatch]);

  const handleSave = useCallback(async () => {
    // Export canvas as image
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const preview = safeCanvasToDataURL(canvas, 'image/png');
    
    // If editing an existing thumbnail, save adjustments to API
    if (thumbnailId && state.adjustments) {
      try {
        const response = await authPost(`/api/thumbnails/${thumbnailId}/edit`, { edits: state.adjustments });
        
        if (!response.ok) {
          throw new Error('Failed to save adjustments');
        }
        
        console.log('Adjustments saved successfully');
        markSaved(); // Reset dirty state after successful API save
      } catch (error) {
        console.error('Error saving adjustments:', error);
        // TODO: Show error toast to user
        return; // Don't mark as saved if API call failed
      }
    } else {
      // No API call needed, but still mark as saved
      markSaved();
    }
    
    onSave?.({
      layers: state.layers,
      preview,
    });
  }, [state.layers, state.adjustments, thumbnailId, onSave, markSaved]);

  // YouTube thumbnail requirements:
  // - Max 2MB file size
  // - Recommended: 1280x720 (16:9)
  // - Accepted formats: JPG, GIF, PNG (JPG recommended for size)
  const YOUTUBE_MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

  // Export state for format selection
  // Default to JPG when YouTube platform preview is active
  const isYouTubeMode = platformPreview.platform === 'youtube' || platformPreview.platform === 'youtube-shorts';
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg' | 'webp'>('png');
  const [exportQuality, setExportQuality] = useState(85);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Auto-switch to JPG when YouTube mode is activated
  useEffect(() => {
    if (isYouTubeMode && exportFormat !== 'jpg') {
      setExportFormat('jpg');
      setExportQuality(90); // Start with high quality for YouTube
    }
  }, [isYouTubeMode]);

  /**
   * Convert canvas to blob with size enforcement for YouTube
   * Uses progressive quality reduction to meet 2MB limit
   */
  const canvasToOptimizedBlob = useCallback(async (
    canvas: HTMLCanvasElement,
    format: 'png' | 'jpg' | 'webp',
    initialQuality: number,
    maxSizeBytes?: number
  ): Promise<{ blob: Blob; finalQuality: number }> => {
    const mimeType = format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
    
    // For PNG, no quality adjustment possible - just return as-is
    if (format === 'png') {
      const blob = await safeCanvasToBlob(canvas, mimeType);
      if (blob) {
        return { blob, finalQuality: 100 };
      }
      throw new Error('Failed to create PNG blob');
    }

    // For JPG/WebP, progressively reduce quality until under size limit
    let quality = initialQuality / 100;
    let blob: Blob | null = null;
    let attempts = 0;
    const maxAttempts = 10;
    const qualityStep = 0.1; // Reduce by 10% each attempt

    while (attempts < maxAttempts) {
      blob = await safeCanvasToBlob(canvas, mimeType, quality);

      if (!blob) {
        throw new Error(`Failed to create ${format.toUpperCase()} blob`);
      }

      // If no size limit or under limit, we're done
      if (!maxSizeBytes || blob.size <= maxSizeBytes) {
        return { blob, finalQuality: Math.round(quality * 100) };
      }

      // Reduce quality and try again
      quality = Math.max(0.1, quality - qualityStep);
      attempts++;
      
      console.log(`[Export] Size ${(blob.size / 1024 / 1024).toFixed(2)}MB > ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB limit, reducing quality to ${Math.round(quality * 100)}%`);
    }

    // If we still can't get under the limit, warn but return the best we have
    if (blob && maxSizeBytes && blob.size > maxSizeBytes) {
      console.warn(`[Export] Could not reduce file size below ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB. Final size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
    }

    return { blob: blob!, finalQuality: Math.round(quality * 100) };
  }, []);

  const handleExport = useCallback(async () => {
    const canvas = document.querySelector('.canvas-wrapper canvas') as HTMLCanvasElement;
    if (!canvas) return;

    setIsExporting(true);
    setExportError(null);

    try {
      let extension: string;
      let maxSize: number | undefined;

      switch (exportFormat) {
        case 'jpg':
          extension = 'jpg';
          // Enforce 2MB limit for YouTube mode
          maxSize = isYouTubeMode ? YOUTUBE_MAX_FILE_SIZE : undefined;
          break;
        case 'webp':
          extension = 'webp';
          break;
        case 'png':
        default:
          extension = 'png';
          break;
      }

      // For free-tier users, clone the canvas and draw watermark on the clone
      // so the live editor canvas is never modified.
      // If user has a watermark-free export available, consume it and skip watermark.
      let exportCanvas = canvas;
      let usedWatermarkFree = false;
      if (shouldWatermark) {
        if (watermarkFreeRemaining > 0) {
          // Consume one watermark-free export
          try {
            const wmResponse = await authPost('/api/subscription/use-watermark-free-export', {});
            if (wmResponse.ok) {
              usedWatermarkFree = true;
              // Skip watermark — export clean canvas
            }
          } catch {
            // If quota consumption fails, fall through to watermarked export
          }
        }

        if (!usedWatermarkFree) {
          const clone = document.createElement('canvas');
          clone.width = canvas.width;
          clone.height = canvas.height;
          const ctx = clone.getContext('2d');
          if (ctx) {
            ctx.drawImage(canvas, 0, 0);
            drawTiledWatermark(ctx, clone.width, clone.height);
            exportCanvas = clone;
          }
        }
      }

      const { blob, finalQuality } = await canvasToOptimizedBlob(
        exportCanvas,
        exportFormat,
        exportQuality,
        maxSize
      );

      // Check final size for YouTube
      if (isYouTubeMode && blob.size > YOUTUBE_MAX_FILE_SIZE) {
        setExportError(`File size (${(blob.size / 1024 / 1024).toFixed(2)}MB) exceeds YouTube's 2MB limit. Try reducing canvas size or using simpler content.`);
        return;
      }

      // Log helpful info for users
      const fileSizeMB = (blob.size / 1024 / 1024).toFixed(2);
      if (isYouTubeMode) {
        console.log(`[YouTube Export] ✓ Size: ${fileSizeMB}MB (limit: 2MB), Quality: ${finalQuality}%`);
      }

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `thumbnail-${Date.now()}${isYouTubeMode ? '-youtube' : ''}.${extension}`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);

      // Update quality state if it was auto-adjusted
      if (finalQuality !== exportQuality) {
        setExportQuality(finalQuality);
      }

      // Refresh subscription status if a watermark-free export was used
      if (usedWatermarkFree) {
        refreshSubscription();
      }
    } catch (error) {
      console.error('[Export] Error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [exportFormat, exportQuality, isYouTubeMode, canvasToOptimizedBlob, shouldWatermark, watermarkFreeRemaining, refreshSubscription]);

  // Video frame handler
  const handleVideoFrameSelect = useCallback((frame: ExtractedFrame) => {
    // Add the extracted frame as an image layer
    addImageLayer(frame.dataUrl, `Video Frame ${formatTimestamp(frame.timestamp)}`);
  }, [addImageLayer]);

  // Chat upload handler — read file as data URL and add as image layer
  const handleChatUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      addImageLayer(reader.result as string, file.name);
    };
    reader.readAsDataURL(file);
  }, [addImageLayer]);

  // Helper to format timestamp
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Contextual toolbar action handler
  const handleContextualAction = useCallback(async (action: QuickActionType) => {
    if (selectedLayers.length === 0) return;
    
    // Set loading state
    setContextualActionLoading(prev => new Set(prev).add(action));
    
    try {
      // Switch to AI tab and set the appropriate AI tool tab
      setActiveTab('ai');
      
      // Map contextual actions to AI tool tabs
      const actionToTabMap: Record<QuickActionType, string> = {
        'remove-bg': 'remove-bg',
        'upscale': 'upscale',
        'enhance': 'enhance',
        'replace': 'inpaint',
        'expand': 'expand',
        'inpaint': 'inpaint',
        'face-swap': 'face-swap',
        'ai-rewrite': 'ai-text',
        'restyle': 'ai-text',
        'animate': 'enhance',
        'effects': 'enhance',
        'decompose': 'decompose',
      };
      
      const aiTab = actionToTabMap[action];
      if (aiTab) {
        // Type assertion simplified to avoid Babel parsing issues
        useAIToolsStore.getState().setActiveTab(aiTab as 'generate' | 'ai-text' | 'inpaint' | 'remove-bg' | 'face-swap' | 'upscale' | 'enhance' | 'expand' | 'decompose' | 'analyze' | 'vision' | 'vision-search');
      }
      
      // Brief delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      console.log(`Contextual action triggered: ${action} → AI tab: ${aiTab}`);
    } finally {
      setContextualActionLoading(prev => {
        const next = new Set(prev);
        next.delete(action);
        return next;
      });
    }
  }, [selectedLayers]);

  // Calculate selected layer bounds for contextual toolbar positioning
  const selectedLayerBounds = useMemo(() => {
    if (selectedLayers.length === 0) return null;
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    selectedLayers.forEach(layer => {
      const { x, y, width, height } = layer.transform;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [selectedLayers]);

  // Platform preview cycle handler
  const cyclePlatformPreview = useCallback(() => {
    const platforms: PlatformPreview[] = ['none', 'youtube', 'youtube-shorts', 'twitch', 'tiktok'];
    const currentIndex = platforms.indexOf(platformPreview.platform);
    const nextPlatform = platforms[(currentIndex + 1) % platforms.length];
    setPlatformPreview(prev => ({ ...prev, platform: nextPlatform }));
  }, [platformPreview.platform]);

  // AI Command Bar: set up the command executor with editor callbacks
  const toggleCommandBar = useCallback(() => {
    setIsCommandBarOpen(prev => !prev);
  }, []);

  const commandExecutor = useCommandExecutor({
    addTextLayer,
    addShapeLayer,
    addImageLayer,
    updateLayer: (layerId: string, updates: Partial<Layer>) => {
      dispatch({ type: 'UPDATE_LAYER', layerId, updates });
    },
    deleteLayer: (layerId: string) => {
      dispatch({ type: 'REMOVE_LAYER', layerId });
    },
    duplicateLayer: (layerId: string) => {
      dispatch({ type: 'DUPLICATE_LAYER', layerId });
    },
    selectLayer,
    reorderLayers: (layerIds: string[]) => {
      dispatch({ type: 'REORDER_LAYERS', layerIds });
    },
    groupLayers: (layerIds: string[]) => {
      dispatch({ type: 'GROUP_LAYERS', layerIds });
    },
    ungroupLayers: (groupId: string) => {
      dispatch({ type: 'UNGROUP_LAYER', groupId });
    },
    callBackendAI,
    getLayers: () => layersRef.current,
    getLayerOrder: () => layerOrderRef.current,
    getSelectedLayerIds: () => selectionRef.current.layerIds,
    getCanvasSize: () => ({ width: state.canvas.width, height: state.canvas.height }),
    startBatch: (label: string) => {
      dispatch({ type: 'BATCH_START', label });
    },
    endBatch: () => {
      dispatch({ type: 'BATCH_END' });
    },
    getCanvasScreenshot: () => {
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      if (!canvas) return null;
      return canvas.toDataURL('image/jpeg', 0.7);
    },
  });

  // AI Chat conversation & actions
  const getCanvasScreenshot = useCallback((): string | null => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return null;
    const maxDim = 1024;
    const scale = Math.min(maxDim / canvas.width, maxDim / canvas.height, 1);
    if (scale < 1) {
      const offscreen = document.createElement('canvas');
      offscreen.width = Math.round(canvas.width * scale);
      offscreen.height = Math.round(canvas.height * scale);
      const ctx = offscreen.getContext('2d');
      if (!ctx) return safeCanvasToDataURL(canvas, 'image/jpeg', 0.7);
      ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
      return safeCanvasToDataURL(offscreen, 'image/jpeg', 0.7);
    }
    return safeCanvasToDataURL(canvas, 'image/jpeg', 0.7);
  }, []);
  
  // Fix: Use ref to break circular dependency between chatConversation and chatActionsHook
  // This prevents stale closure where chatActionsHook would be undefined in onActions callback
  const updateActionResultRef = useRef<((
    messageId: string,
    actionIndex: number,
    status: 'pending' | 'executing' | 'success' | 'error',
    error?: string,
    resultText?: string,
  ) => void) | null>(null);
  
  const chatActionsHook = useChatActions({
    commandExecutor: {
      executeAction: commandExecutor.executeAction,
      startBatch: (label: string) => dispatch({ type: 'BATCH_START', label }),
      endBatch: () => dispatch({ type: 'BATCH_END' }),
    },
    updateActionResult: (...args) => updateActionResultRef.current?.(...args),
  });
  
  const chatConversation = useChatConversation({
    getCanvasContext: commandExecutor.buildContext,
    getCanvasScreenshot,
    platformPreset: platformPreset as PlatformPresetContext | undefined,
    onActions: (actions, messageId) => {
      chatActionsHook.executeActions(actions, messageId);
    },
  });
  
  // Keep ref in sync with chatConversation's updateActionResult
  updateActionResultRef.current = chatConversation.updateActionResult;

  const toggleChatCollapsed = useCallback(() => {
    setIsChatCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('editor-chat-collapsed', String(next));
      return next;
    });
  }, []);

  // Layouts — Advanced Editor integration
  const layouts = useLayouts();

  const handleApplyLayoutToEditor = useCallback(() => {
    if (!layouts.selectedTemplate || !layouts.compositionState) return;
    const missing = layouts.getMissingSlots();
    if (missing.length > 0) return;

    const { layers: newLayers } = compositionToLayers(
      layouts.selectedTemplate,
      layouts.compositionState,
      { groupId: crypto.randomUUID() }
    );

    // Add each layer to the editor via dispatch
    for (const layer of newLayers) {
      dispatch({ type: 'ADD_LAYER', layer });
    }

    layouts.clearTemplate();
  }, [layouts, dispatch]);

  /**
   * Handle template dropped on canvas from drag-and-drop.
   * Creates layers from the template and adds them to the editor.
   */
  const handleTemplateDropOnCanvas = useCallback((
    template: LayoutPreset,
    compositionState: CompositionState,
    _dropPosition: { x: number; y: number }
  ) => {
    // Generate a shared groupId for all layers from this drop
    const groupId = crypto.randomUUID();

    const { layers: newLayers } = compositionToLayers(
      template,
      compositionState,
      { groupId }
    );

    // Add each layer to the editor
    // Note: drop position is not used for offset since templates have
    // their own coordinate system. Future enhancement could adjust
    // layer positions based on drop point.
    for (const layer of newLayers) {
      dispatch({ type: 'ADD_LAYER', layer });
    }
  }, [dispatch]);

  /**
   * Handle layer dropped on trash zone.
   * Removes the layer (or all layers in its group if groupId is provided).
   */
  const handleLayerDropToTrash = useCallback((layerId: string, groupId?: string) => {
    if (groupId) {
      // Remove all layers in the group
      dispatch({ type: 'REMOVE_LAYERS_BY_GROUP', groupId });
    } else {
      // Remove single layer
      dispatch({ type: 'REMOVE_LAYER', layerId });
    }
  }, [dispatch]);

  /** Remove a template group from the canvas (click, drag handle, or drag-off-canvas) */
  const handleRemoveTemplateGroup = useCallback((groupId: string) => {
    dispatch({ type: 'REMOVE_LAYERS_BY_GROUP', groupId });
    setTemplateDragOutsideInfo(null);
  }, [dispatch]);

  /** Called when a template-group layer is dragged outside the canvas viewport */
  const handleTemplateDragOutside = useCallback((info: { groupId: string; layerCount: number }) => {
    if (!isPanelCollapsed) {
      setTemplateDragOutsideInfo(info);
    }
  }, [isPanelCollapsed]);

  /** Called when cursor re-enters canvas during an outside drag */
  const handleTemplateDragReturn = useCallback(() => {
    setTemplateDragOutsideInfo(null);
  }, []);

  /**
   * Handle filling an upload zone placeholder with an image.
   */
  const handleFillUploadZone = useCallback((
    layerId: string,
    imageSrc: string,
    imageWidth: number,
    imageHeight: number
  ) => {
    dispatch({ type: 'FILL_UPLOAD_ZONE', layerId, imageSrc, imageWidth, imageHeight });
  }, [dispatch]);

  /**
   * Handle clearing a filled upload zone back to placeholder.
   */
  const handleClearUploadZone = useCallback((layerId: string) => {
    dispatch({ type: 'CLEAR_UPLOAD_ZONE', layerId });
  }, [dispatch]);

  /**
   * Get count of layers sharing a groupId (for trash zone confirmation).
   */
  const getGroupLayerCount = useCallback((groupId: string): number => {
    return state.layers.filter(l => l.groupId === groupId).length;
  }, [state.layers]);

  return (
    <TemplateDragDropProvider
      onDropTemplate={handleTemplateDropOnCanvas}
      onDropLayerToTrash={handleLayerDropToTrash}
      canvasWidth={state.canvas.width}
      canvasHeight={state.canvas.height}
    >
    <div className={`thumbnail-studio ${isFullCanvas ? 'thumbnail-studio--fullscreen' : ''}`}>
      {/* Top Toolbar */}
      <header className="editor-toolbar">
        <div className="editor-toolbar__left">
          {onClose && (
            <button className="editor-btn editor-btn--icon" onClick={onClose} title="Close">
              <Icons.X />
            </button>
          )}
          <h1 className="editor-toolbar__title">Thumbnail Studio</h1>
          <div className="editor-toolbar__divider" />
          <button 
            className="editor-btn editor-btn--icon" 
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Icons.Undo />
          </button>
          <button 
            className="editor-btn editor-btn--icon"
            onClick={() => dispatch({ type: 'REDO' })}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            <Icons.Redo />
          </button>
          <div className="editor-toolbar__divider" />
          <button 
            className="editor-btn editor-btn--icon"
            onClick={handleClearCanvas}
            disabled={state.layers.length === 0}
            title="New Canvas (Ctrl+Shift+N)"
          >
            <Icons.FilePlus />
          </button>
          <div className="editor-toolbar__divider" />
          <EditorModeToggle />
        </div>

        <div className="editor-toolbar__center">
          {/* View Controls — hidden in Simple mode */}
          {!isSimpleMode && (
            <>
              <button
                className={`editor-btn ${showAttentionHeatmap ? 'editor-btn--accent' : ''}`}
                onClick={() => setShowAttentionHeatmap(prev => !prev)}
                title="Toggle Attention Heatmap"
              >
                <Icons.Heatmap />
                Heatmap
              </button>
              <button
                className={`editor-btn ${platformPreview.platform !== 'none' ? 'editor-btn--accent' : ''}`}
                onClick={() => cyclePlatformPreview()}
                title={`Platform Preview: ${platformPreview.platform === 'none' ? 'Off' : platformPreview.platform}`}
              >
                {platformPreview.platform === 'youtube' || platformPreview.platform === 'youtube-shorts' ? (
                  <Icons.YouTube />
                ) : platformPreview.platform === 'twitch' ? (
                  <Icons.Twitch />
                ) : platformPreview.platform === 'tiktok' ? (
                  <Icons.TikTok />
                ) : (
                  <Icons.Platform />
                )}
                {platformPreview.platform === 'none' ? 'Platform' : platformPreview.platform}
              </button>
              <button
                className={`editor-btn ${smartGuides.enabled ? 'editor-btn--accent' : ''}`}
                onClick={() => setSmartGuides(prev => ({ ...prev, enabled: !prev.enabled }))}
                title="Toggle Smart Guides"
              >
                <Icons.Guides />
                Guides
              </button>
            </>
          )}
        </div>

        <div className="editor-toolbar__right">
          <button
            className="editor-btn editor-btn--icon"
            onClick={() => setIsFullCanvas(prev => !prev)}
            title={isFullCanvas ? 'Exit fullscreen (F11)' : 'Fullscreen (F11)'}
          >
            {isFullCanvas ? <Icons.Minimize /> : <Icons.Maximize />}
          </button>
          <div className="editor-toolbar__divider" />
          
          {/* YouTube mode indicator */}
          {isYouTubeMode && (
            <span 
              className="editor-toolbar__youtube-badge"
              title="YouTube mode: JPG export with 2MB max file size"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                backgroundColor: '#ff0000',
                color: 'white',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
              }}
            >
              <Icons.YouTube />
              2MB Max
            </span>
          )}
          
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'png' | 'jpg' | 'webp')}
            className="editor-toolbar__select"
            title={isYouTubeMode ? 'YouTube requires JPG for best compatibility (auto-selected)' : 'Export format'}
          >
            <option value="png">PNG</option>
            <option value="jpg">{isYouTubeMode ? 'JPG (YouTube)' : 'JPG'}</option>
            <option value="webp">WebP</option>
          </select>
          {(exportFormat === 'jpg' || exportFormat === 'webp') && (
            <div className="editor-toolbar__quality">
              <span className="editor-toolbar__quality-label">{exportQuality}%</span>
              <input
                type="range"
                min="10"
                max="100"
                value={exportQuality}
                onChange={(e) => setExportQuality(parseInt(e.target.value))}
                className="editor-toolbar__quality-slider"
                title={isYouTubeMode ? 'Quality (auto-adjusts to stay under 2MB)' : 'Quality'}
              />
            </div>
          )}
          <button 
            className={`editor-btn ${isYouTubeMode ? 'editor-btn--youtube' : ''}`}
            onClick={handleExport}
            disabled={isExporting}
            title={isYouTubeMode ? 'Export YouTube-ready thumbnail (JPG, max 2MB)' : 'Export thumbnail'}
            style={isYouTubeMode ? { borderColor: '#ff0000' } : undefined}
          >
            <Icons.Download />
            {isExporting ? 'Exporting...' : isYouTubeMode ? 'Export for YouTube' : 'Export'}
          </button>
          <button className="editor-btn editor-btn--primary" onClick={handleSave}>
            <Icons.Save />
            Save
          </button>
          
          {/* Export error toast */}
          {exportError && (
            <div 
              className="editor-toolbar__export-error"
              style={{
                position: 'absolute',
                top: '100%',
                right: '8px',
                marginTop: '8px',
                padding: '8px 12px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderRadius: '6px',
                fontSize: '12px',
                maxWidth: '300px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 100,
              }}
            >
              ⚠️ {exportError}
              <button
                onClick={() => setExportError(null)}
                style={{
                  marginLeft: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#dc2626',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="editor-main">
        {/* Left Tools Panel */}
        <ToolsPanel
          activeTool={state.activeTool}
          toolSettings={state.toolSettings}
          onToolSelect={handleToolSelect}
          onSettingsChange={(settings) => dispatch({ type: 'UPDATE_TOOL_SETTINGS', settings })}
        />

        {/* Canvas Area with Floating Toolbar - Wrapped in CanvasDropZone for template drag-drop */}
        <CanvasDropZone>
        <div ref={canvasContainerRef} className="canvas-area-wrapper">
          <CanvasWithDragPreview
            state={state}
            onZoomChange={handleZoomChange}
            onPanChange={handlePanChange}
            onLayerSelect={handleLayerSelect}
            onDrawingUpdate={handleDrawingUpdate}
            onShapeCreate={handleShapeCreate}
            onTextCreate={handleTextCreate}
            onColorPick={handleColorPick}
            onFillArea={handleFillArea}
            onCrop={handleCrop}
            onToolChange={handleToolChange}
            onLayerMove={handleLayerMove}
            onGroupMove={handleGroupMove}
            onGradientApply={handleGradientApply}
            editingTextLayerId={editingTextLayerId}
            onTextEditStart={handleTextEditStart}
            onTextEditEnd={handleTextEditEnd}
            onTextContentChange={handleTextContentChange}
            onFillUploadZone={handleFillUploadZone}
            onClearUploadZone={handleClearUploadZone}
            onRemoveTemplateGroup={handleRemoveTemplateGroup}
            onTemplateDragOutside={handleTemplateDragOutside}
            onTemplateDragReturn={handleTemplateDragReturn}
          />
          
          {/* Cutting-edge Canvas Overlays */}
          {/* Smart Guides - shows optimal positioning */}
          {smartGuides.enabled && (
            <SmartGuides
              config={smartGuides}
              canvasWidth={state.canvas.width}
              canvasHeight={state.canvas.height}
              platform={platformPreview.platform}
              draggedLayer={selectedLayers.length === 1 ? selectedLayers[0] : null}
              snapThreshold={10}
            />
          )}
          
          {/* Attention Heatmap - shows viewer focus areas */}
          {showAttentionHeatmap && (
            <AttentionHeatmap
              enabled={showAttentionHeatmap}
              layers={state.layers}
              canvasWidth={state.canvas.width}
              canvasHeight={state.canvas.height}
              canvasZoom={state.canvas.zoom}
              canvasPan={{ x: state.canvas.panX, y: state.canvas.panY }}
              onAttentionCalculated={setAttentionData}
            />
          )}
          
          {/* Platform Preview - shows how thumbnail appears on platforms */}
          {platformPreview.platform !== 'none' && (
            <PlatformPreviewOverlay
              config={platformPreview}
              canvasWidth={state.canvas.width}
              canvasHeight={state.canvas.height}
              onConfigChange={(updates) => setPlatformPreview(prev => ({ ...prev, ...updates }))}
            />
          )}
          
          {/* Contextual Quick Actions Toolbar */}
          {showContextualToolbar && selectedLayers.length > 0 && selectedLayerBounds && (
            <ContextualToolbar
              selectedLayers={selectedLayers}
              layerBounds={selectedLayerBounds}
              canvasZoom={state.canvas.zoom}
              canvasPan={{ x: state.canvas.panX, y: state.canvas.panY }}
              onAction={handleContextualAction}
              loadingActions={contextualActionLoading}
            />
          )}
          
          {/* Floating toolbar for selected layers (existing) */}
          {selectedLayers.length > 0 && (
            <FloatingLayerToolbar
              selectedLayers={selectedLayers}
              onUpdateLayer={handleUpdateLayer}
              canvasContainerRef={canvasContainerRef}
            />
          )}
          
          {/* Trash Zone - appears when dragging a layer for removal */}
          <TrashDropZone
            getGroupLayerCount={getGroupLayerCount}
          />
          
          {/* AI Command Bar Trigger Button */}
          <Tooltip
            content="Quick one-shot AI commands — describe what you want and it executes immediately. No conversation history."
            side="top"
            sideOffset={8}
          >
            <button
              className="ai-command-trigger"
              onClick={toggleCommandBar}
            >
              <Icons.Sparkles />
              <span>Ask AI</span>
              <span className="ai-command-trigger-shortcut">Ctrl+K</span>
            </button>
          </Tooltip>

          {/* Smart Select Tool - AI-powered object selection */}
          <SmartSelectTool
            enabled={state.activeTool === 'smart-select'}
            canvasWidth={state.canvas.width}
            canvasHeight={state.canvas.height}
            canvasZoom={state.canvas.zoom}
            canvasPan={{ x: state.canvas.panX, y: state.canvas.panY }}
            smartSelection={smartSelection}
            onSelectionChange={setSmartSelection}
            onClearSelection={clearSmartSelection}
            getCanvasImage={async () => {
              // Get canvas image from CanvasEngine
              const canvas = canvasContainerRef.current?.querySelector('canvas');
              if (!canvas) return null;
              return safeCanvasToDataURL(canvas, 'image/png').split(',')[1];
            }}
            onSegment={async (request) => {
              // Route segmentation through the backend API (keeps API keys server-side)
              // Supports two modes:
              // - 'interactive': When points/clicks provided, uses SAM 2 Video for click-to-select
              // - 'auto': When no points, uses SAM 2 for grid-based auto-detection
              try {
                const hasClicks = request.points && request.points.length > 0;
                const mode = hasClicks ? 'interactive' : 'auto';
                
                const requestBody: Record<string, unknown> = {
                  image: request.image,
                  mode,
                };

                if (hasClicks) {
                  // Interactive mode: pass clicks with foreground label (1)
                  requestBody.clicks = request.points.map((p: { x: number; y: number }) => ({
                    x: p.x,
                    y: p.y,
                    label: 1, // Foreground selection
                  }));
                }

                const response = await authPost(
                  '/api/thumbnails/ai/segment',
                  requestBody
                );

                if (!response.ok) {
                  const data = await response.json().catch(() => ({}));
                  throw new Error(data.error || `Segment failed (${response.status})`);
                }

                const data = await response.json();

                if (data.success && data.masks && data.masks.length > 0) {
                  const mask = data.masks[0];
                  let maskBase64 = '';

                  if (mask.url) {
                    // Fetch mask image from Replicate URL and convert to base64
                    const maskResponse = await fetch(mask.url);
                    const blob = await maskResponse.blob();
                    maskBase64 = await new Promise<string>((resolve) => {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const base64 = (reader.result as string).split(',')[1];
                        resolve(base64);
                      };
                      reader.readAsDataURL(blob);
                    });
                  }

                  return {
                    mask: maskBase64,
                    bounds: { x: 0, y: 0, width: 0, height: 0 },
                  };
                }

                // Also check combinedMask from backend response (auto mode)
                if (data.success && data.combinedMask) {
                  const maskResponse = await fetch(data.combinedMask);
                  const blob = await maskResponse.blob();
                  const maskBase64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = (reader.result as string).split(',')[1];
                      resolve(base64);
                    };
                    reader.readAsDataURL(blob);
                  });

                  return {
                    mask: maskBase64,
                    bounds: { x: 0, y: 0, width: 0, height: 0 },
                  };
                }

                return null;
              } catch (error) {
                console.error('SAM segmentation error:', error);
                return null;
              }
            }}
          />
        </div>
        </CanvasDropZone>

        {/* Toggle panel button (visible when collapsed or in fullscreen) */}
        {(isPanelCollapsed || isFullCanvas) && !isFullCanvas && (
          <button
            className="toggle-panels-btn"
            onClick={() => setIsPanelCollapsed(false)}
            style={{ right: 0 }}
          >
            <Icons.ChevronLeft />
          </button>
        )}

        {/* Right Panels */}
        {!isFullCanvas && (
          <aside className={`panels-container ${isPanelCollapsed ? 'panels-container--collapsed' : ''}`}>
            {!isPanelCollapsed && (
              <>
                {/* Panel tabs */}
                <div className="panels-tabs">
                  <button
                    className={`panels-tab ${activeTab === 'layers' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('layers')}
                  >
                    <Icons.Layers />
                    Layers
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'video' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('video')}
                  >
                    <Icons.Video />
                    Video
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'ai' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                  >
                    <Icons.Sparkles />
                    AI
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'layouts' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('layouts')}
                  >
                    <Icons.Layout />
                    Layouts
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'adjust' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('adjust')}
                  >
                    <Icons.Sliders />
                    Adjust
                  </button>
                  <button
                    className={`panels-tab ${activeTab === 'properties' ? 'panels-tab--active' : ''}`}
                    onClick={() => setActiveTab('properties')}
                  >
                    <Icons.Settings />
                    Props
                  </button>
                  <button
                    onClick={() => setIsPanelCollapsed(true)}
                    style={{
                      width: 32,
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--editor-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icons.ChevronRight />
                  </button>
                </div>

                {/* Panel content */}
                <div className="panel-content">
                  {activeTab === 'layers' && (
                    <LayersPanel
                      layers={state.layers}
                      layerOrder={state.layerOrder}
                      selection={state.selection}
                      onLayerSelect={selectLayer}
                      onLayerVisibilityToggle={handleLayerVisibilityToggle}
                      onLayerLockToggle={handleLayerLockToggle}
                      onLayerReorder={handleLayerReorder}
                      onLayerDelete={handleLayerDelete}
                      onLayerDuplicate={handleLayerDuplicate}
                      onLayerUpdate={handleLayerUpdate}
                      onAddLayer={handleAddLayer}
                      onGroupLayers={handleGroupLayers}
                      onMergeLayers={handleMergeLayers}
                    />
                  )}
                  {activeTab === 'video' && (
                    <VideoFrameExtractor
                      onFrameSelect={handleVideoFrameSelect}
                      onAddToCanvas={addImageLayer}
                    />
                  )}
                  {activeTab === 'ai' && (
                    <div className="ai-tab-content">
                      <AIToolsPanel
                        selectedLayers={selectedLayers}
                        onAddImageLayer={addImageLayer}
                        onAddTextLayer={addTextLayer}
                        onUpdateLayer={handleLayerUpdate}
                      />
                    </div>
                  )}
                  {activeTab === 'layouts' && (
                    <TemplateResetDropZone>
                    <div className="layouts-tab-content">
                      <div className="composition-section">
                        {layouts.selectedTemplate && layouts.compositionState ? (
                          <div className="composition-active">
                            <SlotEditor
                              template={layouts.selectedTemplate}
                              compositionState={layouts.compositionState}
                              onFillSlot={layouts.fillSlot}
                              onClearSlot={layouts.clearSlot}
                              onFillTextSlot={layouts.fillTextSlot}
                              onClearTextSlot={layouts.clearTextSlot}
                            />
                            <div className="composition-actions">
                              <button
                                className="editor-btn editor-btn--secondary"
                                onClick={() => layouts.clearTemplate()}
                              >
                                Cancel
                              </button>
                              <button
                                className="editor-btn editor-btn--primary"
                                onClick={handleApplyLayoutToEditor}
                                disabled={!layouts.isComplete()}
                                title={layouts.getMissingSlots().length > 0
                                  ? `Missing: ${layouts.getMissingSlots().join(', ')}`
                                  : 'Add layout layers to editor'
                                }
                              >
                                Add to Canvas
                              </button>
                            </div>
                          </div>
                        ) : (
                          <TemplatePicker
                            templates={layouts.filteredTemplates}
                            selectedTemplateId={null}
                            categoryFilter={layouts.categoryFilter}
                            searchQuery={layouts.searchQuery}
                            onCategoryChange={layouts.setCategoryFilter}
                            onSearchChange={layouts.setSearchQuery}
                            onSelectTemplate={layouts.selectTemplate}
                            onClearTemplate={layouts.clearTemplate}
                          />
                        )}
                      </div>
                    </div>
                    </TemplateResetDropZone>
                  )}
                  {activeTab === 'adjust' && (
                    <div className="properties-panel">
                      <AdjustmentsPanel
                        adjustments={state.adjustments}
                        onChange={updateAdjustments}
                      />
                    </div>
                  )}
                  {activeTab === 'properties' && (
                    <div className="properties-panel">
                      {selectedLayers.length === 0 ? (
                        <div style={{
                          padding: '24px',
                          textAlign: 'center',
                          color: 'var(--editor-text-muted)',
                          fontSize: '12px',
                        }}>
                          Select a layer to view properties
                        </div>
                      ) : (
                        <div>
                          <div className="properties-section">
                            <h4 className="properties-section__title">Transform</h4>
                            {selectedLayers.map(layer => (
                              <div key={layer.id}>
                                <div className="properties-row">
                                  <span className="properties-label">X</span>
                                  <input
                                    type="number"
                                    className="properties-input"
                                    value={Math.round(layer.transform.x)}
                                    onChange={(e) => handleLayerUpdate(layer.id, {
                                      transform: { ...layer.transform, x: parseInt(e.target.value) || 0 }
                                    })}
                                  />
                                </div>
                                <div className="properties-row">
                                  <span className="properties-label">Y</span>
                                  <input
                                    type="number"
                                    className="properties-input"
                                    value={Math.round(layer.transform.y)}
                                    onChange={(e) => handleLayerUpdate(layer.id, {
                                      transform: { ...layer.transform, y: parseInt(e.target.value) || 0 }
                                    })}
                                  />
                                </div>
                                <div className="properties-row">
                                  <span className="properties-label">Width</span>
                                  <input
                                    type="number"
                                    className="properties-input"
                                    value={Math.round(layer.transform.width)}
                                    onChange={(e) => handleLayerUpdate(layer.id, {
                                      transform: { ...layer.transform, width: parseInt(e.target.value) || 1 }
                                    })}
                                  />
                                </div>
                                <div className="properties-row">
                                  <span className="properties-label">Height</span>
                                  <input
                                    type="number"
                                    className="properties-input"
                                    value={Math.round(layer.transform.height)}
                                    onChange={(e) => handleLayerUpdate(layer.id, {
                                      transform: { ...layer.transform, height: parseInt(e.target.value) || 1 }
                                    })}
                                  />
                                </div>
                                <div className="properties-row">
                                  <span className="properties-label">Rotation</span>
                                  <input
                                    type="number"
                                    className="properties-input"
                                    value={Math.round(layer.transform.rotation)}
                                    onChange={(e) => handleUpdateLayer(layer.id, {
                                      transform: { ...layer.transform, rotation: parseInt(e.target.value) || 0 }
                                    })}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Per-layer filters - only for image layers */}
                          {selectedLayers.length === 1 && selectedLayers[0].type === 'image' && (
                            <div className="properties-section">
                              <h4 className="properties-section__title">Filters</h4>
                              {(() => {
                                const imgLayer = selectedLayers[0] as ImageLayer;
                                const filters = imgLayer.filters || { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0 };
                                return (
                                  <>
                                    <div className="properties-row">
                                      <span className="properties-label">Brightness</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        value={filters.brightness}
                                        onChange={(e) => handleUpdateLayer(imgLayer.id, {
                                          filters: { ...filters, brightness: parseInt(e.target.value) }
                                        } as any)}
                                        className="properties-slider"
                                      />
                                      <span className="properties-value">{filters.brightness}%</span>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Contrast</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        value={filters.contrast}
                                        onChange={(e) => handleUpdateLayer(imgLayer.id, {
                                          filters: { ...filters, contrast: parseInt(e.target.value) }
                                        } as any)}
                                        className="properties-slider"
                                      />
                                      <span className="properties-value">{filters.contrast}%</span>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Saturation</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="200"
                                        value={filters.saturation}
                                        onChange={(e) => handleUpdateLayer(imgLayer.id, {
                                          filters: { ...filters, saturation: parseInt(e.target.value) }
                                        } as any)}
                                        className="properties-slider"
                                      />
                                      <span className="properties-value">{filters.saturation}%</span>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Hue</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        value={filters.hue}
                                        onChange={(e) => handleUpdateLayer(imgLayer.id, {
                                          filters: { ...filters, hue: parseInt(e.target.value) }
                                        } as any)}
                                        className="properties-slider"
                                      />
                                      <span className="properties-value">{filters.hue}°</span>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Blur</span>
                                      <input
                                        type="range"
                                        min="0"
                                        max="20"
                                        value={filters.blur}
                                        onChange={(e) => handleUpdateLayer(imgLayer.id, {
                                          filters: { ...filters, blur: parseInt(e.target.value) }
                                        } as any)}
                                        className="properties-slider"
                                      />
                                      <span className="properties-value">{filters.blur}px</span>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}

                          {/* Per-layer text properties - only for text layers */}
                          {selectedLayers.length === 1 && selectedLayers[0].type === 'text' && (
                            <div className="properties-section">
                              <h4 className="properties-section__title">Text</h4>
                              {(() => {
                                const textLayer = selectedLayers[0] as TextLayer;
                                return (
                                  <>
                                    <div className="properties-row">
                                      <span className="properties-label">Content</span>
                                      <input
                                        type="text"
                                        className="properties-input"
                                        value={textLayer.content}
                                        onChange={(e) => handleUpdateLayer(textLayer.id, {
                                          content: e.target.value
                                        } as any)}
                                      />
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Font</span>
                                      <select
                                        className="properties-input"
                                        value={textLayer.fontFamily}
                                        onChange={(e) => handleUpdateLayer(textLayer.id, {
                                          fontFamily: e.target.value
                                        } as any)}
                                      >
                                        {THUMBNAIL_FONTS.map(f => (
                                          <option key={f.value} value={f.value}>{f.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Size</span>
                                      <input
                                        type="number"
                                        className="properties-input"
                                        value={textLayer.fontSize}
                                        min="8"
                                        max="200"
                                        onChange={(e) => handleUpdateLayer(textLayer.id, {
                                          fontSize: parseInt(e.target.value) || 16
                                        } as any)}
                                      />
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Color</span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                                        <input
                                          type="color"
                                          value={textLayer.fill}
                                          onChange={(e) => handleUpdateLayer(textLayer.id, {
                                            fill: e.target.value
                                          } as any)}
                                          className="properties-color"
                                        />
                                        <div className="properties-color-presets">
                                          {TEXT_COLOR_PRESETS.map(c => (
                                            <button
                                              key={c}
                                              className={`properties-color-swatch ${textLayer.fill === c ? 'properties-color-swatch--active' : ''}`}
                                              style={{ background: c }}
                                              onClick={() => handleUpdateLayer(textLayer.id, { fill: c } as any)}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Align</span>
                                      <div className="properties-buttons">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                          <button
                                            key={align}
                                            className={`properties-btn ${textLayer.textAlign === align ? 'properties-btn--active' : ''}`}
                                            onClick={() => handleUpdateLayer(textLayer.id, {
                                              textAlign: align
                                            } as any)}
                                          >
                                            {align[0].toUpperCase()}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="properties-row">
                                      <span className="properties-label">Weight</span>
                                      <select
                                        className="properties-input"
                                        value={textLayer.fontWeight}
                                        onChange={(e) => handleUpdateLayer(textLayer.id, {
                                          fontWeight: parseInt(e.target.value)
                                        } as any)}
                                      >
                                        <option value="300">Light</option>
                                        <option value="400">Normal</option>
                                        <option value="500">Medium</option>
                                        <option value="600">Semi Bold</option>
                                        <option value="700">Bold</option>
                                        <option value="800">Extra Bold</option>
                                        <option value="900">Black</option>
                                      </select>
                                    </div>

                                    {/* Stroke controls */}
                                    <div className="properties-row">
                                      <span className="properties-label">Stroke</span>
                                      <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                                        <input
                                          type="color"
                                          value={textLayer.stroke || '#000000'}
                                          onChange={(e) => handleUpdateLayer(textLayer.id, {
                                            stroke: e.target.value,
                                            strokeWidth: textLayer.strokeWidth || 2
                                          } as any)}
                                          className="properties-color"
                                          style={{ width: 28, height: 28 }}
                                        />
                                        <input
                                          type="number"
                                          className="properties-input"
                                          value={textLayer.strokeWidth || 0}
                                          min="0"
                                          max="20"
                                          step="1"
                                          style={{ width: 60 }}
                                          onChange={(e) => handleUpdateLayer(textLayer.id, {
                                            strokeWidth: parseInt(e.target.value) || 0
                                          } as any)}
                                        />
                                        <span style={{ fontSize: 10, color: '#9ca3af' }}>px</span>
                                      </div>
                                    </div>

                                    {/* Shadow toggle */}
                                    <div className="properties-row">
                                      <span className="properties-label">Shadow</span>
                                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                        <input
                                          type="checkbox"
                                          checked={!!textLayer.textShadow}
                                          onChange={(e) => handleUpdateLayer(textLayer.id, {
                                            textShadow: e.target.checked ? '3px 3px 6px rgba(0,0,0,0.8)' : ''
                                          } as any)}
                                        />
                                        <span style={{ fontSize: 11, color: '#d1d5db' }}>
                                          {textLayer.textShadow ? 'On' : 'Off'}
                                        </span>
                                      </label>
                                    </div>

                                    {/* Background banner toggle */}
                                    <div className="properties-row">
                                      <span className="properties-label">Banner</span>
                                      <div style={{ display: 'flex', gap: 6, flex: 1, alignItems: 'center' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                                          <input
                                            type="checkbox"
                                            checked={!!textLayer.backgroundColor}
                                            onChange={(e) => handleUpdateLayer(textLayer.id, {
                                              backgroundColor: e.target.checked ? 'rgba(0,0,0,0.6)' : ''
                                            } as any)}
                                          />
                                          <span style={{ fontSize: 11, color: '#d1d5db' }}>
                                            {textLayer.backgroundColor ? 'On' : 'Off'}
                                          </span>
                                        </label>
                                        {textLayer.backgroundColor && (
                                          <input
                                            type="color"
                                            value={textLayer.backgroundColor.startsWith('rgba') ? '#000000' : textLayer.backgroundColor}
                                            onChange={(e) => handleUpdateLayer(textLayer.id, {
                                              backgroundColor: e.target.value
                                            } as any)}
                                            className="properties-color"
                                            style={{ width: 24, height: 24 }}
                                          />
                                        )}
                                      </div>
                                    </div>

                                    {/* Style Presets */}
                                    <div style={{ marginTop: 8 }}>
                                      <span className="properties-label" style={{ display: 'block', marginBottom: 6 }}>Presets</span>
                                      <div className="style-presets-grid">
                                        {TEXT_STYLE_PRESETS.map(preset => (
                                          <button
                                            key={preset.id}
                                            className="style-preset-card"
                                            onClick={() => handleUpdateLayer(textLayer.id, {
                                              fontFamily: preset.fontFamily,
                                              fill: preset.fill,
                                              stroke: preset.stroke,
                                              strokeWidth: preset.strokeWidth,
                                              textShadow: preset.textShadow,
                                              backgroundColor: preset.backgroundColor,
                                              fontWeight: 900,
                                            } as any)}
                                            title={preset.label}
                                          >
                                            <span
                                              className="style-preset-preview"
                                              style={{
                                                fontFamily: preset.fontFamily,
                                                color: preset.fill,
                                                WebkitTextStroke: preset.strokeWidth ? `${Math.min(preset.strokeWidth, 2)}px ${preset.stroke}` : undefined,
                                                textShadow: preset.textShadow || undefined,
                                                backgroundColor: preset.backgroundColor || undefined,
                                                padding: preset.backgroundColor ? '2px 6px' : undefined,
                                                borderRadius: preset.backgroundColor ? 3 : undefined,
                                              }}
                                            >
                                              Aa
                                            </span>
                                            <span className="style-preset-label">{preset.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Draggable divider between tab content and chat */}
                <div
                  className="chat-divider"
                  onDoubleClick={toggleChatCollapsed}
                  title="Double-click to toggle chat"
                />

                {/* AI Chat Section */}
                <ChatPanel
                  messages={chatConversation.messages}
                  isStreaming={chatConversation.isStreaming}
                  onSend={chatConversation.sendMessage}
                  onStop={chatConversation.stopStreaming}
                  onClear={chatConversation.clearMessages}
                  selectedLayers={selectedLayers}
                  isCollapsed={isChatCollapsed}
                  onToggleCollapse={toggleChatCollapsed}
                  onUpload={handleChatUpload}
                  onConfirmActions={chatConversation.confirmActions}
                  onDismissActions={chatConversation.dismissActions}
                />
              </>
            )}

            {/* Drag-off-canvas removal overlay */}
            {templateDragOutsideInfo && (
              <div className="sidebar-removal-overlay">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="rgba(99, 102, 241, 0.95)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 14 4 9 9 4" />
                  <path d="M20 20v-7a4 4 0 0 0-4-4H4" />
                </svg>
                <span className="sidebar-removal-overlay__text">
                  Release to remove template
                </span>
                <span className="sidebar-removal-overlay__count">
                  {templateDragOutsideInfo.layerCount} layer{templateDragOutsideInfo.layerCount !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* AI Command Bar Modal */}
      <AICommandBar
        isOpen={isCommandBarOpen}
        onToggle={toggleCommandBar}
        onParseCommand={commandExecutor.parseCommand}
        onExecuteAll={commandExecutor.executeAll}
        isLoading={isAILoading}
      />

      {/* Clear Canvas Confirmation Dialog */}
      {showClearConfirm && (
        <div className="editor-dialog-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="editor-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="editor-dialog__title">Clear Canvas</h3>
            <p className="editor-dialog__message">This will remove all layers and reset the history. Canvas dimensions and settings will be preserved. This action cannot be undone.</p>
            <div className="editor-dialog__actions">
              <button 
                className="editor-btn"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="editor-btn editor-btn--danger"
                onClick={confirmClearCanvas}
              >
                Clear Canvas
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </TemplateDragDropProvider>
  );
};

export default ThumbnailStudio;
