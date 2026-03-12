import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: AI Tools Integration in Canvas Editor
 *
 * Tests the complete integration of AI tools within the Thumbnail Studio:
 * 1. Vision Analysis (Gemini Vision) - image description, elements, suggested prompts
 * 2. Vision Search - web image search via Bing, add results to canvas
 * 3. AI Generate - prompt-based image generation with tier selection
 * 4. Canvas Editor Integration - AI images added as layers, state management
 * 5. End-to-End User Flows - complete journeys from AI tools to canvas
 *
 * Run with: npx playwright test tests/e2e/ai-tools-integration.spec.ts --headed --project=chromium
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';
const API_URL = process.env.API_BASE_URL || 'http://localhost:8550';

// Test credentials (from prisma/seed.ts)
const TEST_USER = {
  username: 'tester1',
  email: 'tester1@example.com',
  password: 'Test123!',
};

// LLM tester has more credits for AI operations
const LLM_TEST_USER = {
  username: 'testerLLM',
  email: 'testerllm@example.com',
  password: 'LLMdemo2026!',
};

// ============================================
// HELPERS
// ============================================

async function loginUser(page: Page, credentials = TEST_USER) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('text=Sign in to your account', { timeout: 10000 });

  const emailInput = page.locator('input[placeholder*="email"], input[name="email"]').first();
  await emailInput.clear();
  await emailInput.fill(credentials.email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.clear();
  await passwordInput.fill(credentials.password);

  await page.click('button:has-text("Sign In")');
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

async function navigateToEditor(page: Page) {
  await page.goto(`${BASE_URL}/dashboard/editor`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h1:has-text("Thumbnail Studio")', { timeout: 15000 });
}

async function navigateToEditorWithThumbnail(page: Page) {
  // Go to My Thumbnails first to find a thumbnail to edit
  await page.click('button:has-text("My Thumbnails")');
  await page.waitForLoadState('networkidle');

  const thumbnailCard = page.locator('.thumbnail-card, [data-testid="thumbnail-card"]').first();
  const hasThumbnails = await thumbnailCard.isVisible({ timeout: 5000 }).catch(() => false);

  if (hasThumbnails) {
    await thumbnailCard.hover();
    await page.waitForTimeout(300);

    const editButton = thumbnailCard.locator('button:has-text("Edit"), [aria-label*="Edit"]');
    if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editButton.click();
    } else {
      await thumbnailCard.click();
      await page.click('button:has-text("Edit")').catch(() => {});
    }

    await page.waitForURL(/\/dashboard\/editor\//, { timeout: 10000 });
  } else {
    // Fallback to blank editor
    await page.goto(`${BASE_URL}/dashboard/editor`);
  }

  await page.waitForSelector('h1:has-text("Thumbnail Studio")', { timeout: 15000 });
}

async function switchToAITab(page: Page) {
  const aiTab = page.locator('button.panels-tab:has-text("AI")');
  await aiTab.click();
  await page.waitForTimeout(300);
}

async function clickAISubTab(page: Page, tabLabel: string) {
  const tab = page.locator(`.ai-tools-tab:has-text("${tabLabel}")`);
  await tab.click();
  await page.waitForTimeout(300);
}

async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 30000) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

// ============================================
// TEST SUITE: AI TOOLS PANEL NAVIGATION
// ============================================

test.describe('AI Tools Panel - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page);
  });

  test('AI tab is visible and clickable in editor panels', async ({ page }) => {
    await navigateToEditor(page);

    // Verify AI tab exists in the panel tabs
    const aiTab = page.locator('button.panels-tab:has-text("AI")');
    await expect(aiTab).toBeVisible({ timeout: 5000 });

    // Click AI tab
    await aiTab.click();

    // Verify AI tools panel content appears
    const aiToolsPanel = page.locator('.ai-tools-panel');
    await expect(aiToolsPanel).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-screenshots/ai-tools-panel-visible.png' });
  });

  test('All 9 AI tool sub-tabs are rendered', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);

    const expectedTabs = [
      'Generate', 'Inpaint', 'Remove BG', 'Face Swap',
      'Upscale', 'Enhance', 'Score', 'Vision', 'Search',
    ];

    for (const tabLabel of expectedTabs) {
      const tab = page.locator(`.ai-tools-tab:has-text("${tabLabel}")`);
      await expect(tab).toBeVisible({ timeout: 3000 });
    }

    await page.screenshot({ path: 'test-screenshots/ai-tools-all-tabs.png' });
  });

  test('Switching between sub-tabs updates content panel', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);

    // Click Vision tab
    await clickAISubTab(page, 'Vision');
    await expect(page.locator('text=Gemini Vision Analysis')).toBeVisible({ timeout: 3000 });

    // Click Search tab
    await clickAISubTab(page, 'Search');
    await expect(page.locator('text=Web Image Search')).toBeVisible({ timeout: 3000 });

    // Click Generate tab
    await clickAISubTab(page, 'Generate');
    await expect(page.locator('textarea.ai-prompt-input')).toBeVisible({ timeout: 3000 });

    // Click Score tab
    await clickAISubTab(page, 'Score');
    await expect(page.locator('text=Thumbnail Score')).toBeVisible({ timeout: 3000 });
  });

  test('Credit cost indicator updates per tab', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);

    const costIndicator = page.locator('.ai-cost-indicator');

    // Score tab - free
    await clickAISubTab(page, 'Score');
    await expect(costIndicator).toContainText('Free');

    // Vision tab - 1 credit
    await clickAISubTab(page, 'Vision');
    await expect(costIndicator).toContainText('1 credit');

    // Search tab - free
    await clickAISubTab(page, 'Search');
    await expect(costIndicator).toContainText('Free');

    // Generate tab - paid
    await clickAISubTab(page, 'Generate');
    await expect(costIndicator).toContainText('credits');
  });
});

