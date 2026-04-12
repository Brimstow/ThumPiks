import fetch from 'node-fetch';
import { deductCredits } from '../credit/credit.service';
import {
  TARGETING_RULES,
  buildContextMessage,
} from './action-catalog';
import { EDITOR_TOOLS, buildToolsSystemPrompt } from './tool-definitions';
import type {
  EditorActionType,
  EditorAction,
  EditorCommandResult,
  LayerContext,
  CanvasContext,
} from './action-catalog';

// Re-export types so existing imports from this file continue to work
export type {
  EditorActionType,
  EditorAction,
  EditorCommandResult,
  LayerContext,
  CanvasContext,
};

// ============================================================================
// AI Editor Command Service
// Parses natural language prompts into structured editor actions using LLM
// with OpenRouter native function calling (tools parameter)
// ============================================================================

export class EditorCommandService {
  private openrouterApiKey: string;
  private openrouterApiUrl: string;

  constructor() {
    this.openrouterApiKey = process.env.OPENROUTER_API_KEY || '';
    this.openrouterApiUrl =
      process.env.OPENROUTER_API_URL || 'https://openrouter.ai/api/v1';
  }

  /**
   * Parse a natural language command into structured editor actions.
   * Uses OpenRouter native function calling for guaranteed valid tool responses.
   */
  async parseCommand(
    prompt: string,
    canvasContext: CanvasContext,
    canvasScreenshot: string | undefined,
    userId: string
  ): Promise<EditorCommandResult> {
    if (!this.openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Deduct 1 credit for command parsing
    const creditDeducted = await deductCredits(
      userId,
      1,
      'AI editor command parsing'
    );
    if (!creditDeducted) {
      throw new Error('Insufficient credits for AI commands');
    }

    // Build context message describing current editor state
    const contextMessage = buildContextMessage(canvasContext);
    const toolsPrompt = buildToolsSystemPrompt();

    const systemPrompt = `${toolsPrompt}\n\n${TARGETING_RULES}`;

    // Build user message — optionally multimodal with canvas screenshot
    let userContent: unknown;
    const textContent = `${contextMessage}\n\nUser command: "${prompt}"`;

    if (canvasScreenshot) {
      userContent = [
        { type: 'image_url', image_url: { url: canvasScreenshot } },
        { type: 'text', text: textContent },
      ];
    } else {
      userContent = textContent;
    }

    // Use the shared editor model with native function calling
    const model =
      process.env.OPENROUTER_MODEL_EDITOR || 'google/gemini-3-flash-preview';

    const requestBody = {
      model,
      messages: [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        {
          role: 'user' as const,
          content: userContent,
        },
      ],
      tools: EDITOR_TOOLS,
      stream: false,
      temperature: 0.1, // Low temperature for consistent, deterministic parsing
    };

    const response = await fetch(`${this.openrouterApiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.openrouterApiKey}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:8556',
        'X-Title': 'ThumPiks Editor Command',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Editor command parsing failed (${response.status}): ${errorText}`
      );
    }

    const data: any = await response.json();
    const message = data.choices?.[0]?.message;

    // Extract actions from native tool_calls
    const toolCalls = message?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      // Model chose to respond with text only (no action needed)
      // Return the text content as a summary with no actions
      const textContent = message?.content || '';
      if (textContent) {
        throw new Error(textContent);
      }
      throw new Error('No actions returned. Please try a more specific command.');
    }

    const actions: EditorAction[] = toolCalls.map((tc: any) => {
      const params = tc.function?.arguments
        ? JSON.parse(tc.function.arguments)
        : {};
      const target = (params.target as string) || 'selected';
      delete params.target;

      return {
        action: tc.function.name as EditorActionType,
        target,
        description: `${tc.function.name}: ${Object.values(params).filter(v => typeof v === 'string').slice(0, 2).join(', ') || 'execute'}`,
        params,
      };
    });

    return {
      actions,
      summary: actions.map(a => a.description).join('; '),
      needsAutoTarget: false,
    };
  }
}

// Singleton instance
let editorCommandService: EditorCommandService | null = null;

export function getEditorCommandService(): EditorCommandService {
  if (!editorCommandService) {
    editorCommandService = new EditorCommandService();
  }
  return editorCommandService;
}
