/**
 * Model Tier Configuration — Backend Single Source of Truth
 *
 * This file is the ONLY place where tier metadata lives. The frontend
 * fetches it via GET /api/thumbnails/ai/models. There is no duplicate
 * config in the frontend codebase.
 *
 * Pattern: LibreChat's server-config-driven model specs — the backend
 * owns model IDs, labels, credits, estimated times, and badges. The
 * frontend renders whatever the backend returns.
 *
 * To swap a model: change ONE line here. Zero frontend changes.
 *
 * Naming convention:
 *   - Tier names are YOUR brand  → "ThumPiks Flash", "ThumPiks Standard", "ThumPiks Pro"
 *   - Model names are the engine → "FLUX.2 Klein", "Gemini 2.5 Flash Image", etc.
 */

// ============================================
// TYPES
// ============================================

export type ModelTierId = 'flash' | 'standard' | 'pro';

export type TieredToolId =
  | 'generate'
  | 'generate-text'
  | 'inpaint'
  | 'face-swap'
  | 'upscale';

/**
 * A single tier definition with all UI metadata.
 * This is exactly what the frontend receives and renders.
 */
export interface TierDefinition {
  /** Tier identifier */
  id: ModelTierId;
  /** User-facing tier name (e.g. "ThumPiks Flash") */
  label: string;
  /** Emoji/icon for the tier */
  icon: string;
  /** Short tagline shown below the tier name */
  tagline: string;
  /** The actual model ID sent to the AI provider */
  modelId: string;
  /** Human-readable model name — the "Intel Inside" label */
  modelLabel: string;
  /** Credit cost per generation */
  credits: number;
  /** Human-readable estimated time (e.g. "~3s") */
  estimatedTime: string;
  /** Whether this is the default selection */
  isDefault?: boolean;
  /** Optional badge text (e.g. "Most Popular") */
  badge?: string;
  /** Optional capability metadata (e.g. { maxScale: '4x' } for upscale) */
  capabilities?: Record<string, unknown>;
  /** Vision-capable model ID for multimodal requests (image + text). When set,
   *  the controller auto-selects this model if the request includes an image. */
  visionModelId?: string;
  /** Human-readable label for the vision model (e.g. "Qwen 3.5 Flash VL") */
  visionModelLabel?: string;
}

/**
 * Complete tier configuration for one AI tool.
 */
export interface ToolTierConfig {
  toolId: TieredToolId;
  tiers: TierDefinition[];
  defaultTierId: ModelTierId;
}

/**
 * Shape of the full API response from GET /api/thumbnails/ai/models
 */
export interface AIToolModelsAPIResponse {
  /** Per-tool tier configurations (the primary payload) */
  tiers: Record<TieredToolId, ToolTierConfig>;
  /** Whether the AI service is configured (has API key) */
  configured: boolean;
  /** Set of tool IDs that support tier selection */
  tieredToolIds: TieredToolId[];
}

// ============================================
// PROVIDER MODEL CATALOGS (DRY - Single Source of Truth)
// ============================================

/**
 * Available AI providers and their model offerings.
 * Each provider has models mapped to quality tiers (flash/standard/pro).
 */
type AIProvider = 'comet' | 'zenmux' | 'openrouter';

/**
 * Provider-specific model catalogs.
 * IMPORTANT: This is the ONLY place where model IDs are defined.
 * Do NOT hardcode model IDs anywhere else in tier configurations.
 */
const PROVIDER_MODELS: Record<AIProvider, Record<ModelTierId, string>> = {
  comet: {
    flash: 'flux-schnell',
    standard: 'flux-dev',
    pro: 'flux-pro',
  },
  zenmux: {
    flash: 'google/gemini-2.5-flash-image',
    standard: 'google/gemini-2.5-flash-image',
    pro: 'google/gemini-3-pro-image-preview',
  },
  openrouter: {
    flash: 'google/gemini-2.5-flash-image',
    standard: 'google/gemini-2.5-flash-image',
    pro: 'google/gemini-3-pro-image-preview',
  },
};

/**
 * Human-readable model labels for each provider's models.
 * Displayed in the UI as "Powered by {label}"
 */
const PROVIDER_MODEL_LABELS: Record<AIProvider, Record<ModelTierId, string>> = {
  comet: {
    flash: 'FLUX Schnell',
    standard: 'FLUX Dev',
    pro: 'FLUX Pro',
  },
  zenmux: {
    flash: 'Gemini 2.5 Flash Image',
    standard: 'Gemini 2.5 Flash Image',
    pro: 'Gemini 3 Pro Image',
  },
  openrouter: {
    flash: 'Gemini 2.5 Flash Image',
    standard: 'Gemini 2.5 Flash Image',
    pro: 'Gemini 3 Pro Image',
  },
};

