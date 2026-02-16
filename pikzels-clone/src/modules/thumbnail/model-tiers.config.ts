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

export type TieredToolId = 'generate' | 'inpaint' | 'face-swap' | 'upscale';

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
 * Flash    → FLUX.2 Klein: fastest, cheapest, good for quick iterations
 * Standard → Gemini 2.5 Flash Image: balanced quality and speed (default)
 * Pro      → Gemini 3 Pro Image: highest quality, 2K/4K support, slower
 */
const generateTiers: ToolTierConfig = {
  toolId: 'generate',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Fast iterations, good quality',
      modelId: 'black-forest-labs/flux.2-klein-4b',
      modelLabel: 'FLUX.2 Klein',
      credits: 1,
      estimatedTime: '~3s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Balanced quality and speed',
      modelId: 'google/gemini-2.5-flash-image',
      modelLabel: 'Gemini 2.5 Flash Image',
      credits: 2,
      estimatedTime: '~8s',
      isDefault: true,
      badge: 'Most Popular',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Best quality, 2K/4K output',
      modelId: 'google/gemini-3-pro-image-preview',
      modelLabel: 'Gemini 3 Pro Image',
      credits: 5,
      estimatedTime: '~15s',
      badge: 'Best Quality',
    },
  ],
};

/**
 * Inpainting / image editing tiers.
 *
 * Flash    → FLUX.2 Flex: fast, decent contextual edits, great at text
 * Standard → Gemini 3 Pro Image: strong context understanding (default)
 * Pro      → GPT-5 Image: premium editing precision
 */
const inpaintTiers: ToolTierConfig = {
  toolId: 'inpaint',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Quick edits, good for text overlays',
      modelId: 'black-forest-labs/flux.2-flex',
      modelLabel: 'FLUX.2 Flex',
      credits: 1,
      estimatedTime: '~5s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Context-aware, natural blending',
      modelId: 'google/gemini-3-pro-image-preview',
      modelLabel: 'Gemini 3 Pro Image',
      credits: 3,
      estimatedTime: '~10s',
      isDefault: true,
      badge: 'Recommended',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Premium precision editing',
      modelId: 'openai/gpt-5-image',
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
 * Flash    → Gemini 2.5 Flash Image: fast, acceptable face quality
 * Standard → Seedream 4.5: portrait-optimized, natural results (default)
 * Pro      → Gemini 3 Pro Image: highest fidelity face reconstruction
 */
const faceSwapTiers: ToolTierConfig = {
  toolId: 'face-swap',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.flash,
      tagline: 'Quick swaps, good enough for drafts',
      modelId: 'google/gemini-2.5-flash-image',
      modelLabel: 'Gemini 2.5 Flash Image',
      credits: 1,
      estimatedTime: '~4s',
    },
    {
      ...TIER_BASE.standard,
      tagline: 'Portrait-optimized, natural results',
      modelId: 'bytedance-seed/seedream-4.5',
      modelLabel: 'Seedream 4.5',
      credits: 2,
      estimatedTime: '~8s',
      isDefault: true,
      badge: 'Best for Faces',
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Highest fidelity face reconstruction',
      modelId: 'google/gemini-3-pro-image-preview',
      modelLabel: 'Gemini 3 Pro Image',
      credits: 5,
      estimatedTime: '~14s',
      badge: 'Most Realistic',
    },
  ],
};

/**
 * AI upscaling tiers.
 *
 * Standard → Gemini 2.5 Flash Image: fast, good detail preservation (default)
 * Pro      → Gemini 3 Pro Image: native 2K/4K, maximum detail
 */
const upscaleTiers: ToolTierConfig = {
  toolId: 'upscale',
  defaultTierId: 'standard',
  tiers: [
    {
      ...TIER_BASE.standard,
      tagline: 'Fast upscaling, good detail',
      modelId: 'google/gemini-2.5-flash-image',
      modelLabel: 'Gemini 2.5 Flash Image',
      credits: 1,
      estimatedTime: '~5s',
      isDefault: true,
    },
    {
      ...TIER_BASE.pro,
      tagline: 'Native 2K/4K, maximum detail',
      modelId: 'google/gemini-3-pro-image-preview',
      modelLabel: 'Gemini 3 Pro Image',
      credits: 4,
      estimatedTime: '~12s',
      badge: 'Sharpest',
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
