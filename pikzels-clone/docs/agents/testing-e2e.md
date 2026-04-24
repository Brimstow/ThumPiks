# E2E Testing Conventions

**Load this file when:** Writing or running Playwright E2E tests, testing critical user flows through the browser, or debugging E2E test failures.

**Prerequisite:** Load `docs/agents/testing-core.md` first for failure classification. Load `docs/agents/test-credentials.md` for login credentials.

---

## E2E Testing Philosophy

E2E tests validate **critical user journeys** end-to-end through the browser. They are expensive (2-30s each) and should cover only the most important flows.

**Rule:** If a behavior can be verified with a unit or integration test, use that instead. Reserve E2E for flows that cross the full stack (browser -> API -> DB -> response).

---

## Critical User Flows to Test

| Flow | Priority | Why |
|---|---|---|
| Registration -> Email verification -> Login | HIGH | Core auth, most users' first experience |
| Login -> View thumbnails -> Logout | HIGH | Primary user journey |
| Login -> Create thumbnail -> Save -> View in gallery | HIGH | Core product value |
| Login -> AI generate -> Apply -> Download | HIGH | Premium feature, revenue driver |
| Password reset flow | MEDIUM | Security-critical but less frequent |
| Admin login -> Dashboard -> User management | MEDIUM | Admin-specific, separate auth system |
| Subscription upgrade -> Credit purchase | MEDIUM | Revenue flow, payment integration |

---

## Playwright MCP vs Scripted Tests

### Playwright MCP (Agent-Driven)

Use when: Quick ad-hoc verification, debugging UI issues, one-time flow validation.

- Use the `playwright` MCP tools (`browser_navigate`, `browser_click`, `browser_fill_form`, etc.)
- Take screenshots to verify state: `browser_take_screenshot`
- Check console for errors: `browser_console_messages`

### Scripted Playwright Tests (CI-Ready)

Use when: Building permanent test coverage, CI pipeline, regression protection.

- Location: `pikzels-clone/tests/e2e/`
- Run: `npx playwright test`
- Structure: Page Object Model for maintainability

---

## Login Pattern for E2E Tests

### Via Playwright MCP

```
1. browser_navigate -> http://localhost:8556/login
2. browser_fill_form -> email: tester1@example.com
3. browser_fill_form -> password: Test123!
4. browser_click -> Sign In button
5. browser_wait_for -> URL contains /dashboard or /thumbnails
6. Verify: take screenshot, check for user menu or avatar
```

### Via Scripted Playwright

```typescript
// IMPORTANT: Use form-scoped selector to avoid matching Google OAuth button
async function loginUser(page: Page, username: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('h2:has-text("Sign in")', { timeout: 15_000 });

  await page.getByRole('textbox', { name: /username or email/i }).fill(username);
  await page.getByRole('textbox', { name: /password/i }).fill(password);
  // CRITICAL: Scope to form to avoid matching Google OAuth "Sign in with Google" button
  await page.locator('form').getByRole('button', { name: /sign in/i }).click();

  await page.waitForURL(/\/(dashboard|home|thumbnails)/, { timeout: 15_000 });
}
```

**Always get credentials from `docs/agents/test-credentials.md` — never hardcode or guess.**

---

## Auto-Infer Test Scope

When staging URL (e.g., `staging--thumbnail-maker-studio.netlify.app`) and test credentials are already in context, infer the test scope automatically (e.g., "test auth flow on staging") rather than asking the user for clarification.

---

## Selector Strategy

```typescript
// PREFERRED: data-testid (stable, intentional)
await page.click('[data-testid="create-thumbnail-btn"]');

// GOOD: Role-based (accessibility-aligned)
await page.getByRole("button", { name: "Create Thumbnail" }).click();

// ACCEPTABLE: Label-based
await page.getByLabel("Email").fill("tester1@example.com");

// AVOID: CSS classes (change frequently)
await page.click(".btn-primary-large"); // Brittle

// AVOID: DOM structure (very fragile)
await page.click("div > form > button:nth-child(3)");
```

---

## E2E Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Testing every page E2E | Suite takes 40+ min, flakes constantly | Test only critical flows |
| Brittle CSS selectors | Breaks on any UI change | Use data-testid or role-based |
| No wait strategies | Race conditions, flaky failures | Use `waitFor` / `waitForURL` |
| Shared test state | Tests depend on each other | Each test creates its own data |
| Real external API calls | Non-deterministic, slow | Mock at network level |
| Screenshot-only assertions | Misses functional bugs | Assert URL, content, and state |

---

## Performance Targets

| Metric | Target | Red Flag |
|---|---|---|
| Single test execution | 2-5s | >15s (real external API or missing waits) |
| Full E2E suite | <30 minutes | >60 minutes (too many tests or flaky retries) |
| Page load in test | <3s | >10s (frontend build issue or missing cache) |

---

## Debugging E2E Failures

1. **Take a screenshot** at the point of failure — shows actual UI state
2. **Check console messages** — JavaScript errors prevent interactions
3. **Check network requests** — API failures cause UI to not update
4. **Verify test credentials** — session may have expired; re-login
5. **Check ports** — frontend must be on 8556, backend on 8550
6. **Check staging URL** — if testing staging, verify the deploy is live

---

## Test Naming Convention

