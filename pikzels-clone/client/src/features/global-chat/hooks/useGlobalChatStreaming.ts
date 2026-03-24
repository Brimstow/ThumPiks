import { useCallback, useRef } from 'react';
import { authFetch } from '../../../utils/api';
import type {
  GlobalChatScope,
  TokenEventData,
  DoneEventData,
  ErrorEventData,
  EscalationEventData,
} from '../types';

interface StreamCallbacks {
  onToken: (content: string) => void;
  onDone: (creditCost: number, sessionId: string) => void;
  onError: (message: string) => void;
  onEscalation: (ticketId: string, feedbackId: string) => void;
}

interface GlobalChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export function useGlobalChatStreaming() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const streamChat = useCallback(
    async (
      messages: GlobalChatMessagePayload[],
      scope: GlobalChatScope,
      sessionId: string | null,
      imageData: string | undefined,
      callbacks: StreamCallbacks
    ): Promise<void> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await authFetch('/api/global-chat/stream', {
          method: 'POST',
          body: JSON.stringify({
            messages,
            scope,
            sessionId: sessionId || undefined,
            imageData,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Chat failed' }));
          callbacks.onError(err.error || `Chat failed (${res.status})`);
          return;
        }

        if (!res.body) {
          callbacks.onError('Streaming not supported');
          return;
        }

        const reader = (res.body as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEvent = '';
        let currentData = '';

        function processSSELines(text: string) {
          buffer += text;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6).trim();
            } else if (line === '' && currentEvent && currentData) {
              try {
                const data = JSON.parse(currentData);

                switch (currentEvent) {
                  case 'token': {
                    const tokenData = data as TokenEventData;
                    callbacks.onToken(tokenData.content);
                    break;
                  }
                  case 'done': {
                    const doneData = data as DoneEventData;
                    callbacks.onDone(doneData.creditCost, doneData.sessionId);
                    break;
                  }
                  case 'error': {
                    const errorData = data as ErrorEventData;
                    callbacks.onError(errorData.message);
                    break;
                  }
                  case 'escalation': {
                    const escData = data as EscalationEventData;
                    callbacks.onEscalation(escData.ticketId, escData.feedbackId);
                    break;
                  }
                }
              } catch {
                // Ignore malformed SSE data
              }
              currentEvent = '';
              currentData = '';
            }
          }
        }

        async function pump(): Promise<void> {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              if (buffer.trim()) processSSELines('\n\n');
              return;
            }
            processSSELines(decoder.decode(value, { stream: true }));
          }
        }

        await pump();
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        callbacks.onError(err.message || 'Chat stream failed');
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    []
  );

  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { streamChat, abortStream };
}
