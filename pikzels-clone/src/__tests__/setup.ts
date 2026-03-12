// Test setup file - sets up environment variables and mocks for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-long';
process.env.DATABASE_URL = 'file:./test.db';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!!';
process.env.REDIS_URL = 'redis://localhost:6379';
// Set fake Cloudinary URL so CloudinaryProvider thinks it's configured
process.env.CLOUDINARY_URL = 'cloudinary://test_key:test_secret@test_cloud';

// Simple test to make Jest happy
describe('Test Setup', () => {
  it('should have proper environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
const mockInfo = jest.fn();

global.console = {
  ...console,
  log: mockLog,
  warn: mockWarn,
  error: mockError,
  info: mockInfo,
};

// Restore console for specific tests that need it
(global as any).restoreConsole = () => {
  global.console = originalConsole;
};

// Mock external dependencies
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock uuid module to prevent ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-v4'),
  v1: jest.fn(() => 'mocked-uuid-v1'),
}));

// Mock youtubei.js to avoid ESM import issues
jest.mock('youtubei.js', () => ({
  Innertube: {
    create: jest.fn().mockResolvedValue({
      search: jest.fn().mockResolvedValue({ results: [] }),
      getInfo: jest.fn().mockResolvedValue({
        basic_info: {
          title: 'Mock Video Title',
          description: 'Mock video description',
          thumbnail: [{ url: 'https://example.com/thumb.jpg' }],
        },
      }),
    }),
  },
}));

// Mock sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    modulate: jest.fn().mockReturnThis(),
    linear: jest.fn().mockReturnThis(),
    rotate: jest.fn().mockReturnThis(),
    flip: jest.fn().mockReturnThis(),
    flop: jest.fn().mockReturnThis(),
    extract: jest.fn().mockReturnThis(),
    grayscale: jest.fn().mockReturnThis(),
    tint: jest.fn().mockReturnThis(),
    negate: jest.fn().mockReturnThis(),
    blur: jest.fn().mockReturnThis(),
    sharpen: jest.fn().mockReturnThis(),
    convolve: jest.fn().mockReturnThis(),
    composite: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    toFile: jest.fn().mockResolvedValue(undefined),
    metadata: jest.fn().mockResolvedValue({ width: 1280, height: 720 }),
  }));
});

// Mock storage service for image processing tests
jest.mock('../modules/storage', () => ({
  getStorageService: jest.fn(() => ({
    isAvailable: jest.fn().mockResolvedValue(true),
    uploadProcessedImage: jest.fn().mockResolvedValue({
      publicId: 'test-public-id',
      secureUrl: 'https://test.cloudinary.com/test-image.png',
      url: 'http://test.cloudinary.com/test-image.png',
      format: 'png',
      width: 1280,
      height: 720,
    }),
    uploadThumbnail: jest.fn().mockResolvedValue({
      publicId: 'test-thumbnail-id',
      secureUrl: 'https://test.cloudinary.com/thumbnail.png',
      url: 'http://test.cloudinary.com/thumbnail.png',
      format: 'png',
      width: 1280,
      height: 720,
    }),
    uploadEphemeral: jest.fn().mockResolvedValue({
      publicId: 'test-ephemeral-id',
      secureUrl: 'https://test.cloudinary.com/ephemeral.png',
      url: 'http://test.cloudinary.com/ephemeral.png',
      format: 'png',
      width: 1280,
      height: 720,
    }),
    delete: jest.fn().mockResolvedValue({ success: true }),
    healthCheck: jest.fn().mockResolvedValue({
      cloudinary: { healthy: true, latency: 50 },
      storacha: { healthy: false, error: 'Not configured' },
    }),
  })),
  StorageService: {
    getInstance: jest.fn(() => ({
      isAvailable: jest.fn().mockResolvedValue(true),
      uploadProcessedImage: jest.fn().mockResolvedValue({
        publicId: 'test-public-id',
        secureUrl: 'https://test.cloudinary.com/test-image.png',
      }),
    })),
  },
}));

// Also mock with the relative path that image-processing.service uses
jest.mock('../modules/storage/index', () => ({
  getStorageService: jest.fn(() => ({
    isAvailable: jest.fn().mockResolvedValue(true),
    uploadProcessedImage: jest.fn().mockResolvedValue({
      publicId: 'test-public-id',
      secureUrl: 'https://test.cloudinary.com/test-image.png',
      url: 'http://test.cloudinary.com/test-image.png',
      format: 'png',
      width: 1280,
      height: 720,
    }),
  })),
}));

// Mock cloudinary package directly for tests that might reach it
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: {
      ping: jest.fn().mockResolvedValue({ status: 'ok' }),
    },
    uploader: {
      upload: jest.fn().mockResolvedValue({
        public_id: 'test-public-id',
        secure_url: 'https://test.cloudinary.com/test-image.png',
        url: 'http://test.cloudinary.com/test-image.png',
        format: 'png',
        width: 1280,
        height: 720,
      }),
      destroy: jest.fn().mockResolvedValue({ result: 'ok' }),
    },
  },
}));

// Global teardown to cleanup intervals and timers
// Only runs cleanup if modules were already loaded (avoids triggering heavy imports)
afterAll(async () => {
  try {
    // Only cleanup if auto-cleanup was already loaded by a test
    // This avoids triggering massive import chains for simple tests
    const autoCleanupPath = require.resolve('../utils/auto-cleanup');
    if (require.cache[autoCleanupPath]) {
      const { jestGlobalTeardown } = require('../utils/auto-cleanup');
      await jestGlobalTeardown();
    }

    // Only cleanup event handlers if they were loaded
    const analyticsPath = require.resolve('../events/analytics-handlers');
    if (require.cache[analyticsPath]) {
      const { analyticsHandlers } = require('../events/analytics-handlers');
      await analyticsHandlers.cleanup();
    }

    const socialPath = require.resolve('../events/social-share-handlers');
    if (require.cache[socialPath]) {
      const {
        socialShareHandlers,
      } = require('../events/social-share-handlers');
      await socialShareHandlers.cleanup();
    }

    const monitoringPath = require.resolve(
      '../modules/admin/system-monitoring.service'
    );
    if (require.cache[monitoringPath]) {
      const {
        systemMonitoringService,
      } = require('../modules/admin/system-monitoring.service');
      systemMonitoringService.stop();
    }
  } catch {
    // Module not found - this is fine, nothing to clean up
  }
});

// Note: Service-specific mocks (Prisma, Redis, etc.) should be handled
// in individual test files to avoid conflicts and ensure proper isolation
