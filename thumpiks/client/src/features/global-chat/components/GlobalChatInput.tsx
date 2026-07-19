import { useState, useCallback, useRef, useEffect } from 'react';
import { useImageUpload } from '../hooks/useImageUpload';

interface GlobalChatInputProps {
  onSend: (text: string, imageData?: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  scope: string;
}

const SCOPE_SUGGESTIONS: Record<string, string[]> = {
  product: ['How do I add text?', 'Remove background', 'AI tools guide'],
  billing: ['What plans exist?', 'How are credits used?', 'Upgrade plan'],
  feedback: ['Report a bug', 'Feature request', 'General feedback'],
  general: ['Help me get started', 'What can you do?', 'Report an issue'],
};

export function GlobalChatInput({
  onSend,
  onStop,
  isStreaming,
  scope,
}: GlobalChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    imagePreview,
    imageData,
    isDragOver,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handlePaste,
    handleFileSelect,
    clearImage,
  } = useImageUpload();

  const handleSend = useCallback(() => {
    if (!text.trim() && !imageData) return;
    if (isStreaming) return;
    onSend(text.trim() || 'Analyze this image', imageData);
    setText('');
    clearImage();
  }, [text, imageData, isStreaming, onSend, clearImage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [text]);

  const suggestions = SCOPE_SUGGESTIONS[scope] || SCOPE_SUGGESTIONS.general;

  return (
    <div
      className={`gchat-input ${isDragOver ? 'gchat-input--dragover' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Image preview */}
      {imagePreview && (
        <div className="gchat-image-preview">
          <img src={imagePreview} alt="Upload preview" />
          <button
            className="gchat-image-remove"
            onClick={clearImage}
            aria-label="Remove image"
          >
            &times;
          </button>
        </div>
      )}

      {/* Suggestion chips (only when no messages typed yet) */}
      {!text && !isStreaming && (
        <div className="gchat-suggestions">
          {suggestions.map((s) => (
            <button
              key={s}
              className="gchat-suggestion-chip"
              onClick={() => onSend(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragOver && (
        <div className="gchat-drop-overlay">Drop image here</div>
      )}

      {/* Input area */}
      <div className="gchat-input-wrapper">
        <textarea
          ref={textareaRef}
          className="gchat-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          rows={1}
          disabled={isStreaming}
        />
        <div className="gchat-input-actions">
          {/* File upload button */}
          <button
            className="gchat-action-btn"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach image"
            title="Attach image"
            disabled={isStreaming}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <button
              className="gchat-action-btn gchat-stop-btn"
              onClick={onStop}
              aria-label="Stop"
              title="Stop generating"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              className="gchat-action-btn gchat-send-btn"
              onClick={handleSend}
              disabled={!text.trim() && !imageData}
              aria-label="Send"
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
