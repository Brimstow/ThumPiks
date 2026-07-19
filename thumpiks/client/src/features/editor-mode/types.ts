/**
 * Editor Mode Types
 * 
 * Defines the Simple/Pro mode toggle system for Grandma Test compliance.
 * Simple mode shows fewer tools for non-technical users.
 * Pro mode reveals all advanced features for power users.
 */

import type { ToolType } from '../../components/editor/types/editor.types';

/** Editor mode type - 'simple' for Grandma-friendly, 'pro' for power users */
export type EditorMode = 'simple' | 'pro';

/** Tools visible in Simple mode (essential only) */
export const SIMPLE_MODE_TOOL_IDS: Set<ToolType> = new Set([
  'select',
  'text',
  'eraser',
  'crop',
  'hand',
]);

/** Shape tools consolidated into flyout in Simple mode */
export const SHAPE_TOOL_IDS: ToolType[] = ['rectangle', 'ellipse', 'polygon', 'line'];

/** Top toolbar buttons hidden in Simple mode */
export const SIMPLE_MODE_HIDDEN_TOPBAR: string[] = ['heatmap', 'platform', 'guides'];

/** Hook return type */
export interface UseEditorModeReturn {
  /** Current editor mode */
  editorMode: EditorMode;
  /** Update editor mode */
  setEditorMode: (mode: EditorMode) => void;
  /** Convenience boolean for Simple mode check */
  isSimpleMode: boolean;
  /** Convenience boolean for Pro mode check */
  isProMode: boolean;
}
