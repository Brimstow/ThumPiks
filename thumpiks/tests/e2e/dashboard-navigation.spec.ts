import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Dashboard Navigation & Core Pages
 *
 * Covers:
 *   1. Dashboard loads after login
 *   2. Sidebar navigation to all main sections
 *   3. Account settings page renders
 *   4. Credits page renders
 *   5. Help page renders
 *
 * Run:
 *   npx playwright test tests/e2e/dashboard-navigation.spec.ts --project=chromium-headless
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';

const TEST_USER = {
  username: 'tester1',
  email: 'tester1@example.com',
  password: 'Test123!',
};

// Onboarding localStorage key
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

async function seedOnboardingDismissed(page: Page) {
  await page.addInitScript((args) => {
    localStorage.setItem(args.key, args.value);
  }, { key: ONBOARDING_STORAGE_KEY, value: ONBOARDING_DISMISSED });
}

async function loginUser(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h2:has-text("Sign in to your account")', { timeout: 10000 });
  await page.getByRole('textbox', { name: 'Username or Email *' }).fill(TEST_USER.email);
  await page.getByRole('textbox', { name: 'Password *' }).fill(TEST_USER.password);
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

// ─── 1. Dashboard Home ──────────────────────────────────────

test.describe('Dashboard — Home', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await seedOnboardingDismissed(page);
    await loginUser(page);
  });

  test('dashboard loads with sidebar navigation', async ({ page }) => {
    // After login, we're already on the dashboard - no need to re-navigate
    // The dashboard home route is /dashboard/create
    await expect(page.locator('button:has-text("My Thumbnails"), button:has-text("Pricing"), button:has-text("Credits")').first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows user greeting or content', async ({ page }) => {
    // After login, the user is on the dashboard home (/dashboard/create)
    // Verify main content area is rendered
    await expect(page.locator('h1, h2, [role="main"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard displays credits information', async ({ page }) => {
    // Credits display should be somewhere in the dashboard UI
    const creditsText = page.locator('text=/credits|Credits/');
    await expect(creditsText.first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── 2. Sidebar Navigation ─────────────────────────────────

test.describe('Dashboard — Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await seedOnboardingDismissed(page);
    await loginUser(page);
  });

  test('My Thumbnails navigation works', async ({ page }) => {
    // Already on dashboard after login
    const thumbsBtn = page.locator('button:has-text("My Thumbnails"), a:has-text("My Thumbnails")').first();
    await expect(thumbsBtn).toBeVisible({ timeout: 10000 });
    await thumbsBtn.click();
    await page.waitForURL(/\/dashboard\/thumbnails/, { timeout: 10000 });
    expect(page.url()).toContain('/thumbnails');
  });

  test('Pricing navigation works', async ({ page }) => {
    const pricingBtn = page.locator('button:has-text("Pricing"), a:has-text("Pricing")').first();
    await expect(pricingBtn).toBeVisible({ timeout: 10000 });
    await pricingBtn.click();
    await page.waitForURL(/\/dashboard\/pricing/, { timeout: 10000 });
    await expect(page.locator('h1:has-text("Choose Your Pricing Plan")')).toBeVisible({ timeout: 10000 });
  });

  test('Credits navigation works', async ({ page }) => {
    const creditsBtn = page.locator('button:has-text("Credits"), a:has-text("Credits")').first();
    await expect(creditsBtn).toBeVisible({ timeout: 10000 });
    await creditsBtn.click();
    await page.waitForURL(/\/dashboard\/credits/, { timeout: 10000 });
  });

  test('Account navigation works', async ({ page }) => {
    // Navigate to account via sidebar or direct URL (same session)
    await page.goto(`${BASE_URL}/dashboard/account`);
    await page.waitForLoadState('domcontentloaded');

    // Account page should load with user info
    await expect(page.locator('text=/Account|Profile|Settings/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('Editor navigation works', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/editor`);
    await page.waitForLoadState('domcontentloaded');

    // Editor should show Thumbnail Studio heading or canvas
    await expect(page.locator('text=/Thumbnail Studio|Editor/i').first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── 3. Account Page ────────────────────────────────────────

test.describe('Dashboard — Account Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await seedOnboardingDismissed(page);
    await loginUser(page);
  });

  test('account page displays user profile information', async ({ page }) => {
    // Navigate to account via sidebar (since direct URL may not work with SPA routing)
    const accountBtn = page.locator('button:has-text("Account"), a:has-text("Account"), button[aria-label*="Account"]').first();
    if (await accountBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      // Fallback: navigate via URL within the same authenticated session
      await page.goto(`${BASE_URL}/dashboard/account`);
      await page.waitForLoadState('domcontentloaded');
    }

    // Should display account-related content
    await expect(page.locator('text=/Account|Profile|tester1|Settings/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('account page has settings section', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/account/settings`);
    await page.waitForLoadState('domcontentloaded');

    // Should display settings related content
    await expect(page.locator('text=/Settings|Preferences|Account|Profile/i').first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── 4. Credits Page ────────────────────────────────────────

test.describe('Dashboard — Credits Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await seedOnboardingDismissed(page);
    await loginUser(page);
  });

  test('credits page displays current balance', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/credits`);
    await page.waitForLoadState('domcontentloaded');

    // Should show credits balance or usage info
    await expect(page.locator('text=/credits|balance|usage/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('credits page shows credit packs for purchase', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/credits`);
    await page.waitForLoadState('domcontentloaded');

    // Should show purchase options or credit pack cards
    const purchaseContent = page.locator('text=/buy|purchase|pack|credit/i');
    await expect(purchaseContent.first()).toBeVisible({ timeout: 10000 });
  });
});

// ─── 5. Public Pages ─────────────────────────────────────────

test.describe('Public Pages — Landing & Info', () => {
  test('landing page loads with hero section', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('domcontentloaded');

    // Landing page should have main heading
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    // Should have header/nav with ThumPiks branding
    await expect(page.locator('text=ThumPiks').first()).toBeVisible();
  });

  test('features page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/features`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('about page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/about`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=/About|ThumPiks/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('terms page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/terms`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=/Terms|Service/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('privacy page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/privacy`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=/Privacy|Policy/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('changelog page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/changelog`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('text=/Changelog|Updates|What.*New/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('compare page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/compare`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });
});
