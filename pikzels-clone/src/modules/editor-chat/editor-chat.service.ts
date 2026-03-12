import fetch from 'node-fetch';
import {
  ACTION_CATALOG,
  TARGETING_RULES,
  buildContextMessage,
} from '../editor-command/action-catalog';
import type { CanvasContext } from '../editor-command/action-catalog';
import type { ChatMessagePayload, PlatformPresetContext } from './types';

// ============================================================================
// Editor Chat Service
// Multi-turn conversational AI that streams responses and can emit editor actions.
// Uses OpenRouter streaming completions with the same model as editor-command.
// ============================================================================

/** Maximum conversation messages sent to the LLM (to stay within token limits) */
const MAX_CONVERSATION_HISTORY = 10;

/**
 * Build the system prompt for the chat LLM.
 * Combines thumbnail assistant identity, action catalog, targeting rules,
 * and instructions for the mixed prose + action response format.
 */
function buildSystemPrompt(
  canvasContext: CanvasContext,
  platformPreset?: PlatformPresetContext
): string {
  const contextMessage = buildContextMessage(canvasContext);

  let platformLine = '';
  if (platformPreset) {
    platformLine = `\nTarget platform: ${platformPreset.platform} (${platformPreset.width}x${platformPreset.height}). Respect platform conventions (safe zones, text readability at small sizes, aspect ratio).`;
  }

  return `You are an AI thumbnail editing assistant. You can see the current canvas state and help users create and refine thumbnails through conversation.
${platformLine}

CURRENT CANVAS STATE:
${contextMessage}

${ACTION_CATALOG}

${TARGETING_RULES}

RESPONSE FORMAT:
- For general questions or explanations, respond with plain conversational text.
- When the user wants you to make changes to the canvas, include a JSON action block fenced in triple backticks with the "json" language tag.
- The JSON block must be a single object with this shape: {"actions": [...], "summary": "...", "needsAutoTarget": false}
- Each action in the array has: { "action": "<type>", "target": "<target>", "description": "<short desc>", "params": { ... } }
- You can mix text and action blocks: explain what you're doing, then include the action block.
- Only include an action block when the user actually wants changes made. For questions, analysis, or suggestions, just respond with text.
- Keep responses concise and helpful. You are a thumbnail expert.`;
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
   *
   * @param messages  Conversation history (user + assistant turns)
   * @param canvasContext  Current editor state
   * @param platformPreset  Optional platform targeting info
   * @param send  SSE helper: (event, data) => void
   * @param isAborted  Function returning true if client disconnected
   */
  async streamChat(
    messages: ChatMessagePayload[],
    canvasContext: CanvasContext,
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

    const model =
      process.env.OPENROUTER_MODEL_COMMAND || 'google/gemini-2.5-flash';

    const requestBody = {
      model,
      messages: [
        { role: 'system' as const, content: systemPrompt },
        ...trimmed.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
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

    // Stream chunks from OpenRouter and forward as SSE token events
    let fullContent = '';
    let buffer = '';

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
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            send('token', { content: delta });
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }

    if (isAborted()) return;

    // After streaming completes, try to extract action blocks from the full response
    const actionBlock = this.extractActionBlock(fullContent);
    if (actionBlock) {
      send('actions', actionBlock);
    }

    send('done', { creditCost: 1 });
  }

  /**
   * Extract a JSON action block from the LLM's response text.
   * Looks for ```json ... ``` fenced blocks containing an "actions" array.
   */
  private extractActionBlock(text: string): Record<string, unknown> | null {
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/;
    const match = text.match(jsonBlockRegex);
    if (!match?.[1]) return null;

    try {
      const parsed = JSON.parse(match[1].trim());
      if (
        parsed &&
        Array.isArray(parsed.actions) &&
        parsed.actions.length > 0
      ) {
        return {
          actions: parsed.actions,
          summary: parsed.summary || '',
          needsAutoTarget: parsed.needsAutoTarget || false,
          autoTargetQuery: parsed.autoTargetQuery,
        };
      }
    } catch {
      // Malformed JSON in the action block
    }

    return null;
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
