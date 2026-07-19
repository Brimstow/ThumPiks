// ============================================================================
// Shared Tool Definitions — OpenRouter native function calling definitions
// Single source of truth for all editor actions as tool/function definitions.
// Used by both editor-command (single-turn) and editor-chat (multi-turn) services.
// ============================================================================

import type { EditorActionType } from './action-catalog';

/** OpenRouter-compatible tool/function definition */
export interface EditorToolDefinition {
  type: 'function';
  function: {
    name: EditorActionType;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/** All editor actions as native function definitions */
export const EDITOR_TOOLS: EditorToolDefinition[] = [
  // ---- LAYER CREATION ----
  {
    type: 'function',
    function: {
      name: 'addText',
      description: 'Add a text layer to the canvas',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The text content' },
          x: { type: 'number', description: 'X position in pixels' },
          y: { type: 'number', description: 'Y position in pixels' },
          fontSize: { type: 'number', description: 'Font size in pixels' },
          fontFamily: { type: 'string', description: 'Font family name' },
          color: { type: 'string', description: 'Hex color e.g. #FF0000' },
          bold: { type: 'boolean', description: 'Bold text' },
          italic: { type: 'boolean', description: 'Italic text' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'addShape',
      description: 'Add a shape layer to the canvas',
      parameters: {
        type: 'object',
        properties: {
          shape: { type: 'string', enum: ['rectangle', 'ellipse', 'polygon', 'star', 'line', 'arrow'], description: 'Shape type: rectangle, ellipse (circle), polygon, star, line, or arrow' },
          x: { type: 'number', description: 'X position in pixels' },
          y: { type: 'number', description: 'Y position in pixels' },
          width: { type: 'number', description: 'Width in pixels' },
          height: { type: 'number', description: 'Height in pixels' },
          color: { type: 'string', description: 'Fill color in hex' },
        },
        required: ['shape'],
      },
    },
  },

  // ---- TEXT EDITING ----
  {
    type: 'function',
    function: {
      name: 'updateText',
      description: 'Update properties of a text layer. Specify target layer name in the "target" param.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected" for the currently selected layer' },
          text: { type: 'string', description: 'New text content' },
          fontSize: { type: 'number', description: 'New font size' },
          fontFamily: { type: 'string', description: 'New font family' },
          color: { type: 'string', description: 'New text color in hex' },
          bold: { type: 'boolean', description: 'Bold text' },
          italic: { type: 'boolean', description: 'Italic text' },
        },
        required: ['target'],
      },
    },
  },