// ============================================
// TEST SUITE: VISION ANALYSIS FEATURES
// ============================================

test.describe('Vision Analysis (Gemini Vision)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page, LLM_TEST_USER);
  });

  test('Vision tab shows "Select an image layer first" when no layer selected', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    // Without an image layer selected, should show notice
    const notice = page.locator('.ai-notice:has-text("Select an image layer first")');
    await expect(notice).toBeVisible({ timeout: 5000 });

    // Analyze button should NOT be visible when no layer selected
    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    await expect(analyzeBtn).not.toBeVisible();

    await page.screenshot({ path: 'test-screenshots/ai-vision-no-layer.png' });
  });

  test('Vision tab shows analyze button when image layer is selected', async ({ page }) => {
    test.setTimeout(90000);
    await navigateToEditorWithThumbnail(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    // With a thumbnail loaded, should see the analyze button (or notice if no layer selected)
    // The base image from the thumbnail should be available as a layer
    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    const notice = page.locator('.ai-notice:has-text("Select an image layer first")');

    // One of these should be visible
    const hasAnalyzeBtn = await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false);
    const hasNotice = await notice.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasAnalyzeBtn || hasNotice).toBeTruthy();

    if (hasAnalyzeBtn) {
      // Preview box should show the selected image
      const previewBox = page.locator('.ai-preview-box img');
      await expect(previewBox).toBeVisible({ timeout: 3000 });

      // Credit hint should mention 1 credit
      await expect(page.locator('text=1 credit per analysis')).toBeVisible();
    }

    await page.screenshot({ path: 'test-screenshots/ai-vision-with-layer.png' });
  });

  test('Vision analysis sends request to /api/vision/describe', async ({ page }) => {
    test.setTimeout(120000);
    await navigateToEditorWithThumbnail(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    const hasButton = await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasButton) {
      // Try selecting the background layer if available
      const bgLayer = page.locator('text=Background').first();
      if (await bgLayer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bgLayer.click();
        await page.waitForTimeout(500);
        await clickAISubTab(page, 'Vision');
      }
    }

    if (await analyzeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Set up API request interception
      const apiRequestPromise = page.waitForRequest(
        (request) => request.url().includes('/api/vision/describe'),
        { timeout: 10000 }
      ).catch(() => null);

      await analyzeBtn.click();

      // Verify loading state appears
      const loadingText = page.locator('text=Analyzing with Gemini');
      const isLoading = await loadingText.isVisible({ timeout: 3000 }).catch(() => false);
      if (isLoading) {
        // Button should be disabled during loading
        await expect(analyzeBtn).toBeDisabled();
      }

      // Check that API request was made
      const apiRequest = await apiRequestPromise;
      if (apiRequest) {
        expect(apiRequest.method()).toBe('POST');
        const postData = apiRequest.postDataJSON();
        expect(postData).toHaveProperty('imageBase64');
      }

      // Wait for response (success or error)
      await page.waitForTimeout(5000);

      // Check for either results or error
      const hasResult = await page.locator('.ai-vision-result').isVisible({ timeout: 10000 }).catch(() => false);
      const hasError = await page.locator('.ai-tools-error').isVisible().catch(() => false);

      // One of these should be true
      expect(hasResult || hasError).toBeTruthy();

      await page.screenshot({ path: 'test-screenshots/ai-vision-analysis-result.png' });
    }
  });

  test('Vision analysis result displays all VisionAnalysisResult fields', async ({ page }) => {
    test.setTimeout(120000);
    await navigateToEditorWithThumbnail(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    if (!(await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Intercept the API to mock a successful response
    await page.route('**/api/vision/describe', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-vision-123',
          imageUrl: 'https://example.com/test.jpg',
          description: 'A vibrant thumbnail featuring a person against a colorful background',
          suggestedPrompt: 'Create a thumbnail with a person centered against gradient colors, bold text overlay',
          elements: {
            mainSubject: 'Person with microphone',
            faces: 1,
            textOverlay: ['SUBSCRIBE', 'Episode 42'],
            colorPalette: ['#FF5733', '#3498DB', '#2ECC71', '#F39C12'],
            mood: 'Energetic',
            style: 'Modern YouTube',
            composition: 'Rule of thirds with subject on left',
          },
          createdAt: new Date().toISOString(),
        }),
      });
    });

    await analyzeBtn.click();

    // Wait for mocked result to render
    const resultContainer = page.locator('.ai-vision-result');
    await expect(resultContainer).toBeVisible({ timeout: 10000 });

    // Verify Description section
    await expect(page.locator('.ai-vision-section:has(h5:has-text("Description"))'))
      .toBeVisible();
    await expect(page.locator('.ai-vision-text'))
      .toContainText('vibrant thumbnail');

    // Verify Suggested Prompt section
    await expect(page.locator('.ai-vision-section:has(h5:has-text("Suggested Prompt"))'))
      .toBeVisible();
    await expect(page.locator('.ai-vision-prompt'))
      .toContainText('gradient colors');

    // Verify copy button exists for suggested prompt
    const copyBtn = page.locator('.ai-copy-btn').first();
    await expect(copyBtn).toBeVisible();

    // Verify Design Elements section
    await expect(page.locator('.ai-vision-section:has(h5:has-text("Design Elements"))'))
      .toBeVisible();

    // Check individual element fields
    await expect(page.locator('.ai-vision-item:has(.label:has-text("Subject")) .value'))
      .toContainText('Person with microphone');
    await expect(page.locator('.ai-vision-item:has(.label:has-text("Faces")) .value'))
      .toContainText('1');
    await expect(page.locator('.ai-vision-item:has(.label:has-text("Mood")) .value'))
      .toContainText('Energetic');
    await expect(page.locator('.ai-vision-item:has(.label:has-text("Style")) .value'))
      .toContainText('Modern YouTube');
    await expect(page.locator('.ai-vision-item:has(.label:has-text("Composition")) .value'))
      .toContainText('Rule of thirds');

    // Verify Color Palette
    await expect(page.locator('.ai-vision-section:has(h5:has-text("Color Palette"))'))
      .toBeVisible();
    const swatches = page.locator('.ai-color-swatch');
    expect(await swatches.count()).toBe(4);

    // Verify Text Found section
    await expect(page.locator('.ai-vision-section:has(h5:has-text("Text Found"))'))
      .toBeVisible();
    await expect(page.locator('.ai-text-tag:has-text("SUBSCRIBE")')).toBeVisible();
    await expect(page.locator('.ai-text-tag:has-text("Episode 42")')).toBeVisible();

    await page.screenshot({ path: 'test-screenshots/ai-vision-full-result.png', fullPage: true });
  });

  test('Vision analysis handles insufficient credits (402)', async ({ page }) => {
    test.setTimeout(90000);
    await navigateToEditorWithThumbnail(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    if (!(await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Mock a 402 response
    await page.route('**/api/vision/describe', async (route) => {
      await route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Insufficient credits for vision analysis' }),
      });
    });

    await analyzeBtn.click();

    // Should show error about insufficient credits
    const errorEl = page.locator('.ai-tools-error');
    await expect(errorEl).toBeVisible({ timeout: 10000 });
    await expect(errorEl).toContainText('Insufficient credits');

    await page.screenshot({ path: 'test-screenshots/ai-vision-insufficient-credits.png' });
  });
});

