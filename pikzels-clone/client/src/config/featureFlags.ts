/**
 * Feature Flags Configuration
 * 
 * Controls feature visibility across the application.
 * These can later be:
 * - Stored in database (per-user flags for beta testers)
 * - Controlled via admin panel
 * - Environment variable based
 */

export interface FeatureFlags {
  brandKit: {
    /** AI-powered brand identity generator (Looka-style questionnaire) */
    aiGenerator: boolean;
    /** Import brand assets from website URL */
    urlImport: boolean;
    /** Manual step-by-step brand kit setup */
    manualSetup: boolean;
  };
  feedback: {
    /** Hotjar-style right-edge feedback tab */
    sideTab: boolean;
  };
  globalChat: {
    /** Global AI chatbot widget on all dashboard pages */
    enabled: boolean;
  };
}

/**
 * Default feature flags configuration
 * 
 * To enable a feature for testing, set it to true here.
 * In production, this could be fetched from an API or environment variables.
 */
export const featureFlags: FeatureFlags = {
  brandKit: {
    aiGenerator: false,  // Coming soon - AI brand generation wizard
    urlImport: false,    // Coming soon - Extract brand from website URL
    manualSetup: false,  // Coming soon - Manual brand kit setup
  },
  feedback: {
    sideTab: true,       // Hotjar-style right-edge feedback tab
  },
  globalChat: {
    enabled: true,       // Global AI chatbot widget
  },
};

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(
  group: keyof FeatureFlags,
  feature: string
): boolean {
  const groupFlags = featureFlags[group];
  if (!groupFlags) return false;
  return (groupFlags as Record<string, boolean>)[feature] ?? false;
}

/**
 * Get all flags for a feature group
 */
export function getFeatureGroup<K extends keyof FeatureFlags>(
  group: K
): FeatureFlags[K] {
  return featureFlags[group];
}
