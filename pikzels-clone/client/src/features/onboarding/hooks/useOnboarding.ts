/**
 * useOnboarding Hook
 * 
 * Manages onboarding state including Quick Edit overlay,
 * spotlight tooltips, and guided tours.
 */

import { useState, useCallback, useEffect } from 'react';
import type { OnboardingPrefs, UseOnboardingReturn } from '../types';
import { DEFAULT_ONBOARDING_PREFS } from '../types';

const STORAGE_KEY = 'thumpiks_onboarding_prefs';
const SESSION_DISMISSED_KEY = 'thumpiks_onboarding_session_dismissed';

/**
 * Read onboarding preferences from localStorage
 */
function getStoredPrefs(): OnboardingPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_ONBOARDING_PREFS, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parsing errors
  }
  return { ...DEFAULT_ONBOARDING_PREFS };
}

/**
 * Write onboarding preferences to localStorage
 */
function setStoredPrefs(prefs: OnboardingPrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // localStorage unavailable — silently fail
  }
}

/**
 * Check if overlay was dismissed this browser session (tab lifetime).
 * Resets automatically on new tab / login.
 */
function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SESSION_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Mark overlay as dismissed for this browser session only.
 */
function setDismissedThisSession(): void {
  try {
    sessionStorage.setItem(SESSION_DISMISSED_KEY, 'true');
  } catch {
    // sessionStorage unavailable — silently fail
  }
}

/**
 * Hook for managing onboarding state.
 * 
 * @example
 * const { shouldShowQuickEditOverlay, dismissOverlay } = useOnboarding();
 * 
 * if (shouldShowQuickEditOverlay) {
 *   return <OnboardingOverlay onDismiss={dismissOverlay} />;
 * }
 */
export function useOnboarding(): UseOnboardingReturn {
  const [prefs, setPrefs] = useState<OnboardingPrefs>(getStoredPrefs);
  const [sessionDismissed, setSessionDismissed] = useState(isDismissedThisSession);

  // Sync to localStorage when prefs change
  useEffect(() => {
    setStoredPrefs(prefs);
  }, [prefs]);

  // Calculate whether to show Quick Edit overlay
  // Show if: enabled in settings AND not permanently dismissed AND not dismissed this session
  const shouldShowQuickEditOverlay = 
    prefs.quickEditOverlayEnabled && 
    !prefs.quickEditOverlayDismissed &&
    !sessionDismissed;

  // Dismiss overlay
  const dismissOverlay = useCallback((permanent = false) => {
    if (permanent) {
      // "Don't show again" — persist to localStorage
      setPrefs(prev => ({
        ...prev,
        quickEditOverlaySeen: true,
        quickEditOverlayDismissed: true,
      }));
    } else {
      // Session-only dismiss — will reappear on next login/tab
      setDismissedThisSession();
      setSessionDismissed(true);
    }
  }, []);

  // Mark overlay as seen (first time view)
  const markOverlaySeen = useCallback(() => {
    setPrefs(prev => ({
      ...prev,
      quickEditOverlaySeen: true,
    }));
  }, []);

  // Check if tour should be shown
  const shouldShowTour = useCallback((page: 'dashboard' | 'editor') => {
    if (!prefs.tipsEnabled) return false;
    if (page === 'dashboard') return !prefs.dashboardTourSeen;
    if (page === 'editor') return !prefs.editorTourSeen;
    return false;
  }, [prefs.tipsEnabled, prefs.dashboardTourSeen, prefs.editorTourSeen]);

  // Mark tour as completed
  const markTourSeen = useCallback((page: 'dashboard' | 'editor') => {
    setPrefs(prev => ({
      ...prev,
      [page === 'dashboard' ? 'dashboardTourSeen' : 'editorTourSeen']: true,
    }));
  }, []);

  // Toggle tips enabled
  const setTipsEnabled = useCallback((enabled: boolean) => {
    setPrefs(prev => ({
      ...prev,
      tipsEnabled: enabled,
    }));
  }, []);

  // Get spotlight seen count
  const getSpotlightSeenCount = useCallback((id: string) => {
    return prefs.spotlights[id] ?? 0;
  }, [prefs.spotlights]);

  // Increment spotlight seen count
  const incrementSpotlightSeen = useCallback((id: string) => {
    setPrefs(prev => ({
      ...prev,
      spotlights: {
        ...prev.spotlights,
        [id]: (prev.spotlights[id] ?? 0) + 1,
      },
    }));
  }, []);

  // Dismiss spotlight permanently
  const dismissSpotlight = useCallback((id: string) => {
    setPrefs(prev => ({
      ...prev,
      spotlights: {
        ...prev.spotlights,
        [id]: 999, // High number indicates permanent dismissal
      },
    }));
  }, []);

  // Enable/disable Quick Edit overlay on startup
  const setQuickEditOverlayEnabled = useCallback((enabled: boolean) => {
    setPrefs(prev => ({
      ...prev,
      quickEditOverlayEnabled: enabled,
    }));
  }, []);

  // Reset all onboarding state
  const resetOnboarding = useCallback(() => {
    setPrefs({ ...DEFAULT_ONBOARDING_PREFS });
  }, []);

  return {
    prefs,
    shouldShowQuickEditOverlay,
    dismissOverlay,
    markOverlaySeen,
    shouldShowTour,
    markTourSeen,
    setTipsEnabled,
    getSpotlightSeenCount,
    incrementSpotlightSeen,
    dismissSpotlight,
    setQuickEditOverlayEnabled,
    resetOnboarding,
  };
}

export default useOnboarding;