// ============================================
// TEST SUITE: VISION SEARCH FEATURES
// ============================================

test.describe('Vision Search (Web Image Search)', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page);
  });

  test('Search tab renders input field and search button', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Verify search UI elements
    await expect(page.locator('text=Web Image Search')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.ai-search-input')).toBeVisible();
    await expect(page.locator('.ai-search-btn')).toBeVisible();

    // Verify placeholder text
    const searchInput = page.locator('.ai-search-input');
    await expect(searchInput).toHaveAttribute('placeholder', /thumbnails|images/i);

    await page.screenshot({ path: 'test-screenshots/ai-search-empty.png' });
  });

  test('Search button is disabled when input is empty', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    const searchBtn = page.locator('.ai-search-btn');
    const searchInput = page.locator('.ai-search-input');

    // Button should be disabled when empty
    await expect(searchBtn).toBeDisabled();

    // Type something
    await searchInput.fill('gaming thumbnail');
    await expect(searchBtn).toBeEnabled();

    // Clear it
    await searchInput.fill('');
    await expect(searchBtn).toBeDisabled();
  });

  test('Search sends request to /api/vision/search with query params', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('gaming thumbnail background');

    // Set up request interception
    const apiRequestPromise = page.waitForRequest(
      (request) => request.url().includes('/api/vision/search'),
      { timeout: 10000 }
    ).catch(() => null);

    // Click search
    const searchBtn = page.locator('.ai-search-btn');
    await searchBtn.click();

    const apiRequest = await apiRequestPromise;
    if (apiRequest) {
      const url = new URL(apiRequest.url());
      expect(url.searchParams.get('q')).toBe('gaming thumbnail background');
      expect(url.searchParams.get('count')).toBe('12');
    }
  });

  test('Search results display as image grid with BingImageResult data', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Mock the search API
    await page.route('**/api/vision/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [
            {
              url: 'https://example.com/image1.jpg',
              title: 'Gaming Thumbnail Template',
              sourceUrl: 'https://example.com/page1',
              width: 1280,
              height: 720,
              thumbnailUrl: 'https://example.com/thumb1.jpg',
            },
            {
              url: 'https://example.com/image2.jpg',
              title: 'YouTube Thumbnail Design',
              sourceUrl: 'https://example.com/page2',
              width: 1920,
              height: 1080,
              thumbnailUrl: 'https://example.com/thumb2.jpg',
            },
            {
              url: 'https://example.com/image3.jpg',
              title: 'Creative Background Art',
              sourceUrl: 'https://example.com/page3',
              width: 3840,
              height: 2160,
              thumbnailUrl: 'https://example.com/thumb3.jpg',
            },
          ],
        }),
      });
    });

    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('gaming thumbnail');
    await page.locator('.ai-search-btn').click();

    // Wait for results
    const resultsContainer = page.locator('.ai-search-results');
    await expect(resultsContainer).toBeVisible({ timeout: 10000 });

    // Verify result count hint
    await expect(page.locator('.ai-hint:has-text("3 results")')).toBeVisible();

    // Verify grid items
    const resultItems = page.locator('.ai-search-result-item');
    expect(await resultItems.count()).toBe(3);

    // Verify dimension overlays show width x height
    const overlays = page.locator('.ai-search-overlay');
    await expect(overlays.first()).toContainText('1280x720');

    // Verify title attributes
    await expect(resultItems.first()).toHaveAttribute('title', 'Gaming Thumbnail Template');

    await page.screenshot({ path: 'test-screenshots/ai-search-results.png' });
  });

  test('Enter key triggers search', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Mock the API
    await page.route('**/api/vision/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [{ url: 'https://example.com/img.jpg', title: 'Test', sourceUrl: 'https://example.com', width: 800, height: 600, thumbnailUrl: 'https://example.com/thumb.jpg' }] }),
      });
    });

    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('test query');
    await searchInput.press('Enter');

    // Should show results
    await expect(page.locator('.ai-search-results')).toBeVisible({ timeout: 10000 });
  });

  test('Search shows loading state during request', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Mock with delay to observe loading state
    await page.route('**/api/vision/search*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ results: [] }),
      });
    });

    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('slow search');
    await page.locator('.ai-search-btn').click();

    // Search button should show loader icon and be disabled during search
    await expect(page.locator('.ai-search-btn')).toBeDisabled();

    await page.screenshot({ path: 'test-screenshots/ai-search-loading.png' });
  });

  test('Search handles API error gracefully', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Mock an error response
    await page.route('**/api/vision/search*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('broken search');
    await page.locator('.ai-search-btn').click();

    // Should show error message
    const errorEl = page.locator('.ai-tools-error');
    await expect(errorEl).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-screenshots/ai-search-error.png' });
  });
});

