/**
 * Layouts Module
 *
 * Multi-image layout presets with drop zones for Quick Edit & Advanced Editor.
 */

// Types
export * from './types';

// Built-in presets
export { BUILTIN_LAYOUTS } from './presets';

// Engine
export { CompositionEngine } from './composition-engine';
export type { RenderOptions, LayerDescriptor, TextLayerDescriptor } from './composition-engine';

// Hooks
export { useLayouts } from './useCompositionTemplates';
export type { UseLayoutsReturn } from './useCompositionTemplates';

// Layer converter (for Advanced Editor integration)
export { compositionToLayers } from './compositionToLayers';
export type { ConvertedLayers } from './compositionToLayers';

// Components
export { default as TemplatePicker } from './components/TemplatePicker';
export { default as SlotEditor } from './components/SlotEditor';
