import { useMemo } from 'react';
import { featureFlags, FeatureFlags, isFeatureEnabled, getFeatureGroup } from '../config/featureFlags';

/**
 * React hook for accessing feature flags
 * 
 * Usage:
 * ```tsx
 * const { brandKit, isEnabled } = useFeatureFlags();
 * 
 * // Check specific feature
 * if (brandKit.aiGenerator) { ... }
 * 
 * // Or use helper
 * if (isEnabled('brandKit', 'aiGenerator')) { ... }
 * ```
 */
export function useFeatureFlags() {
  // Memoize to prevent unnecessary re-renders
  // In the future, this could fetch from API/context
  const flags = useMemo(() => featureFlags, []);

  return {
    /** All feature flags */
    flags,
    
    /** Brand Kit feature flags */
    brandKit: flags.brandKit,
    
    /** Check if a specific feature is enabled */
    isEnabled: isFeatureEnabled,
    
    /** Get all flags for a feature group */
    getGroup: getFeatureGroup,
  };
}

/**
 * Hook specifically for Brand Kit features
 */
export function useBrandKitFeatures() {
  const { brandKit } = useFeatureFlags();
  
  return {
    /** AI-powered brand generator available */
    canUseAiGenerator: brandKit.aiGenerator,
    
    /** URL import available */
    canUseUrlImport: brandKit.urlImport,
    
    /** Manual setup available */
    canUseManualSetup: brandKit.manualSetup,
    
    /** Check if any advanced feature is available */
    hasAdvancedFeatures: brandKit.aiGenerator || brandKit.urlImport,
  };
}

export default useFeatureFlags;