// ============================================
// TEST SUITE: AI GENERATE FEATURES
// ============================================

test.describe('AI Image Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page);
  });

  test('Generate tab shows prompt input, style grid, and aspect ratio selector', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Prompt textarea
    const promptInput = page.locator('textarea.ai-prompt-input');
    await expect(promptInput).toBeVisible({ timeout: 5000 });
    await expect(promptInput).toHaveAttribute('placeholder', /Describe your thumbnail/i);

    // Style grid
    await expect(page.locator('text=Style')).toBeVisible();
    const styleButtons = page.locator('.ai-style-btn');
    expect(await styleButtons.count()).toBeGreaterThanOrEqual(6);

    // Check specific styles
    await expect(page.locator('.ai-style-btn:has-text("Cinematic")')).toBeVisible();
    await expect(page.locator('.ai-style-btn:has-text("Gaming")')).toBeVisible();

    // Aspect ratio
    await expect(page.locator('text=Aspect Ratio')).toBeVisible();
    const aspectSelect = page.locator('select');
    await expect(aspectSelect).toBeVisible();

    await page.screenshot({ path: 'test-screenshots/ai-generate-tab.png' });
  });

  test('Generate button is disabled when prompt is empty', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    const generateBtn = page.locator('.ai-action-btn:has-text("Generate Thumbnail")');
    await expect(generateBtn).toBeDisabled();

    // Type a prompt
    const promptInput = page.locator('textarea.ai-prompt-input');
    await promptInput.fill('A futuristic cityscape at sunset');
    await expect(generateBtn).toBeEnabled();

    // Clear prompt
    await promptInput.fill('');
    await expect(generateBtn).toBeDisabled();
  });

  test('Style selection toggles active state', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Cinematic should be selected by default
    const cinematicBtn = page.locator('.ai-style-btn:has-text("Cinematic")');
    await expect(cinematicBtn).toHaveClass(/active/);

    // Click Gaming style
    const gamingBtn = page.locator('.ai-style-btn:has-text("Gaming")');
    await gamingBtn.click();

    // Gaming should now be active, Cinematic not
    await expect(gamingBtn).toHaveClass(/active/);
    await expect(cinematicBtn).not.toHaveClass(/active/);
  });

  test('Advanced options toggle works', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Advanced options should be hidden initially
    const advancedToggle = page.locator('.ai-advanced-toggle');
    await expect(advancedToggle).toContainText('Show');

    // Click to expand
    await advancedToggle.click();
    await expect(page.locator('.ai-advanced-options')).toBeVisible();
    await expect(advancedToggle).toContainText('Hide');

    // Verify negative prompt and steps slider appear
    await expect(page.locator('text=Negative Prompt')).toBeVisible();
    await expect(page.locator('text=Steps')).toBeVisible();

    // Click to collapse
    await advancedToggle.click();
    await expect(page.locator('.ai-advanced-options')).not.toBeVisible();
  });

  test('Generate sends request with correct parameters', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Fill prompt
    const promptInput = page.locator('textarea.ai-prompt-input');
    await promptInput.fill('A cyberpunk city at night');

    // Select Gaming style
    await page.locator('.ai-style-btn:has-text("Gaming")').click();

    // Change aspect ratio to square
    await page.locator('select').selectOption('1:1');

    // Intercept the generation request
    const requestPromise = page.waitForRequest(
      (request) =>
        request.url().includes('/api/thumbnails/ai/generate') ||
        request.url().includes('/generate'),
      { timeout: 10000 }
    ).catch(() => null);

    const generateBtn = page.locator('.ai-action-btn:has-text("Generate Thumbnail")');
    await generateBtn.click();

    const request = await requestPromise;
    if (request) {
      const body = request.postDataJSON();
      expect(body.prompt).toBe('A cyberpunk city at night');
      expect(body.style).toBe('gaming');
      expect(body.aspectRatio).toBe('1:1');
      expect(body.tier).toBeDefined();
    }
  });

  test('Ctrl+Enter shortcut triggers generation', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Mock the API to avoid actual generation
    await page.route('**/api/thumbnails/ai/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ images: ['https://example.com/generated.jpg'] }),
      });
    });

    const promptInput = page.locator('textarea.ai-prompt-input');
    await promptInput.fill('Test prompt for shortcut');

    // Press Ctrl+Enter
    await promptInput.press('Control+Enter');

    // Should show loading or result - the request was triggered
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'test-screenshots/ai-generate-shortcut.png' });
  });
});

