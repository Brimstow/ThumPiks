import React, { useRef, useEffect, useMemo } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import Tooltip from '../../../components/ui/Tooltip';
import type {
  ChatMessage as ChatMessageType,
  PlatformPresetContext,
  SuggestedPrompt,
} from '../types';
import type { Layer } from '../../../components/editor/types/editor.types';
import './ChatPanel.css';

// ============================================================================
// Chat Panel Component
// Main container: header, scrollable message list, input bar
// Lives inside the ThumbnailStudio side panel as a bottom split section
// ============================================================================

interface ChatPanelProps {
  messages: ChatMessageType[];
  isStreaming: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
  /** Currently selected layers (for context-aware suggestions) */
  selectedLayers?: Layer[];
  platformPreset?: PlatformPresetContext;
  /** Whether the chat section is collapsed */
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  /** Handler for uploading an image from the chat input */
  onUpload?: (file: File) => void;
  /** Called when user confirms pending actions (preview mode) */
  onConfirmActions?: (messageId: string) => void;
  /** Called when user dismisses pending actions (preview mode) */
  onDismissActions?: (messageId: string) => void;
}

/** Generate context-aware suggestion chips based on selected layer type */
function getSuggestions(selectedLayers?: Layer[]): SuggestedPrompt[] {
  if (!selectedLayers || selectedLayers.length === 0) {
    return [
      { label: 'Add text', prompt: 'Add bold white text that says "EPIC"' },
      { label: 'Generate bg', prompt: 'Generate a vibrant gradient background' },
      { label: 'Analyze', prompt: 'Analyze this thumbnail and suggest improvements' },
    ];
  }

  const layer = selectedLayers[0];
  if (layer.type === 'image') {
    return [
      { label: 'Remove bg', prompt: 'Remove the background from this image' },
      { label: 'Enhance', prompt: 'Enhance this image quality' },
      { label: 'Upscale', prompt: 'Upscale this image 2x' },
    ];
  }

  if (layer.type === 'text') {
    return [
      { label: 'Bigger', prompt: 'Make this text bigger and bolder' },
      { label: 'Recolor', prompt: 'Change this text to a bright red color' },
      { label: 'Rewrite', prompt: 'Rewrite this text in a clickbait style' },
    ];
  }

  return [
    { label: 'Duplicate', prompt: 'Duplicate this layer' },
    { label: 'Move center', prompt: 'Move this to the center of the canvas' },
    { label: 'Delete', prompt: 'Delete this layer' },
  ];
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isStreaming,
  onSend,
  onStop,
  onClear,
  selectedLayers,
  isCollapsed,
  onToggleCollapse,
  onUpload,
  onConfirmActions,
  onDismissActions,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const suggestions = useMemo(
    () => getSuggestions(selectedLayers),
    [selectedLayers],
  );

  const unreadCount = useMemo(() => {
    if (!isCollapsed) return 0;
    // Count messages since we don't have a "last read" marker, just show total assistant messages
    return messages.filter((m) => m.role === 'assistant').length;
  }, [messages, isCollapsed]);

  if (isCollapsed) {
    return (
      <div className="chat-section chat-section--collapsed">
        <Tooltip
          content="Multi-turn AI conversation — chat back and forth, ask follow-ups, and refine results with full context."
          side="top"
          sideOffset={8}
        >
          <button
            className="chat-section__toggle"
            onClick={onToggleCollapse}
            type="button"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            <span>AI Chat</span>
            {unreadCount > 0 && (
              <span className="chat-section__badge">{unreadCount}</span>
            )}
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="chat-section">
      <div className="chat-section__header">
        <Tooltip
          content="Multi-turn AI conversation — chat back and forth, ask follow-ups, and refine results with full context."
          side="bottom"
          sideOffset={8}
        >
          <div className="chat-section__title">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
            AI Chat
            <span className="chat-section__subtitle">Multi-turn conversation</span>
          </div>
        </Tooltip>
        <div className="chat-section__actions">
          {messages.length > 0 && (
            <button
              className="chat-section__btn"
              onClick={onClear}
              type="button"
              title="Clear conversation"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          )}
          <button
            className="chat-section__btn"
            onClick={onToggleCollapse}
            type="button"
            title="Collapse chat"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      <div className="chat-section__messages">
        {messages.length === 0 && (
          <div className="chat-section__empty">
            <p>Ask the AI to help create your thumbnail.</p>
            <p className="chat-section__empty-hint">
              Try: &quot;Add bold text saying EPIC&quot;
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onConfirmActions={onConfirmActions}
            onDismissActions={onDismissActions}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        suggestions={suggestions}
        onUpload={onUpload}
      />
    </div>
  );
};
