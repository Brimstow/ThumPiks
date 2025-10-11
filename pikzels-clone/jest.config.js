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
      tsconfig: 'tsconfig.test.json'
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
  // Handle ES modules properly
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 10000,
  // Force Jest to exit after tests complete (prevents hanging from open handles)
  forceExit: true
};
