# Phase 4: Operational Excellence

**Priority:** P3 -- Important for sustained production operation
**Scope:** 6 tasks (infrastructure, monitoring, documentation)
**Depends on:** Phase 1 completed, Phase 2 recommended
**Reference:** `PRODUCTION_READINESS_AUDIT_2026_03.md`

---

## Task 19: Centralize Logging

**Problem:** Winston writes logs to local disk files (`/logs/` directory). On Railway, container restarts or redeployments lose these logs. There's no way to search across historical logs or set up alerts.

**Current setup:**

- App logs: 14-day retention, 20MB max, daily rotation
- Error logs: 30-day retention
- Security logs: 90-day retention
- All local to the container filesystem

**Options (choose one):**

**Option A: Railway Logs (Simplest, Free)**

- Railway captures stdout/stderr automatically
- Modify Winston to also log to console in production (currently dev-only)
- Pros: Zero cost, zero setup
- Cons: Limited retention (Railway keeps ~1 week), no advanced search

**Option B: Datadog (Best for monitoring + logs)**

- Install `dd-trace` and `winston-datadog-transport`
- Configure `DD_API_KEY` in Railway env vars
- Pros: Unified logs + metrics + APM, alerts, dashboards
- Cons: Cost ($15/host/month for logs)

**Option C: Logtail/Better Stack (Good balance)**

- Install `@logtail/winston` transport
- Configure `LOGTAIL_SOURCE_TOKEN` in Railway env vars
- Pros: Free tier (1GB/month), good search, alerts
- Cons: Separate from error tracking

**Option D: Sentry + Console Logs (If Sentry from Task 6)**

- Sentry captures errors with full context
- Console logs go to Railway's built-in viewer
- Pros: Already set up if Task 6 done, minimal additional work
- Cons: Only captures errors, not general logs

**Implementation (applies to all options):**

- Add the chosen transport to `src/utils/logger.ts`
- Ensure request ID (from Task 8) is included in all log entries
- Test that logs appear in the external service
- Keep local file logging as a fallback

**Verify:**

- Generate some log entries (make API calls)
- Confirm they appear in the external service
- Search for a specific request ID
- Confirm error logs include stack traces

---

## Task 20: Set Up Monitoring Dashboards

**Status:** Done -- Axiom dashboards powered by structured request metrics

**Problem:** Performance metrics were collected by `performance.middleware.ts` but stored only in cache (lost on restart). No dashboards to visualize response times, error rates, or cache efficiency.

**Solution:** Axiom Dashboards (chosen over Prometheus/Grafana to stay within the Axiom ecosystem from Task 19)

### Implementation

**Code change:** Added structured `category: 'request'` log entry for every HTTP request in `performance.middleware.ts`. Each entry includes numeric `duration` (ms) and `statusCode` fields, enabling Axiom aggregations like percentiles, counts, and averages.

**Log schema (per request):**

```json
{
  "message": "request",
  "category": "request",
  "method": "GET",
  "url": "/api/thumbnails",
  "statusCode": 200,
  "duration": 45,
  "ip": "::1",
  "userAgent": "Mozilla/5.0...",
  "requestId": "uuid",
  "service": "thumbnail-maker-studio"
}
```

### Axiom Dashboard Setup

Create a new dashboard in Axiom (Dashboards tab > New Dashboard > name it "Thumbnail Maker Operations").

Add the following elements using APL queries:

#### 1. Response Time Percentiles (Time Series)

```apl
['thumbnail-maker']
| where category == 'request'
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
  by bin(_time, 5m)
```

#### 2. Error Rate % (Time Series)

```apl
['thumbnail-maker']
| where category == 'request'
| summarize errorRate = countif(statusCode >= 400) * 100.0 / count()
  by bin(_time, 5m)
```

#### 3. Requests per Minute (Time Series)

```apl
['thumbnail-maker']
| where category == 'request'
| summarize count()
  by bin(_time, 1m)
```

#### 4. Slowest Endpoints (Table)

```apl
['thumbnail-maker']
| where category == 'request'
| summarize
    avgDuration = avg(duration),
    p95 = percentile(duration, 95),
    requests = count()
  by url
| order by p95 desc
| take 20
```

#### 5. Error Breakdown by Route (Bar Chart)

