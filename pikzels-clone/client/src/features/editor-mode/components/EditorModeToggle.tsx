/**
 * EditorModeToggle Component
 * 
 * Segmented control pill toggle for switching between Simple and Pro modes.
 * Designed for the editor toolbar with dark theme styling.
 */

import React from 'react';
import { useEditorMode } from '../hooks/useEditorMode';
import type { EditorMode } from '../types';
import './EditorModeToggle.css';

interface EditorModeToggleProps {
  /** Optional CSS class */
  className?: string;
}

/**
 * A pill-shaped toggle for switching between Simple and Pro editor modes.
 * 
 * Simple mode: Shows essential tools only, shapes in flyout
 * Pro mode: Shows all tools and advanced features
 */
export const EditorModeToggle: React.FC<EditorModeToggleProps> = ({ className = '' }) => {
  const { editorMode, setEditorMode } = useEditorMode();

  const handleToggle = (mode: EditorMode) => {
    if (mode !== editorMode) {
      setEditorMode(mode);
    }
  };

  return (
    <div className={`editor-mode-toggle ${className}`} role="tablist" aria-label="Editor mode">
      <button
        role="tab"
        aria-selected={editorMode === 'simple'}
        className={`editor-mode-toggle__option ${editorMode === 'simple' ? 'editor-mode-toggle__option--active' : ''}`}
        onClick={() => handleToggle('simple')}
        title="Simple mode - Essential tools for quick edits"
      >
        <span className="editor-mode-toggle__indicator" />
        Simple
      </button>
      <button
        role="tab"
        aria-selected={editorMode === 'pro'}
        className={`editor-mode-toggle__option ${editorMode === 'pro' ? 'editor-mode-toggle__option--active' : ''}`}
        onClick={() => handleToggle('pro')}
        title="Pro mode - All tools and advanced features"
      >
        <span className="editor-mode-toggle__indicator" />
        Pro
      </button>
    </div>
  );
};

export default EditorModeToggle;
