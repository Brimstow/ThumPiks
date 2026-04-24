import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Review System
 *
 * Covers:
 *   1. SANITY  — Page loads, elements render, stats display, placeholders show
 *   2. CREATE  — Authenticated user submits a review
 *   3. FLOW    — Full user journey: login → write → see status → edit → delete
 *   4. EDGE    — Empty body, XSS attempt, duplicate review, unauthenticated access
 *
 * Run:
 *   node node_modules/@playwright/test/cli.js test tests/e2e/review-system.spec.ts --project=chromium-headless
 *
 * Prerequisites:
 *   - Backend on localhost:8550, Frontend on localhost:8556 (per AGENTS.md §189-194)
 *   - tester1@example.com seeded in the DB
 *
 * Failure Classification Log (per AGENTS.md §1024-1084):
 *   - Login "Sign In" resolves 2 buttons → Category C: Google OAuth button text
 *     contains "Sign in". Fix: scope selector to <form>, not app bug.
 *   - Onboarding overlay blocks dashboard → By design for new users (localStorage).
 *     Fix: pre-seed localStorage in test setup.
 *   - Review card not visible → Category A: imperative sessionStorage.getItem() +
 *     DOM .remove() in JSX. Fixed in DashboardHome.tsx → React state.
 */

// DRY: Single source for API URL (baseURL comes from playwright.config.ts)
const API_URL = process.env.API_URL || 'http://localhost:8550';

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

// ─── Helpers ──────────────────────────────────────────────

/**
 * Pre-seed localStorage to skip onboarding overlay.
 * Must be called AFTER page.goto() but BEFORE the dashboard renders.
 * We navigate to a blank origin page first to set storage, then navigate to target.
 */
async function seedOnboardingDismissed(page: Page) {
  await page.addInitScript((args) => {
    localStorage.setItem(args.key, args.value);
  }, { key: ONBOARDING_STORAGE_KEY, value: ONBOARDING_DISMISSED });
}

/**
 * Login via the Login page. Uses form-scoped selector for "Sign In" button
 * to avoid ambiguity with "Sign in with Google" (Category C — test selector fix).
 */
async function loginUser(page: Page, credentials = TEST_USER) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h2:has-text("Sign in to your account")', { timeout: 10000 });
  await page.getByRole('textbox', { name: 'Username or Email *' }).fill(credentials.username);
  await page.getByRole('textbox', { name: 'Password *' }).fill(credentials.password);
  // Scoped to <form> to avoid "Sign in with Google" button (Category C fix)
  await page.locator('form').getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 15000 });
}

/**
 * Delete the test user's review via browser-side fetch.
 * page.request doesn't share HttpOnly cookies with the browser context,
 * so we use page.evaluate to call fetch with credentials: 'include'.
 */
async function deleteReviewViaBrowser(page: Page) {
  await page.evaluate(async (apiUrl) => {
    try {
      await fetch(`${apiUrl}/api/reviews/mine`, {
        method: 'DELETE',
        credentials: 'include',
      });
    } catch {
      // 404 = no review to delete — expected
    }
  }, API_URL);
}

// ─── 1. SANITY — Public page loads correctly ─────────────

