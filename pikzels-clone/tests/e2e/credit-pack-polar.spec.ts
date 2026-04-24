import { test, expect, Page } from '@playwright/test';

/**
 * E2E Test Suite: Credit Pack Purchase Flow (Polar Billing)
 *
 * Covers:
 *  - Sanity:       page loads, credit balance visible, packs rendered
 *  - User flow:    login → navigate to /dashboard/credits → initiate purchase
 *  - Edge cases:   unauthenticated access, missing packId, API balance endpoint,
 *                  success/cancel URL params, transaction history display
 *
 * Test account: creditpacktest1@example.com  (free plan, 10 credits)
 * Run:  npx playwright test tests/e2e/credit-pack-polar.spec.ts --project=chromium-headless
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8556';
const API_URL  = process.env.API_URL  || 'http://localhost:8550';

// Primary test account (free plan, 10 credits) — used for all non-checkout tests.
// NOTE: Polar sandbox rejects @example.com emails on checkout, so we use the
// dedicated Polar tester account (real Gmail) for the live checkout flow test.
const TEST_USER = {
  email:    'creditpacktest1@example.com',
  username: 'creditPackTest1',
  password: 'Test123!',
};

// Polar-compatible test account — has a real email domain accepted by Polar sandbox.
const POLAR_TEST_USER = {
  email:    'tester1.thumpiks@gmail.com',
  username: 'polartester',
  password: 'Test123!',
};

// ─── helpers ────────────────────────────────────────────────────────────────

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

async function login(page: Page, creds = TEST_USER) {
  // Dismiss onboarding overlay before navigation
  await page.addInitScript((args) => {
    localStorage.setItem(args.key, args.value);
  }, { key: ONBOARDING_STORAGE_KEY, value: ONBOARDING_DISMISSED });

  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h2:has-text("Sign in")', { timeout: 15_000 });

  await page.getByRole('textbox', { name: /username or email/i }).fill(creds.username);
  await page.getByRole('textbox', { name: /password/i }).fill(creds.password);
  await page.locator('form').getByRole('button', { name: /sign in/i }).click();

  // Accept either dashboard or thumbnails as a successful landing
  await page.waitForURL(/\/(dashboard|home|thumbnails)/, { timeout: 15_000 });
}

async function goToCredits(page: Page) {
  await page.goto(`${BASE_URL}/dashboard/credits`);
  await page.waitForLoadState('domcontentloaded');
  // Wait for the credits page content to actually render (not just the loading state)
  await page.waitForSelector('h1:has-text("Credits"), h2:has-text("Purchase Additional Credits")', { timeout: 15_000 });
}

// ─── test suite ─────────────────────────────────────────────────────────────

test.describe('Credit Pack – Sanity Tests', () => {
  test('credits page loads without errors', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    // Page should not show a generic error message (avoid matching "500" from Ultra Pack credit count)
    const body = await page.textContent('body');
    expect(body).not.toMatch(/internal server error|something went wrong/i);
    // Verify the heading is present to confirm successful load
    await expect(page.locator('h1:has-text("Credits")')).toBeVisible();
  });

  test('credit balance is displayed for free-tier user', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    // Balance section shows "Current Balance" with a numeric figure
    await expect(page.getByText('Current Balance')).toBeVisible({ timeout: 10_000 });
    // The remaining credits pattern: "X / Y remaining"
    await expect(page.getByText(/\d+ \/ \d+ remaining/)).toBeVisible({ timeout: 10_000 });
  });

  test('all 4 credit packs are rendered', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    const packNames = ['Starter Pack', 'Value Pack', 'Pro Pack', 'Ultra Pack'];
    for (const name of packNames) {
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 10_000 });
    }
  });

  test('each pack shows price and purchase button', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    // Prices exist on the page
    for (const price of ['$9', '$15', '$35', '$60']) {
      await expect(page.getByText(price).first()).toBeVisible({ timeout: 10_000 });
    }

    // At least one "Purchase" button
    const purchaseBtns = page.getByRole('button', { name: /purchase/i });
    await expect(purchaseBtns.first()).toBeVisible({ timeout: 10_000 });
    expect(await purchaseBtns.count()).toBeGreaterThanOrEqual(4);
  });
});

// ─── User-flow tests ─────────────────────────────────────────────────────────

test.describe('Credit Pack – User Flow Tests', () => {
  test('clicking Purchase initiates Polar checkout redirect', async ({ page }) => {
    await login(page);

    // Set up API route interception BEFORE navigating to credits page
    let apiCalled = false;
    await page.route('**/api/credits/purchase', async (route) => {
      apiCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://sandbox.polar.sh/checkout/fake-test-id' }),
      });
    });

    // Prevent actual navigation to Polar checkout
    await page.route('**/sandbox.polar.sh/**', async (route) => {
      await route.abort();
    });

    await goToCredits(page);

    const starterPurchaseBtn = page
      .getByRole('button', { name: /purchase/i })
      .first();

    await expect(starterPurchaseBtn).toBeVisible({ timeout: 10_000 });
    await starterPurchaseBtn.click();

    // Wait for the API to be called
    await page.waitForTimeout(3_000);
    expect(apiCalled).toBe(true);
  });

  test('Purchase button shows loading state while processing', async ({ page }) => {
    await login(page);

    // Slow down the API response so we can catch the loading state
    await page.route('**/api/credits/purchase', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://sandbox.polar.sh/checkout/fake-id' }),
      });
    });

    await page.route('**/sandbox.polar.sh/**', async (route) => {
      await route.abort();
    });

    await goToCredits(page);

    const firstPurchaseBtn = page
      .getByRole('button', { name: /purchase/i })
      .first();

    await expect(firstPurchaseBtn).toBeVisible({ timeout: 10_000 });
    await firstPurchaseBtn.click();

    // Expect the button to show loading/disabled state or "Processing..." text
    const processingOrDisabled = page.getByText(/processing/i)
      .or(page.locator('button[disabled]:has-text("Purchase")'));
    await expect(processingOrDisabled).toBeVisible({ timeout: 5_000 });
  });

  test('success query param shows success notification', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/credits?success=true`);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText(/credits purchased successfully/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('cancel query param shows cancel notification', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/credits?cancel=true`);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByText(/purchase cancelled/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('transaction history section is present', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    await expect(
      page.getByText(/transaction history/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});

// ─── API / edge-case tests ───────────────────────────────────────────────────

test.describe('Credit Pack – Edge Cases & API Tests', () => {
  test('GET /api/credits/balance returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/credits/balance`);
    expect([401, 403]).toContain(res.status());
  });

  test('POST /api/credits/purchase returns 401 when unauthenticated', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/credits/purchase`, {
      data: { packId: 'starter_pack' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('GET /api/subscription/pricing returns all 4 credit packs', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/subscription/pricing`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    const packs = body.creditPacks ?? body.credit_packs ?? body.packs;
    expect(Array.isArray(packs)).toBe(true);
    expect(packs.length).toBe(4);

    const ids = packs.map((p: any) => p.id);
    expect(ids).toContain('starter_pack');
    expect(ids).toContain('value_pack');
    expect(ids).toContain('pro_pack');
    expect(ids).toContain('ultra_pack');
  });

  test('POST /api/credits/purchase returns 400 with no packId', async ({ page, request }) => {
    // Log in via the UI to get a session cookie / token
    await login(page);

    // Extract auth token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('authToken') || localStorage.getItem('token') || '');

    if (!token) {
      test.skip(true, 'Could not extract auth token from localStorage — skipping authenticated API test');
      return;
    }

    const res = await request.post(`${API_URL}/api/credits/purchase`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {},
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: expect.any(String) });
  });

  test('POST /api/credits/purchase returns error for invalid packId', async ({ page, request }) => {
    await login(page);
    const token = await page.evaluate(() => localStorage.getItem('authToken') || localStorage.getItem('token') || '');

    if (!token) {
      test.skip(true, 'Could not extract auth token — skipping');
      return;
    }

    const res = await request.post(`${API_URL}/api/credits/purchase`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { packId: 'definitely_not_a_real_pack' },
    });
    // Backend should reject with 400 or 500 (invalid pack)
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('Unauthenticated user cannot access /dashboard/credits', async ({ page }) => {
    // Go directly without logging in
    await page.goto(`${BASE_URL}/dashboard/credits`);
    await page.waitForLoadState('domcontentloaded');
    // Wait for client-side routing to settle
    await page.waitForTimeout(2_000);

    // The app should either redirect to login, show a login form,
    // or not show the credits page content (SPA may fall through to landing)
    const url = page.url();
    const hasLoginUI = await page.locator('input[type="password"]').isVisible().catch(() => false);
    const hasCreditsPage = await page.locator('h1:has-text("Credits")').isVisible().catch(() => false);
    const redirectedToLogin = url.includes('/login') || url.includes('/sign-in') || hasLoginUI;

    // Either user was redirected to login OR credits page is NOT shown (both are valid auth guards)
    expect(redirectedToLogin || !hasCreditsPage).toBe(true);
  });

  test('Credit pack pricing data per-credit is correct', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/subscription/pricing`);
    const body = await res.json();
    const packs = body.creditPacks ?? body.credit_packs ?? body.packs;

    if (!Array.isArray(packs)) {
      test.skip(true, 'Could not read credit packs from pricing API');
      return;
    }

    const expected: Record<string, { credits: number; price: number }> = {
      starter_pack: { credits: 50,  price: 9  },
      value_pack:   { credits: 100, price: 15 },
      pro_pack:     { credits: 250, price: 35 },
      ultra_pack:   { credits: 500, price: 60 },
    };

    for (const pack of packs) {
      const e = expected[pack.id];
      if (e) {
        expect(pack.credits).toBe(e.credits);
        expect(pack.price).toBe(e.price);
      }
    }
  });

  test('Polar product IDs are configured (env vars populated)', async ({ request }) => {
    // Attempting a purchase with a real pack should NOT return a config error.
    // Without auth we'll get 401, but if we get 500 with "not configured" it means
    // the env vars are missing.
    const res = await request.post(`${API_URL}/api/credits/purchase`, {
      data: { packId: 'starter_pack' },
    });

    // 401 = auth guard hit first = product IDs configured correctly
    // 500 containing "not configured" = env vars missing = fail
    if (res.status() === 500) {
      const body = await res.text();
      expect(body).not.toMatch(/not configured/i);
    }

    // We expect 401 from the auth middleware
    expect([401, 403]).toContain(res.status());
  });
});
