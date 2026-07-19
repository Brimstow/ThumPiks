/**
 * Model Tier Utilities — Types & Helpers (No Hardcoded Data)
 *
 * All tier DATA (model IDs, labels, credits, estimated times, badges)
 * lives on the backend in `src/modules/thumbnail/model-tiers.config.ts`.
 * The frontend fetches it via GET /api/thumbnails/ai/models.
 *
 * This file contains ONLY:
 *   1. TypeScript types that mirror the backend response shape
 *   2. Pure utility functions that operate on fetched data
 *
 * Single source of truth: the backend.
 * To swap a model: change ONE line on the backend. Zero frontend changes.
 *
 * Pattern references:
 *   - LibreChat: server-config-driven modelSpecs (librechat.yaml)
 *   - Vercel AI SDK: provider registry with Edge Config
 *   - Open WebUI: fully API-driven model catalog
 */

import type {
  ModelTierId,
  TieredToolId,
  ModelTier,
  ToolTierConfig,
  AIToolModelsResponse,
} from './types';

// Re-export types so consumers can import from this module
export type {
  ModelTierId,
  TieredToolId,
  ModelTier,
  ToolTierConfig,
  AIToolModelsResponse,
};

// ============================================
// UTILITY FUNCTIONS (operate on fetched data)
// ============================================

/**
 * Set of tool IDs that support tier selection.
 * Populated from the backend response's `tieredToolIds` array.
 * Falls back to a known set if the response doesn't include it.
 */
const DEFAULT_TIERED_TOOL_IDS: Set<string> = new Set([
  'generate',
  'inpaint',
  'face-swap',
  'upscale',
]);

/**
 * Check if a given tool ID supports tier selection.
 * When backend data is available, uses the server-provided list.
 * Otherwise falls back to known defaults.
 */
export function isTieredTool(
  toolId: string,
  serverTieredIds?: string[]
): toolId is TieredToolId {
  if (serverTieredIds && serverTieredIds.length > 0) {
    return serverTieredIds.includes(toolId);
  }
  return DEFAULT_TIERED_TOOL_IDS.has(toolId);
}

/**
 * Get the tier configuration for a specific tool from fetched data.
 * Returns `null` for non-tiered tools or if data hasn't loaded.
 */
export function getToolTierConfig(
  toolId: string,
  tiersMap: Record<string, ToolTierConfig> | null | undefined
): ToolTierConfig | null {
  if (!tiersMap) return null;
  if (!tiersMap[toolId]) return null;
  return tiersMap[toolId];
}

/**
 * Get the default tier for a tool from fetched data.
 * Returns `null` if the tool isn't tiered or data hasn't loaded.
 */
export function getDefaultTier(
  toolId: string,
  tiersMap: Record<string, ToolTierConfig> | null | undefined
): ModelTier | null {
  const config = getToolTierConfig(toolId, tiersMap);
  if (!config) return null;
  return (
    config.tiers.find(t => t.id === config.defaultTierId) ??
    config.tiers[0] ??
    null
  );
}

/**
 * Get a specific tier by tool ID and tier ID from fetched data.
 * Returns `null` if the tool isn't tiered or the tier doesn't exist.
 */
export function getTierById(
  toolId: string,
  tierId: ModelTierId,
  tiersMap: Record<string, ToolTierConfig> | null | undefined
): ModelTier | null {
  const config = getToolTierConfig(toolId, tiersMap);
  if (!config) return null;
  return config.tiers.find(t => t.id === tierId) ?? null;
}

/**
 * Resolve the model ID for a given tool + tier selection from fetched data.
 * Falls back to the tool's default tier if the requested tier isn't available.
 * Returns `null` if data hasn't loaded or the tool isn't tiered.
 */
export function resolveModelId(
  toolId: string,
  tierId: ModelTierId | undefined,
  tiersMap: Record<string, ToolTierConfig> | null | undefined
): string | null {
  const config = getToolTierConfig(toolId, tiersMap);
  if (!config) return null;

  if (tierId) {
    const tier = config.tiers.find(t => t.id === tierId);
    if (tier) return tier.modelId;
  }

  // Fall back to default
  const defaultTier = getDefaultTier(toolId, tiersMap);
  return defaultTier?.modelId ?? null;
}

/**
 * Get the default tier ID for a tool from fetched data.
 * Returns 'standard' as a safe fallback if data hasn't loaded.
 */
export function getDefaultTierId(
  toolId: string,
  tiersMap: Record<string, ToolTierConfig> | null | undefined
): ModelTierId {
  const config = getToolTierConfig(toolId, tiersMap);
  if (!config) return 'standard';
  return config.defaultTierId;
}
