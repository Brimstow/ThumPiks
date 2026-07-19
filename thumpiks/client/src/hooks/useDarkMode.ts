/**
 * useDarkMode
 * Manages light/dark/system mode with localStorage persistence.
 * Toggles the `dark` class on <html> which Tailwind's dark variant reads.
 */

import { useState, useEffect, useCallback } from 'react';

export type ColorMode = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'thumpiks-color-mode';

function applyMode(mode: ColorMode): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = mode === 'dark' || (mode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', shouldBeDark);
}

function getInitialMode(): ColorMode {
  const stored = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  return 'dark'; // default
}

export function useDarkMode() {
  const [mode, setModeState] = useState<ColorMode>(getInitialMode);

  // Apply on mount and whenever mode changes
  useEffect(() => {
    applyMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Re-apply when system preference changes (only matters for 'system' mode)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (mode === 'system') applyMode('system'); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ColorMode) => {
    setModeState(next);
  }, []);

  return { mode, setMode };
}

/**
 * Called once at app startup (before React renders) to prevent flash.
 */
export function initDarkMode(): void {
  const stored = localStorage.getItem(STORAGE_KEY) as ColorMode | null;
  const mode: ColorMode = stored === 'dark' || stored === 'light' || stored === 'system' ? stored : 'dark';
  applyMode(mode);
}
