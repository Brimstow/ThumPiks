# Phase 2: Pre-Scale Hardening

**Priority:** P1 -- High impact, needed before significant user load
**Scope:** 7 tasks (code changes + configuration)
**Depends on:** Phase 1 completed
**Reference:** `PRODUCTION_READINESS_AUDIT_2026_03.md`

---

## Task 8: Add Request ID Middleware -- DONE

**Status:** Completed

**Verified (2026-03-09):**

- `src/middleware/request-id.middleware.ts` generates UUID via `randomUUID()`, respects incoming `X-Request-Id`
- `src/server.ts` line 94: middleware registered early in pipeline
- `src/utils/logger.ts`: `enrichContext()` includes `requestId` from `getRequestId()` in all log output
- `X-Request-Id` included in CORS `allowedHeaders` and `exposedHeaders`
- 11 tests passing in `src/middleware/__tests__/request-id.middleware.test.ts`

**Problem:** There is no way to correlate a single user request across log entries, cache operations, and external API calls. When debugging production issues, this makes tracing a specific request's path through the system nearly impossible.

**Files to modify:**

- `src/server.ts` -- add middleware early in the stack
- `src/utils/logger.ts` -- include requestId in log context

**Implementation:**

- Create middleware that generates a UUID (or use `crypto.randomUUID()`) for each incoming request
- Store it on `req.id` (extend the Request type)
- Add `X-Request-Id` response header so the frontend can reference it in bug reports
- Pass `requestId` to the Winston logger context so every log line from that request includes the ID
- If the request already has an `X-Request-Id` header (from a load balancer or gateway), use that instead of generating a new one

**Verify:**

- Every response includes `X-Request-Id` header
- Log entries include the request ID
- Different requests have different IDs

---

## Task 9: Cap In-Memory Cache Size -- DONE

**Status:** Completed

**Verified (2026-03-09):**

- `src/services/cache.service.ts`: `DEFAULT_MAX_CACHE_ENTRIES = 10_000`, `CAPACITY_WARNING_THRESHOLD = 0.8`
- Uses `lru-cache` library with `max: maxEntries` for automatic LRU eviction
- Warning logged at 80% capacity via `logger.warn('In-memory cache near capacity', ...)`
- `dispose` handler logs evicted entries
- Tests passing in `src/services/__tests__/cache.service.test.ts`

**Problem:** When Redis is unavailable, the in-memory fallback cache (`CacheService`) grows without bound. Under sustained traffic without Redis, this could cause an OOM crash.

**File:** `src/services/cache.service.ts`

**Implementation:**

- Add a `MAX_CACHE_ENTRIES` constant (e.g., 10,000)
- When inserting into the in-memory Map, check size
- If at capacity, evict the oldest entry (LRU) or entries that are closest to expiry
- Log a warning when the cache is at 80% capacity so you know Redis needs attention
- Consider using an existing LRU library like `lru-cache` if the Map-based implementation is too simple

**Verify:**

- Disable Redis connection
- Generate more cache entries than the limit
- Confirm old entries are evicted and memory stays bounded
- Confirm a warning is logged when cache is near capacity

---

## Task 10: Complete Team Invitation Flow -- NOT STARTED

**Status:** Deferred -- team invitation flow still uses mock data. Not blocking for initial launch.

**Problem:** `src/modules/team/team.service.ts` returns hardcoded mock data for `getTeamInvitations()`. The collaboration module (`src/modules/collaboration/`) has real invitation endpoints, but the team module's invitation code is incomplete.

**Files to investigate:**

- `src/modules/team/team.service.ts` -- has mock invitation data
- `src/modules/collaboration/collaboration.service.ts` -- has real invitation CRUD
- Prisma schema: `TeamInvitation` model

**Implementation:**

- Determine if the team module should delegate to the collaboration module or be self-contained
- Replace mock invitation data with real Prisma queries against the `TeamInvitation` table
- Ensure `inviteTeamMember()` creates a real `TeamInvitation` record
- Ensure `getTeamInvitations()` queries the database instead of returning hardcoded arrays
- Wire up invitation acceptance/decline to update `TeamMember` table

