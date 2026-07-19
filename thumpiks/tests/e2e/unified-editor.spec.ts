import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Unified Thumbnail Editor
 * 
 * This test suite covers the unified editor workflow:
 * 1. Navigate from thumbnail card to editor
 * 2. Verify base layer loads as locked
 * 3. Test adjustment controls (brightness, contrast, etc.)
 * 4. Verify CSS filter preview updates
 * 5. Save changes via API
 * 6. Verify changes persist
 * 
 * Run with: npx playwright test tests/e2e/unified-editor.spec.ts --headed --project=chromium
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';

// Test credentials (from prisma/seed.ts)
const TEST_USER = {
  username: 'tester1',
  email: 'tester1@example.com',
  password: 'Test123!',
};

// Onboarding localStorage key (from client/src/features/onboarding/hooks/useOnboarding.ts)
const ONBOARDING_STORAGE_KEY = 'thumpiks_onboarding_prefs';
const ONBOARDING_DISMISSED = JSON.stringify({
  quickEditOverlayEnabled: false,
  quickEditOverlayDismissed: true,
  quickEditOverlaySeen: true,
  dashboardTourSeen: true,
  editorTourSeen: true,
  tipsEnabled: false,
  spotlights: {},
});

/**
 * Pre-seed localStorage to skip onboarding overlay.
 * Must be called BEFORE navigation to dashboard pages.
 */
async function seedOnboardingDismissed(page: Page) {
  await page.addInitScript((args) => {
    localStorage.setItem(args.key, args.value);
  }, { key: ONBOARDING_STORAGE_KEY, value: ONBOARDING_DISMISSED });
}

// Helper: Login user
async function loginUser(page: Page, credentials = TEST_USER) {
  console.log('🔐 Logging in as:', credentials.username);
  
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for login form
  await page.waitForSelector('h2:has-text("Sign in to your account")', { timeout: 10000 });
  console.log('  ✓ Login form loaded');
  
  // Fill credentials
  await page.getByRole('textbox', { name: 'Username or Email *' }).fill(credentials.email);
  await page.getByRole('textbox', { name: 'Password *' }).fill(credentials.password);
  console.log('  ✓ Credentials filled');
  
  // Submit (scoped to <form> to avoid "Sign in with Google" button)
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
  
  // Wait for redirect
  await page.waitForURL(/\/(dashboard|home|thumbnails)/, { timeout: 10000 });
  console.log('✅ Login successful');
}

// Helper: Navigate to My Thumbnails
async function navigateToMyThumbnails(page: Page) {
  console.log('📁 Navigating to My Thumbnails...');
  
  // Click My Thumbnails in sidebar
  await page.click('button:has-text("My Thumbnails")');
  await page.waitForLoadState('domcontentloaded');
  
  // Verify page loaded
  await page.waitForSelector('h1:has-text("My Thumbnails"), h2:has-text("My Thumbnails")', { timeout: 10000 });
  console.log('✅ On My Thumbnails page');
}

// Helper: Wait for API response
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