test.describe('Review Page — Sanity', () => {
  test('renders hero section with Creator Reviews heading', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toContainText('Creator');
    await expect(page.locator('h1')).toContainText('Reviews');
    await expect(page.locator('header')).toContainText('ThumPiks');
  });

  test('displays 4 stat cards with correct labels', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    const statCards = page.locator('.grid.grid-cols-2 > div');
    await expect(statCards).toHaveCount(4);

    await expect(page.getByText('Active Creators')).toBeVisible();
    await expect(page.getByText('Thumbnails Generated')).toBeVisible();
    await expect(page.getByText('Avg Creator Rating')).toBeVisible();
    // "Reviews" text appears in multiple places; scope to the stat card
    await expect(page.locator('div').filter({ hasText: /^Reviews$/ })).toBeVisible();
  });

  test('shows placeholder or real reviews grid section', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    // Either "Be the First" (no reviews) or "What Creators Are Saying" (has reviews)
    const gridSection = page.locator('section').filter({ hasText: /Be the First|What Creators/ });
    await expect(gridSection).toBeVisible();
  });

  test('shows Sign In to Review button for unauthenticated visitors', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    // Two instances exist (hero + bottom CTA); verify at least one is visible
    await expect(page.getByRole('button', { name: /Sign In to Review/i }).first()).toBeVisible();
  });

  test('Sign In to Review button navigates to login', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /Sign In to Review/i }).first().click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test('stats API returns correct shape', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/reviews/stats`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data).toHaveProperty('totalReviews');
    expect(data).toHaveProperty('averageRating');
    expect(data).toHaveProperty('totalUsers');
    expect(data).toHaveProperty('totalThumbnails');
    expect(typeof data.totalUsers).toBe('number');
    expect(typeof data.totalThumbnails).toBe('number');
  });

  test('public reviews API returns reviews array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/reviews/public`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data).toHaveProperty('reviews');
    expect(Array.isArray(data.reviews)).toBeTruthy();
  });

  test('footer contains copyright notice', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('footer')).toContainText('ThumPiks LLC');
  });
});

// ─── 2. CREATE — Authenticated review submission ─────────

test.describe('Review Creation', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDismissed(page);
    await loginUser(page);
    await deleteReviewViaBrowser(page);
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');
  });

  test('shows Write a Review button when user has no review', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Write a Review/i })).toBeVisible();
  });

  test('renders review form with all fields for authenticated user', async ({ page }) => {
    await expect(page.locator('#review-form')).toBeVisible();
    await expect(page.getByText('Write Your Review')).toBeVisible();
    await expect(page.getByText('Rating *')).toBeVisible();
    await expect(page.getByText('Your Review *')).toBeVisible();
    await expect(page.getByPlaceholder('Sum up your experience in a few words')).toBeVisible();
    await expect(page.getByPlaceholder('Share your honest experience with ThumPiks...')).toBeVisible();
  });

  test('submits review with all fields and shows pending status', async ({ page }) => {
    await page.getByRole('button', { name: 'Rate 4 stars' }).click();
    await page.getByPlaceholder('Sum up your experience in a few words').fill('Great tool for thumbnails');
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(
      'ThumPiks has been a great addition to my workflow. The AI generation is fast and the editor is intuitive.'
    );
    await page.getByPlaceholder('@YourChannel').fill('@TestChannel');
    await page.getByPlaceholder('e.g. 50K').fill('10K');
    await page.getByPlaceholder('e.g. Gaming, Tech').fill('Testing');
    await page.getByPlaceholder('e.g. +120% CTR, 3 hrs/week saved').fill('+50% CTR');

    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/pending approval/i)).toBeVisible({ timeout: 5000 });
  });

  test('submits minimal review with body only (rating defaults to 5)', async ({ page }) => {
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(
      'Solid tool, works well for basic thumbnail needs.'
    );

    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });
  });
});

// ─── 3. FLOW — Full user journey ─────────────────────────

