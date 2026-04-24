import { useCallback, useRef } from 'react';
import { authFetch } from '../../../utils/api';
import type {
  TokenEventData,
  ActionsEventData,
  DoneEventData,
  ErrorEventData,
  PlatformPresetContext,
} from '../types';
import type { EditorAction } from '../../../components/editor/hooks/useCommandExecutor';

// ============================================================================
// SSE Streaming Hook for Editor Chat
// Adapted from quickEditService.ts fetchVideoFramesStreaming pattern
// ============================================================================

interface StreamCallbacks {
  onToken: (content: string) => void;
  onActions: (actions: EditorAction[], summary: string, needsAutoTarget: boolean, autoTargetQuery?: string) => void;
  onDone: (creditCost: number) => void;
  onError: (message: string) => void;
}

interface CanvasContextPayload {
  width: number;
  height: number;
  layers: Array<{
    id: string;
    type: string;
    name: string;
    visible: boolean;
    locked: boolean;
    selected: boolean;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
    opacity?: number;
    blendMode?: string;
    zIndex?: number;
    text?: string;
    font?: string;
    fontSize?: number;
    color?: string;
  }>;
}

interface ChatMessagePayload {
  role: 'user' | 'assistant';
  content: string;
}

export function useChatStreaming() {
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stream a chat request to the backend SSE endpoint.
   * Returns a promise that resolves when the stream completes.
   */
  const streamChat = useCallback(
    async (
      messages: ChatMessagePayload[],
      canvasContext: CanvasContextPayload,
      canvasScreenshot: string | undefined,
      platformPreset: PlatformPresetContext | undefined,
      callbacks: StreamCallbacks,
    ): Promise<void> => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await authFetch('/api/editor-chat/stream', {
          method: 'POST',
          body: JSON.stringify({
            messages,
            canvasContext,
            canvasScreenshot,
            platformPreset,
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
              // End of SSE message
              try {
                const data = JSON.parse(currentData);

                switch (currentEvent) {
                  case 'token': {
                    const tokenData = data as TokenEventData;
                    callbacks.onToken(tokenData.content);
                    break;
                  }
                  case 'actions': {
                    const actionsData = data as ActionsEventData;
                    callbacks.onActions(
                      actionsData.actions,
                      actionsData.summary,
                      actionsData.needsAutoTarget,
                      actionsData.autoTargetQuery,
                    );
                    break;
                  }
                  case 'done': {
                    const doneData = data as DoneEventData;
                    callbacks.onDone(doneData.creditCost);
                    break;
                  }
                  case 'error': {
                    const errorData = data as ErrorEventData;
                    callbacks.onError(errorData.message);
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

        // Pump loop
        async function pump(): Promise<void> {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process remaining buffer
              if (buffer.trim()) processSSELines('\n\n');
              return;
            }
            processSSELines(decoder.decode(value, { stream: true }));
          }
        }

        await pump();
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User cancelled — not an error
          return;
        }
        callbacks.onError(err.message || 'Chat stream failed');
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [],
  );

  /** Abort the current stream */
  const abortStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return { streamChat, abortStream };
}
