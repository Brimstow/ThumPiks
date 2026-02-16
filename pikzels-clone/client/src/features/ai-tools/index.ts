/**
 * AI Tools Feature - Public API
 *
 * This is the single entry point for the ai-tools feature module.
 * Other parts of the application should import from here, not from
 * internal files directly.
 *
 * Architecture: Backend-driven model config (LibreChat pattern)
 *   - All tier DATA (model IDs, labels, credits, times, badges) lives
 *     on the backend in `src/modules/thumbnail/model-tiers.config.ts`.
 *   - The frontend fetches it via GET /api/thumbnails/ai/models.
 *   - This module exports ONLY types, utilities, hooks, and components.
 *   - Zero hardcoded model data.
 *
 * @example
 *   import {
 *     useModelTiers,
 *     ModelTierSelector,
 *     isTieredTool,
 *   } from '../features/ai-tools';
 */

// ============================================
// TYPES (re-exported for consumers)
// ============================================

export type {
  ModelTierId,
  ModelTier,
  TieredToolId,
  AIToolId,
  ToolTierConfig,
  TieredGenerateRequest,
  AIToolModelsResponse,
} from './types';

// ============================================
// HOOK (primary way to access tier data)
// ============================================

export { useModelTiers } from './hooks/useModelTiers';
export type { UseModelTiersReturn } from './hooks/useModelTiers';

// ============================================
// UTILITY FUNCTIONS (operate on fetched data)
// ============================================

export {
  isTieredTool,
  getToolTierConfig,
  getDefaultTier,
  getTierById,
  resolveModelId,
  getDefaultTierId,
} from './model-tiers';

// ============================================
// COMPONENTS
// ============================================

export { default as ModelTierSelector } from './components/ModelTierSelector';
