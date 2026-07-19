import { useEffect, useRef } from 'react';
import { GlobalChatMessage } from './GlobalChatMessage';
import { GlobalChatInput } from './GlobalChatInput';
import { ScopeSelector } from './ScopeSelector';
import type { GlobalChatMessage as MessageType, GlobalChatScope } from '../types';

interface GlobalChatPanelProps {
  messages: MessageType[];
  isStreaming: boolean;
  scope: GlobalChatScope;
  escalationInfo: { ticketId: string; feedbackId: string } | null;
  onSend: (text: string, imageData?: string) => void;
  onStop: () => void;
  onClose: () => void;
  onClear: () => void;
  onChangeScope: (scope: GlobalChatScope) => void;
}

const SCOPE_LABELS: Record<GlobalChatScope, string> = {
  product: 'Product Help',
  billing: 'Billing',
  feedback: 'Feedback',
  general: 'General',
};

export function GlobalChatPanel({
  messages,
  isStreaming,
  scope,
  escalationInfo,
  onSend,
  onStop,
  onClose,
  onClear,
  onChangeScope,
}: GlobalChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const hasMessages = messages.length > 0;
  const scopeSelected = scope !== 'general';
  const showChat = hasMessages || scopeSelected;

  return (
    <div className="gchat-panel" role="dialog" aria-label="Chat with Pik">
      {/* Header */}
      <div className="gchat-header">
        <div className="gchat-header-left">
          <span className="gchat-header-title">ThumPiks AI</span>
          {scopeSelected && (
            <span className="gchat-scope-pill">{SCOPE_LABELS[scope]}</span>
          )}
        </div>
        <div className="gchat-header-actions">
          {showChat && (
            <button
              className="gchat-header-btn"
              onClick={onClear}
              aria-label="New chat"
              title="New chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
            </button>
          )}
          <button
            className="gchat-header-btn"
            onClick={onClose}
            aria-label="Close chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="gchat-body">
        {!showChat ? (
          <ScopeSelector onSelectScope={onChangeScope} />
        ) : (
          <div className="gchat-messages">
            {messages.map((msg) => (
              <GlobalChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Escalation banner */}
      {escalationInfo && (
        <div className="gchat-escalation-banner">
          Ticket created — our team will follow up soon.
        </div>
      )}

      {/* Input (shown when scope is selected or there are messages) */}
      {showChat && (
        <GlobalChatInput
          onSend={onSend}
          onStop={onStop}
          isStreaming={isStreaming}
          scope={scope}
        />
      )}
    </div>
  );
}
