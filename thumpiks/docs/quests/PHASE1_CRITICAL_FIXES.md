# Phase 1: Critical Fixes Before Launch

**Priority:** P0 -- Blockers
**Scope:** 5 code fixes + 2 operational tasks
**Reference:** `PRODUCTION_READINESS_AUDIT_2026_03.md`

---

## Task 1: Fix Admin Role Enforcement

**File:** `src/middleware/auth.middleware.ts` (line ~87)

**Problem:** The `authenticateToken` middleware hardcodes `role: 'user'` for every authenticated request, ignoring the `AdminRole` table in the database. This means admin-only route guards that check `req.user.role` will never see an admin role.

**Fix:**

- After verifying the user exists in the database, query the `AdminRole` table to check if this user has an admin role
- Set `req.user.role` to the actual role from the database (e.g., `'admin'` or `'super_admin'`) instead of hardcoding `'user'`
- If no AdminRole record exists, default to `'user'` (current behavior as fallback)

**Verify:**

- Check that `requireRole` middleware (same file) correctly gates admin endpoints
- Ensure regular users still get `role: 'user'`
- Ensure admin users get their actual role from the `AdminRole` table
- Check Prisma schema for the `AdminRole` model to understand the table structure

---

## Task 2: Remove `unsafe-eval` from CSP

**File:** `src/middleware/security.middleware.ts` (line ~12)

**Problem:** The Content Security Policy includes `'unsafe-eval'` in the `scriptSrc` directive. This allows `eval()` and similar dynamic code execution, which is an XSS attack vector.

**Fix:**

- Remove `'unsafe-eval'` from the `scriptSrc` array in the Helmet CSP configuration
- Keep `'self'` and `'unsafe-inline'` (inline may be needed for the React app, but ideally migrate to nonce-based later)
- If the frontend breaks after this change, identify which scripts require `eval()` and find alternatives

**Verify:**

- Start the dev server and confirm no CSP violations in the browser console that break functionality
- Check that the React app loads and renders correctly
- Check that AI tools page (which may use dynamic code) still works

---

## Task 3: Implement Real Database Health Check

**File:** `src/server.ts` (the `/health` endpoint, line ~227 area)

**Problem:** The health endpoint always returns `"database": "healthy"` without actually testing the database connection. Railway uses this endpoint to determine if the instance should receive traffic.

**Fix:**

- Replace the hardcoded database status with an actual Prisma connectivity test
- Use `prisma.$queryRaw(SELECT 1)` or `prisma.$connect()` wrapped in a try/catch
- Return `"database": "healthy"` on success, `"database": "unhealthy"` with the error message on failure
- If the database is unhealthy, the overall health check should return HTTP 503 (not 200)

**Verify:**

- Hit `GET /health` and confirm it returns database status
- Temporarily use a bad `DATABASE_URL` and confirm the endpoint returns 503 with `"database": "unhealthy"`

---

## Task 4: Clean Up Mock OAuth on DashboardHome

**File:** `client/src/components/dashboard/DashboardHome.tsx`

**Problem:** The Google Drive and Apple iCloud integration buttons use `setTimeout` to simulate a "connected" state. Users will click "Connect", see a success state, but nothing actually works. This will generate support tickets.

**Fix -- choose one approach:**

**Option A (Recommended): Remove the mock integrations entirely**

- Remove the Google Drive and iCloud file picker sections
- Remove `mockGoogleDriveFiles` and `mockICloudFiles` arrays
- Remove the fake OAuth connection handlers
- Keep the core functionality: URL input, file upload, and thumbnail generation

**Option B: Label as "Coming Soon"**

- Keep the UI elements but disable the connect buttons
- Add "Coming Soon" badges to Google Drive and iCloud sections
- Remove the fake setTimeout connection logic

**Verify:**

- DashboardHome loads without errors
- Core thumbnail generation flow (URL input + generate) still works
- File upload still works
- No fake "connected" states appear

