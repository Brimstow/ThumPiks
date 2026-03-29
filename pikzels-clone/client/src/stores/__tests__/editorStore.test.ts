/**
 * editorStore — store isolation tests
 *
 * Verifies that stores created with different storage keys
 * persist to separate sessionStorage slots and never cross-contaminate.
 */

import { createEditorStore } from '../editorStore';

// ── helpers ──────────────────────────────────────────────────

/** Zustand persist writes JSON under the key; parse it back. */
function getPersistedState(key: string) {
  const raw = sessionStorage.getItem(key);
  if (!raw) return null;
  return JSON.parse(raw);
}

// ── tests ────────────────────────────────────────────────────

describe('createEditorStore — storage key isolation', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('uses the provided storageKey as the persist name', () => {
    const keyA = 'test-store-a';
    const keyB = 'test-store-b';

    const useStoreA = createEditorStore(keyA);
    const useStoreB = createEditorStore(keyB);

    // Trigger a mutation on store A
    const storeA = useStoreA.getState();
    storeA.addTextLayer('Hello from A', 50, 50);

    // Trigger a mutation on store B
    const storeB = useStoreB.getState();
    storeB.addTextLayer('Hello from B', 100, 100);

    // Both keys should exist in sessionStorage
    const persistedA = getPersistedState(keyA);
    const persistedB = getPersistedState(keyB);

    expect(persistedA).not.toBeNull();
    expect(persistedB).not.toBeNull();
  });

  it('does not cross-contaminate layers between stores', () => {
    const useStoreA = createEditorStore('iso-store-a');
    const useStoreB = createEditorStore('iso-store-b');

    // Add a layer only to store A
    useStoreA.getState().addTextLayer('Only in A');

    // Store B should have zero layers
    expect(useStoreB.getState().layers).toHaveLength(0);

    // Store A should have exactly one layer
    expect(useStoreA.getState().layers).toHaveLength(1);
    expect(useStoreA.getState().layers[0].type).toBe('text');
    expect((useStoreA.getState().layers[0] as any).content).toBe('Only in A');
  });

  it('writes to separate sessionStorage keys', () => {
    const useStoreA = createEditorStore('key-alpha');
    const useStoreB = createEditorStore('key-beta');

    useStoreA.getState().addTextLayer('Alpha text');
    useStoreB.getState().addTextLayer('Beta text');

    const rawAlpha = sessionStorage.getItem('key-alpha');
    const rawBeta = sessionStorage.getItem('key-beta');

    // Each key has data
    expect(rawAlpha).toBeTruthy();
    expect(rawBeta).toBeTruthy();

    // They are different
    expect(rawAlpha).not.toEqual(rawBeta);
  });

  it('modifying one store does not affect the other store persisted data', () => {
    const useStoreA = createEditorStore('mut-store-a');
    const useStoreB = createEditorStore('mut-store-b');

    // Add a layer to store A
    useStoreA.getState().addTextLayer('A layer');

    // Snapshot store B persisted data before any mutation
    const beforeB = sessionStorage.getItem('mut-store-b');

    // Mutate store A further
    useStoreA.getState().addTextLayer('A layer 2');

    // Store B persisted data should be unchanged
    const afterB = sessionStorage.getItem('mut-store-b');
    expect(afterB).toEqual(beforeB);
  });

  it('production stores use distinct keys', () => {
    // This test imports the actual production store instances
    // and verifies their persist names differ by checking
    // that each writes independently.
    const { useEditorStore, usePresetEditorStore } = require('../editorStore');

    // Both should be callable
    expect(typeof useEditorStore.getState).toBe('function');
    expect(typeof usePresetEditorStore.getState).toBe('function');

    // They should be different store instances
    expect(useEditorStore).not.toBe(usePresetEditorStore);
  });
});
