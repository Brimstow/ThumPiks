/**
 * useModelTiers Hook — Fetches tier config from the backend API
 *
 * This hook is the frontend's gateway to the backend single source of truth
 * for model tier configurations. It fetches from GET /api/thumbnails/ai/models
 * (already cached for 1 hour on the backend via cacheMiddleware).
 *
 * Pattern: LibreChat's server-config-driven approach — the backend owns all
 * tier metadata (model IDs, labels, credits, times, badges). The frontend
 * renders whatever the backend returns. Zero hardcoded model data here.
 *
 * Usage:
 *   const { tiers, tieredToolIds, isLoading, error, isTiered } = useModelTiers();
 *
 *   // Check if current tool supports tiers
 *   if (isTiered('generate')) { ... }
 *
 *   // Get tier config for a tool
 *   const generateConfig = tiers?.generate;
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { authGet } from '../../../utils/api';
import type {
  ModelTierId,
  TieredToolId,
  ModelTier,
  ToolTierConfig,
  AIToolModelsResponse,
} from '../types';

// ============================================
// TYPES
// ============================================

export interface UseModelTiersReturn {
  /** Per-tool tier configurations (null while loading) */
  tiers: Record<string, ToolTierConfig> | null;

  /** List of tool IDs that support tier selection */
  tieredToolIds: string[];

  /** Whether the AI service is configured on the backend */
  configured: boolean;

  /** Whether the initial fetch is in progress */
  isLoading: boolean;

  /** Error message if the fetch failed */
  error: string | null;

  /** Check if a tool supports tier selection */
  isTiered: (toolId: string) => boolean;

  /** Get tier config for a specific tool */
  getConfig: (toolId: string) => ToolTierConfig | null;

  /** Get the default tier for a tool */
  getDefault: (toolId: string) => ModelTier | null;

  /** Get the default tier ID for a tool (safe fallback to 'standard') */
  getDefaultId: (toolId: string) => ModelTierId;

  /** Resolve a tier selection to a model ID */
  resolveModel: (toolId: string, tierId?: ModelTierId) => string | null;

  /** Force a refetch of the tier config */
  refetch: () => void;
}

// ============================================
// MODULE-LEVEL CACHE
// ============================================

/**
 * Module-level cache so multiple components mounting simultaneously
 * don't trigger duplicate fetches. Shared across all hook instances.
 *
 * The backend already caches this endpoint for 1 hour (cacheMiddleware).
 * This client-side cache prevents redundant network calls within a
 * single page session (e.g., navigating between tools).
 */
let cachedResponse: AIToolModelsResponse | null = null;
let cacheTimestamp = 0;
const CLIENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes client-side

/** In-flight fetch promise to deduplicate concurrent requests */
let inflightPromise: Promise<AIToolModelsResponse> | null = null;

// ============================================
// FETCH FUNCTION
// ============================================

async function fetchTierConfig(): Promise<AIToolModelsResponse> {
  // Return cached if fresh
  const now = Date.now();
  if (cachedResponse && now - cacheTimestamp < CLIENT_CACHE_TTL_MS) {
    return cachedResponse;
  }

  // Deduplicate concurrent requests
  if (inflightPromise) {
    return inflightPromise;
  }

  inflightPromise = (async () => {
    try {
      const response = await authGet('/api/thumbnails/ai/models');

      if (!response.ok) {
        throw new Error(
          `Failed to fetch model tiers (${response.status})`
        );
      }

      const data: AIToolModelsResponse = await response.json();

      // Update module-level cache
      cachedResponse = data;
      cacheTimestamp = Date.now();

      return data;
    } finally {
      inflightPromise = null;
    }
  })();

  return inflightPromise;
}

// ============================================
// HOOK
// ============================================

export function useModelTiers(): UseModelTiersReturn {
  // Initialize from cache if available (handles React StrictMode re-mounts)
  const [tiers, setTiers] = useState<Record<string, ToolTierConfig> | null>(
    () => cachedResponse?.tiers ?? null
  );
  const [tieredToolIds, setTieredToolIds] = useState<string[]>(
    () => cachedResponse?.tieredToolIds ?? []
  );
  const [configured, setConfigured] = useState<boolean>(
    () => cachedResponse?.configured ?? false
  );
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedResponse);
  const [error, setError] = useState<string | null>(null);

  // On mount, if cache was populated but state is stale, sync it
  useEffect(() => {
    if (cachedResponse && !tiers) {
      setTiers(cachedResponse.tiers);
      setTieredToolIds(cachedResponse.tieredToolIds ?? []);
      setConfigured(cachedResponse.configured);
      setIsLoading(false);
    }
  }, []);  

  // Track mounted state to prevent state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    // Reset to true on mount (handles React StrictMode re-mounts)
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch on mount
  const loadTiers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchTierConfig();
      if (mountedRef.current) {
        setTiers(data.tiers);
        setTieredToolIds(data.tieredToolIds ?? []);
        setConfigured(data.configured);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message =
          err instanceof Error ? err.message : 'Failed to load model tiers';
        setError(message);
        console.error('[useModelTiers] Fetch failed:', message);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTiers();
  }, [loadTiers]);

  // ============================================
  // DERIVED HELPERS (memoized via useCallback)
  // ============================================

  const isTiered = useCallback(
    (toolId: string): boolean => {
      if (tieredToolIds.length > 0) {
        return tieredToolIds.includes(toolId);
      }
      // Fallback: check if tiers map has this tool
      return tiers != null && toolId in tiers;
    },
    [tieredToolIds, tiers]
  );

  const getConfig = useCallback(
    (toolId: string): ToolTierConfig | null => {
      if (!tiers || !tiers[toolId]) return null;
      return tiers[toolId];
    },
    [tiers]
  );

  const getDefault = useCallback(
    (toolId: string): ModelTier | null => {
      const cfg = tiers?.[toolId];
      if (!cfg) return null;
      return (
        cfg.tiers.find(t => t.id === cfg.defaultTierId) ??
        cfg.tiers[0] ??
        null
      );
    },
    [tiers]
  );

  const getDefaultId = useCallback(
    (toolId: string): ModelTierId => {
      const cfg = tiers?.[toolId];
      if (!cfg) return 'standard';
      return cfg.defaultTierId;
    },
    [tiers]
  );

  const resolveModel = useCallback(
    (toolId: string, tierId?: ModelTierId): string | null => {
      const cfg = tiers?.[toolId];
      if (!cfg) return null;

      if (tierId) {
        const tier = cfg.tiers.find(t => t.id === tierId);
        if (tier) return tier.modelId;
      }

      // Fall back to default
      const defaultTier =
        cfg.tiers.find(t => t.id === cfg.defaultTierId) ?? cfg.tiers[0];
      return defaultTier?.modelId ?? null;
    },
    [tiers]
  );

  const refetch = useCallback(() => {
    // Invalidate cache and re-fetch
    cachedResponse = null;
    cacheTimestamp = 0;
    loadTiers();
  }, [loadTiers]);

  return {
    tiers,
    tieredToolIds,
    configured,
    isLoading,
    error,
    isTiered,
    getConfig,
    getDefault,
    getDefaultId,
    resolveModel,
    refetch,
  };
}

export default useModelTiers;
