/**
 * useEditorMode Hook
 * 
 * Provides access to Simple/Pro editor mode state from the Zustand store.
 * Wraps store selector for clean component consumption.
 */

import { useEditorStore, selectEditorMode } from '../../../stores/editorStore';
import type { UseEditorModeReturn, EditorMode } from '../types';

/**
 * Hook to access and control Simple/Pro editor mode.
 * 
 * @example
 * const { editorMode, setEditorMode, isSimpleMode } = useEditorMode();
 * 
 * // Check mode
 * if (isSimpleMode) {
 *   // Show simplified UI
 * }
 * 
 * // Toggle mode
 * setEditorMode(isSimpleMode ? 'pro' : 'simple');
 */
export function useEditorMode(): UseEditorModeReturn {
  const editorMode = useEditorStore(selectEditorMode);
  const setEditorMode = useEditorStore((state) => state.setEditorMode);

  return {
    editorMode,
    setEditorMode,
    isSimpleMode: editorMode === 'simple',
    isProMode: editorMode === 'pro',
  };
}

export default useEditorMode;
