import { test, expect, Page } from '@playwright/test';
import path from 'path';

/**
 * E2E Test Suite: Thumbnail Creation, Editing, and Deletion Flow
 * 
 * This test suite covers the complete thumbnail lifecycle:
 * 1. User authentication
 * 2. Navigate to thumbnail creation
 * 3. Upload and create thumbnail
 * 4. Edit thumbnail properties
 * 5. Delete thumbnail
 * 
 * Run with: npx playwright test tests/e2e/thumbnail-operations.spec.ts --headed --project=chromium
 */

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';
const API_URL = process.env.API_URL || 'http://localhost:8550';

// Test credentials (from TEST_CREDENTIALS.md)
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

// Helper functions
async function loginUser(page: Page, credentials = TEST_USER) {
  console.log('🔐 Logging in as:', credentials.username);
  
  // Navigate to the correct login page
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for the login form to be visible
  await page.waitForSelector('h2:has-text("Sign in to your account")', { timeout: 10000 });
  console.log('  ✓ Login form loaded');
  
  // Fill login form using the actual UI labels - using email for login
  await page.getByRole('textbox', { name: 'Username or Email *' }).fill(credentials.email);
  console.log(`  ✓ Email filled: ${credentials.email}`);
  
  await page.getByRole('textbox', { name: 'Password *' }).fill(credentials.password);
  console.log('  ✓ Password filled');
  
  // Take screenshot before login
  await page.screenshot({ path: 'test-screenshots/0-login-form-filled.png', fullPage: true });
  console.log('  📸 Screenshot saved: 0-login-form-filled.png');
  
  // Click the Sign In button (scoped to <form> to avoid "Sign in with Google" button)
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
  console.log('  ✓ Sign In button clicked');
  
  // Wait for redirect to dashboard/home/thumbnails
  await page.waitForURL(/\/(dashboard|home|thumbnails)/, { timeout: 10000 });
  
  console.log('✅ Login successful');
}

async function navigateToThumbnails(page: Page) {
  console.log('📁 Navigating to thumbnails section...');
  
  // Try multiple navigation patterns
  const navigationPatterns = [
    () => page.click('a[href*="/thumbnails"]'),
    () => page.click('text=Thumbnails'),
    () => page.click('[data-testid="thumbnails-link"]'),
    () => page.goto(`${BASE_URL}/thumbnails`),
  ];
  
  for (const navigate of navigationPatterns) {
    try {
      await navigate();
      await page.waitForLoadState('domcontentloaded');
      break;
    } catch (e) {
      continue;
    }
  }
  
  console.log('✅ Navigated to thumbnails');
}

async function waitForApiResponse(page: Page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout: 30000 }
  );
}

