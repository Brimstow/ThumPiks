import type { PersistedState } from './types';

const SESSION_KEY = 'quickedit_state';

export function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<PersistedState>;
  } catch {
    return {};
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    // Skip saving if frames contain large base64 data (>2MB total)
    const framesSize = JSON.stringify(state.videoFrames).length;
    const toSave: PersistedState =
      framesSize > 2_000_000 ? { ...state, videoFrames: [] } : state;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(toSave));
  } catch {
    // sessionStorage full — silently fail
  }
}