```apl
['thumbnail-maker']
| where category == 'request' and statusCode >= 400
| summarize count()
  by url, statusCode
| order by count_ desc
```

#### 6. Response Time Heatmap (Heatmap)

```apl
['thumbnail-maker']
| where category == 'request'
| summarize count()
  by bin(duration, 50), bin(_time, 5m)
```

#### 7. Current Error Rate (Statistic)

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(1h)
| summarize errorRate = round(countif(statusCode >= 400) * 100.0 / count(), 2)
```

#### 8. Current p95 Response Time (Statistic)

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(1h)
| summarize p95 = round(percentile(duration, 95), 1)
```

#### 9. Requests by Method (Pie/Bar)

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(24h)
| summarize count() by method
```

#### 10. Cache Hit Rate (Time Series)

```apl
['thumbnail-maker']
| where category == 'cache' and operation == 'get'
| summarize hitRate = countif(hit == true) * 100.0 / count()
  by bin(_time, 5m)
```

#### 11. Cache Hit Rate by Source (Stacked Bar)

```apl
['thumbnail-maker']
| where category == 'cache' and operation == 'get' and hit == true
| summarize count() by source, bin(_time, 5m)
```

### Optional: Axiom Monitors (Alerts)

Set up alerts in Axiom (Monitors tab) for:

| Monitor         | Condition                          | Notify      |
| --------------- | ---------------------------------- | ----------- |
| High Error Rate | Error rate > 5% over 5 minutes     | Email/Slack |
| Slow Responses  | p95 > 2000ms over 5 minutes        | Email/Slack |
| Traffic Spike   | Requests/min > 500 sustained 5 min | Email/Slack |

**Verify:**

- Dashboard shows live data after a few API requests
- Use Axiom's "Ask AI" to query: "What are the slowest endpoints in the last hour?"
- Percentile charts show p50/p95/p99 distribution

---

## Task 21: Document Production Runbooks

**Status:** Done -- 7 files in `docs/runbooks/` covering 6 incident scenarios + index

**Problem:** When production incidents happen, there's no documented procedure for diagnosis and recovery. This leads to slow response times and inconsistent fixes.

**Solution:** Created `docs/runbooks/` directory with the following documents:

### Runbook 1: Application Won't Start

- Check Railway deployment logs (`railway logs`)
- Common causes: missing env vars, database migration failure, port conflict
- Recovery: check env vars, run `npx prisma migrate deploy`, redeploy

### Runbook 2: Database Connection Issues

- Symptoms: 503 from health check, timeout errors in logs
- Diagnosis: check `railway logs` for Prisma connection errors
- Recovery: verify DATABASE_URL, check Railway Postgres status, restart service

### Runbook 3: AI Generation Failures

- Symptoms: Users report "generation failed" errors
- Diagnosis: check logs for provider errors (OpenRouter, Replicate, Comet)
- Check provider status pages
- Recovery: verify API keys, check credit balance on providers, confirm fallback is working

### Runbook 4: Payment/Stripe Issues

- Symptoms: Checkout failures, webhook errors
- Diagnosis: check Stripe dashboard for failed events, check webhook logs
- Recovery: verify STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET, resend failed webhooks

### Runbook 5: High Error Rate

- Symptoms: Sentry alerts, user complaints
- Diagnosis: check Sentry for error grouping, check request IDs in logs
- Recovery: depends on error type -- deploy fix or rollback

### Runbook 6: Performance Degradation

- Symptoms: Slow response times, timeouts
- Diagnosis: check Redis availability, database query times, AI provider latency
- Recovery: check cache hit rates, restart Redis, scale up if needed

**Verify:**

- Each runbook has clear symptoms, diagnosis steps, and recovery actions
- Team members can follow them without prior context

---

## Task 22: Implement Secret Rotation Schedule

**Status:** Partial ⚠️ — Procedure doc + rotation script created. Dual-key JWT validation code change **deferred** (spec'd in doc, not yet implemented).

**Problem:** All API keys and secrets are static. If a key is compromised, there's no automated way to rotate it.

**Implementation:**

- Document which secrets exist and their rotation procedures:
  | Secret | Rotation Method | Frequency |
  |---|---|---|
  | `JWT_SECRET` | Generate new, redeploy (invalidates all sessions) | Every 90 days or on suspected compromise |
  | `JWT_REFRESH_SECRET` | Same as above | Every 90 days |
  | `STRIPE_SECRET_KEY` | Roll in Stripe dashboard, update Railway env var | On suspected compromise |
  | `CLOUDINARY_API_SECRET` | Regenerate in Cloudinary console, update env var | On suspected compromise |
  | `OPENROUTER_API_KEY` | Regenerate in OpenRouter dashboard, update env var | On suspected compromise |
  | `REPLICATE_API_TOKEN` | Regenerate in Replicate settings, update env var | On suspected compromise |

- Create a `scripts/rotate-jwt-secrets.sh` script that:
  1. Generates new random secrets
  2. Outputs Railway CLI commands to set them
  3. Reminds to redeploy after setting

- Consider implementing dual-key JWT validation (accept both old and new key for a grace period during rotation)

**Verify:**

- Rotation script generates valid secrets
- After rotation, new sessions work
- Document the last rotation date somewhere (Cipher memory or a config file)

---

## Task 23: Load Test Critical Paths

**Problem:** No load testing has been performed. Unknown behavior under concurrent users.

**Tool:** Use `k6` (free, scriptable) or `artillery` (npm-based)

**Critical paths to test:**

1. **Authentication flow** (login, token refresh)
   - Target: 100 concurrent users, <500ms p95
   - Watch for: JWT validation bottleneck, rate limiter behavior

2. **Thumbnail generation** (AI provider calls)
   - Target: 20 concurrent generations
   - Watch for: Provider rate limits, BullMQ queue depth, credit deduction race conditions

3. **Project listing** (with cache warm/cold)
   - Target: 200 concurrent reads
   - Watch for: Cache hit ratio, database query time, Redis connection pool

4. **Dashboard page load** (multiple API calls)
   - Target: 100 concurrent users loading dashboard
   - Watch for: Aggregate response time, database connection exhaustion

**Implementation:**

1. Install k6: `winget install k6` or download from k6.io
2. Write test scripts in `tests/load/` directory
3. Run against staging (never production)
4. Document results and bottlenecks found
5. Fix identified issues before production

**Verify:**

- All critical paths meet latency targets
- No errors under expected load
- Resource usage (CPU, memory, connections) stays within limits

---

## Task 24: Set Up Staging Environment ✅ Done

**Problem:** There's no staging environment. All testing happens against development or directly in production.

**Implementation:**

1. Create a second Railway service (or use Railway environments feature)
2. Configure staging with:
   - Separate PostgreSQL database (seed with test data)
   - Separate Redis instance
   - Same external service keys (Stripe test mode, Cloudinary, etc.)
   - `NODE_ENV=staging`
3. Deploy the same code as production
4. Use staging for:
   - Pre-deployment testing
   - Load testing (Task 23)
   - QA by team members
   - Demo to stakeholders

**What was delivered:**

- `src/utils/env.ts` — shared `isProductionLike()` / `isDevelopmentEnv()` helpers (single source of truth)
- Updated 7 files to treat `NODE_ENV=staging` as production-like (strict security, secure cookies, JSON logging, trust proxy, etc.)
- `prisma/seed.ts` already supported staging — auto-seeds test users + admin + layouts
- `.env.staging.example` — documents which variables differ from production
- `docs/staging-environment-setup.md` — step-by-step Railway guide with CLI fallback
- Railway Environments feature recommended (duplicate production → override staging vars)

**Verify:**

- Staging is accessible and functional
- Database is seeded with realistic test data
- All features work the same as production
- Staging and production databases are completely separate

---

## Completion Checklist

- [x] Task 19: Logs flow to external service, searchable by request ID (Axiom with `@axiomhq/winston`)
- [x] Task 20: Monitoring dashboard shows response times, error rates, cache stats (Axiom dashboards with APL queries)
- [x] Task 21: Runbooks documented for 6 incident scenarios (+ README index with severity matrix, Axiom queries, quick-ref for 4 additional scenarios)
- [~] Task 22: Secret rotation procedure documented, rotation script created ⚠️ **Dual-key JWT code not yet implemented** — revisit when ready
- [ ] Task 23: Load tests pass for 4 critical paths, bottlenecks documented
- [x] Task 24: Staging environment setup documented, code updated to support `NODE_ENV=staging` as production-like (`src/utils/env.ts`, 7 files updated)
