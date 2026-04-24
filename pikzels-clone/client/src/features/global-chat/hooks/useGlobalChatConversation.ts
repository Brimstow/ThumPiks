import { useState, useCallback, useRef } from 'react';
import { useGlobalChatStreaming } from './useGlobalChatStreaming';
import { createSession } from '../services/globalChat.api';
import type { GlobalChatMessage, GlobalChatScope } from '../types';

export function useGlobalChatConversation() {
  const [messages, setMessages] = useState<GlobalChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [scope, setScope] = useState<GlobalChatScope>('general');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [escalationInfo, setEscalationInfo] = useState<{
    ticketId: string;
    feedbackId: string;
  } | null>(null);

  const streamingContentRef = useRef('');
  const streamingMessageIdRef = useRef<string | null>(null);

  const { streamChat, abortStream } = useGlobalChatStreaming();

  const sendMessage = useCallback(
    async (text: string, imageData?: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessageId = `user-${Date.now()}`;
      const assistantMessageId = `assistant-${Date.now()}`;

      const userMessage: GlobalChatMessage = {
        id: userMessageId,
        role: 'user',
        content: text.trim(),
        imageUrl: imageData ? 'attached' : undefined,
        timestamp: Date.now(),
      };

      const assistantPlaceholder: GlobalChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
      setIsStreaming(true);
      streamingContentRef.current = '';
      streamingMessageIdRef.current = assistantMessageId;

      // Build conversation payload
      const allMessages = [
        ...messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: text.trim() },
      ];

      // Resolve session — create if needed
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        try {
          const session = await createSession(scope);
          currentSessionId = session.id;
          setSessionId(session.id);
        } catch (err: any) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessageId
                ? { ...m, content: `Error: ${err.message}`, isStreaming: false }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }
      }

      await streamChat(
        allMessages,
        scope,
        currentSessionId,
        imageData,
        {
          onToken: (content) => {
            streamingContentRef.current += content;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: streamingContentRef.current }
                  : m
              )
            );
          },
          onDone: (_creditCost, returnedSessionId) => {
            if (returnedSessionId && !sessionId) {
              setSessionId(returnedSessionId);
            }
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
            setIsStreaming(false);
            streamingMessageIdRef.current = null;
          },
          onError: (message) => {
            const fallback = streamingContentRef.current || `Error: ${message}`;
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMessageId
                  ? { ...m, content: fallback, isStreaming: false }
                  : m
              )
            );
            setIsStreaming(false);
            streamingMessageIdRef.current = null;
          },
          onEscalation: (ticketId, feedbackId) => {
            setEscalationInfo({ ticketId, feedbackId });
            setMessages(prev => [
              ...prev,
              {
                id: `system-${Date.now()}`,
                role: 'system',
                content: `A support ticket has been created (Ticket #${ticketId.slice(0, 8)}). Our team will follow up soon.`,
                timestamp: Date.now(),
              },
            ]);
          },
        }
      );
    },
    [messages, isStreaming, scope, sessionId, streamChat]
  );

  const stopStreaming = useCallback(() => {
    abortStream();
    if (streamingMessageIdRef.current) {
      setMessages(prev =>
        prev.map(m =>
          m.id === streamingMessageIdRef.current
            ? { ...m, isStreaming: false }
            : m
        )
      );
    }
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
  }, [abortStream]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setEscalationInfo(null);
    setScope('general');
    streamingContentRef.current = '';
  }, []);

  const changeScope = useCallback(
    (newScope: GlobalChatScope) => {
      clearMessages();
      setScope(newScope);
    },
    [clearMessages]
  );

  return {
    messages,
    isStreaming,
    scope,
    sessionId,
    escalationInfo,
    sendMessage,
    stopStreaming,
    clearMessages,
    changeScope,
  };
}
