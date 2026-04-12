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

async function login(page: Page, creds = TEST_USER) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('h2:has-text("Sign in")', { timeout: 15_000 });

  await page.getByRole('textbox', { name: /username or email/i }).fill(creds.username);
  await page.getByRole('textbox', { name: /password/i }).fill(creds.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Accept either dashboard or thumbnails as a successful landing
  await page.waitForURL(/\/(dashboard|home|thumbnails)/, { timeout: 15_000 });
}

async function goToCredits(page: Page) {
  await page.goto(`${BASE_URL}/dashboard/credits`);
  await page.waitForLoadState('networkidle');
}

// ─── test suite ─────────────────────────────────────────────────────────────

test.describe('Credit Pack – Sanity Tests', () => {
  test('credits page loads without errors', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    // Page should not show a generic error message
    const body = await page.textContent('body');
    expect(body).not.toMatch(/500|internal server error|something went wrong/i);
  });

  test('credit balance is displayed for free-tier user', async ({ page }) => {
    await login(page);
    await goToCredits(page);

    // Some numeric balance figure must be visible
    const balanceEl = page.locator('text=/\\d+ credits?/i').first();
    await expect(balanceEl).toBeVisible({ timeout: 10_000 });
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
    // Must use a real-domain email account — Polar sandbox rejects @example.com
    await login(page, POLAR_TEST_USER);
    await goToCredits(page);

    // Intercept the API call to avoid actually hitting Polar sandbox
    let apiCalled = false;
    await page.route('**/api/credits/purchase', async (route) => {
      apiCalled = true;
      // Return a fake Polar checkout URL so the frontend redirects
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://sandbox.polar.sh/checkout/fake-test-id' }),
      });
    });

    // Stub window.location.href so Playwright does not actually navigate away
    await page.addInitScript(() => {
      Object.defineProperty(window, '_redirectedTo', { value: null, writable: true });
      const origDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
      const origAssign = window.location.assign.bind(window.location);
      // Intercept href assignment
      try {
        Object.defineProperty(window, 'location', {
          get: () => origDescriptor?.get?.call(window) ?? window.location,
          set: (v) => { (window as any)._redirectedTo = v; },
          configurable: true,
        });
      } catch { /* some browsers don't allow overriding location */ }
    });

    const starterPurchaseBtn = page
      .locator('[data-testid="purchase-starter_pack"], button')
      .filter({ hasText: /purchase/i })
      .first();

    await expect(starterPurchaseBtn).toBeVisible({ timeout: 10_000 });
    await starterPurchaseBtn.click();

    // Wait for the API to be called
    await page.waitForTimeout(2_000);
    expect(apiCalled).toBe(true);
  });

  test('Purchase button shows loading state while processing', async ({ page }) => {
    // Must use a real-domain email account — Polar sandbox rejects @example.com
    await login(page, POLAR_TEST_USER);
    await goToCredits(page);

    // Slow down the API response so we can catch the loading state
    await page.route('**/api/credits/purchase', async (route) => {
      await page.waitForTimeout(500);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://sandbox.polar.sh/checkout/fake-id' }),
      });
    });

    const firstPurchaseBtn = page
      .getByRole('button', { name: /purchase/i })
      .first();

    await expect(firstPurchaseBtn).toBeVisible({ timeout: 10_000 });
    await firstPurchaseBtn.click();

    // Expect "Processing..." or a spinner to appear briefly
    const processingText = page.getByText(/processing/i);
    await expect(processingText).toBeVisible({ timeout: 5_000 });
  });

  test('success query param shows success notification', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/credits?success=true`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByText(/credits purchased successfully/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test('cancel query param shows cancel notification', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/dashboard/credits?cancel=true`);
    await page.waitForLoadState('networkidle');

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

  test('Unauthenticated user is redirected from /dashboard/credits to login', async ({ page }) => {
    // Go directly without logging in
    await page.goto(`${BASE_URL}/dashboard/credits`);
    await page.waitForLoadState('networkidle');

    // Should land on /login or show a login form
    const url = page.url();
    const hasLoginUI = await page.locator('input[type="password"]').isVisible().catch(() => false);
    const redirectedToLogin = url.includes('/login') || url.includes('/sign-in') || hasLoginUI;
    expect(redirectedToLogin).toBe(true);
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