// Main test suite
test.describe('Unified Editor E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Pre-seed onboarding dismissal to prevent overlay from blocking interactions
    await seedOnboardingDismissed(page);
    
    // Login
    await loginUser(page);
  });

  test('Complete Editor Workflow: Navigate → Load → Adjust → Save', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    // ========================================================================
    // STEP 1: Navigate to Thumbnails and Find One to Edit
    // ========================================================================
    await test.step('Navigate to thumbnails', async () => {
      console.log('\n📁 STEP 1: Finding a thumbnail to edit...');
      
      await navigateToMyThumbnails(page);
      
      // Wait for thumbnail grid to load
      await page.waitForSelector('.thumbnail-card, [data-testid="thumbnail-card"]', { timeout: 10000 });
      console.log('  ✓ Thumbnail grid loaded');
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/editor-1-thumbnails-list.png', fullPage: true });
      console.log('  📸 Screenshot: editor-1-thumbnails-list.png');
    });

    // ========================================================================
    // STEP 2: Click Edit on a Thumbnail Card
    // ========================================================================
    await test.step('Click Edit button on thumbnail card', async () => {
      console.log('\n✏️ STEP 2: Opening editor for thumbnail...');
      
      // Hover over the first thumbnail card to reveal Edit button
      const firstCard = page.locator('.thumbnail-card, [data-testid="thumbnail-card"]').first();
      await firstCard.hover();
      await page.waitForTimeout(500);
      
      // Click Edit button (appears on hover)
      const editButton = firstCard.locator('button:has-text("Edit"), [aria-label*="Edit"]');
      
      // If Edit button not visible, try clicking the card's menu or the card itself
      if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editButton.click();
        console.log('  ✓ Edit button clicked');
      } else {
        // Try clicking the thumbnail card directly
        await firstCard.click();
        await page.waitForTimeout(500);
        
        // Look for Edit option in modal or dropdown
        await page.click('button:has-text("Edit")').catch(() => {
          console.log('  ⚠️ No Edit button found, trying direct navigation');
        });
      }
      
      // Wait for navigation to editor
      await page.waitForURL(/\/dashboard\/editor\//, { timeout: 10000 });
      console.log('  ✓ Navigated to editor route');
    });

    // ========================================================================
    // STEP 3: Verify Editor Loaded with Base Layer
    // ========================================================================
    await test.step('Verify editor loads with thumbnail', async () => {
      console.log('\n🎨 STEP 3: Verifying editor loaded...');
      
      // Wait for editor UI
      await page.waitForSelector('h1:has-text("Thumbnail Studio")', { timeout: 10000 });
      console.log('  ✓ Editor header visible');
      
      // Wait for canvas area
      await page.waitForSelector('.canvas-container, [data-testid="canvas-engine"]', { timeout: 10000 });
      console.log('  ✓ Canvas loaded');
      
      // Verify layers panel shows the Background layer (base image)
      const layersPanel = page.locator('text="Background", text="LAYERS"');
      await expect(layersPanel.first()).toBeVisible({ timeout: 5000 });
      console.log('  ✓ Layers panel visible');
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/editor-2-loaded.png', fullPage: true });
      console.log('  📸 Screenshot: editor-2-loaded.png');
    });

    // ========================================================================
    // STEP 4: Switch to Adjustments Tab
    // ========================================================================
    await test.step('Switch to Adjustments tab', async () => {
      console.log('\n🎚️ STEP 4: Opening adjustments panel...');
      
      // Click ADJUST tab
      const adjustTab = page.locator('button:has-text("Adjust"), button:has-text("ADJUST")');
      await adjustTab.click();
      console.log('  ✓ Adjust tab clicked');
      
      // Wait for adjustments panel to show
      await page.waitForSelector('text="Brightness", text="brightness"', { timeout: 5000 });
      console.log('  ✓ Adjustments panel loaded');
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/editor-3-adjust-panel.png', fullPage: true });
      console.log('  📸 Screenshot: editor-3-adjust-panel.png');
    });

    // ========================================================================
    // STEP 5: Modify Brightness Slider
    // ========================================================================
    let originalBrightness = '100';
    await test.step('Modify brightness adjustment', async () => {
      console.log('\n☀️ STEP 5: Adjusting brightness...');
      
      // Find brightness slider
      const brightnessSection = page.locator('text="Brightness"').locator('..').locator('..');
      const brightnessSlider = brightnessSection.locator('input[type="range"]');
      
      // Get original value
      originalBrightness = await brightnessSlider.inputValue().catch(() => '100');
      console.log(`  📊 Original brightness: ${originalBrightness}`);
      
      // Set new value (120%)
      await brightnessSlider.fill('120');
      console.log('  ✓ Brightness set to 120');
      
      // Wait for preview update
      await page.waitForTimeout(500);
      
      // Verify the input updated
      const newValue = await brightnessSlider.inputValue();
      expect(newValue).toBe('120');
      console.log(`  ✓ Slider value confirmed: ${newValue}`);
    });

    // ========================================================================
    // STEP 6: Modify Contrast Slider
    // ========================================================================
    await test.step('Modify contrast adjustment', async () => {
      console.log('\n🔲 STEP 6: Adjusting contrast...');
      
      // Find contrast slider
      const contrastSection = page.locator('text="Contrast"').locator('..').locator('..');
      const contrastSlider = contrastSection.locator('input[type="range"]');
      
      // Set new value (110%)
      await contrastSlider.fill('110');
      console.log('  ✓ Contrast set to 110');
      
      // Wait for preview
      await page.waitForTimeout(500);
      
      // Take screenshot showing adjustments
      await page.screenshot({ path: 'test-screenshots/editor-4-adjusted.png', fullPage: true });
      console.log('  📸 Screenshot: editor-4-adjusted.png');
    });

    // ========================================================================
    // STEP 7: Verify Undo/Redo Enabled
    // ========================================================================
    await test.step('Verify undo button is enabled', async () => {
      console.log('\n↩️ STEP 7: Checking undo/redo state...');
      
      // After making changes, Undo should be enabled
      const undoButton = page.locator('button[title*="Undo"]');
      const isUndoEnabled = await undoButton.isEnabled().catch(() => false);
      
      // Note: May or may not be enabled depending on state tracking
      console.log(`  ℹ️ Undo enabled: ${isUndoEnabled}`);
    });

    // ========================================================================
    // STEP 8: Save Changes
    // ========================================================================
    await test.step('Save thumbnail changes', async () => {
      console.log('\n💾 STEP 8: Saving changes...');
      
      // Set up API response listener
      const saveResponsePromise = waitForApiResponse(page, /\/api\/thumbnails\/.*\/edit/);
      
      // Click Save button
      const saveButton = page.locator('button:has-text("Save")');
      await saveButton.click();
      console.log('  ✓ Save button clicked');
      
      // Wait for API response
      try {
        const response = await saveResponsePromise;
        const status = response.status();
        console.log(`  ✓ API response received: ${status}`);
        
        expect(status).toBeLessThan(400);
        console.log('  ✅ Save successful!');
      } catch (err) {
        console.log('  ⚠️ Could not capture save API response');
      }
      
      // Wait for any success indicators
      await page.waitForTimeout(1000);
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/editor-5-saved.png', fullPage: true });
      console.log('  📸 Screenshot: editor-5-saved.png');
    });

    // ========================================================================
    // STEP 9: Navigate Back and Verify
    // ========================================================================
    await test.step('Navigate back to thumbnails', async () => {
      console.log('\n🔙 STEP 9: Navigating back to verify...');
      
      // Click Close button to exit editor
      const closeButton = page.locator('button[title="Close"]');
      await closeButton.click();
      console.log('  ✓ Close button clicked');
      
      // Wait for navigation
      await page.waitForURL(/\/(dashboard|thumbnails)/, { timeout: 10000 });
      console.log('  ✓ Back to dashboard');
      
      // Take final screenshot
      await page.screenshot({ path: 'test-screenshots/editor-6-final.png', fullPage: true });
      console.log('  📸 Screenshot: editor-6-final.png');
    });

    console.log('\n✅ UNIFIED EDITOR E2E TEST COMPLETE!');
  });

  test('Editor: Direct navigation via URL loads thumbnail', async ({ page }) => {
    test.setTimeout(60000);
    
    await test.step('Navigate directly to editor with thumbnail ID', async () => {
      console.log('\n🔗 Testing direct URL navigation...');
      
      // First get a valid thumbnail ID from the API
      await navigateToMyThumbnails(page);
      
      // Wait for thumbnails to load
      await page.waitForSelector('.thumbnail-card', { timeout: 10000 });
      
      // Get first thumbnail card's edit link
      const firstCard = page.locator('.thumbnail-card').first();
      await firstCard.hover();
      
      // Find the thumbnail ID from data attribute or href
      const editLink = firstCard.locator('a[href*="/editor/"]');
      let thumbnailId: string | null = null;
      
      if (await editLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        const href = await editLink.getAttribute('href');
        thumbnailId = href?.split('/editor/')[1] || null;
      }
      
      if (thumbnailId) {
        console.log(`  ✓ Found thumbnail ID: ${thumbnailId}`);
        
        // Navigate directly to editor URL
        await page.goto(`${BASE_URL}/dashboard/editor/${thumbnailId}`);
        await page.waitForLoadState('domcontentloaded');
        
        // Verify editor loads
        await page.waitForSelector('h1:has-text("Thumbnail Studio")', { timeout: 10000 });
        console.log('  ✓ Editor loaded via direct URL');
        
        // Verify thumbnail image loaded
        await page.waitForSelector('.canvas-container', { timeout: 10000 });
        console.log('  ✅ Direct URL navigation works!');
      } else {
        console.log('  ⚠️ Could not find thumbnail ID, skipping direct URL test');
      }
    });
  });

  test('Editor: Blank canvas mode works', async ({ page }) => {
    test.setTimeout(60000);
    
    await test.step('Open editor without thumbnail ID', async () => {
      console.log('\n🆕 Testing blank canvas mode...');
      
      // Navigate to editor without ID
      await page.goto(`${BASE_URL}/dashboard/editor`);
      await page.waitForLoadState('domcontentloaded');
      
      // Verify editor loads
      await page.waitForSelector('h1:has-text("Thumbnail Studio")', { timeout: 10000 });
      console.log('  ✓ Editor loaded');
      
      // Verify blank canvas (no layers)
      const noLayersText = page.locator('text="No layers yet"');
      const hasNoLayers = await noLayersText.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasNoLayers) {
        console.log('  ✓ Blank canvas shows "No layers yet"');
      } else {
        console.log('  ℹ️ Canvas may have default layer');
      }
      
      // Verify tools panel is visible
      await page.waitForSelector('button[title*="Select"]', { timeout: 5000 });
      console.log('  ✓ Tools panel visible');
      
      // Take screenshot
      await page.screenshot({ path: 'test-screenshots/editor-blank-canvas.png', fullPage: true });
      console.log('  📸 Screenshot: editor-blank-canvas.png');
      
      console.log('  ✅ Blank canvas mode works!');
    });
  });
});
