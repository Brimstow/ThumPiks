/**
 * Sanity tests for Medium-severity browser compatibility fixes (Issues 10-15).
 *
 * Tests cover:
 * - Medium 11: overscroll-behavior-x + touch-action CSS for iOS Safari
 * - Medium 12: IE dead code removal (msMaxTouchPoints)
 * - Medium 13: Graceful Worker module→classic fallback
 * - Medium 15: prefers-reduced-motion for AnimatedBackground
 */

import fs from 'fs';
import path from 'path';

// ============================================
// Medium 11: overscroll-behavior-x CSS fix
// ============================================

describe('Medium 11 — overscroll-behavior-x iOS Safari CSS', () => {
  const cssPath = path.resolve(__dirname, '../../index.css');
  let cssContent: string;

  beforeAll(() => {
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  });

  it('has overscroll-behavior-x: none on body', () => {
    expect(cssContent).toContain('overscroll-behavior-x: none');
  });

  it('has touch-action to prevent horizontal swipe nav', () => {
    expect(cssContent).toMatch(/touch-action:\s*pan-y/);
  });

  it('has -webkit-overflow-scrolling for older iOS', () => {
    expect(cssContent).toContain('-webkit-overflow-scrolling: touch');
  });
});

// ============================================
// Medium 12: IE dead code removal
// ============================================

describe('Medium 12 — msMaxTouchPoints IE dead code removed', () => {
  const hookPath = path.resolve(__dirname, '../../hooks/useDeviceDetection.ts');
  let hookContent: string;

  beforeAll(() => {
    hookContent = fs.readFileSync(hookPath, 'utf-8');
  });

  it('does NOT reference msMaxTouchPoints', () => {
    expect(hookContent).not.toContain('msMaxTouchPoints');
  });

  it('does NOT have IE-specific @ts-expect-error', () => {
    expect(hookContent).not.toContain('@ts-expect-error - msMaxTouchPoints');
  });

  it('still checks maxTouchPoints (standard API)', () => {
    expect(hookContent).toContain('navigator.maxTouchPoints');
  });

  it('still checks ontouchstart (standard API)', () => {
    expect(hookContent).toContain("'ontouchstart' in window");
  });
});

// ============================================
// Medium 13: Worker module→classic fallback
// ============================================

describe('Medium 13 — useAIWorker graceful Worker fallback', () => {
  const workerHookPath = path.resolve(__dirname, '../../hooks/useAIWorker.ts');
  let workerHookContent: string;

  beforeAll(() => {
    workerHookContent = fs.readFileSync(workerHookPath, 'utf-8');
  });

  it('creates Worker with type: module as first attempt', () => {
    expect(workerHookContent).toContain("{ type: 'module' }");
  });

  it('has a catch block that falls back to classic worker', () => {
    // Should have a try/catch around the module worker that creates a new Worker without type
    expect(workerHookContent).toContain('Module worker failed, trying classic worker');
  });

  it('catches moduleErr in the inner try/catch', () => {
    // Verify the two-level try-catch structure exists
    const moduleWorkerTry = workerHookContent.indexOf("{ type: 'module' }");
    const fallbackCatch = workerHookContent.indexOf('moduleErr');
    expect(moduleWorkerTry).toBeGreaterThan(-1);
    expect(fallbackCatch).toBeGreaterThan(moduleWorkerTry);
  });

  it('still has the outer try/catch for total failure', () => {
    expect(workerHookContent).toContain('Failed to create worker');
  });
});

// ============================================
// Medium 15: prefers-reduced-motion + GPU hints
// ============================================

describe('Medium 15 — AnimatedBackground Safari perf + reduced motion', () => {
  const bgPath = path.resolve(
    __dirname,
    '../../components/AnimatedBackground.tsx'
  );
  let bgContent: string;

  beforeAll(() => {
    bgContent = fs.readFileSync(bgPath, 'utf-8');
  });

  it('checks prefers-reduced-motion media query', () => {
    expect(bgContent).toContain('prefers-reduced-motion: reduce');
  });

  it('disables rendering when prefersReducedMotion is true', () => {
    expect(bgContent).toContain('!prefersReducedMotion');
  });

  it('applies will-change: transform for GPU compositing', () => {
    expect(bgContent).toContain("willChange: 'transform'");
  });

  it('uses translateZ(0) to force Safari GPU layer', () => {
    expect(bgContent).toContain("transform: 'translateZ(0)'");
  });

  it('already disables on mobile devices', () => {
    // Existing behavior — verify it's preserved
    expect(bgContent).toContain('shouldRender: false');
    expect(bgContent).toContain('isMobile');
  });
});
