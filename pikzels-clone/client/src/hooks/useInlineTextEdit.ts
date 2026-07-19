import { useState, useCallback, useRef } from 'react';
import type React from 'react';

/**
 * Shared hook for inline text editing across both Quick Editor and Full Canvas Editor.
 * Manages editing state, keyboard shortcuts, and provides shared textarea styles.
 *
 * Usage:
 *   const edit = useInlineTextEdit({ onUpdate });
 *   // Start editing: edit.start(layerId)
 *   // Stop editing:  edit.stop()
 *   // In textarea:   onKeyDown={edit.handleKeyDown} value=... onChange=...
 *   // Style:         style={INLINE_EDIT_STYLES}
 */

interface UseInlineTextEditOptions {
  /** Called when the user changes text content while editing */
  onUpdate: (id: string, text: string) => void;
}

interface InlineTextEditReturn {
  /** ID of the text layer currently being edited, or null */
  editingId: string | null;
  /** Enter editing mode for a given layer/overlay ID */
  start: (id: string) => void;
  /** Exit editing mode */
  stop: () => void;
  /** Keyboard handler: Escape → stop, Enter (no shift) → stop */
  handleKeyDown: (e: React.KeyboardEvent) => void;
  /** onChange handler for the textarea — calls onUpdate with current editingId */
  handleChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export function useInlineTextEdit({ onUpdate }: UseInlineTextEditOptions): InlineTextEditReturn {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingIdRef = useRef<string | null>(null);

  const start = useCallback((id: string) => {
    editingIdRef.current = id;
    setEditingId(id);
  }, []);

  const stop = useCallback(() => {
    editingIdRef.current = null;
    setEditingId(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      editingIdRef.current = null;
      setEditingId(null);
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      editingIdRef.current = null;
      setEditingId(null);
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const id = editingIdRef.current;
    if (id) {
      onUpdate(id, e.target.value);
    }
  }, [onUpdate]);

  return { editingId, start, stop, handleKeyDown, handleChange };
}

/**
 * Base styles for the inline editing textarea.
 * Both editors apply these so the textarea inherits the text layer's visual appearance.
 * Editors add their own positioning styles on top.
 */
export const INLINE_EDIT_STYLES: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'inherit',
  font: 'inherit',
  fontWeight: 'inherit',
  fontSize: 'inherit',
  letterSpacing: 'inherit',
  textTransform: 'inherit' as const,
  lineHeight: 'inherit',
  textAlign: 'center',
  width: '100%',
  resize: 'none',
  overflow: 'hidden',
  padding: 0,
  cursor: 'text',
};
