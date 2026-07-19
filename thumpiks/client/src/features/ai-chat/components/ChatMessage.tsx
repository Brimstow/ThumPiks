import React from 'react';
import type { ChatMessage as ChatMessageType, ActionResult } from '../types';

// ============================================================================
// Chat Message Component
// Renders user, assistant, system, and action-card message types
// ============================================================================

interface ChatMessageProps {
  message: ChatMessageType;
  /** Called when user clicks "Run All" to confirm pending actions */
  onConfirmActions?: (messageId: string) => void;
  /** Called when user clicks "Dismiss" to skip pending actions */
  onDismissActions?: (messageId: string) => void;
}

/** Status badge colors */
const STATUS_ICONS: Record<ActionResult['status'], { icon: string; className: string }> = {
  pending: { icon: '\u2022', className: 'chat-action-status--pending' },
  executing: { icon: '\u25CB', className: 'chat-action-status--executing' },
  success: { icon: '\u2713', className: 'chat-action-status--success' },
  error: { icon: '\u2717', className: 'chat-action-status--error' },
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onConfirmActions, onDismissActions }) => {
  if (message.role === 'system') {
    return (
      <div className="chat-message chat-message--system">
        <span className="chat-message__system-text">{message.content}</span>
      </div>
    );
  }

  if (message.role === 'user') {
    return (
      <div className="chat-message chat-message--user">
        <div className="chat-message__bubble chat-message__bubble--user">
          {message.content}
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="chat-message chat-message--assistant">
      <div className="chat-message__bubble chat-message__bubble--assistant">
        {message.content && (
          <div className="chat-message__text">
            {stripActionBlock(message.content)}
            {message.isStreaming && (
              <span className="chat-message__cursor" />
            )}
          </div>
        )}
        {!message.content && message.isStreaming && (
          <div className="chat-message__text">
            <span className="chat-message__thinking">Thinking...</span>
          </div>
        )}
        {message.actionResults && message.actionResults.length > 0 && (
          <div className="chat-action-cards">
            {message.actionResults.map((result, idx) => (
              <div
                key={idx}
                className={`chat-action-card ${STATUS_ICONS[result.status].className}`}
              >
                <span className="chat-action-card__icon">
                  {STATUS_ICONS[result.status].icon}
                </span>
                <span className="chat-action-card__text">
                  {result.description}
                </span>
                {result.error && (
                  <span className="chat-action-card__error">{result.error}</span>
                )}
                {result.resultText && (
                  <div className="chat-action-card__result">{result.resultText}</div>
                )}
              </div>
            ))}
            {message.awaitingConfirmation && (
              <div className="chat-action-cards__confirm">
                <button
                  type="button"
                  className="chat-action-cards__btn chat-action-cards__btn--run"
                  onClick={() => onConfirmActions?.(message.id)}
                >
                  Run All
                </button>
                <button
                  type="button"
                  className="chat-action-cards__btn chat-action-cards__btn--dismiss"
                  onClick={() => onDismissActions?.(message.id)}
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Strip the ```json action block from display text since
 * we render actions as separate cards.
 */
function stripActionBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/g, '').trim();
}
