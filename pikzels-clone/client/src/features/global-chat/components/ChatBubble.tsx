import { useState, useCallback } from 'react';
import { isFeatureEnabled } from '../../../config/featureFlags';
import { useGlobalChatConversation } from '../hooks/useGlobalChatConversation';
import { GlobalChatPanel } from './GlobalChatPanel';
import './ChatBubble.css';

/**
 * GlobalChatWidget — floating chat bubble + expandable panel.
 * Renders a bottom-right circular trigger; clicking opens the chat panel.
 * Gated behind the `globalChat.enabled` feature flag.
 */
export function GlobalChatWidget() {
  const [open, setOpen] = useState(false);

  const {
    messages,
    isStreaming,
    scope,
    escalationInfo,
    sendMessage,
    stopStreaming,
    clearMessages,
    changeScope,
  } = useGlobalChatConversation();

  const toggle = useCallback(() => setOpen(prev => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  if (!isFeatureEnabled('globalChat', 'enabled')) return null;

  return (
    <>
      {/* Floating trigger */}
      <button
        className="gchat-trigger"
        onClick={toggle}
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
      >
        {open ? (
          /* Close icon (X) */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          /* Chat icon */
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <GlobalChatPanel
          messages={messages}
          isStreaming={isStreaming}
          scope={scope}
          escalationInfo={escalationInfo}
          onSend={sendMessage}
          onStop={stopStreaming}
          onClose={close}
          onClear={clearMessages}
          onChangeScope={changeScope}
        />
      )}
    </>
  );
}
