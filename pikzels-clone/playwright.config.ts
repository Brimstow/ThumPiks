import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for E2E Tests
 * 
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  
  // Maximum time one test can run
  timeout: 60 * 1000,
  
  // Run tests in files in parallel
  fullyParallel: false,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : 1,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/test-results.json' }],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:8556',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on first retry
    video: 'retain-on-failure',
    
    // Maximum time each action can take
    actionTimeout: 10 * 1000,
    
    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Run in headed mode to watch the test
        headless: false,
        // Slow down by 500ms per action to make it easier to watch
        launchOptions: {
          slowMo: 500,
        },
      },
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        headless: false,
        launchOptions: {
          slowMo: 500,
        },
      },
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        headless: false,
        launchOptions: {
          slowMo: 500,
        },
      },
    },
    
    // Headless mode for CI
    {
      name: 'chromium-headless',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
    },
  ],
  
  // Run local dev server before starting tests
  // Uncomment if you want Playwright to start the servers automatically
  // webServer: [
  //   {
  //     command: 'npm run dev',
  //     port: 8550,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: 'npm run dev:frontend',
  //     port: 8556,
  //     timeout: 120 * 1000,
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});
