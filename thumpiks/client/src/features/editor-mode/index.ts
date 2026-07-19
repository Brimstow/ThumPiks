/**
 * Editor Mode Feature Module
 * 
 * Provides Simple/Pro mode toggle for Grandma Test compliance.
 * Simple mode shows essential tools only for non-technical users.
 * Pro mode reveals all advanced features for power users.
 * 
 * @module features/editor-mode
 */

// Types
export type { EditorMode, UseEditorModeReturn } from './types';
export { SIMPLE_MODE_TOOL_IDS, SHAPE_TOOL_IDS, SIMPLE_MODE_HIDDEN_TOPBAR } from './types';

// Hooks
export { useEditorMode } from './hooks/useEditorMode';

// Components
export { EditorModeToggle } from './components/EditorModeToggle';