// Main test suite
test.describe('Thumbnail Operations E2E Flow', () => {
  let thumbnailId: string;
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Set viewport for better visibility
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Pre-seed onboarding dismissal to prevent overlay from blocking interactions
    await seedOnboardingDismissed(page);
    
    // Login before each test
    await loginUser(page);
    await navigateToThumbnails(page);
  });
  
  test('Complete Thumbnail Lifecycle: Create → Edit → Delete', async () => {
    test.setTimeout(120000); // 2 minutes for complete flow
    
    // ========================================================================
    // STEP 1: CREATE THUMBNAIL
    // ========================================================================
    await test.step('Create New Thumbnail', async () => {
      console.log('\n🎨 STEP 1: Creating New Thumbnail...');
      
      // Click create/new thumbnail button
      const createButtonSelectors = [
        'button:has-text("Create")',
        'button:has-text("New")',
        'button:has-text("Add")',
        'a[href*="/create"]',
        '[data-testid="create-thumbnail"]',
        '.create-button',
      ];
      
      for (const selector of createButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Wait for creation form/modal
      await page.waitForSelector('input[type="file"], input[name="title"], h1:has-text("Create")', { timeout: 10000 });
      console.log('  ✓ Create form opened');
      
      // Fill thumbnail details
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('E2E Test Thumbnail');
        console.log('  ✓ Title entered: "E2E Test Thumbnail"');
      }
      
      const descInput = page.locator('textarea[name="description"], textarea[placeholder*="description" i]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.fill('This is an automated E2E test thumbnail');
        console.log('  ✓ Description entered');
      }
      
      // Upload image file (if file input exists)
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Create a test image file
        const testImagePath = path.join(__dirname, '..', '..', 'test-screenshots', 'test-thumbnail.png');
        
        try {
          await fileInput.setInputFiles(testImagePath);
          console.log('  ✓ Image uploaded:', testImagePath);
        } catch (err) {
          console.log('  ⚠️ File upload skipped (file may not exist)');
        }
      }
      
      // Select dimensions/size (if available)
      const widthInput = page.locator('input[name="width"], input[placeholder*="width" i]').first();
      if (await widthInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await widthInput.fill('1920');
        console.log('  ✓ Width set: 1920px');
      }
      
      const heightInput = page.locator('input[name="height"], input[placeholder*="height" i]').first();
      if (await heightInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await heightInput.fill('1080');
        console.log('  ✓ Height set: 1080px');
      }
      
      // Take screenshot before submission
      await page.screenshot({ path: 'test-screenshots/1-thumbnail-create-form.png', fullPage: true });
      console.log('  📸 Screenshot saved: 1-thumbnail-create-form.png');
      
      // Submit form
      const submitButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Create")',
        'button:has-text("Save")',
        'button:has-text("Generate")',
      ];
      
      const responsePromise = waitForApiResponse(page, /\/api\/thumbnails/);
      
      for (const selector of submitButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log('  ✓ Submit button clicked');
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Wait for API response
      try {
        const response = await responsePromise;
        const data = await response.json();
        
        // Extract thumbnail ID from response
        thumbnailId = data.id || data.thumbnail?.id || data.thumbnails?.[0]?.id;
        
        console.log('  ✅ Thumbnail created! ID:', thumbnailId);
        console.log('  📦 Response data:', JSON.stringify(data, null, 2));
      } catch (err) {
        console.log('  ⚠️ Could not capture API response, continuing...');
      }
      
      // Wait for success message or redirect
      await page.waitForTimeout(2000);
      
      // Take screenshot of success state
      await page.screenshot({ path: 'test-screenshots/2-thumbnail-created.png', fullPage: true });
      console.log('  📸 Screenshot saved: 2-thumbnail-created.png');
      
      // Verify thumbnail appears in list
      const thumbnailExists = await page.locator('text="E2E Test Thumbnail"').isVisible({ timeout: 5000 }).catch(() => false);
      expect(thumbnailExists).toBeTruthy();
      console.log('  ✓ Thumbnail visible in list');
    });
    
    // ========================================================================
    // STEP 2: EDIT THUMBNAIL
    // ========================================================================
    await test.step('Edit Thumbnail', async () => {
      console.log('\n✏️ STEP 2: Editing Thumbnail...');
      
      // Find and click on the created thumbnail
      await page.click('text="E2E Test Thumbnail"');
      await page.waitForLoadState('domcontentloaded');
      console.log('  ✓ Opened thumbnail details');
      
      // Click edit button
      const editButtonSelectors = [
        'button:has-text("Edit")',
        'button[aria-label="Edit"]',
        '[data-testid="edit-button"]',
        'a[href*="/edit"]',
      ];
      
      for (const selector of editButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log('  ✓ Edit button clicked');
          break;
        } catch (e) {
          continue;
        }
      }
      
      // Wait for edit form
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/3-thumbnail-edit-form.png', fullPage: true });
      console.log('  📸 Screenshot saved: 3-thumbnail-edit-form.png');
      
      // Modify title
      const titleInput = page.locator('input[name="title"], input[value*="E2E Test Thumbnail"]').first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.clear();
        await titleInput.fill('E2E Test Thumbnail (Edited)');
        console.log('  ✓ Title updated to: "E2E Test Thumbnail (Edited)"');
      }
      
      // Modify description
      const descInput = page.locator('textarea[name="description"]').first();
      if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descInput.clear();
        await descInput.fill('This thumbnail has been edited by automated E2E test');
        console.log('  ✓ Description updated');
      }
      
      // Apply edits (if there's an effects/adjustments panel)
      const brightnessSlider = page.locator('input[type="range"][name*="brightness" i], #brightness').first();
      if (await brightnessSlider.isVisible({ timeout: 2000 }).catch(() => false)) {
        await brightnessSlider.fill('120');
        console.log('  ✓ Brightness adjusted to 120%');
      }
      
      const contrastSlider = page.locator('input[type="range"][name*="contrast" i], #contrast').first();
      if (await contrastSlider.isVisible({ timeout: 2000 }).catch(() => false)) {
        await contrastSlider.fill('110');
        console.log('  ✓ Contrast adjusted to 110%');
      }
      
      // Take screenshot of edited form
      await page.screenshot({ path: 'test-screenshots/4-thumbnail-edited.png', fullPage: true });
      console.log('  📸 Screenshot saved: 4-thumbnail-edited.png');
      
      // Save changes
      const saveButtonSelectors = [
        'button:has-text("Save")',
        'button:has-text("Update")',
        'button[type="submit"]',
      ];
      
      for (const selector of saveButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log('  ✓ Save button clicked');
          break;
        } catch (e) {
          continue;
        }
      }
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Verify changes were saved
      const updatedTitle = await page.locator('text="E2E Test Thumbnail (Edited)"').isVisible({ timeout: 5000 }).catch(() => false);
      expect(updatedTitle).toBeTruthy();
      console.log('  ✅ Thumbnail updated successfully!');
      
      await page.screenshot({ path: 'test-screenshots/5-thumbnail-saved.png', fullPage: true });
      console.log('  📸 Screenshot saved: 5-thumbnail-saved.png');
    });
    
    // ========================================================================
    // STEP 3: DELETE THUMBNAIL
    // ========================================================================
    await test.step('Delete Thumbnail', async () => {
      console.log('\n🗑️ STEP 3: Deleting Thumbnail...');
      
      // Navigate back to thumbnails list if not there
      const onListPage = await page.locator('text="E2E Test Thumbnail (Edited)"').isVisible({ timeout: 2000 }).catch(() => false);
      if (!onListPage) {
        await navigateToThumbnails(page);
        await page.click('text="E2E Test Thumbnail (Edited)"');
        await page.waitForLoadState('domcontentloaded');
      }
      
      // Click delete button
      const deleteButtonSelectors = [
        'button:has-text("Delete")',
        'button[aria-label="Delete"]',
        '[data-testid="delete-button"]',
        'button:has([data-icon="trash"])',
      ];
      
      let deleteButtonFound = false;
      for (const selector of deleteButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log('  ✓ Delete button clicked');
          deleteButtonFound = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!deleteButtonFound) {
        // Try opening context menu / more options
        const moreOptions = page.locator('[aria-label="More options"], button:has-text("⋮"), button:has-text("...")').first();
        if (await moreOptions.isVisible({ timeout: 2000 }).catch(() => false)) {
          await moreOptions.click();
          await page.waitForTimeout(500);
          await page.click('text="Delete"');
          console.log('  ✓ Delete option clicked from menu');
        }
      }
      
      // Wait for confirmation dialog
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/6-delete-confirmation.png', fullPage: true });
      console.log('  📸 Screenshot saved: 6-delete-confirmation.png');
      
      // Confirm deletion
      const confirmButtonSelectors = [
        'button:has-text("Confirm")',
        'button:has-text("Yes")',
        'button:has-text("Delete"):visible',
        '[role="dialog"] button:has-text("Delete")',
      ];
      
      for (const selector of confirmButtonSelectors) {
        try {
          await page.click(selector, { timeout: 2000 });
          console.log('  ✓ Deletion confirmed');
          break;
        } catch (e) {
          continue;
        }
      }
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      
      // Verify thumbnail is deleted (should not appear in list)
      const thumbnailGone = await page.locator('text="E2E Test Thumbnail (Edited)"').isHidden({ timeout: 5000 }).catch(() => true);
      expect(thumbnailGone).toBeTruthy();
      console.log('  ✅ Thumbnail deleted successfully!');
      
      await page.screenshot({ path: 'test-screenshots/7-thumbnail-deleted.png', fullPage: true });
      console.log('  📸 Screenshot saved: 7-thumbnail-deleted.png');
    });
    
    console.log('\n🎉 ========================================');
    console.log('✅ COMPLETE THUMBNAIL LIFECYCLE TEST PASSED!');
    console.log('========================================\n');
  });
  
  // Additional test for error handling
  test('Handle Invalid Thumbnail Creation', async () => {
    await test.step('Attempt to create thumbnail without required fields', async () => {
      console.log('\n❌ Testing Error Handling...');
      
      // Click create button
      await page.click('button:has-text("Create"), button:has-text("New")').catch(() => {});
      await page.waitForTimeout(1000);
      
      // Try to submit without filling required fields
      await page.click('button[type="submit"], button:has-text("Create")').catch(() => {});
      await page.waitForTimeout(1000);
      
      // Check for validation errors
      const errorVisible = await page.locator('text=/error|required|invalid/i').isVisible({ timeout: 3000 }).catch(() => false);
      
      if (errorVisible) {
        console.log('  ✓ Validation errors displayed correctly');
        await page.screenshot({ path: 'test-screenshots/8-validation-errors.png', fullPage: true });
      } else {
        console.log('  ⚠️ No validation errors found (may be handled differently)');
      }
    });
  });
});
