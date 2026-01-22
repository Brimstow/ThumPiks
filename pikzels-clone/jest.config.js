module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: false
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/__tests__/**/*'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  // Transform ES modules from node_modules that Jest can't handle
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|node-fetch|.*\\.mjs$))'
  ],
  testTimeout: 10000,
  // Detect open handles but don't force exit (Jest 29 handles this better)
  detectOpenHandles: false,
  // Modern globals injection (automatic in Jest 29)
  injectGlobals: true,
  // Coverage thresholds - enforced on pre-push
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  }
};