  // ---- IMAGE AI OPERATIONS ----
  {
    type: 'function',
    function: {
      name: 'removeBackground',
      description: 'Remove background from an image layer',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'enhance',
      description: 'Enhance image quality',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          enhancementType: { type: 'string', enum: ['auto', 'color', 'sharpen', 'denoise', 'hdr'], description: 'Type of enhancement' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'upscale',
      description: 'Upscale image resolution',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          scale: { type: 'string', enum: ['2x', '4x'], description: 'Scale factor' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'inpaint',
      description: 'Edit a region of the image using AI. Requires a prompt describing the desired change.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          prompt: { type: 'string', description: 'Description of what to generate in the masked region' },
        },
        required: ['target', 'prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate',
      description: 'Generate a new image from a text prompt and add it as a layer',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Text description of the image to generate' },
          style: { type: 'string', description: 'Optional style hint (e.g. "photorealistic", "cartoon")' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'faceSwap',
      description: 'Swap face in an image layer',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          prompt: { type: 'string', description: 'Optional prompt for the face swap' },
        },
        required: ['target'],
      },
    },
  },

  // ---- IMAGE ADJUSTMENTS ----
  {
    type: 'function',
    function: {
      name: 'adjustImage',
      description: 'Adjust image properties like brightness, contrast, etc. Values range -100 to 100, opacity 0-100.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          brightness: { type: 'number', description: '-100 to 100' },
          contrast: { type: 'number', description: '-100 to 100' },
          saturation: { type: 'number', description: '-100 to 100' },
          hue: { type: 'number', description: '-100 to 100' },
          blur: { type: 'number', description: '0 to 100' },
          opacity: { type: 'number', description: '0 to 100' },
        },
        required: ['target'],
      },
    },
  },

  // ---- LAYER MANAGEMENT ----
  {
    type: 'function',
    function: {
      name: 'deleteLayer',
      description: 'Delete a layer from the canvas',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'duplicateLayer',
      description: 'Duplicate a layer',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reorderLayer',
      description: 'Move a layer up/down in the layer stack',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          direction: { type: 'string', enum: ['up', 'down', 'top', 'bottom'], description: 'Direction to move' },
        },
        required: ['target', 'direction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'resizeLayer',
      description: 'Resize a layer',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          width: { type: 'number', description: 'New width in pixels' },
          height: { type: 'number', description: 'New height in pixels' },
          scale: { type: 'number', description: 'Scale factor (e.g. 0.5 for half, 2 for double)' },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'moveLayer',
      description: 'Move a layer to a position',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          x: { type: 'number', description: 'X position in pixels' },
          y: { type: 'number', description: 'Y position in pixels' },
          position: {
            type: 'string',
            enum: ['center', 'top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'],
            description: 'Named position (overrides x/y)',
          },
        },
        required: ['target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recolorLayer',
      description: 'Change color of a text or shape layer',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          color: { type: 'string', description: 'New color in hex' },
        },
        required: ['target', 'color'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'selectLayer',
      description: 'Select a specific layer by name or description',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Layer name or description to search for' },
        },
        required: ['query'],
      },
    },
  },

  // ---- ROTATION ----
  {
    type: 'function',
    function: {
      name: 'rotateLayer',
      description: 'Rotate a layer by a specified angle in degrees',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          angle: { type: 'number', description: 'Rotation angle in degrees (positive = clockwise, negative = counter-clockwise)' },
        },
        required: ['target', 'angle'],
      },
    },
  },

  // ---- GROUPING ----
  {
    type: 'function',
    function: {
      name: 'groupLayers',
      description: 'Group multiple layers together into a single group',
      parameters: {
        type: 'object',
        properties: {
          layerNames: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of layer names to group together',
          },
        },
        required: ['layerNames'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'ungroupLayers',
      description: 'Ungroup a group layer back into individual layers',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Group layer name or "selected"' },
        },
        required: ['target'],
      },
    },
  },

  // ---- CROP ----
  {
    type: 'function',
    function: {
      name: 'cropLayer',
      description: 'Crop an image layer to a specified region',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          x: { type: 'number', description: 'X offset of crop region in pixels (from left edge of layer)' },
          y: { type: 'number', description: 'Y offset of crop region in pixels (from top edge of layer)' },
          width: { type: 'number', description: 'Width of crop region in pixels' },
          height: { type: 'number', description: 'Height of crop region in pixels' },
          region: {
            type: 'string',
            enum: ['top-half', 'bottom-half', 'left-half', 'right-half', 'center'],
            description: 'Named region preset (overrides x/y/width/height)',
          },
        },
        required: ['target'],
      },
    },
  },

  // ---- DECOMPOSITION ----
  {
    type: 'function',
    function: {
      name: 'decompose',
      description: 'Auto-decompose image into separate layers for each detected object using SAM segmentation',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          maxLayers: { type: 'number', description: 'Maximum number of layers to extract (default: 14)' },
        },
        required: ['target'],
      },
    },
  },

  // ---- ANALYSIS ----
  {
    type: 'function',
    function: {
      name: 'analyzeImage',
      description: 'Analyze the image and provide design suggestions',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
        },
        required: ['target'],
      },
    },
  },

  // ---- NEW: EXPANDED CAPABILITIES ----
  {
    type: 'function',
    function: {
      name: 'expand',
      description: 'Outpaint / expand an image beyond its current borders',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          direction: { type: 'string', enum: ['left', 'right', 'up', 'down', 'all'], description: 'Direction to expand' },
          prompt: { type: 'string', description: 'Optional prompt describing what to generate in the expanded area' },
        },
        required: ['target', 'direction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'aiText',
      description: 'Generate AI-written text content (headlines, titles, descriptions) and add as a text layer',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'What kind of text to generate (e.g. "catchy YouTube title about cooking")' },
          style: { type: 'string', description: 'Text style hint (e.g. "bold headline", "subtitle", "caption")' },
        },
        required: ['prompt'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'vision',
      description: 'Analyze what is visible on the canvas or a specific layer and describe it',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name, "selected", or "canvas" for entire canvas' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'visionSearch',
      description: 'Search for reference images based on a text query and add the result as a new layer',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query for reference images' },
        },
        required: ['query'],
      },
    },
  },

  // ---- LAYER EFFECTS ----
  {
    type: 'function',
    function: {
      name: 'addEffect',
      description: 'Add a visual effect (shadow, glow, blur, stroke, or bevel) to a layer. Replaces any existing effect of the same type.',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          effectType: { type: 'string', enum: ['shadow', 'glow', 'blur', 'stroke', 'bevel'], description: 'Type of visual effect' },
          color: { type: 'string', description: 'Effect color in hex (for shadow/glow/stroke). Default: shadow=#000000, glow=#FFFF00, stroke=#000000' },
          offsetX: { type: 'number', description: 'Horizontal offset in pixels (shadow/bevel). Default: 4' },
          offsetY: { type: 'number', description: 'Vertical offset in pixels (shadow/bevel). Default: 4' },
          blur: { type: 'number', description: 'Blur radius in pixels. Default: 8 for shadow, 15 for glow, 4 for blur effect' },
          spread: { type: 'number', description: 'Width for stroke (px) or depth for bevel (px). Default: 3' },
          opacity: { type: 'number', description: 'Effect opacity 0-100. Default: 80' },
        },
        required: ['target', 'effectType'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'removeEffect',
      description: 'Remove a visual effect from a layer by type',
      parameters: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Layer name or "selected"' },
          effectType: { type: 'string', enum: ['shadow', 'glow', 'blur', 'stroke', 'bevel'], description: 'Type of effect to remove' },
        },
        required: ['target', 'effectType'],
      },
    },
  },
];

/**
 * System prompt for the AI editor assistant.
 * Replaces the old ACTION_CATALOG text description with structured guidance
 * for native function calling mode.
 */
export function buildToolsSystemPrompt(): string {
  return `You are an AI thumbnail editing assistant with native tool access.

BEHAVIOR:
- When the user wants changes to the canvas, call the appropriate tool(s). You can call multiple tools in a single response.
- For questions, analysis, or conversation, respond with text only (no tool calls).
- Use the canvas screenshot (if provided) and layer metadata to understand the current design state.

TARGETING:
- For "target" parameters: use "selected" when the user refers to the current selection, or use the layer name to target a specific layer.
- For new content (addText, addShape, generate), no target is needed.
- Use canvas dimensions from the layer metadata to calculate pixel positions.

STYLE:
- Keep responses concise and design-focused.
- When suggesting improvements, explain the design reasoning briefly.
- For color values, use hex format (#FF0000).`;
}