test.describe('Review Flow — Full Journey', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDismissed(page);
    await loginUser(page);
    await deleteReviewViaBrowser(page);
  });

  test('write → see pending → edit → delete cycle', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    // Write
    await page.getByPlaceholder('Sum up your experience in a few words').fill('Initial Review');
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(
      'This is my initial honest review of ThumPiks as a content creator.'
    );
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });

    // See pending
    await expect(page.getByText(/pending approval/i)).toBeVisible();

    // Edit
    await page.getByRole('button', { name: /Edit/i }).first().click();
    await expect(page.getByText('Edit Your Review')).toBeVisible();
    const bodyField = page.getByPlaceholder('Share your honest experience with ThumPiks...');
    await bodyField.clear();
    await bodyField.fill('Updated review: ThumPiks has improved since my initial review!');
    await page.getByRole('button', { name: /Update Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });

    // Delete
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Are you sure');
      await dialog.accept();
    });
    await page.getByRole('button', { name: /Delete/i }).first().click();
    await expect(page.getByRole('button', { name: /Write a Review/i })).toBeVisible({ timeout: 10000 });
  });

  test('dashboard sidebar contains Leave a Review link that navigates to /reviews', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const sidebarReviewBtn = page.locator('nav button[aria-label="Leave a Review"]');
    await expect(sidebarReviewBtn).toBeVisible();
    await sidebarReviewBtn.click();
    await page.waitForURL(/\/reviews/, { timeout: 10000 });
  });

  test('dashboard home shows review prompt card and navigates to /reviews', async ({ page }) => {
    // Ensure review prompt is not dismissed for this session
    await page.evaluate(() => sessionStorage.removeItem('reviewPromptDismissed'));
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Enjoying ThumPiks?')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Your honest review helps other creators discover us')).toBeVisible();

    // Click "Leave a Review" in the prompt card (scoped to main content area, not sidebar)
    const cardBtn = page.getByRole('main').getByRole('button', { name: 'Leave a Review' });
    await cardBtn.click();
    await page.waitForURL(/\/reviews/, { timeout: 10000 });
  });

  test('review prompt card dismisses and stays hidden', async ({ page }) => {
    await page.evaluate(() => sessionStorage.removeItem('reviewPromptDismissed'));
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');

    const promptCard = page.getByText('Enjoying ThumPiks?');
    await expect(promptCard).toBeVisible({ timeout: 5000 });

    await page.locator('[aria-label="Dismiss review prompt"]').click();
    await expect(promptCard).not.toBeVisible({ timeout: 3000 });
  });
});

// ─── 4. EDGE CASES ───────────────────────────────────────

test.describe('Review Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await seedOnboardingDismissed(page);
    await loginUser(page);
    await deleteReviewViaBrowser(page);
  });

  test('submit button is disabled when review body is empty', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    const submitBtn = page.getByRole('button', { name: /Submit Review/i });
    await expect(submitBtn).toBeDisabled();
  });

  test('unauthenticated POST to /api/reviews returns 401', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/reviews`, {
      data: { rating: 5, body: 'Unauthorized review attempt' },
    });
    expect(res.status()).toBe(401);
  });

  test('duplicate review submission returns 400 or 409', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    // Create first review
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(
      'First review for duplicate test.'
    );
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });

    // Try duplicate via browser fetch (shares auth cookies)
    const status = await page.evaluate(async (apiUrl) => {
      const res = await fetch(`${apiUrl}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rating: 3, body: 'Duplicate attempt.' }),
      });
      return res.status;
    }, API_URL);

    expect([400, 409]).toContain(status);
  });

  test('XSS payload in review body does not render as HTML', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(xssPayload);
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });

    // No injected <script> tags in DOM
    expect(await page.locator('script:has-text("xss")').count()).toBe(0);
  });

  test('1999-character review body submits and shows character count', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    const longBody = 'A'.repeat(1999);
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(longBody);
    await expect(page.getByText('1999/2000')).toBeVisible();

    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });
  });

  test('star rating buttons toggle filled stars correctly', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    const formStars = page.locator('#review-form svg[class*="fill-yellow"]');

    await page.getByRole('button', { name: 'Rate 1 star' }).click();
    await expect(formStars).toHaveCount(1);

    await page.getByRole('button', { name: 'Rate 3 stars' }).click();
    await expect(formStars).toHaveCount(3);

    await page.getByRole('button', { name: 'Rate 5 stars' }).click();
    await expect(formStars).toHaveCount(5);
  });

  test('cancelling delete confirmation keeps review intact', async ({ page }) => {
    await page.goto('/reviews');
    await page.waitForLoadState('networkidle');

    // Create a review first
    await page.getByPlaceholder('Share your honest experience with ThumPiks...').fill(
      'Review to test cancel delete.'
    );
    await page.getByRole('button', { name: /Submit Review/i }).click();
    await expect(page.getByText(/Thank you for your review/i)).toBeVisible({ timeout: 10000 });

    // Cancel the delete dialog
    page.on('dialog', async (dialog) => await dialog.dismiss());
    await page.getByRole('button', { name: /Delete/i }).first().click();

    // Review should still be visible
    await expect(page.getByText(/pending approval/i)).toBeVisible();
  });

  test('landing page reviews section renders without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const reviewsSection = page.locator('#reviews');
    if (await reviewsSection.isVisible()) {
      await expect(reviewsSection).toContainText(/Saying|First/);
    }
  });
});