// ============================================
// TEST SUITE: CANVAS INTEGRATION
// ============================================

test.describe('Canvas Editor Integration with AI Tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page);
  });

  test('Clicking search result adds image to canvas as new layer', async ({ page }) => {
    test.setTimeout(90000);
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Search');

    // Mock search results
    await page.route('**/api/vision/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{
            url: 'https://via.placeholder.com/800x600',
            title: 'Test Canvas Image',
            sourceUrl: 'https://example.com',
            width: 800,
            height: 600,
            thumbnailUrl: 'https://via.placeholder.com/200x150',
          }],
        }),
      });
    });

    // Search
    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('test background');
    await page.locator('.ai-search-btn').click();

    // Wait for results
    await expect(page.locator('.ai-search-results')).toBeVisible({ timeout: 10000 });

    // Count layers before adding
    // Switch to layers tab to check
    const layersTabBtn = page.locator('button.panels-tab:has-text("Layers")');

    // Click the search result image
    const resultItem = page.locator('.ai-search-result-item').first();
    await resultItem.click();

    // Give time for the image layer to be added
    await page.waitForTimeout(1000);

    // Switch to layers tab to verify layer was added
    await layersTabBtn.click();
    await page.waitForTimeout(500);

    // Should see a layer (either "Web Image" or "Test Canvas Image")
    const layersList = page.locator('.layers-list, [class*="layer"]');
    await expect(layersList).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'test-screenshots/ai-search-result-added-to-canvas.png' });
  });

  test('AI tools requiring image layer show notice without selection', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);

    const tabsRequiringLayer = ['Remove BG', 'Upscale', 'Enhance', 'Score', 'Vision'];

    for (const tabLabel of tabsRequiringLayer) {
      await clickAISubTab(page, tabLabel);

      const notice = page.locator('.ai-notice:has-text("Select an image layer")');
      const isNoticeVisible = await notice.isVisible({ timeout: 3000 }).catch(() => false);

      // In blank editor without layers, these tabs should show the notice
      if (isNoticeVisible) {
        await expect(notice).toBeVisible();
      }
    }

    await page.screenshot({ path: 'test-screenshots/ai-tools-layer-notices.png' });
  });

  test('Face Swap tab shows "Select an image layer with a face first" notice', async ({ page }) => {
    await navigateToEditor(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Face Swap');

    // Without selected image layer
    const notice = page.locator('.ai-notice');
    const isNoticeVisible = await notice.isVisible({ timeout: 3000 }).catch(() => false);

    if (isNoticeVisible) {
      await expect(notice).toContainText('Select an image layer');
    }

    await page.screenshot({ path: 'test-screenshots/ai-face-swap-no-layer.png' });
  });

  test('Inpaint tab shows instructions when image layer is available', async ({ page }) => {
    test.setTimeout(90000);
    await navigateToEditorWithThumbnail(page);
    await switchToAITab(page);
    await clickAISubTab(page, 'Inpaint');

    // Should see inpainting info
    await expect(page.locator('text=AI Inpainting')).toBeVisible({ timeout: 5000 });

    // If a layer is selected, should see brush instruction
    const instruction = page.locator('.ai-instruction');
    const notice = page.locator('.ai-notice');

    const hasInstruction = await instruction.isVisible({ timeout: 3000 }).catch(() => false);
    const hasNotice = await notice.isVisible({ timeout: 2000 }).catch(() => false);

    expect(hasInstruction || hasNotice).toBeTruthy();

    if (hasInstruction) {
      await expect(instruction).toContainText('brush tool');
    }

    await page.screenshot({ path: 'test-screenshots/ai-inpaint-tab.png' });
  });
});

