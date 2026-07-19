/**
 * Sanity tests for VideoService.initialize() browser-aware loading.
 *
 * Verifies Critical Issue #4 fix: FFmpeg loads with worker when
 * crossOriginIsolated, without worker on Safari, and with
 * try/fallback on other non-isolated browsers.
 */

// ============================================
// Mocks
// ============================================

// Mock browserCompat — we control the flags per test
const mockCompat = {
  isCrossOriginIsolated: false,
  isSafari: false,
};
jest.mock('@/utils/browserCompat', () => mockCompat);

// Mock @ffmpeg/util
const mockToBlobURL = jest.fn().mockImplementation(async (url: string) => `blob:${url}`);
jest.mock('@ffmpeg/util', () => ({
  toBlobURL: (...args: any[]) => mockToBlobURL(...args),
  fetchFile: jest.fn(),
}));

// Mock @ffmpeg/ffmpeg
const mockLoad = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();
jest.mock('@ffmpeg/ffmpeg', () => ({
  FFmpeg: jest.fn().mockImplementation(() => ({
    load: mockLoad,
    on: mockOn,
  })),
}));

// Mock platforms
jest.mock('../platforms', () => ({ platformRegistry: {} }));

// Mock environment
jest.mock('@/config/environment', () => ({
  API_BASE_URL: 'http://localhost:8550',
}));

import { VideoService } from '../video-service';

// ============================================
// Tests
// ============================================

describe('VideoService.initialize — browser-aware loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompat.isCrossOriginIsolated = false;
    mockCompat.isSafari = false;
  });

  it('loads with classWorkerURL when crossOriginIsolated is true', async () => {
    mockCompat.isCrossOriginIsolated = true;

    const service = new VideoService();
    await service.initialize();

    expect(mockLoad).toHaveBeenCalledTimes(1);
    const loadArgs = mockLoad.mock.calls[0][0];
    expect(loadArgs).toHaveProperty('classWorkerURL');
    expect(loadArgs.classWorkerURL).toContain('worker.js');
    expect(loadArgs).toHaveProperty('coreURL');
    expect(loadArgs).toHaveProperty('wasmURL');
  });

  it('loads WITHOUT classWorkerURL on Safari', async () => {
    mockCompat.isSafari = true;
    mockCompat.isCrossOriginIsolated = false;

    const service = new VideoService();
    await service.initialize();

    expect(mockLoad).toHaveBeenCalledTimes(1);
    const loadArgs = mockLoad.mock.calls[0][0];
    expect(loadArgs).not.toHaveProperty('classWorkerURL');
    expect(loadArgs).toHaveProperty('coreURL');
    expect(loadArgs).toHaveProperty('wasmURL');
  });

  it('tries worker first on non-isolated non-Safari, falls back without', async () => {
    mockCompat.isCrossOriginIsolated = false;
    mockCompat.isSafari = false;

    // First load (with worker) fails, second (without) succeeds
    mockLoad
      .mockRejectedValueOnce(new Error('SharedArrayBuffer not defined'))
      .mockResolvedValueOnce(undefined);

    const service = new VideoService();
    await service.initialize();

    // Should have tried twice: with worker, then without
    expect(mockLoad).toHaveBeenCalledTimes(2);
    const firstCall = mockLoad.mock.calls[0][0];
    const secondCall = mockLoad.mock.calls[1][0];
    expect(firstCall).toHaveProperty('classWorkerURL');
    expect(secondCall).not.toHaveProperty('classWorkerURL');
  });

  it('sets ready = true after successful load', async () => {
    mockCompat.isCrossOriginIsolated = true;

    const service = new VideoService();
    expect(service.isReady()).toBe(false);
    await service.initialize();
    expect(service.isReady()).toBe(true);
  });

  it('does not re-initialize if already ready', async () => {
    mockCompat.isCrossOriginIsolated = true;

    const service = new VideoService();
    await service.initialize();
    await service.initialize(); // second call

    // load should only be called once
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('throws and reports error if all load attempts fail', async () => {
    mockCompat.isCrossOriginIsolated = true;
    mockLoad.mockRejectedValue(new Error('WASM load failed'));

    const service = new VideoService();
    await expect(service.initialize()).rejects.toThrow('WASM load failed');
    expect(service.isReady()).toBe(false);
  });
});