**Verify:**

- Create a team invitation via API
- Query invitations and confirm real data returned
- Accept an invitation and confirm TeamMember record created
- Decline an invitation and confirm it's marked as declined

---

## Task 11: Configure Prisma Connection Pooling -- DONE

**Status:** Completed

**Verified (2026-03-09):**

- `.env.example` documents `connection_limit=10`, `pool_timeout=10`, `connect_timeout=10` as DATABASE_URL query parameters
- Comments explain Railway's ~97 total connection limit and parameter behavior

**Problem:** Prisma uses default connection pool settings. Under production load with multiple concurrent AI generation requests, database connections can be exhausted.

**Files:**

- `prisma/schema.prisma` -- datasource block
- `.env.example` -- document the parameter

**Implementation:**

- Add connection pool parameters to the DATABASE_URL or Prisma datasource config:
  ```
  connection_limit=10  (adjust based on Railway plan)
  pool_timeout=10      (seconds to wait for a connection)
  ```
- For Railway's shared PostgreSQL, start with `connection_limit=10` and monitor
- Add `connect_timeout=10` to prevent hanging on database unavailability
- Document the parameters in `.env.example`

**Verify:**

- Application starts without connection errors
- Under concurrent requests, no "too many connections" errors
- Health check still passes

---

## Task 12: Add Per-User Rate Limiting -- DONE

**Status:** Completed

**Verified (2026-03-09):**

- `src/middleware/security.middleware.ts`: three per-user rate limiters implemented
  - `userApiRateLimit`: 200 req/15min per user
  - `userAiRateLimit`: 30 req/15min per user
  - `userUploadRateLimit`: 50 req/15min per user
- Key generation uses `req.user?.id || req.ip || 'unknown'`
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers set
- Redis backend with MemoryStore fallback
- Tests passing in `src/middleware/__tests__/per-user-rate-limit.test.ts`

**Problem:** Current rate limits are IP-based only. Users behind shared IPs (offices, VPNs, mobile carriers) can hit each other's limits. A single abusive user on a unique IP faces no per-account throttling.

**File:** `src/middleware/security.middleware.ts`

**Implementation:**

- For authenticated routes, use `req.user.id` as the rate limit key instead of (or in addition to) IP
- Keep IP-based limiting for unauthenticated routes (login, register)
- Suggested per-user limits:
  - General API: 200 req/15min per user
  - AI generation: 30 req/15min per user (these are expensive)
  - Upload: 50 req/15min per user
