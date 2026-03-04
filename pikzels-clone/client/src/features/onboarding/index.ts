/**
 * Onboarding Feature Module
 * 
 * Provides onboarding system for Grandma Test compliance.
 * Includes Quick Edit overlay, spotlight tooltips, and guided tours.
 * 
 * @module features/onboarding
 */

// Types
export type { 
  OnboardingPrefs, 
  UseOnboardingReturn, 
  QuickEditFlow, 
  TourStep,
  QuickEditOptionCardProps,
} from './types';
export { DEFAULT_ONBOARDING_PREFS } from './types';

// Hooks
export { useOnboarding } from './hooks/useOnboarding';

// Components
export { OnboardingOverlay } from './components/OnboardingOverlay';
export { QuickEditOptionCard } from './components/QuickEditOptionCard';
export { SpotlightTooltip } from './components/SpotlightTooltip';
export { GuidedTour } from './components/GuidedTour';
