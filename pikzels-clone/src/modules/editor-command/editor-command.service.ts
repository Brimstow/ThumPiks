import fetch from 'node-fetch';
import { deductCredits } from '../credit/credit.service';

// ============================================================================
// AI Editor Command Service
// Parses natural language prompts into structured editor actions using LLM
// with OpenRouter structured JSON output (response_format: json_schema)
// ============================================================================

/** Supported editor action types that map to existing editor functions */
export type EditorActionType =
  | 'addText'
  | 'updateText'
  | 'addShape'
  | 'adjustImage'
  | 'removeBackground'
  | 'enhance'
  | 'upscale'
  | 'inpaint'
  | 'generate'
  | 'faceSwap'
  | 'deleteLayer'
  | 'duplicateLayer'
  | 'reorderLayer'
  | 'resizeLayer'
  | 'moveLayer'
  | 'recolorLayer'
  | 'selectLayer'
  | 'analyzeImage'
  | 'decompose';

/** A single editor action returned by the LLM */
export interface EditorAction {
  action: EditorActionType;
  /** Which layer to target: 'selected', 'auto', or a specific layer name/type */
  target: 'selected' | 'auto' | string;
  /** Description for the user confirmation step */
  description: string;
  /** Action-specific parameters */
  params: Record<string, unknown>;
}

/** The full structured response from the LLM */
export interface EditorCommandResult {
  actions: EditorAction[];
  /** Human-readable summary of what will happen */
  summary: string;
  /** Whether SAM auto-targeting is needed for any action */
  needsAutoTarget: boolean;
  /** If auto-target needed, what object to look for */
  autoTargetQuery?: string;
}

/** Layer context sent from the frontend */
export interface LayerContext {
  id: string;
  type: 'image' | 'text' | 'shape' | 'drawing';
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  /** Text content for text layers */
  text?: string;
  /** Font for text layers */
  font?: string;
  /** Font size for text layers */
  fontSize?: number;
  /** Color for text/shape layers */
  color?: string;
}

/** Canvas context sent from the frontend */
export interface CanvasContext {
  width: number;
  height: number;
  layers: LayerContext[];
}

const EDITOR_COMMAND_SYSTEM_PROMPT = `You are an AI assistant for a thumbnail editor. The user will give you a natural language command and you must convert it into structured editor actions.

You have access to these actions:

LAYER CREATION:
- addText: Add a text layer. Params: { text, x, y, fontSize, fontFamily, color, bold, italic }
- addShape: Add a shape layer. Params: { shape: "rectangle"|"circle"|"triangle", x, y, width, height, color }

TEXT EDITING (target a text layer):
- updateText: Update text layer properties. Params: { text?, fontSize?, fontFamily?, color?, bold?, italic? }

IMAGE AI OPERATIONS (target an image layer):
- removeBackground: Remove background from image layer. Params: {}
- enhance: Enhance image quality. Params: { enhancementType?: "auto"|"color"|"sharpen"|"denoise"|"hdr" }
- upscale: Upscale image resolution. Params: { scale?: "2x"|"4x" }
- inpaint: Edit a region of the image. Params: { prompt: string }
- generate: Generate a new image. Params: { prompt: string, style?: string }
- faceSwap: Swap face in image. Params: { prompt?: string }

IMAGE ADJUSTMENTS (target an image layer):
- adjustImage: Adjust image properties. Params: { brightness?, contrast?, saturation?, hue?, blur?, opacity? } (values: -100 to 100 for most, 0-100 for opacity)

LAYER MANAGEMENT:
- deleteLayer: Delete a layer. Params: {}
- duplicateLayer: Duplicate a layer. Params: {}
- reorderLayer: Move layer up/down. Params: { direction: "up"|"down"|"top"|"bottom" }
- resizeLayer: Resize a layer. Params: { width?, height?, scale? }
- moveLayer: Move a layer. Params: { x?, y?, position?: "center"|"top"|"bottom"|"left"|"right"|"top-left"|"top-right"|"bottom-left"|"bottom-right" }
- recolorLayer: Change color of text or shape. Params: { color: string }
- selectLayer: Select a specific layer. Params: { query: string }

DECOMPOSITION:
- decompose: Auto-decompose image into separate layers for each detected object using SAM segmentation. Params: { maxLayers?: number }

ANALYSIS:
- analyzeImage: Analyze the image for suggestions. Params: {}

RULES:
1. If the user mentions a specific element (e.g., "the planet", "the text"), set target to "auto" and set needsAutoTarget to true with autoTargetQuery describing what to find.
2. If a layer is marked as selected in the context, prefer targeting it unless the user clearly means something else.
3. If the command is about creating something new (add text, generate image), target should be "new".
4. You can return MULTIPLE actions for complex commands (e.g., "add red bold text saying EPIC at the top" = addText + moveLayer).
5. For color values, use hex format (#FF0000).
6. Keep descriptions short and user-friendly.
7. If the command is ambiguous, pick the most likely interpretation and explain in the summary.
8. For position commands, use the canvas dimensions provided to calculate pixel positions.

Return ONLY valid JSON matching the required schema.`;

/** JSON Schema for OpenRouter structured output */
const EDITOR_COMMAND_SCHEMA = {
  type: 'object' as const,
  properties: {
    actions: {
      type: 'array' as const,
      items: {
        type: 'object' as const,
        properties: {
          action: { type: 'string' as const },
          target: { type: 'string' as const },
          description: { type: 'string' as const },
          params: { type: 'object' as const },
        },
        required: ['action', 'target', 'description', 'params'],
      },
    },
    summary: { type: 'string' as const },
    needsAutoTarget: { type: 'boolean' as const },
    autoTargetQuery: { type: 'string' as const },
  },
  required: ['actions', 'summary', 'needsAutoTarget'],
};

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
    const contextMessage = this.buildContextMessage(canvasContext);

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

    const response = await fetch(
      `${this.openrouterApiUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.openrouterApiKey}`,
          'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:8556',
          'X-Title': 'ThumPiks Editor Command',
        },
        body: JSON.stringify(requestBody),
      }
    );

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
      throw new Error('Failed to understand the command. Please try rephrasing.');
    }
  }

  /** Build a context message describing the current editor state */
  private buildContextMessage(ctx: CanvasContext): string {
    const lines = [
      `Canvas: ${ctx.width}x${ctx.height}px`,
      `Layers (${ctx.layers.length} total):`,
    ];

    for (const layer of ctx.layers) {
      const flags = [
        layer.selected ? 'SELECTED' : '',
        layer.locked ? 'locked' : '',
        !layer.visible ? 'hidden' : '',
      ]
        .filter(Boolean)
        .join(', ');

      let info = `  - [${layer.type}] "${layer.name}"`;
      if (flags) info += ` (${flags})`;
      if (layer.type === 'text' && layer.text) {
        info += ` text="${layer.text}" font=${layer.font || 'default'} size=${layer.fontSize || 24} color=${layer.color || '#FFFFFF'}`;
      }
      if (layer.type === 'shape' && layer.color) {
        info += ` color=${layer.color}`;
      }
      lines.push(info);
    }

    if (ctx.layers.length === 0) {
      lines.push('  (empty canvas - no layers yet)');
    }

    return lines.join('\n');
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
