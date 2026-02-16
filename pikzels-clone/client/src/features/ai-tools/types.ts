/**
 * AI Tools Feature - Type Definitions
 *
 * Defines the "Intel Inside" model tier system where each AI tool
 * exposes branded quality tiers (ThumPiks Flash / Standard / Pro)
 * with transparent model attribution underneath.
 */

// ============================================
// TIER SYSTEM
// ============================================

/**
 * Quality tier identifiers - these are YOUR brand names.
 * Users see "ThumPiks Flash", not "flux.2-klein-4b".
 */
export type ModelTierId = 'flash' | 'standard' | 'pro';

/**
 * AI tool identifiers that support tier selection.
 * Tools using local/free processing (remove-bg, enhance) are excluded
 * since they don't route through paid API models.
 */
export type TieredToolId = 'generate' | 'inpaint' | 'face-swap' | 'upscale';

/**
 * All AI tool identifiers (including non-tiered local tools).
 */
export type AIToolId = TieredToolId | 'remove-bg' | 'enhance';

// ============================================
// MODEL TIER DEFINITION
// ============================================

/**
 * A single model tier configuration.
 *
 * This is the core of the "Intel Inside" pattern:
 * - `id` + `label` + `icon` = YOUR brand (ThumPiks Flash)
 * - `modelId` + `modelLabel` = the engine underneath (FLUX.2 Klein)
 * - `credits` + `estimatedTime` = cost justification for the user
 */
export interface ModelTier {
  /** Tier identifier */
  id: ModelTierId;

  /** User-facing tier name (e.g. "ThumPiks Flash") */
  label: string;

  /** Emoji/icon for the tier */
  icon: string;

  /** Short tagline shown below the tier name */
  tagline: string;

  /** The actual model ID sent to the backend (e.g. "black-forest-labs/flux.2-klein-4b") */
  modelId: string;

  /**
   * Human-readable model name for transparency
   * (e.g. "FLUX.2 Klein" — the "Intel Inside" label)
   */
  modelLabel: string;

  /** Credit cost per generation for this tier */
  credits: number;

  /** Estimated generation time in human-readable form (e.g. "~3s") */
  estimatedTime: string;

  /** Whether this tier is the default selection */
  isDefault?: boolean;

  /** Optional badge text (e.g. "Most Popular", "Best Quality") */
  badge?: string;
}

// ============================================
// TOOL → TIER MAPPING
// ============================================

/**
 * Complete tier configuration for one AI tool.
 * Each tiered tool has 2–3 tiers with different quality/cost tradeoffs.
 */
export interface ToolTierConfig {
  /** Which AI tool this config belongs to */
  toolId: TieredToolId;

  /** Ordered list of tiers (cheapest → most expensive) */
  tiers: ModelTier[];

  /** The tier ID selected by default */
  defaultTierId: ModelTierId;
}

// ============================================
// API REQUEST / RESPONSE
// ============================================

/**
 * Extended generate request that includes the tier/model selection.
 * This is what the frontend sends to the backend.
 */
export interface TieredGenerateRequest {
  prompt: string;
  style?: string;
  projectId?: string;
  /** The quality tier the user selected */
  tier?: ModelTierId;
  /** Direct model override (for power users / Layer 3) */
  model?: string;
}

/**
 * Response shape from GET /api/thumbnails/ai/models
 *
 * This mirrors the backend's AIToolModelsAPIResponse from model-tiers.config.ts.
 * The backend is the single source of truth — the frontend renders whatever
 * this endpoint returns. Zero hardcoded model data on the frontend.
 */
export interface AIToolModelsResponse {
  /** Per-tool tier configurations (the primary payload) */
  tiers: Record<TieredToolId, ToolTierConfig>;
  /** Whether the AI service is configured (has API key) */
  configured: boolean;
  /** Set of tool IDs that support tier selection */
  tieredToolIds: TieredToolId[];
}

// ============================================
// COMPONENT PROPS
// ============================================

// ModelTierSelectorProps is defined in the component file itself
// (components/ModelTierSelector.tsx) since it now accepts `tierConfig`
// as a prop from the useModelTiers hook rather than importing hardcoded data.
