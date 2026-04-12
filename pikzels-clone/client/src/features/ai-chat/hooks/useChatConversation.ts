import { useState, useCallback, useRef } from 'react';
import { useChatStreaming } from './useChatStreaming';
import type {
  ChatMessage,
  ActionResult,
  PlatformPresetContext,
} from '../types';
import type { EditorAction } from '../../../components/editor/hooks/useCommandExecutor';

// ============================================================================
// Chat Conversation Hook
// Manages message history, triggers streaming, and integrates action results
// ============================================================================

let messageIdCounter = 0;
function nextMessageId(): string {
  return `chat-${Date.now()}-${++messageIdCounter}`;
}

interface CanvasContextGetter {
  (): {
    width: number;
    height: number;
    layers: Array<{
      id: string;
      type: string;
      name: string;
      visible: boolean;
      locked: boolean;
      selected: boolean;
      text?: string;
      font?: string;
      fontSize?: number;
      color?: string;
    }>;
  };
}

interface UseChatConversationOptions {
  getCanvasContext: CanvasContextGetter;
  getCanvasScreenshot?: () => string | null;
  platformPreset?: PlatformPresetContext;
  onActions?: (actions: EditorAction[], messageId: string) => void;
}

export function useChatConversation({
  getCanvasContext,
  getCanvasScreenshot,
  platformPreset,
  onActions,
}: UseChatConversationOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Show initial system message if we have a platform preset
    if (platformPreset) {
      return [
        {
          id: nextMessageId(),
          role: 'system' as const,
          content: `Creating for ${platformPreset.name} (${platformPreset.width}x${platformPreset.height})`,
          timestamp: Date.now(),
        },
      ];
    }
    return [];
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const streamingContentRef = useRef('');
  const streamingMessageIdRef = useRef<string | null>(null);

  const { streamChat, abortStream } = useChatStreaming();

  /** Send a user message and stream the AI response */
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMessage: ChatMessage = {
        id: nextMessageId(),
        role: 'user',
        content: text.trim(),
        timestamp: Date.now(),
      };

      // Create a placeholder for the assistant's streaming response
      const assistantId = nextMessageId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setIsStreaming(true);
      streamingContentRef.current = '';
      streamingMessageIdRef.current = assistantId;

      // Build conversation payload (only user/assistant messages, no system)
      const conversationPayload = [...messages, userMessage]
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      const canvasContext = getCanvasContext();
      const canvasScreenshot = getCanvasScreenshot?.() ?? undefined;

      await streamChat(
        conversationPayload,
        canvasContext,
        canvasScreenshot,
        platformPreset,
        {
          onToken: (content) => {
            streamingContentRef.current += content;
            const currentContent = streamingContentRef.current;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: currentContent }
                  : m,
              ),
            );
          },

          onActions: (actions, summary, needsAutoTarget, autoTargetQuery) => {
            const actionResults: ActionResult[] = actions.map((a) => ({
              action: a.action,
              description: a.description,
              status: 'pending' as const,
            }));

            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, actions, actionResults }
                  : m,
              ),
            );

            // Notify parent to execute actions
            onActions?.(actions, assistantId);
          },

          onDone: () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, isStreaming: false }
                  : m,
              ),
            );
            setIsStreaming(false);
            streamingMessageIdRef.current = null;
          },

          onError: (message) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: m.content || `Error: ${message}`,
                      isStreaming: false,
                    }
                  : m,
              ),
            );
            setIsStreaming(false);
            streamingMessageIdRef.current = null;
          },
        },
      );
    },
    [messages, isStreaming, getCanvasContext, getCanvasScreenshot, platformPreset, streamChat, onActions],
  );

  /** Update the status of an action result within a message */
  const updateActionResult = useCallback(
    (messageId: string, actionIndex: number, status: ActionResult['status'], error?: string) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId || !m.actionResults) return m;
          const updated = [...m.actionResults];
          updated[actionIndex] = { ...updated[actionIndex], status, error };
          return { ...m, actionResults: updated };
        }),
      );
    },
    [],
  );

  /** Stop the current streaming response */
  const stopStreaming = useCallback(() => {
    abortStream();
    if (streamingMessageIdRef.current) {
      const id = streamingMessageIdRef.current;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === id ? { ...m, isStreaming: false } : m,
        ),
      );
    }
    setIsStreaming(false);
    streamingMessageIdRef.current = null;
  }, [abortStream]);

  /** Clear all messages */
  const clearMessages = useCallback(() => {
    stopStreaming();
    setMessages(
      platformPreset
        ? [
            {
              id: nextMessageId(),
              role: 'system' as const,
              content: `Creating for ${platformPreset.name} (${platformPreset.width}x${platformPreset.height})`,
              timestamp: Date.now(),
            },
          ]
        : [],
    );
  }, [platformPreset, stopStreaming]);

  return {
    messages,
    isStreaming,
    sendMessage,
    stopStreaming,
    clearMessages,
    updateActionResult,
  };
}
