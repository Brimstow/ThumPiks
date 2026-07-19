module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^@dnd-kit/react/sortable$': '<rootDir>/src/test-utils/dndKitReactSortableMock.ts',
    '^@dnd-kit/dom/sortable$': '<rootDir>/src/test-utils/dndKitDomSortableMock.ts',
    '^@dnd-kit/react$': '<rootDir>/src/test-utils/dndKitReactMock.tsx',
    '^@ffmpeg/ffmpeg$': '<rootDir>/src/test-utils/ffmpegMock.ts',
    '^@ffmpeg/util$': '<rootDir>/src/test-utils/ffmpegUtilMock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../src/config/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
      },
      diagnostics: {
        ignoreCodes: [1343],
      },
      astTransformers: {
        before: [
          {
            path: 'ts-jest-mock-import-meta',
            options: {
              metaObjectReplacement: {
                env: { PROD: false, DEV: true, MODE: 'test' },
                url: 'file:///test',
              },
            },
          },
        ],
      },
    }],
  },
  testMatch: ['**/*.test.(ts|tsx)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    // Playwright E2E specs rely on a global `page` and must run via Playwright, not Jest.
    '\\.e2e\\.test\\.(ts|tsx)$',
    // ThumbnailStudio is a canvas + browser-integration component suite that
    // requires a real browser/canvas; covered by Playwright E2E, not jsdom.
    'editor[\\\\/]ThumbnailStudio\\.test\\.tsx$',
  ],
};