- Store rate limit state in Redis (falls back to in-memory if Redis unavailable)
- Return `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers

**Verify:**

- Authenticated requests use user ID as key
- Unauthenticated requests still use IP
- Hitting the limit returns 429 with appropriate headers
- Different users on the same IP have independent limits

---

## Task 13: Validate JSON Columns with Schemas -- DONE

**Status:** Completed

**Verified (2026-03-09):** All 4 JSON columns with service-layer write paths are validated:

- `Thumbnail.parameters` -- `ThumbnailParametersSchema` in `src/modules/thumbnail/types.ts`, validated on create (line 50) and update (line 201) in `thumbnail.service.ts`
- `User.settings` -- `UserSettingsSchema` in `src/modules/user/types.ts`, validated on write in `user-settings.service.ts` (lines 182, 222)
- `Template.parameters` -- `TemplateParametersSchema` in `src/modules/templates/types.ts`, validated on create (line 25) in `template.service.ts`
- `Template.tags` -- `TemplateTagsSchema` in `src/modules/templates/types.ts`, validated on create (line 26) and update (line 195)
- Read paths use `safeParseJsonColumn()` for legacy data tolerance (7 call sites)
- Tests in `src/modules/thumbnail/__tests__/json-column-validation.test.ts`
- Note: `Thumbnail.canvasState` and `Template.canvasData` do not exist in the Prisma schema

**Problem:** Several Prisma models have `Json` type columns (`parameters`, `settings`, `metadata`, `canvasState`) that accept any valid JSON. Invalid data could break features silently.

**Files to modify:** Service files that write to JSON columns

**Key columns to validate:**

- `Thumbnail.parameters` -- AI generation parameters (prompt, model, seed, etc.)
- `Thumbnail.canvasState` -- Editor canvas state
- `User.settings` -- User preference settings (theme, timezone, etc.)
- `Template.canvasData` -- Template layout data

**Implementation:**

- Create Zod schemas for each JSON column's expected shape
- Validate data in the service layer before writing to Prisma
- For reads, use `.safeParse()` to handle legacy data that doesn't match the schema (log warning, don't crash)
- Place schemas in each module's `types.ts` file

**Verify:**

- Writing valid JSON succeeds
- Writing invalid JSON returns a 400 validation error
- Reading legacy invalid JSON logs a warning but doesn't crash

---

## Task 14: Add Tests for Untested Backend Services -- DONE

**Status:** Completed

**Verified (2026-03-09):** Codebase analysis revealed that 4 of the 7 listed services already have tests:

- `analytics.service.ts` -- already tested in `src/modules/analytics/__tests__/analytics.service.test.ts`
- `thumbnail` (AI orchestration) -- already tested in `src/modules/thumbnail/__tests__/` (multiple test files)
- `vision.service.ts` -- already tested in `src/modules/vision/__tests__/vision.service.test.ts`
- `visual-search.service.ts` -- already tested in `src/modules/visual-search/__tests__/visual-search.service.test.ts`

The following 3 services were confirmed untested and now have tests:

- `credit.service.ts` -- **28 tests added** (`src/modules/credit/__tests__/credit.service.test.ts`)
- `billing.service.ts` -- **24 tests added** (`src/modules/billing/__tests__/billing.service.test.ts`)
- `brand-kit.service.ts` -- **38 tests added** (`src/modules/brand-kit/__tests__/brand-kit.service.test.ts`)

Total: **90 new tests** covering financial operations, Stripe integration, CRUD + Cloudinary.
All 90 tests pass. Live smoke tests against dev server (localhost:8550) also confirmed correct behavior.

**Priority order for testing:**

1. `analytics.service.ts` -- ~~Core dashboard data, complex aggregation logic~~ Already tested
2. `credit.service.ts` -- Financial operations (balance, deduction, purchase) -- **DONE**
3. `billing.service.ts` -- Stripe integration (mock Stripe in tests) -- **DONE**
4. `brand-kit.service.ts` -- CRUD + Cloudinary (mock Cloudinary in tests) -- **DONE**

**Implementation:**

- Follow existing test patterns from `project.service.test.ts` and `collaboration.service.test.ts`
- Use Jest mock factories (respect the hoisting rules in AGENTS.md testing conventions)
- Inject dependencies via constructor where possible
- Mock Prisma, Stripe, Cloudinary -- never call real external services in tests
- Target critical paths: happy path + error handling + edge cases

**Verify:**

- `npm test` passes with new tests
- Coverage increases for tested modules
- No open handles or leaked resources (use `--detectOpenHandles` if needed)

---

## Completion Checklist

- [x] Task 8: Every response has `X-Request-Id`, logs include it
- [x] Task 9: In-memory cache evicts at capacity, logs warning at 80%
- [ ] Task 10: Team invitations use real database, not mock data -- **DEFERRED**
- [x] Task 11: Prisma connection pool configured, documented in `.env.example`
- [x] Task 12: Authenticated routes rate-limited per user, headers returned
- [x] Task 13: JSON columns validated with Zod before writes (Thumbnail.parameters, User.settings, Template.parameters, Template.tags)
- [x] Task 14: Tests added for credit, billing, brand-kit services (analytics, thumbnail, vision, visual-search already tested)
- [x] All changes pass `npm run lint` and `npx tsc --noEmit` (for new Task 14 files; 9 pre-existing test suite failures from `@types/express` v5 mismatch are unrelated)
- [x] `npm test` passes with no regressions (712 tests pass, 9 pre-existing suite failures unchanged)