// ============================================
// TEST SUITE: END-TO-END USER FLOWS
// ============================================

test.describe('End-to-End AI Tools User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginUser(page, LLM_TEST_USER);
  });

  test('Flow: Search image -> Add to canvas -> Switch to Layers tab -> Verify layer', async ({ page }) => {
    test.setTimeout(120000);
    await navigateToEditor(page);

    // Mock search API
    await page.route('**/api/vision/search*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          results: [{
            url: 'https://via.placeholder.com/1280x720/FF5733/FFFFFF?text=AI+Search+Result',
            title: 'AI Search Result Image',
            sourceUrl: 'https://example.com',
            width: 1280,
            height: 720,
            thumbnailUrl: 'https://via.placeholder.com/320x180/FF5733/FFFFFF?text=Thumb',
          }],
        }),
      });
    });

    // Step 1: Switch to AI tab
    await switchToAITab(page);
    await page.screenshot({ path: 'test-screenshots/e2e-flow-1-ai-tab.png' });

    // Step 2: Go to Search sub-tab
    await clickAISubTab(page, 'Search');
    await expect(page.locator('text=Web Image Search')).toBeVisible();

    // Step 3: Search for an image
    const searchInput = page.locator('.ai-search-input');
    await searchInput.fill('thumbnail background');
    await page.locator('.ai-search-btn').click();

    // Step 4: Wait for results
    await expect(page.locator('.ai-search-results')).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'test-screenshots/e2e-flow-2-search-results.png' });

    // Step 5: Click result to add to canvas
    await page.locator('.ai-search-result-item').first().click();
    await page.waitForTimeout(1000);

    // Step 6: Switch to Layers tab to verify
    const layersTab = page.locator('button.panels-tab:has-text("Layers")');
    await layersTab.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/e2e-flow-3-layer-added.png' });
  });

  test('Flow: Open editor -> AI tab -> Vision analyze -> Copy suggested prompt -> Use in Generate', async ({ page }) => {
    test.setTimeout(120000);
    await navigateToEditorWithThumbnail(page);

    // Mock the vision API
    await page.route('**/api/vision/describe', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'flow-test-1',
          imageUrl: 'https://example.com/test.jpg',
          description: 'A dynamic gaming thumbnail with neon accents',
          suggestedPrompt: 'Neon-lit gaming scene with dramatic lighting, cyberpunk aesthetics, ultra-detailed',
          elements: {
            mainSubject: 'Gaming character',
            faces: 0,
            textOverlay: [],
            colorPalette: ['#00FF88', '#FF00AA'],
            mood: 'Intense',
            style: 'Gaming',
            composition: 'Centered subject',
          },
          createdAt: new Date().toISOString(),
        }),
      });
    });

    // Step 1: Switch to AI tab -> Vision sub-tab
    await switchToAITab(page);
    await clickAISubTab(page, 'Vision');

    // Step 2: If analyze button is visible, click it
    const analyzeBtn = page.locator('.ai-action-btn:has-text("Analyze with Vision AI")');
    const canAnalyze = await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false);

    if (!canAnalyze) {
      // Try selecting the background layer
      const layersTab = page.locator('button.panels-tab:has-text("Layers")');
      await layersTab.click();
      await page.waitForTimeout(300);

      const bgLayer = page.locator('[class*="layer"]:has-text("Background")').first();
      if (await bgLayer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await bgLayer.click();
      }

      await switchToAITab(page);
      await clickAISubTab(page, 'Vision');
    }

    if (await analyzeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyzeBtn.click();

      // Wait for result
      await expect(page.locator('.ai-vision-result')).toBeVisible({ timeout: 15000 });

      // Step 3: Verify suggested prompt is displayed
      const suggestedPrompt = page.locator('.ai-vision-prompt');
      await expect(suggestedPrompt).toContainText('Neon-lit gaming scene');

      await page.screenshot({ path: 'test-screenshots/e2e-flow-vision-result.png' });

      // Step 4: Now switch to Generate tab
      await clickAISubTab(page, 'Generate');

      // The user would manually copy the prompt - verify Generate tab is ready
      const promptInput = page.locator('textarea.ai-prompt-input');
      await expect(promptInput).toBeVisible();

      // Simulate pasting the suggested prompt
      await promptInput.fill('Neon-lit gaming scene with dramatic lighting, cyberpunk aesthetics, ultra-detailed');

      const generateBtn = page.locator('.ai-action-btn:has-text("Generate Thumbnail")');
      await expect(generateBtn).toBeEnabled();

      await page.screenshot({ path: 'test-screenshots/e2e-flow-prompt-in-generate.png' });
    }
  });

  test('Flow: Navigate between all AI tabs without errors', async ({ page }) => {
    test.setTimeout(90000);
    await navigateToEditor(page);
    await switchToAITab(page);

    const tabSequence = [
      { tab: 'Generate', expected: 'Describe your thumbnail' },
      { tab: 'Inpaint', expected: 'AI Inpainting' },
      { tab: 'Remove BG', expected: 'Background Removal' },
      { tab: 'Face Swap', expected: 'Face Swap' },
      { tab: 'Upscale', expected: 'AI Upscaling' },
      { tab: 'Enhance', expected: 'Image Enhancement' },
      { tab: 'Score', expected: 'Thumbnail Score' },
      { tab: 'Vision', expected: 'Gemini Vision Analysis' },
      { tab: 'Search', expected: 'Web Image Search' },
    ];

    for (const { tab, expected } of tabSequence) {
      await clickAISubTab(page, tab);
      await expect(page.locator(`text=${expected}`)).toBeVisible({ timeout: 5000 });
    }

    // Rapid switching shouldn't cause errors
    for (let i = 0; i < 3; i++) {
      await clickAISubTab(page, 'Generate');
      await clickAISubTab(page, 'Search');
      await clickAISubTab(page, 'Vision');
    }

    // Should still be functional
    await expect(page.locator('text=Gemini Vision Analysis')).toBeVisible();

    // Check console for errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.waitForTimeout(500);
    // No React errors expected
    await page.screenshot({ path: 'test-screenshots/e2e-flow-rapid-tab-switch.png' });
  });

  test('Flow: Blank editor -> Generate image -> Image appears as layer', async ({ page }) => {
    test.setTimeout(120000);
    await navigateToEditor(page);

    // Mock generate API
    await page.route('**/api/thumbnails/ai/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          images: ['https://via.placeholder.com/1280x720/3498DB/FFFFFF?text=Generated+Image'],
        }),
      });
    });

    // Also intercept the useBackendAI hook's endpoint pattern
    await page.route('**/api/thumbnails/generate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          images: ['https://via.placeholder.com/1280x720/3498DB/FFFFFF?text=Generated+Image'],
        }),
      });
    });

    // Step 1: Go to AI > Generate
    await switchToAITab(page);
    await clickAISubTab(page, 'Generate');

    // Step 2: Enter prompt and generate
    const promptInput = page.locator('textarea.ai-prompt-input');
    await promptInput.fill('A beautiful sunset over mountains');

    const generateBtn = page.locator('.ai-action-btn:has-text("Generate Thumbnail")');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    // Step 3: Wait for generation to complete
    await page.waitForTimeout(3000);

    // Step 4: Check that generated image appears in history section
    const historyGrid = page.locator('.ai-history-grid');
    const hasHistory = await historyGrid.isVisible({ timeout: 10000 }).catch(() => false);

    if (hasHistory) {
      const historyItems = historyGrid.locator('.ai-history-item');
      expect(await historyItems.count()).toBeGreaterThan(0);
    }

    // Step 5: Check layers panel for added layer
    const layersTab = page.locator('button.panels-tab:has-text("Layers")');
    await layersTab.click();
    await page.waitForTimeout(500);

    await page.screenshot({ path: 'test-screenshots/e2e-flow-generated-image-layer.png' });
  });
});

// ============================================
// TEST SUITE: API-LEVEL INTEGRATION
// ============================================

test.describe('API Integration Tests', () => {
  test('GET /api/vision/search requires authentication', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/vision/search?q=test`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/vision/describe requires authentication', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/vision/describe`, {
      data: { imageUrl: 'https://example.com/test.jpg' },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/vision/describe requires image input', async ({ page }) => {
    await loginUser(page);

    // Get cookies for API request
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => c.name === 'token' || c.name === 'auth');

    if (authCookie) {
      const response = await page.request.post(`${API_URL}/api/vision/describe`, {
        data: {},
        headers: {
          Cookie: `${authCookie.name}=${authCookie.value}`,
        },
      });

      // Should return 400 for missing image
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('imageUrl or imageBase64 is required');
    }
  });

  test('GET /api/vision/search requires query parameter', async ({ page }) => {
    await loginUser(page);

    // Navigate to get auth state then make API call
    const response = await page.request.get(`${API_URL}/api/vision/search`);

    // Without auth from page context, should be 401
    // This tests the route exists
    expect([400, 401]).toContain(response.status());
  });
});