---

## Task 5: Verify BrandPage Integration

**File:** `client/src/hooks/useBrandKit.ts` (or wherever the hook is defined)
**File:** `client/src/components/dashboard/BrandPage.tsx`

**Problem:** The `useBrandKit` hook has an `isUsingMockData` flag and the page shows a "sample data" banner. The backend brand-kit module is fully built (30+ endpoints at `/api/brand-kit/*`), but the frontend may not be wired to it.

**Fix:**

- Read the `useBrandKit` hook and trace its data flow
- If it has a hardcoded mock flag, determine under what conditions it uses real API calls vs mock data
- Ensure the hook calls the real `/api/brand-kit` endpoints when the backend is running
- The mock fallback should only activate when the API is unreachable (development without backend), not as the default
- Remove or update the "sample data" banner logic so it only shows when actually using mock data

**Verify:**

- Start both frontend and backend
- Navigate to BrandPage
- Confirm it fetches from `/api/brand-kit` (check Network tab)
- Confirm the "sample data" banner does NOT show when the backend is running
- Test adding a logo or color to confirm write operations work end-to-end

---

## Task 6: Set Up Error Reporting (Sentry)

**This is an operational/config task, not just a code change.**

**Steps:**

1. Create a free Sentry account at sentry.io (Developer plan, $0, 5K errors/month)
2. Create a Node.js project in Sentry dashboard
3. Install `@sentry/node` in the backend: `npm install @sentry/node`
4. Initialize Sentry early in `src/server.ts` (before other middleware):
   ```typescript
   import * as Sentry from '@sentry/node';
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```
5. Add `Sentry.setupExpressErrorHandler(app)` before the global error handler
6. Add `SENTRY_DSN` to `.env.example` with a placeholder
7. Optionally install `@sentry/react` in the frontend for client-side error capture

**Verify:**

- Throw a test error in a route handler
- Confirm it appears in the Sentry dashboard within seconds

**Alternative:** If you prefer not to add another service, skip this task. Your existing Winston logging will still capture errors to disk. The trade-off is you won't get alerts or persistence across container restarts.

---

## Task 7: Production Secrets Configuration

**This is a deployment/config task.**

**Steps:**

1. Generate strong secrets for production (minimum 64 chars, cryptographically random):
   - `JWT_SECRET` -- used for signing access tokens
   - `JWT_REFRESH_SECRET` -- used for signing refresh tokens
   - `COOKIE_SECRET` -- used for cookie signing
   - `SESSION_SECRET` -- if used
2. Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. Set these in Railway environment variables (not in `.env` file committed to git)
4. Ensure `COOKIE_SECURE=true` is set in production (requires HTTPS, which Railway provides)
5. Verify `.env` is in `.gitignore`
6. Review `.env.example` to ensure no real secrets are committed

**Verify:**

- `.env` is NOT in git: `git ls-files .env` should return nothing
- `.env.example` has only placeholder values
- Railway env vars are set (check via `railway variables` CLI or dashboard)

---

## Completion Checklist

- [x] Task 1: Not needed -- admin module has its own auth middleware (`admin-auth.middleware.ts`) that checks `req.adminUser.roles` independently
- [x] Task 2: `unsafe-eval` removed from CSP, app still works -- only included in development via `NODE_ENV` check
- [x] Task 3: `/health` returns 503 when database is down -- uses `healthCheckPrisma()` with `SELECT 1`
- [x] Task 4: No fake OAuth connections on DashboardHome -- mock Google Drive/iCloud removed
- [x] Task 5: BrandPage uses real API when backend is running -- no mock flags in `useBrandKit`
- [ ] Task 6: Error reporting configured (or explicitly deferred)
- [x] Task 7: Production secrets generated and configured in Railway -- `.env.example` has placeholders, actual secrets are deploy-time ops
- [x] All changes pass `npm run lint` and `npx tsc --noEmit`