/**
 * Global tier-to-provider mapping (SINGLE SOURCE OF TRUTH)
 *
 * Change ONE line here to switch ALL tools using that tier to a different provider.
 *
 * Example: To switch all Flash tiers from Comet to ZenMux:
 *   flash: 'comet' → flash: 'zenmux'
 *
 * This will automatically update generate, inpaint, face-swap, and upscale Flash tiers.
 */
const TIER_PROVIDER_MAP: Record<ModelTierId, AIProvider> = {
  flash: 'comet', // Fast, cost-effective - uses Comet FLUX Schnell
  standard: 'openrouter', // Balanced - uses OpenRouter Gemini 2.5
  pro: 'openrouter', // Best quality - uses OpenRouter Gemini 3 Pro
};

// ============================================
// VISION TEXT MODELS (for generate-text with image input)
// ============================================

/**
 * Vision-capable models for text generation when an image is provided.
 * These models can analyze images and generate text suggestions in a single call.
 *
 * Flash    → Qwen 3.5 Flash: cheapest VL model, native vision-language (Chinese)
 * Standard → Gemini 2.5 Flash: proven, already used in vision service
 * Pro      → Grok 4.1 Fast: excellent quality, 2M context, very capable
 */
const VISION_TEXT_MODELS: Record<ModelTierId, string> = {
  flash: 'qwen/qwen3.5-flash',
  standard: 'google/gemini-2.5-flash',
  pro: 'x-ai/grok-4.1-fast',
};

const VISION_TEXT_MODEL_LABELS: Record<ModelTierId, string> = {
  flash: 'Qwen 3.5 Flash VL',
  standard: 'Gemini 2.5 Flash',
  pro: 'Grok 4.1 Fast',
};

/**
 * Resolve the model ID for a specific tier.
 * This is the centralized lookup that prevents model ID duplication.
 */
function getModelForTier(tierId: ModelTierId): string {
  const provider = TIER_PROVIDER_MAP[tierId];
  return PROVIDER_MODELS[provider][tierId];
}

/**
 * Resolve the model label for a specific tier.
 * Returns the human-readable model name for UI display.
 */
function getModelLabelForTier(tierId: ModelTierId): string {
  const provider = TIER_PROVIDER_MAP[tierId];
  return PROVIDER_MODEL_LABELS[provider][tierId];
}

/**
 * Get the provider that will handle requests for a specific tier.
 * Used by the controller to route requests to the correct AI service.
 */
export function getProviderForTier(tierId: ModelTierId): AIProvider {
  return TIER_PROVIDER_MAP[tierId];
}

// ============================================
// TIER BASE TEMPLATES
// ============================================

const TIER_BASE: Record<
  ModelTierId,
  Pick<TierDefinition, 'id' | 'label' | 'icon'>
> = {
  flash: {
    id: 'flash',
    label: 'ThumPiks Flash',
    icon: '⚡',
  },
  standard: {
    id: 'standard',
    label: 'ThumPiks Standard',
    icon: '⭐',
  },
  pro: {
    id: 'pro',
    label: 'ThumPiks Pro',
    icon: '💎',
  },
};

// ============================================
// TOOL TIER CONFIGURATIONS
// ============================================

/**
 * Text-to-image generation tiers.
 *
 * Flash    → FLUX Schnell (Comet): fastest, cheapest, good for quick iterations
 * Standard → Gemini 2.5 Flash Image (OpenRouter): balanced quality and speed (default)
 * Pro      → Gemini 3 Pro Image (OpenRouter): highest quality, 2K/4K support, slower
 *
 * NOTE: Model IDs are resolved via TIER_PROVIDER_MAP. To change providers,
 * update TIER_PROVIDER_MAP at the top of this file.
 */
const generateTiers: ToolTierConfig = {
  toolId: 'generate',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Fast iterations, good quality',
      modelId: getModelForTier('flash'),
      modelLabel: getModelLabelForTier('flash'),
      credits: 1,
      estimatedTime: '~3s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Balanced quality and speed',
      modelId: getModelForTier('standard'),
      modelLabel: getModelLabelForTier('standard'),
      credits: 2,
      estimatedTime: '~8s',
      isDefault: true,
      badge: 'Most Popular',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Best quality, 2K/4K output',
      modelId: getModelForTier('pro'),
      modelLabel: getModelLabelForTier('pro'),
      credits: 5,
      estimatedTime: '~15s',
      badge: 'Best Quality',
    },
  ],
};

