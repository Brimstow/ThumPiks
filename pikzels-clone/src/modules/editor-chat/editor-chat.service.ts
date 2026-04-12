import fetch from 'node-fetch';
import {
  TARGETING_RULES,
  buildContextMessage,
} from '../editor-command/action-catalog';
import { EDITOR_TOOLS, buildToolsSystemPrompt } from '../editor-command/tool-definitions';
import type { CanvasContext } from '../editor-command/action-catalog';
import type { ChatMessagePayload, PlatformPresetContext } from './types';

// ============================================================================
// Editor Chat Service
// Multi-turn conversational AI that streams responses and can emit editor actions.
// Uses OpenRouter streaming completions with native function calling (tools).
// ============================================================================

/** Maximum conversation messages sent to the LLM (to stay within token limits) */
const MAX_CONVERSATION_HISTORY = 10;

/**
 * Build the system prompt for the chat LLM.
 * Combines tool-calling system prompt with canvas state and targeting rules.
 */
function buildSystemPrompt(
  canvasContext: CanvasContext,
  platformPreset?: PlatformPresetContext
): string {
  const contextMessage = buildContextMessage(canvasContext);
  const toolsPrompt = buildToolsSystemPrompt();

  let platformLine = '';
  if (platformPreset) {
    platformLine = `\nTarget platform: ${platformPreset.platform} (${platformPreset.width}x${platformPreset.height}). Respect platform conventions (safe zones, text readability at small sizes, aspect ratio).`;
  }

  return `${toolsPrompt}
${platformLine}

CURRENT CANVAS STATE:
${contextMessage}

${TARGETING_RULES}`;
}

/** Accumulated tool call from streamed delta chunks */
interface ToolCallAccumulator {
  index: number;
  id: string;
  functionName: string;
  argumentsJson: string;
}

export class EditorChatService {
  private openrouterApiKey: string;
  private openrouterApiUrl: string;

  constructor() {
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterApiUrl =
      process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Stream a chat completion to the client via SSE.
   * Uses native OpenRouter function calling (tools parameter).
   * Streams prose via 'token' events, then emits 'actions' from tool_calls.
   *
   * @param messages  Conversation history (user + assistant turns)
   * @param canvasContext  Current editor state
   * @param canvasScreenshot  Optional base64 canvas screenshot for vision
   * @param platformPreset  Optional platform targeting info
   * @param send  SSE helper: (event, data) => void
   * @param isAborted  Function returning true if client disconnected
   */
  async streamChat(
    messages: ChatMessagePayload[],
    canvasContext: CanvasContext,
    canvasScreenshot: string | undefined,
    platformPreset: PlatformPresetContext | undefined,
    send: (event: string, data: Record<string, unknown>) => void,
    isAborted: () => boolean
  ): Promise<void> {
    if (!this.openrouterApiKey) {
      send('error', { message: 'AI service not configured' });
      return;
    }

    const systemPrompt = buildSystemPrompt(canvasContext, platformPreset);

    // Trim conversation to last N messages
    const trimmed = messages.slice(-MAX_CONVERSATION_HISTORY);

    // Build messages array with optional vision (multimodal last user message)
    const apiMessages: Array<{ role: string; content: unknown }> = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < trimmed.length; i++) {
      const m = trimmed[i]!;
      const isLastUserMessage = i === trimmed.length - 1 && m.role === 'user';

      if (isLastUserMessage && canvasScreenshot) {
        // Multimodal message: image + text
        apiMessages.push({
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: canvasScreenshot } },
            { type: 'text', text: m.content },
          ],
        });
      } else {
        apiMessages.push({
          role: m.role,
          content: m.content,
        });
      }
    }

    const model =
      process.env.OPENROUTER_MODEL_EDITOR || 'google/gemini-3-flash-preview';

    const requestBody = {
      model,
      messages: apiMessages,
      tools: EDITOR_TOOLS,
      stream: true,
      temperature: 0.3,
    };

    const response = await fetch(`${this.openrouterApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:8556',
        'X-Title': 'ThumPiks Editor Chat',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      send('error', {
        message: `Chat failed (${response.status}): ${errorText}`,
      });
      return;
    }

    if (!response.body) {
      send('error', { message: 'No response body from AI service' });
      return;
    }

    // Stream chunks from OpenRouter and forward as SSE events
    // Accumulate both prose (delta.content) and tool calls (delta.tool_calls)
    let buffer = '';
    const toolCalls: Map<number, ToolCallAccumulator> = new Map();

    const stream = response.body as NodeJS.ReadableStream;

    for await (const chunk of stream) {
      if (isAborted()) break;

      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (isAborted()) break;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (!delta) continue;

          // Stream prose content to client
          if (delta.content) {
            send('token', { content: delta.content });
          }

          // Accumulate tool call chunks
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, {
                  index: idx,
                  id: tc.id || '',
                  functionName: tc.function?.name || '',
                  argumentsJson: '',
                });
              }
              const acc = toolCalls.get(idx)!;
              if (tc.id) acc.id = tc.id;
              if (tc.function?.name) acc.functionName = tc.function.name;
              if (tc.function?.arguments) acc.argumentsJson += tc.function.arguments;
            }
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    if (isAborted()) return;

    // Convert accumulated tool calls to editor actions
    if (toolCalls.size > 0) {
      const actions = this.toolCallsToActions(toolCalls);
      if (actions.length > 0) {
        send('actions', {
          actions,
          summary: actions.map(a => a.description).join('; '),
          needsAutoTarget: false,
        });
      }
    }

    send('done', { creditCost: 1 });
  }

  /**
   * Convert accumulated tool call chunks into EditorAction objects.
   * Maps native function calling responses to the existing action format
   * that the frontend already understands.
   */
  private toolCallsToActions(
    toolCalls: Map<number, ToolCallAccumulator>
  ): Array<{ action: string; target: string; description: string; params: Record<string, unknown> }> {
    const actions: Array<{ action: string; target: string; description: string; params: Record<string, unknown> }> = [];

    for (const [, tc] of toolCalls) {
      try {
        const params = tc.argumentsJson ? JSON.parse(tc.argumentsJson) : {};
        const target = (params.target as string) || 'selected';
        // Remove 'target' from params since it's a top-level field in EditorAction
        delete params.target;

        actions.push({
          action: tc.functionName,
          target,
          description: `${tc.functionName}: ${Object.values(params).filter(v => typeof v === 'string').slice(0, 2).join(', ') || 'execute'}`,
          params,
        });
      } catch {
        // Skip malformed tool call arguments
      }
    }

    return actions;
  }
}

// Singleton
let editorChatService: EditorChatService | null = null;

export function getEditorChatService(): EditorChatService {
  if (!editorChatService) {
    editorChatService = new EditorChatService();
  }
  return editorChatService;
}
