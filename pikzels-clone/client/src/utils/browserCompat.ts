/**
 * Browser Compatibility Utilities
 * Shared detection for Safari, iOS, Firefox, and feature support.
 * Used by TensorFlow.js provider, FFmpeg video service, clipboard helpers, etc.
 */

// ============================================
// BROWSER DETECTION
// ============================================

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

/** True on any iOS device (iPhone, iPad, iPod) */
export const isIOS = /iPad|iPhone|iPod/.test(ua) ||
  (ua.includes('Mac') && 'ontouchend' in document);

/** True on Safari (desktop or mobile), false on Chrome/Firefox/Edge */
export const isSafari = /^((?!chrome|android|crios|fxios|edgios|opr\/).)*safari/i.test(ua);

/** True on any Firefox variant */
export const isFirefox = /firefox|fxios/i.test(ua);

/** True on iOS Safari specifically (all iOS browsers are WebKit, but this detects the Safari shell) */
export const isIOSSafari = isIOS && isSafari;

// ============================================
// FEATURE DETECTION
// ============================================

/** True when COOP/COEP headers are active and SharedArrayBuffer is available */
export const isCrossOriginIsolated =
  typeof window !== 'undefined' && !!window.crossOriginIsolated;

/** True when SharedArrayBuffer is defined (requires cross-origin isolation in modern browsers) */
export const hasSharedArrayBuffer =
  typeof SharedArrayBuffer !== 'undefined';

/** True when OffscreenCanvas is supported (needed for WebGL in Web Workers) */
export const hasOffscreenCanvas =
  typeof OffscreenCanvas !== 'undefined';

// ============================================
// TENSORFLOW.js BACKEND SELECTION
// ============================================

/**
 * Pick the best TensorFlow.js backend for the current browser.
 *
 * Priority:
 *   Chrome/Edge/Firefox desktop → webgl (fast, well-supported)
 *   Safari desktop              → webgl (try), fallback wasm → cpu
 *   iOS Safari                  → cpu (WebGL hangs on iOS Safari)
 *   Unknown                     → webgl → wasm → cpu
 *
 * Returns the backend name string that tf.setBackend() accepts.
 */
export function selectTFBackend(): 'webgl' | 'wasm' | 'cpu' {
  if (isIOSSafari || isIOS) {
    // iOS Safari: WebGL backend hangs; WASM may also have issues.
    // CPU is slow but reliable.
    return 'cpu';
  }

  if (isSafari) {
    // Desktop Safari: WebGL works in most cases (Safari 17.5+),
    // but older Safari has OffscreenCanvas / WebGL-in-worker bugs.
    // Default to webgl; caller should catch errors and retry with wasm/cpu.
    return 'webgl';
  }

  // Chrome, Firefox, Edge — webgl is the fast default
  return 'webgl';
}

/**
 * Attempt to set the TF.js backend with an automatic fallback chain.
 * Returns the backend that was successfully set.
 */
export async function setTFBackendWithFallback(
  tf: { setBackend: (b: string) => Promise<boolean>; ready: () => Promise<void> }
): Promise<string> {
  const preferred = selectTFBackend();
  const fallbackChain: string[] =
    preferred === 'cpu'
      ? ['cpu']
      : preferred === 'wasm'
        ? ['wasm', 'cpu']
        : ['webgl', 'wasm', 'cpu'];

  for (const backend of fallbackChain) {
    try {
      const success = await tf.setBackend(backend);
      if (success) {
        await tf.ready();
        console.log(`[TF.js] Backend set: ${backend}`);
        return backend;
      }
    } catch (err) {
      console.warn(`[TF.js] Backend "${backend}" failed, trying next...`, err);
    }
  }

  throw new Error('[TF.js] All backends failed to initialize');
}

// ============================================
// CANVAS LIMITS
// ============================================

/** Maximum canvas dimensions for the current platform */
export function getMaxCanvasSize(): { width: number; height: number } {
  if (isIOS) return { width: 4096, height: 4096 };       // ~16 MP
  if (isSafari) return { width: 8192, height: 8192 };    // Desktop Safari
  return { width: 16384, height: 16384 };                 // Chrome/Firefox
}

/**
 * Check if a canvas size is safe for the current browser.
 * Returns true if within limits, false if oversized.
 */
export function isCanvasSizeSafe(width: number, height: number): boolean {
  const max = getMaxCanvasSize();
  return width <= max.width && height <= max.height && width * height <= max.width * max.height;
}

// ============================================
// CLIPBOARD (with fallback)
// ============================================

/**
 * Copy text to clipboard with fallback for Firefox permissions / older browsers.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Modern Clipboard API
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Permission denied or document not focused — fall through to legacy
    }
  }

  // Legacy fallback (execCommand)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

// ============================================
// Safe Canvas Export (iOS Safari memory guard)
// ============================================

/**
 * Downscale a canvas to fit within maxWidth × maxHeight while
 * preserving aspect ratio. Returns the original canvas if
 * already within limits.
 */
export function downscaleCanvas(
  canvas: HTMLCanvasElement,
  maxWidth: number,
  maxHeight: number,
): HTMLCanvasElement {
  if (canvas.width <= maxWidth && canvas.height <= maxHeight) return canvas;

  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const offscreen = document.createElement('canvas');
  offscreen.width = Math.round(canvas.width * scale);
  offscreen.height = Math.round(canvas.height * scale);
  const ctx = offscreen.getContext('2d');
  if (!ctx) return canvas; // cannot downscale, return original
  ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
  return offscreen;
}

/**
 * Safe wrapper around canvas.toBlob that:
 * 1. Validates canvas size against platform limits
 * 2. Downscales if oversized (iOS Safari 4096×4096 limit)
 * 3. Returns null with a console.error if toBlob still fails
 */
export function safeCanvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): Promise<Blob | null> {
  const { width: maxW, height: maxH } = getMaxCanvasSize();
  const safeCanvas = downscaleCanvas(canvas, maxW, maxH);

  return new Promise((resolve) => {
    try {
      safeCanvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error(
              `[browserCompat] toBlob returned null (canvas ${safeCanvas.width}×${safeCanvas.height}, type=${type})`,
            );
          }
          resolve(blob);
        },
        type,
        quality,
      );
    } catch (err) {
      console.error('[browserCompat] toBlob threw:', err);
      resolve(null);
    }
  });
}

/**
 * Safe wrapper around canvas.toDataURL that:
 * 1. Validates canvas size against platform limits
 * 2. Downscales if oversized
 * 3. Returns empty string on failure instead of crashing
 */
export function safeCanvasToDataURL(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality?: number,
): string {
  const { width: maxW, height: maxH } = getMaxCanvasSize();
  const safeCanvas = downscaleCanvas(canvas, maxW, maxH);

  try {
    return safeCanvas.toDataURL(type, quality);
  } catch (err) {
    console.error('[browserCompat] toDataURL threw:', err);
    return '';
  }
}
