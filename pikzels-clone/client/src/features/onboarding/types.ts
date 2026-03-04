/**
 * Onboarding Types
 * 
 * Defines the onboarding system for Grandma Test compliance.
 * Includes Quick Edit overlay, spotlight tooltips, and guided tours.
 */

/** Quick Edit creation flow types */
export type QuickEditFlow = 'url-input' | 'ai-generate' | 'upload';

/** Onboarding preferences stored in localStorage */
export interface OnboardingPrefs {
  /** Whether the Quick Edit overlay has been seen */
  quickEditOverlaySeen: boolean;
  /** Whether user permanently dismissed the overlay */
  quickEditOverlayDismissed: boolean;
  /** Whether dashboard tour has been completed */
  dashboardTourSeen: boolean;
  /** Whether editor tour has been completed */
  editorTourSeen: boolean;
  /** Whether tips/spotlights are enabled */
  tipsEnabled: boolean;
  /** Map of spotlight IDs to their seen count */
  spotlights: Record<string, number>;
}

/** Default onboarding preferences */
export const DEFAULT_ONBOARDING_PREFS: OnboardingPrefs = {
  quickEditOverlaySeen: false,
  quickEditOverlayDismissed: false,
  dashboardTourSeen: false,
  editorTourSeen: false,
  tipsEnabled: true,
  spotlights: {},
};

/** Tour step definition */
export interface TourStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Step body text */
  body: string;
  /** Tooltip placement relative to target */
  placement: 'top' | 'bottom' | 'left' | 'right';
  /** CSS selector for target element */
  targetSelector: string;
}

/** Hook return type */
export interface UseOnboardingReturn {
  /** Current preferences */
  prefs: OnboardingPrefs;
  /** Whether to show Quick Edit overlay */
  shouldShowQuickEditOverlay: boolean;
  /** Dismiss the overlay (optionally permanently) */
  dismissOverlay: (permanent?: boolean) => void;
  /** Mark overlay as seen (first time) */
  markOverlaySeen: () => void;
  /** Whether to show tour for given page */
  shouldShowTour: (page: 'dashboard' | 'editor') => boolean;
  /** Mark tour as completed */
  markTourSeen: (page: 'dashboard' | 'editor') => void;
  /** Update tips enabled setting */
  setTipsEnabled: (enabled: boolean) => void;
  /** Get spotlight seen count */
  getSpotlightSeenCount: (id: string) => number;
  /** Increment spotlight seen count */
  incrementSpotlightSeen: (id: string) => void;
  /** Dismiss spotlight permanently */
  dismissSpotlight: (id: string) => void;
}

/** Props for QuickEditOptionCard */
export interface QuickEditOptionCardProps {
  /** Icon component */
  icon: React.ReactNode;
  /** Card title */
  title: string;
  /** Card subtitle/description */
  subtitle: string;
  /** Accent color theme */
  accentColor: 'purple' | 'amber' | 'emerald';
  /** Click handler */
  onClick: () => void;
}
