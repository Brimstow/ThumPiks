import type { GlobalChatMessage as MessageType } from '../types';

interface GlobalChatMessageProps {
  message: MessageType;
}

export function GlobalChatMessage({ message }: GlobalChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  return (
    <div
      className={`gchat-message gchat-message--${message.role}`}
    >
      <div
        className={`gchat-bubble gchat-bubble--${message.role}`}
      >
        {isSystem ? (
          <div className="gchat-system-msg">{message.content}</div>
        ) : (
          <>
            {message.imageUrl && isUser && (
              <div className="gchat-image-badge">Image attached</div>
            )}
            <div className="gchat-text">
              {message.content || (message.isStreaming ? (
                <span className="gchat-thinking">Thinking...</span>
              ) : null)}
            </div>
          </>
        )}
        {message.isStreaming && message.content && (
          <span className="gchat-cursor" />
        )}
      </div>
    </div>
  );
}
