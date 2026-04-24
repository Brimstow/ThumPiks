import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { SuggestedPrompt } from '../types';

// ============================================================================
// Chat Input Component
// Multi-line textarea with toolbar: upload, send/stop, context-aware chips
// ============================================================================

interface ChatInputProps {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  suggestions?: SuggestedPrompt[];
  onUpload?: (file: File) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isStreaming,
  suggestions = [],
  onUpload,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea up to max height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSend = useCallback(() => {
    if (!text.trim() || isStreaming) return;
    onSend(text);
    setText('');
  }, [text, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      if (isStreaming) return;
      onSend(prompt);
    },
    [isStreaming, onSend],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && onUpload) {
        onUpload(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [onUpload],
  );

  return (
    <div className="chat-input">
      {suggestions.length > 0 && !isStreaming && !text && (
        <div className="chat-input__suggestions">
          {suggestions.map((s, i) => (
            <button
              key={i}
              className="chat-input__chip"
              onClick={() => handleSuggestionClick(s.prompt)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
      <div className="chat-input__wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input__textarea"
          placeholder="Ask the AI assistant..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          disabled={isStreaming}
        />
        <div className="chat-input__actions">
          {onUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="chat-input__file-hidden"
              />
              <button
                className="chat-input__tool-btn"
                onClick={() => fileInputRef.current?.click()}
                type="button"
                title="Upload image"
                disabled={isStreaming}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
            </>
          )}
          {isStreaming ? (
            <button
              className="chat-input__btn chat-input__btn--stop"
              onClick={onStop}
              type="button"
              title="Stop generating"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              className="chat-input__btn chat-input__btn--send"
              onClick={handleSend}
              disabled={!text.trim()}
              type="button"
              title="Send message"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
