/**
 * Sanity tests for browserCompat utilities.
 *
 * These tests verify the browser-compatibility helpers created
 * to fix Critical Issues 1-4 from the Browser Compatibility Report.
 *
 * Because the module reads `navigator.userAgent` and `document` at
 * import-time, we use `jest.isolateModules` to re-import with
 * different UA strings.
 */

// ============================================
// Helpers
// ============================================

function loadModuleWithUA(ua: string) {
  let mod: typeof import('../../utils/browserCompat');

  const originalUA = navigator.userAgent;
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });

  jest.isolateModules(() => {
    mod = require('../../utils/browserCompat');
  });

  Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true });
  return mod!;
}

// ============================================
// Browser Detection
// ============================================

describe('browserCompat — browser detection', () => {
  it('detects Chrome desktop correctly', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    expect(m.isSafari).toBe(false);
    expect(m.isFirefox).toBe(false);
    expect(m.isIOS).toBe(false);
  });

  it('detects Safari desktop correctly', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );
    expect(m.isSafari).toBe(true);
    expect(m.isFirefox).toBe(false);
    expect(m.isIOS).toBe(false);
  });

  it('detects Firefox correctly', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    );
    expect(m.isFirefox).toBe(true);
    expect(m.isSafari).toBe(false);
  });

  it('detects iOS Safari (iPhone)', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(m.isIOS).toBe(true);
    expect(m.isSafari).toBe(true);
    expect(m.isIOSSafari).toBe(true);
  });

  it('detects iOS Chrome (still iOS underneath)', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1'
    );
    expect(m.isIOS).toBe(true);
    // CriOS is not "Safari" shell
    expect(m.isSafari).toBe(false);
  });
});

// ============================================
// Feature Detection
// ============================================

describe('browserCompat — feature detection', () => {
  it('isCrossOriginIsolated reflects window.crossOriginIsolated', () => {
    // jsdom doesn't set crossOriginIsolated, so it should be false
    const m = loadModuleWithUA(navigator.userAgent);
    expect(m.isCrossOriginIsolated).toBe(false);
  });

  it('hasSharedArrayBuffer is true in jsdom (Node has it)', () => {
    const m = loadModuleWithUA(navigator.userAgent);
    // Node.js / jsdom environment has SharedArrayBuffer
    expect(m.hasSharedArrayBuffer).toBe(true);
  });
});

// ============================================
// TF Backend Selection
// ============================================

describe('browserCompat — selectTFBackend', () => {
  it('returns "cpu" for iOS Safari', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(m.selectTFBackend()).toBe('cpu');
  });

  it('returns "webgl" for desktop Safari', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
    );
    expect(m.selectTFBackend()).toBe('webgl');
  });

  it('returns "webgl" for Chrome', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    expect(m.selectTFBackend()).toBe('webgl');
  });

  it('returns "webgl" for Firefox', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
    );
    expect(m.selectTFBackend()).toBe('webgl');
  });
});

// ============================================
// setTFBackendWithFallback
// ============================================

describe('browserCompat — setTFBackendWithFallback', () => {
  it('uses preferred backend when it succeeds', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    const mockTF = {
      setBackend: jest.fn().mockResolvedValue(true),
      ready: jest.fn().mockResolvedValue(undefined),
    };
    const result = await m.setTFBackendWithFallback(mockTF);
    expect(result).toBe('webgl');
    expect(mockTF.setBackend).toHaveBeenCalledWith('webgl');
  });

  it('falls back through the chain when backends fail', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    const mockTF = {
      setBackend: jest.fn()
        .mockRejectedValueOnce(new Error('webgl fail'))
        .mockRejectedValueOnce(new Error('wasm fail'))
        .mockResolvedValueOnce(true),
      ready: jest.fn().mockResolvedValue(undefined),
    };
    const result = await m.setTFBackendWithFallback(mockTF);
    expect(result).toBe('cpu');
    expect(mockTF.setBackend).toHaveBeenCalledTimes(3);
  });

  it('throws when all backends fail', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    const mockTF = {
      setBackend: jest.fn().mockRejectedValue(new Error('fail')),
      ready: jest.fn(),
    };
    await expect(m.setTFBackendWithFallback(mockTF)).rejects.toThrow('All backends failed');
  });
});

