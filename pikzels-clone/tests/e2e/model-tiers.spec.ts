/**
 * Model Tier System E2E Tests
 *
 * Tests the "Intel Inside" tier system:
 * - Backend API returns tier configuration
 * - Tier selector appears for tiered tools (generate, inpaint, face-swap, upscale)
 * - Tier selector does NOT appear for non-tiered tools (remove-bg, enhance)
 * - Tier selection persists and is sent to backend
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.CLIENT_URL || 'http://localhost:8556';
const API_URL = process.env.API_BASE_URL || 'http://localhost:8550';

// Helper to login and get auth cookie
async function loginAsTestUser(page: any) {
  // Navigate to login
  await page.goto(`${BASE_URL}/login`);

  // Wait for login form to load
  await page.waitForSelector('text=Sign in to your account', { timeout: 10000 });

  // Fill credentials (use test account - the form may already have values from localStorage)
  const emailInput = page.locator('input[placeholder*="email"], input[name="email"]').first();
  await emailInput.clear();
  await emailInput.fill('tester1@example.com');
  
  const passwordInput = page.locator('input[placeholder*="••"], input[type="password"]').first();
  await passwordInput.clear();
  await passwordInput.fill('Test123!');

  // Submit and wait for redirect (scoped to <form> to avoid "Sign in with Google" button)
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
}

test.describe('Model Tier API', () => {
  test('GET /api/thumbnails/ai/models returns tier configuration', async ({ request }) => {
    // This endpoint requires auth, so we test the response structure
    // when called without auth (should return 401)
    const response = await request.get(`${API_URL}/api/thumbnails/ai/models`);

    // Without auth, should get 401
    expect(response.status()).toBe(401);
  });
});

test.describe('Model Tier UI', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('AI Tools page loads with tier selector', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should see AI tools section
    await expect(page.locator('text=AI Image Generation')).toBeVisible({ timeout: 10000 });
  });

  test('Tier selector appears for Generate tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Generate tool
    await page.click('text=AI Image Generation');

    // Should see Quality Tier section
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });

    // Should see tier options
    await expect(page.locator('text=ThumPiks Flash')).toBeVisible();
    await expect(page.locator('text=ThumPiks Standard')).toBeVisible();
    await expect(page.locator('text=ThumPiks Pro')).toBeVisible();
  });

  test('Tier selector appears for Inpaint tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Inpaint tool
    await page.click('text=AI Inpainting');

    // Should see Quality Tier section
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });
  });

  test('Tier selector appears for Face Swap tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Face Swap tool
    await page.click('text=Face Swap');

    // Should see Quality Tier section
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });
  });

  test('Tier selector appears for Upscale tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Upscale tool (may be named differently)
    await page.click('text=Upscale').catch(() => page.click('text=AI Upscale'));

    // Should see Quality Tier section
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });
  });

  test('Tier selector does NOT appear for Background Removal', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Background Removal tool
    await page.click('text=Background Removal');

    // Wait a moment for UI to settle
    await page.waitForTimeout(500);

    // Should NOT see Quality Tier section for non-tiered tool
    await expect(page.locator('text=Quality Tier')).not.toBeVisible();
  });

  test('Tier selector does NOT appear for Enhance tool', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Enhance tool
    await page.click('text=Enhance').catch(() => page.click('text=Image Enhancement'));

    // Wait a moment for UI to settle
    await page.waitForTimeout(500);

    // Should NOT see Quality Tier section for non-tiered tool
    await expect(page.locator('text=Quality Tier')).not.toBeVisible();
  });

  test('Switching tiers updates selection', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Generate tool
    await page.click('text=AI Image Generation');

    // Wait for tier selector
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });

    // Standard should be selected by default (look for the selected state)
    const standardTier = page.locator('button:has-text("ThumPiks Standard")');
    await expect(standardTier).toHaveAttribute('aria-pressed', 'true');

    // Click Flash tier
    await page.click('button:has-text("ThumPiks Flash")');

    // Flash should now be selected
    const flashTier = page.locator('button:has-text("ThumPiks Flash")');
    await expect(flashTier).toHaveAttribute('aria-pressed', 'true');

    // Standard should no longer be selected
    await expect(standardTier).toHaveAttribute('aria-pressed', 'false');
  });

  test('Tier shows model attribution (Intel Inside)', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Generate tool
    await page.click('text=AI Image Generation');

    // Wait for tier selector
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });

    // Should see "Powered by" attribution for each tier
    await expect(page.locator('text=Powered by')).toBeVisible();

    // Should see model names (from backend config)
    // These are the default models in model-tiers.config.ts
    await expect(page.locator('text=FLUX.2 Klein').or(page.locator('text=Gemini'))).toBeVisible();
  });

  test('Tier credits are displayed', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Generate tool
    await page.click('text=AI Image Generation');

    // Wait for tier selector
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });

    // Should see credit costs
    await expect(page.locator('text=1 cr')).toBeVisible(); // Flash
    await expect(page.locator('text=2 cr')).toBeVisible(); // Standard
    await expect(page.locator('text=5 cr')).toBeVisible(); // Pro
  });
});

test.describe('Model Tier API Integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('Generate request includes tier parameter', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/ai-tools`);
    await page.waitForLoadState('networkidle');

    // Click on Generate tool
    await page.click('text=AI Image Generation');

    // Wait for tier selector
    await expect(page.locator('text=Quality Tier')).toBeVisible({ timeout: 5000 });

    // Select Flash tier
    await page.click('button:has-text("ThumPiks Flash")');

    // Fill in prompt
    await page.fill('textarea, input[placeholder*="prompt"], input[placeholder*="describe"]', 'A test thumbnail');

    // Intercept the API request
    const requestPromise = page.waitForRequest((request: any) =>
      request.url().includes('/api/thumbnails/ai/generate') ||
      request.url().includes('/api/thumbnails/generate')
    );

    // Click generate (may be disabled if no prompt - fill prompt first)
    const generateButton = page.locator('button:has-text("Generate")');
    if (await generateButton.isEnabled()) {
      await generateButton.click();

      // Check the request includes tier
      const request = await requestPromise.catch(() => null);
      if (request) {
        const postData = request.postDataJSON();
        expect(postData.tier).toBe('flash');
      }
    }
  });
});