/**
 * Inpainting / image editing tiers.
 *
 * Flash    → FLUX Schnell (Comet): fast, decent contextual edits
 * Standard → Gemini 3 Pro Image (OpenRouter): strong context understanding (default)
 * Pro      → GPT-5 Image (OpenRouter): premium editing precision
 *
 * NOTE: Model IDs are resolved via TIER_PROVIDER_MAP.
 */
const inpaintTiers: ToolTierConfig = {
  toolId: 'inpaint',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Quick edits, good for text overlays',
      modelId: getModelForTier('flash'),
      modelLabel: getModelLabelForTier('flash'),
      credits: 1,
      estimatedTime: '~5s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Context-aware, natural blending',
      modelId: getModelForTier('standard'),
      modelLabel: getModelLabelForTier('standard'),
      credits: 3,
      estimatedTime: '~10s',
      isDefault: true,
      badge: 'Recommended',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Premium precision editing',
      modelId: 'openai/gpt-5-image', // Special case: Pro tier uses GPT-5 for inpainting
      modelLabel: 'GPT-5 Image',
      credits: 6,
      estimatedTime: '~18s',
      badge: 'Most Precise',
    },
  ],
};

/**
 * Face swap tiers.
 *
 * Flash    → FLUX Schnell (Comet): fast, acceptable face quality
 * Standard → Seedream 4.5 (OpenRouter): portrait-optimized, natural results (default)
 * Pro      → Gemini 3 Pro Image (OpenRouter): highest fidelity face reconstruction
 *
 * NOTE: Standard tier uses Seedream 4.5 (special case for face-optimized model).
 */
const faceSwapTiers: ToolTierConfig = {
  toolId: 'face-swap',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Quick swaps, good enough for drafts',
      modelId: getModelForTier('flash'),
      modelLabel: getModelLabelForTier('flash'),
      credits: 1,
      estimatedTime: '~4s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Portrait-optimized, natural results',
      modelId: 'bytedance-seed/seedream-4.5', // Special case: Seedream optimized for faces
      modelLabel: 'Seedream 4.5',
      credits: 2,
      estimatedTime: '~8s',
      isDefault: true,
      badge: 'Best for Faces',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Highest fidelity face reconstruction',
      modelId: getModelForTier('pro'),
      modelLabel: getModelLabelForTier('pro'),
      credits: 5,
      estimatedTime: '~14s',
      badge: 'Most Realistic',
    },
  ],
};

/**
 * AI upscaling tiers.
 *
 * Standard → Gemini 2.5 Flash Image (OpenRouter): fast, good detail preservation (default)
 * Pro      → Gemini 3 Pro Image (OpenRouter): native 2K/4K, maximum detail
 *
 * NOTE: Upscale does not have a Flash tier. Only Standard and Pro.
 */
const upscaleTiers: ToolTierConfig = {
  toolId: 'upscale',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.standard,
      tagline: 'Fast upscaling, good detail',
      modelId: getModelForTier('standard'),
      modelLabel: getModelLabelForTier('standard'),
      credits: 1,
      estimatedTime: '~5s',
      isDefault: true,
      capabilities: { maxScale: '2x' },
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Native 2K/4K, maximum detail',
      modelId: getModelForTier('pro'),
      modelLabel: getModelLabelForTier('pro'),
      credits: 4,
      estimatedTime: '~12s',
      badge: 'Sharpest',
      capabilities: { maxScale: '4x' },
    },
  ],
};

/**
 * AI text generation tiers (chat completions).
 *
 * Text-only models (default):
 *   Flash    → GPT-4.1 Nano: fastest, cheapest, excellent JSON compliance
 *   Standard → GPT-4.1 Mini: best quality-per-dollar, mature structured output
 *   Pro      → GPT-4.1: premium quality, highest accuracy, native structured output
 *
 * Vision models (auto-selected when image is provided):
 *   Flash    → Qwen 3.5 Flash VL: cheapest multimodal, native vision-language
 *   Standard → Gemini 2.5 Flash: proven quality, excellent image understanding
 *   Pro      → Grok 4.1 Fast: 2M context, exceptional quality
 *
 * NOTE: Text-only model IDs are defined directly (not via TIER_PROVIDER_MAP)
 * since the image provider map doesn't apply to text generation.
 * Vision model IDs come from the VISION_TEXT_MODELS catalog above.
 */
