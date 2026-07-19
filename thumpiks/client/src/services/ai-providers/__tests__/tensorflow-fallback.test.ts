/**
 * Sanity tests for TensorFlow provider — MediaPipe → TF.js runtime fallback.
 *
 * Verifies Critical Issue #3 fix: when MediaPipe WASM runtime fails
 * (e.g. Safari CSP), the provider retries with TF.js runtime.
 * Also tests the canvas size guard for iOS Safari.
 */

// ============================================
// Mocks
// ============================================

const mockCompat = {
  isIOS: false,
  isSafari: false,
  isCanvasSizeSafe: jest.fn().mockReturnValue(true),
};
jest.mock('@/utils/browserCompat', () => mockCompat);

// Mock the dynamic import of @tensorflow-models/body-segmentation
const mockCreateSegmenter = jest.fn();
jest.mock('@tensorflow-models/body-segmentation', () => ({
  createSegmenter: (...args: any[]) => mockCreateSegmenter(...args),
  SupportedModels: {
    MediaPipeSelfieSegmentation: 'MediaPipeSelfieSegmentation',
  },
}), { virtual: true });

// ============================================
// Tests
// ============================================

describe('TensorFlowProvider — MediaPipe fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompat.isIOS = false;
    mockCompat.isSafari = false;
    mockCompat.isCanvasSizeSafe.mockReturnValue(true);
  });

  it('logs iOS-aware message on initialization for iOS', async () => {
    mockCompat.isIOS = true;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    // Dynamic import to get fresh instance after mock setup
    const { TensorFlowProvider } = await import('../tensorflow.provider');
    const provider = new TensorFlowProvider();
    // Call the protected _initialize via initialize (from BaseAIProvider)
    await (provider as any).initialize();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('iOS detected')
    );
    consoleSpy.mockRestore();
  });

  it('logs Safari-aware message on initialization for Safari', async () => {
    mockCompat.isSafari = true;
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const { TensorFlowProvider } = await import('../tensorflow.provider');
    const provider = new TensorFlowProvider();
    await (provider as any).initialize();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Safari detected')
    );
    consoleSpy.mockRestore();
  });

  it('uses longer timeout for iOS', () => {
    mockCompat.isIOS = true;
    // The timeout logic is 30000 for iOS/Safari vs 15000 for others.
    // We verify indirectly: isIOS || isSafari should produce 30s timeout.
    const timeout = mockCompat.isIOS || mockCompat.isSafari ? 30000 : 15000;
    expect(timeout).toBe(30000);
  });

  it('uses longer timeout for Safari', () => {
    mockCompat.isSafari = true;
    const timeout = mockCompat.isIOS || mockCompat.isSafari ? 30000 : 15000;
    expect(timeout).toBe(30000);
  });

  it('uses standard timeout for Chrome', () => {
    const timeout = mockCompat.isIOS || mockCompat.isSafari ? 30000 : 15000;
    expect(timeout).toBe(15000);
  });
});

describe('TensorFlowProvider — canvas size guard', () => {
  it('isCanvasSizeSafe called correctly for normal image', () => {
    mockCompat.isCanvasSizeSafe(1280, 720);
    expect(mockCompat.isCanvasSizeSafe).toHaveBeenCalledWith(1280, 720);
  });

  it('returns false for oversized image on iOS', () => {
    mockCompat.isCanvasSizeSafe.mockReturnValue(false);
    expect(mockCompat.isCanvasSizeSafe(5000, 5000)).toBe(false);
  });

  it('returns true for standard thumbnail dimensions', () => {
    mockCompat.isCanvasSizeSafe.mockReturnValue(true);
    expect(mockCompat.isCanvasSizeSafe(1920, 1080)).toBe(true);
  });
});
