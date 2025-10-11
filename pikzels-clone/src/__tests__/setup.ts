// Test setup file - sets up environment variables and mocks for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-that-is-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-32-chars-long';
process.env.DATABASE_URL = 'file:./test.db';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long!!!';
process.env.REDIS_URL = 'redis://localhost:6379';

// Simple test to make Jest happy
describe('Test Setup', () => {
  it('should have proper environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBeDefined();
  });
});

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
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

// Mock sharp for image processing
jest.mock('sharp', () => {
  return jest.fn(() => ({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    png: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
  }));
});

// Global teardown to cleanup intervals and timers
afterAll(async () => {
  // Clean up all service singletons and their timers
  try {
    // Import services dynamically to avoid import issues
    const { CacheService } = await import('../services/cache.service');
    const { analyticsHandlers } = await import('../events/analytics-handlers');
    const { socialShareHandlers } = await import('../events/social-share-handlers');
    const { systemMonitoringService } = await import('../modules/admin/system-monitoring.service');

    // Call cleanup methods
    const cacheService = CacheService.getInstance();
    cacheService.cleanup();
    
    await analyticsHandlers.cleanup();
    await socialShareHandlers.cleanup();
    systemMonitoringService.stop();
    
  } catch (error) {
    console.error('❌ Error during global test cleanup:', error);
  }
});

// Note: Service-specific mocks (Prisma, Redis, etc.) should be handled 
// in individual test files to avoid conflicts and ensure proper isolation