```typescript
describe("Auth Flow", () => {
  it("logs in with valid credentials and redirects to thumbnails", async () => { ... });
  it("shows error message when password is incorrect", async () => { ... });
  it("persists session after page refresh", async () => { ... });
});

describe("Thumbnail Creation", () => {
  it("creates a blank thumbnail and shows it in gallery", async () => { ... });
  it("generates AI thumbnail from text prompt", async () => { ... });
});
```

---

## Critical Patterns (Lessons from QA Audit - May 2025)

### 1. NEVER Use `networkidle` on Dashboard Pages

The dashboard has persistent SSE/polling connections that prevent `networkidle` from resolving. Always use `domcontentloaded` + specific element waits.

```typescript
// BAD - will timeout (30s) due to SSE connections
await page.waitForLoadState('networkidle');

// GOOD - fast, then wait for actual content
await page.waitForLoadState('domcontentloaded');
await page.waitForSelector('h1:has-text("Credits")', { timeout: 10_000 });
```

### 2. Dismiss Onboarding Overlay via localStorage

The onboarding overlay blocks pointer events on dashboard pages. Dismiss it by seeding localStorage BEFORE navigation:

```typescript
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

// Call in beforeEach or before first navigation
test.beforeEach(async ({ page }) => {
  await seedOnboardingDismissed(page);
});
```

### 3. SPA Routing Awareness

The app uses client-side routing. Key routing facts:

| Route | Renders |
|---|---|
| `/dashboard` (bare) | Falls through to catch-all -> Landing Page |
| `/dashboard/create` | Actual dashboard home |
| `/dashboard/pricing` | Pricing page (NOT `/pricing`) |
| `/dashboard/credits` | Credits page |
| `/login` | Login form |
| `/reviews` | Public reviews page |

**After login, user lands on a dashboard sub-route -- do NOT re-navigate to bare `/dashboard`.**

### 4. Form-Scoped Selectors for Login

The login page has a Google OAuth button with text "Sign in with Google". Using `getByRole('button', { name: /sign in/i })` without form scoping will match BOTH buttons (strict mode violation).

```typescript
// BAD - matches Google OAuth button too
await page.getByRole('button', { name: /sign in/i }).click();

// GOOD - scoped to form, avoids OAuth button
await page.locator('form').getByRole('button', { name: /sign in/i }).click();
```

### 5. Payment Provider is Polar (Not Stripe)

The app uses **Polar** for billing/checkout. Any test asserting payment text should use:
- "Secure payment via Polar" (NOT "Stripe")
- Route interception: `**/api/credits/purchase`
- Checkout URLs: `sandbox.polar.sh`

### 6. Test Parallelism with Shared State

Tests that modify shared state (e.g., reviews for the same user) MUST run serially:

```bash
# Run review tests serially to avoid race conditions
npx playwright test tests/e2e/review-system.spec.ts --workers=1
```

### 7. Avoid False Positives in Content Assertions

Don't use overly broad regex that matches legitimate page content:

```typescript
// BAD - "500" matches Ultra Pack credit count
expect(body).not.toMatch(/500|internal server error/i);

// GOOD - specific error patterns only
expect(body).not.toMatch(/internal server error|something went wrong/i);
```

---

## Test Suite Coverage Map

| Spec File | Tests | Coverage |
|---|---|---|
| `auth-flow.spec.ts` | 15 | Login, registration links, OAuth button, invalid creds, protected routes, logout |
| `credit-pack-polar.spec.ts` | 17 | Credit balance, packs display, purchase flow, API validation, auth guards |
| `dashboard-navigation.spec.ts` | 19 | Sidebar nav, all dashboard pages, public pages |
| `notification-system.spec.ts` | 31 | Notification bell, API endpoints, read/unread, filter, pagination |
| `pricing-checkout-flow.spec.ts` | 8 | Pricing tiers, billing toggle, plan selection, FAQ |
| `review-system.spec.ts` | 24 | Review CRUD, star ratings, XSS protection, edge cases |
| `watermark-enforcement.spec.ts` | 13 | Watermark presence, free tier restrictions |
| `watermark-free-export.spec.ts` | 22 | Paid tier exports, consumption tracking |

---

## Running Tests

```bash
# Single suite
npx playwright test tests/e2e/auth-flow.spec.ts --project=chromium-headless

# Core suites (recommended for pre-commit)
npx playwright test tests/e2e/auth-flow.spec.ts tests/e2e/credit-pack-polar.spec.ts tests/e2e/dashboard-navigation.spec.ts tests/e2e/pricing-checkout-flow.spec.ts tests/e2e/review-system.spec.ts --project=chromium-headless --workers=1

# Full suite including watermark
npx playwright test tests/e2e/ --project=chromium-headless --workers=1

# With UI (headed mode for debugging)
npx playwright test tests/e2e/auth-flow.spec.ts --project=chromium-headless --headed
```

---

## Known Test Limitations (Category A - Require Backend Changes)

| Test | Issue | Root Cause |
|---|---|---|
| notification-system `credits_low` filter | 0 results | No `credits_low` notifications in seed data |
| notification-system pagination `2a` | Intermittent | Needs 10+ seeded notifications for pagination |
| unified-editor / thumbnail-operations | UI selector mismatch | Tests reference `.thumbnail-card` class not in current UI |