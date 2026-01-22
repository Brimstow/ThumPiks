// Thumbnail Studio Editor - Main exports
export { default as ThumbnailStudio } from './ThumbnailStudio';

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
