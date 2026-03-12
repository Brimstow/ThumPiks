import fetch from 'node-fetch';
import { deductCredits } from '../credit/credit.service';
import {
  ACTION_CATALOG,
  TARGETING_RULES,
  EDITOR_COMMAND_SCHEMA,
  buildContextMessage,
} from './action-catalog';
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
// with OpenRouter structured JSON output (response_format: json_schema)
// ============================================================================

const EDITOR_COMMAND_SYSTEM_PROMPT = `You are an AI assistant for a thumbnail editor. The user will give you a natural language command and you must convert it into structured editor actions.

${ACTION_CATALOG}

${TARGETING_RULES}

Return ONLY valid JSON matching the required schema.`;

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
   * Uses OpenRouter structured JSON output for guaranteed valid responses.
   */
  async parseCommand(
    prompt: string,
    canvasContext: CanvasContext,
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

    // Use a fast, cheap model for intent parsing
    const model =
      process.env.OPENROUTER_MODEL_COMMAND || 'google/gemini-2.5-flash';

    const requestBody = {
      model,
      messages: [
        {
          role: 'system' as const,
          content: EDITOR_COMMAND_SYSTEM_PROMPT,
        },
        {
          role: 'user' as const,
          content: `${contextMessage}\n\nUser command: "${prompt}"`,
        },
      ],
      response_format: {
        type: 'json_schema' as const,
        json_schema: {
          name: 'editor_command',
          strict: true,
          schema: EDITOR_COMMAND_SCHEMA,
        },
      },
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
    const rawContent = data.choices?.[0]?.message?.content || '';

    try {
      const parsed: EditorCommandResult = JSON.parse(rawContent);

      // Validate the response has at least one action
      if (!parsed.actions || parsed.actions.length === 0) {
        throw new Error('No actions returned');
      }

      return parsed;
    } catch (parseError) {
      console.error('Failed to parse editor command response:', rawContent);
      throw new Error(
        'Failed to understand the command. Please try rephrasing.'
      );
    }
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
