/**
 * Test Utilities - Provides consistent mocking patterns
 * Use these utilities in your tests to avoid mock conflicts
 */

export const createMockPrismaClient = () => ({
  $connect: jest.fn().mockResolvedValue(undefined),
  $disconnect: jest.fn().mockResolvedValue(undefined),
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  thumbnail: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  project: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  socialShare: {
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
});

export const createMockCacheService = () => ({
  getInstance: jest.fn(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delPattern: jest.fn().mockResolvedValue(undefined),
    getOrSet: jest.fn((_key: string, fn: () => any) => fn()),
    exists: jest.fn().mockResolvedValue(false),
    increment: jest.fn().mockResolvedValue(1),
    healthCheck: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(undefined),
  })),
});

export const createMockEventEmitter = () => ({
  createAndEmit: jest.fn().mockResolvedValue('mock-event-id'),
  emitEvent: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn(() => () => {}), // Returns unsubscribe function
  getStats: jest.fn().mockReturnValue({ eventsProcessed: 0 }),
});

export const createMockEventFunctions = () => ({
  emitThumbnailCreated: jest.fn().mockResolvedValue('thumbnail-event-id'),
  emitAnalyticsEvent: jest.fn().mockResolvedValue('analytics-event-id'),
  emitSocialShareRequested: jest.fn().mockResolvedValue('share-event-id'),
});

/**
 * Helper to reset all mocks in a test
 */
export const resetAllMocks = (...mocks: any[]) => {
  mocks.forEach(mock => {
    if (typeof mock === 'object' && mock !== null) {
      Object.values(mock).forEach(fn => {
        if (jest.isMockFunction(fn)) {
          (fn as jest.MockedFunction<any>).mockClear();
        }
      });
    }
  });
  jest.clearAllMocks();
};

/**
 * Setup function for service tests - call this in beforeEach
 */
export const setupServiceTest = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Reset any module registry if needed
  jest.resetModules();
};