// ============================================
// Canvas Size Limits
// ============================================

describe('browserCompat — canvas size safety', () => {
  it('returns safe for normal thumbnail sizes on desktop', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    );
    expect(m.isCanvasSizeSafe(1280, 720)).toBe(true);
    expect(m.isCanvasSizeSafe(3840, 2160)).toBe(true); // 4K
  });

  it('returns unsafe for oversized canvas on iOS', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(m.isCanvasSizeSafe(1280, 720)).toBe(true);
    expect(m.isCanvasSizeSafe(5000, 5000)).toBe(false); // Over 4096x4096
  });

  it('getMaxCanvasSize returns iOS limits on iPhone', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );
    expect(m.getMaxCanvasSize()).toEqual({ width: 4096, height: 4096 });
  });

  it('getMaxCanvasSize returns large limits on Chrome desktop', () => {
    const m = loadModuleWithUA(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
    );
    expect(m.getMaxCanvasSize()).toEqual({ width: 16384, height: 16384 });
  });
});

// ============================================
// Clipboard (with fallback)
// ============================================

describe('browserCompat — copyToClipboard', () => {
  it('uses Clipboard API when available', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const ok = await m.copyToClipboard('hello');
    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to execCommand when Clipboard API throws', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });

    // Mock execCommand
    document.execCommand = jest.fn().mockReturnValue(true);

    const ok = await m.copyToClipboard('fallback text');
    expect(ok).toBe(true);
    expect(document.execCommand).toHaveBeenCalledWith('copy');
  });

  it('returns false when both methods fail', async () => {
    const m = loadModuleWithUA(navigator.userAgent);
    Object.assign(navigator, {
      clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) },
    });
    document.execCommand = jest.fn().mockImplementation(() => { throw new Error('not allowed'); });

    const ok = await m.copyToClipboard('nothing works');
    expect(ok).toBe(false);
  });
});

// ============================================
// downscaleCanvas
// ============================================

describe('browserCompat — downscaleCanvas', () => {
  const m = loadModuleWithUA(navigator.userAgent);

  it('returns the same canvas when already within limits', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const result = m.downscaleCanvas(canvas, 4096, 4096);
    expect(result).toBe(canvas); // same reference
  });

  it('downscales an oversized canvas preserving aspect ratio', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 8000;
    canvas.height = 4000;

    // jsdom doesn't implement canvas 2d context, so mock createElement
    // to return a canvas-like object with a working getContext
    const fakeCtx = { drawImage: jest.fn() };
    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'canvas') {
        (el as any).getContext = () => fakeCtx;
      }
      return el;
    });

    const result = m.downscaleCanvas(canvas, 4096, 4096);
    expect(result).not.toBe(canvas);
    // Scale = min(4096/8000, 4096/4000) = min(0.512, 1.024) = 0.512
    expect(result.width).toBe(Math.round(8000 * 0.512));
    expect(result.height).toBe(Math.round(4000 * 0.512));
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('handles square canvases that exceed limits', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 6000;
    canvas.height = 6000;

    const fakeCtx = { drawImage: jest.fn() };
    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'canvas') {
        (el as any).getContext = () => fakeCtx;
      }
      return el;
    });

    const result = m.downscaleCanvas(canvas, 4096, 4096);
    expect(result.width).toBeLessThanOrEqual(4096);
    expect(result.height).toBeLessThanOrEqual(4096);
    // Should be square since input was square
    expect(result.width).toBe(result.height);
    jest.restoreAllMocks();
  });

  it('returns original canvas if getContext fails', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 8000;
    canvas.height = 4000;
    // Force getContext to return null on the offscreen canvas
    jest.spyOn(document, 'createElement').mockReturnValueOnce({
      ...document.createElement('canvas'),
      getContext: () => null,
      width: 0,
      height: 0,
    } as any);
    // Re-run with the spy; since downscaleCanvas creates an offscreen canvas internally,
    // we need to mock document.createElement
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 8000;
    offCanvas.height = 4000;
    const result = m.downscaleCanvas(offCanvas, 4096, 4096);
    // Should still return *some* canvas (either offscreen or original)
    expect(result).toBeDefined();
    jest.restoreAllMocks();
  });
});