const generateTextTiers: ToolTierConfig = {
  toolId: 'generate-text',
  defaultTierId: 'flash',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Quick text ideas',
      modelId: 'openai/gpt-4.1-nano',
      modelLabel: 'GPT-4.1 Nano',
      credits: 1,
      estimatedTime: '~2s',
      isDefault: true,
      visionModelId: VISION_TEXT_MODELS.flash,
      visionModelLabel: VISION_TEXT_MODEL_LABELS.flash,
      capabilities: { supportsVision: true },
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Smarter, more creative suggestions',
      modelId: 'openai/gpt-4.1-mini',
      modelLabel: 'GPT-4.1 Mini',
      credits: 2,
      estimatedTime: '~5s',
      badge: 'More Creative',
      visionModelId: VISION_TEXT_MODELS.standard,
      visionModelLabel: VISION_TEXT_MODEL_LABELS.standard,
      capabilities: { supportsVision: true },
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Premium AI, best text quality',
      modelId: 'openai/gpt-4.1',
      modelLabel: 'GPT-4.1',
      credits: 3,
      estimatedTime: '~4s',
      badge: 'Best Quality',
      visionModelId: VISION_TEXT_MODELS.pro,
      visionModelLabel: VISION_TEXT_MODEL_LABELS.pro,
      capabilities: { supportsVision: true },
    },
  ],
};

// ============================================
// MASTER CONFIG (exported)
// ============================================

/**
 * The single source of truth for all tier configurations.
 * This map is used by:
 *   1. The controller's resolveModelFromTier() for request routing
 *   2. The getAIToolModels endpoint to serve the full config to the frontend
 */
export const TOOL_TIER_CONFIG: Record<TieredToolId, ToolTierConfig> = {
  generate: generateTiers,
  'generate-text': generateTextTiers,
  inpaint: inpaintTiers,
  'face-swap': faceSwapTiers,
  upscale: upscaleTiers,
};

/**
 * All tool IDs that support tier selection.
 * Tools NOT in this set use local/free processing and don't need tier UI.
 */
export const TIERED_TOOL_IDS: TieredToolId[] = [
  'generate',
  'generate-text',
  'inpaint',
  'face-swap',
  'upscale',
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Resolve a quality tier to a concrete model ID for a given tool.
 * Returns undefined if tier is missing/invalid (lets the service use its default).
 */
export function resolveModelFromTier(
  tier: string | undefined,
  tool: TieredToolId
): string | undefined {
  if (!tier) return undefined;

  const config = TOOL_TIER_CONFIG[tool];
  if (!config) return undefined;

  const tierDef = config.tiers.find(t => t.id === tier);
  return tierDef?.modelId ?? undefined;
}

/**
 * Resolve a quality tier to a vision-capable model ID for a given tool.
 * Returns undefined if tier is missing/invalid or the tier has no vision model.
 */
export function resolveVisionModelFromTier(
  tier: string | undefined,
  tool: TieredToolId
): string | undefined {
  if (!tier) {
    const defaultTier = getDefaultTier(tool);
    return defaultTier?.visionModelId ?? undefined;
  }

  const config = TOOL_TIER_CONFIG[tool];
  if (!config) return undefined;

  const tierDef = config.tiers.find(t => t.id === tier);
  return tierDef?.visionModelId ?? undefined;
}

/**
 * Get the default tier definition for a tool.
 */
export function getDefaultTier(tool: TieredToolId): TierDefinition | undefined {
  const config = TOOL_TIER_CONFIG[tool];
  if (!config) return undefined;
  return (
    config.tiers.find(t => t.id === config.defaultTierId) ?? config.tiers[0]
  );
}

/**
 * Get credit cost for a tier/tool combination.
 * Returns the credit value from the tier definition, or 1 as fallback.
 */
export function getCreditCostForTier(
  tier: string | undefined,
  tool: TieredToolId
): number {
  if (!tier) {
    const defaultTier = getDefaultTier(tool);
    return defaultTier?.credits ?? 1;
  }
  const config = TOOL_TIER_CONFIG[tool];
  if (!config) return 1;
  const tierDef = config.tiers.find(t => t.id === tier);
  return tierDef?.credits ?? 1;
}

/**
 * Read a capability value from a tier definition.
 * Used for backend validation (e.g. maxScale for upscale).
 */
export function getTierCapability(
  tier: string | undefined,
  tool: TieredToolId,
  key: string
): unknown {
  if (!tier) {
    const defaultTier = getDefaultTier(tool);
    return defaultTier?.capabilities?.[key];
  }
  const config = TOOL_TIER_CONFIG[tool];
  if (!config) return undefined;
  const tierDef = config.tiers.find(t => t.id === tier);
  return tierDef?.capabilities?.[key];
}

/**
 * Build the full API response for GET /api/thumbnails/ai/models.
 * The controller calls this to produce the response payload.
 */
export function buildTierAPIResponse(
  isConfigured: boolean
): AIToolModelsAPIResponse {
  return {
    tiers: TOOL_TIER_CONFIG,
    configured: isConfigured,
    tieredToolIds: TIERED_TOOL_IDS,
  };
}
