// Thumbnail Studio Editor - Main exports
export { default as ThumbnailStudio } from './ThumbnailStudio';
export { EditorRouter, default as EditorRouterDefault } from './EditorRouter';

// Mobile Editor
export { MobileEditor } from './mobile';
export type { MobileEditorProps, MobileToolTab } from './mobile';

// Types
export type {
  BlendMode,
  LayerType,
  Layer,
  ImageLayer,
  TextLayer,
  ShapeLayer,
  GroupLayer,
  AdjustmentLayer,
  DrawingLayer,
  LayerEffect,
  LayerMask,
  LayerTransform,
  DrawingPath,
  ImageFilters,
  ToolType,
  ToolSettings,
  CanvasState,
  Selection,
  HistoryEntry,
  EditorState,
  EditorAction,
  AIPrompt,
  AIGenerationResult,
  ThumbnailStudioProps,
} from './types/editor.types';

// Hooks
export { useEditorState } from './hooks/useEditorState';

// Components
export { default as ToolsPanel } from './panels/ToolsPanel';
export { default as LayersPanel } from './panels/LayersPanel';
export { default as AIPromptPanel } from './panels/AIPromptPanel';
export { default as CanvasEngine } from './canvas/CanvasEngine';