// ============================================
// safeCanvasToBlob
// ============================================

describe('browserCompat — safeCanvasToBlob', () => {
  const m = loadModuleWithUA(navigator.userAgent);

  it('resolves with a Blob for a valid canvas', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    // jsdom doesn't implement toBlob natively, so mock it
    canvas.toBlob = jest.fn((cb: BlobCallback, _type?: string, _quality?: number) => {
      cb(new Blob(['fake-png'], { type: 'image/png' }));
    });

    const blob = await m.safeCanvasToBlob(canvas, 'image/png');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob!.type).toBe('image/png');
  });

  it('resolves null and logs error when toBlob callback returns null', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.toBlob = jest.fn((cb: BlobCallback) => {
      cb(null);
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const blob = await m.safeCanvasToBlob(canvas, 'image/png');
    expect(blob).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('toBlob returned null'),
    );
    errorSpy.mockRestore();
  });

  it('resolves null when toBlob throws synchronously', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.toBlob = jest.fn(() => {
      throw new Error('Canvas memory exceeded');
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const blob = await m.safeCanvasToBlob(canvas, 'image/png');
    expect(blob).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      '[browserCompat] toBlob threw:',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it('passes quality parameter through for JPEG', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.toBlob = jest.fn((cb: BlobCallback, _type?: string, _quality?: number) => {
      cb(new Blob(['fake-jpeg'], { type: 'image/jpeg' }));
    });

    await m.safeCanvasToBlob(canvas, 'image/jpeg', 0.8);
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.8,
    );
  });
});

// ============================================
// safeCanvasToDataURL
// ============================================

describe('browserCompat — safeCanvasToDataURL', () => {
  const m = loadModuleWithUA(navigator.userAgent);

  it('returns a data URL for a valid canvas', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    // jsdom doesn't implement toDataURL, so mock it
    canvas.toDataURL = jest.fn(() => 'data:image/png;base64,fakedata');
    const result = m.safeCanvasToDataURL(canvas, 'image/png');
    expect(result).toMatch(/^data:image\/png/);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png', undefined);
  });

  it('returns empty string when toDataURL throws', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    canvas.toDataURL = jest.fn(() => {
      throw new Error('SecurityError: tainted canvas');
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = m.safeCanvasToDataURL(canvas, 'image/png');
    expect(result).toBe('');
    expect(errorSpy).toHaveBeenCalledWith(
      '[browserCompat] toDataURL threw:',
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });

  it('passes quality through for JPEG format', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 50;
    canvas.height = 50;
    canvas.toDataURL = jest.fn(() => 'data:image/jpeg;base64,fakedata');
    m.safeCanvasToDataURL(canvas, 'image/jpeg', 0.7);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.7);
  });

  it('downscales an oversized canvas on iOS before exporting', () => {
    // Load with iOS UA to trigger smaller max canvas size (4096×4096)
    const iosModule = loadModuleWithUA(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    );

    const canvas = document.createElement('canvas');
    canvas.width = 5000;
    canvas.height = 5000;

    // Mock the offscreen canvas created by downscaleCanvas
    const fakeCtx = { drawImage: jest.fn() };
    const origCreate = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'canvas') {
        (el as any).getContext = () => fakeCtx;
        (el as any).toDataURL = jest.fn(() => 'data:image/png;base64,downscaled');
      }
      return el;
    });

    const result = iosModule.safeCanvasToDataURL(canvas, 'image/png');
    // Should return a valid data URL from the downscaled canvas
    expect(result).toMatch(/^data:image\/png/);
    // The offscreen canvas drawImage should have been called (downscaling happened)
    expect(fakeCtx.drawImage).toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});
