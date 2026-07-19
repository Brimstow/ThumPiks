# Runbook 01: Application Won't Start

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P1 — Critical
**Expected Duration:** 10–30 minutes

---

## When to Use This Runbook

Use this runbook when:

- Railway deployment fails during build or start phase
- Health check at `/health` returns connection refused or times out
- `railway logs` shows the app crashing on startup
- Railway dashboard shows deployment status as "Failed"

Do **NOT** use this runbook when:

- App started successfully but specific routes return errors → see [05-high-error-rate.md](./05-high-error-rate.md)
- App is running but slow → see [06-performance-degradation.md](./06-performance-degradation.md)
- Database-specific connection errors after successful start → see [02-database-connection-issues.md](./02-database-connection-issues.md)

---

## Prerequisites

Before starting:

- [ ] Confirm you have Railway CLI installed and authenticated (`railway login`)
- [ ] Confirm you can access the Railway dashboard for this project
- [ ] Have access to the project's environment variables (Railway dashboard → Variables)

---

## Diagnosis

### Step 1: Check deployment status

```bash
railway deployment list
```

**Expected output (healthy):**

```
Deployment ID    Status     Created
dep_abc123       SUCCESS    2026-03-10T10:30:00Z
```

**Expected output (problem):**

```
Deployment ID    Status     Created
dep_abc123       FAILED     2026-03-10T10:30:00Z
```

### Step 2: Check deployment logs

```bash
railway logs --tail 100
```

Look for one of these failure patterns:

---

## Failure Pattern A: Build Failure

### Symptoms

```
Build failed
ERROR: npm run build exited with code 1
```

### Diagnosis

```bash
railway logs | grep -i "error\|ERR!\|failed"
```

**Common causes:**

1. **TypeScript compilation error** — Code compiles locally but fails on Railway due to stricter `node_modules` versions.

   ```
   error TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'
   ```

   **Fix:** Run locally first to verify:

   ```bash
   npx tsc --project tsconfig.build.json
   ```

2. **Missing dependency** — A package is in `devDependencies` but needed at build time.

   ```
   Cannot find module 'some-package'
   ```

   **Fix:** Move the package to `dependencies` in `package.json`.

3. **Husky `prepare` script failing** — Railway runs `npm install` which triggers `prepare`.
   ```
   .husky/pre-commit: not found
   ```
   **Fix:** Verify the `prepare` script is guarded in `package.json`:
   ```json
   "prepare": "node -e \"if (process.env.CI || process.env.RAILWAY_ENVIRONMENT) process.exit(0)\" || husky"
   ```

### Recovery

1. Fix the code locally.
2. Verify build passes: `npm run build`
3. Redeploy:
   ```bash
   railway up
   ```

---

## Failure Pattern B: Prisma Migration Failure

### Symptoms

```
Error: P3009 migrate found failed migrations in the target database
```

or

```
Error: P1001 Can't reach database server at `...`
```

This happens during the `preDeployCommand`: `npx prisma migrate deploy`

### Diagnosis

1. **Check if DATABASE_URL is set:**

   ```bash
   railway variables | grep DATABASE_URL
   ```

   **Expected:** A valid PostgreSQL connection string.
   **Problem:** Empty or malformed URL.

2. **Check if database is reachable:**
   Check Railway dashboard → PostgreSQL service → is it running?

3. **Check for failed migrations:**
   ```bash
   npx prisma migrate status
   ```

### Recovery

**If DATABASE_URL is missing or wrong:**

1. Go to Railway dashboard → PostgreSQL service → Connect tab
2. Copy the connection string
3. Set it: Railway dashboard → your service → Variables → `DATABASE_URL`
4. Redeploy

**If a migration is stuck/failed:**

1. Check which migration failed:
   ```bash
   npx prisma migrate status
   ```
2. If safe to re-run, mark the failed migration as rolled back:
   ```bash
   npx prisma migrate resolve --rolled-back MIGRATION_NAME
   ```
3. Then redeploy:
   ```bash
   railway up
   ```

**If database is unreachable:**
→ Follow [02-database-connection-issues.md](./02-database-connection-issues.md)

---

## Failure Pattern C: Health Check Timeout

### Symptoms

Railway logs show the app starting, but deployment still fails:

```
Healthcheck failed after 60s
Deployment failed during healthcheck
```

### Diagnosis

The health check hits `GET /health` (configured in `railway.json` with 60s timeout). If the app doesn't respond within 60 seconds, the deployment is marked as failed.

1. **App is starting but too slowly:**
   Check logs for how long startup takes. Look for:

   ```
   🚀 Server is running on port XXXX
   ```

   If this message appears after 60s, startup is too slow.

2. **App starts then immediately crashes:**
   Look for errors right after the "Server is running" message:

   ```
   Error: connect ECONNREFUSED 127.0.0.1:8520
   ```

   This means Redis isn't available. The app should still start (graceful fallback), but check if there's a hard dependency somewhere.

3. **Port binding issue:**

   ```
   Error: listen EADDRINUSE :::8550
   ```

   Another process is using the port. On Railway, this shouldn't happen — likely a stale container. Trigger a full redeploy.

4. **Silent failure — no logs at all:**
   The container starts but produces zero output. This is a known Railway issue (March 2026).
   **Fix:** Trigger a new deployment. If it persists, check for unhandled promise rejections in startup code.

### Recovery

**If startup is too slow:**

- Check what's blocking: database connection? Redis connection? External API call?
- Ensure connections have timeouts (Prisma: `connect_timeout=10`, Redis: reconnect with backoff)

**If port conflict:**

```bash
# Redeploy fresh
railway up
```

**If silent failure:**

```bash
# Force a clean redeploy
railway up
```

If it fails again with the same silent behavior, check for:

- Syntax errors in compiled JS (`node dist/server.js` locally)
- Missing environment variables that cause immediate crash

---

## Failure Pattern D: Missing Environment Variables

### Symptoms

```
Error: JWT_SECRET is not defined
```

or the app crashes immediately with unclear errors about undefined values.

### Diagnosis

Compare Railway env vars against required vars:

```bash
railway variables
```

**Required env vars for startup** (app won't function without these):

| Variable               | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection                    |
| `JWT_SECRET`           | Auth token signing                       |
| `REFRESH_TOKEN_SECRET` | Refresh token signing                    |
| `PORT`                 | Server port (Railway sets automatically) |
| `NODE_ENV`             | Should be `production`                   |
| `CLIENT_URL`           | Frontend URL for CORS                    |

**Required for features** (app starts but features break):

| Variable             | Purpose                          |
| -------------------- | -------------------------------- |
| `STRIPE_SECRET_KEY`  | Payments (has demo fallback)     |
| `OPENROUTER_API_KEY` | AI generation                    |
| `CLOUDINARY_URL`     | Image storage                    |
| `REDIS_URL`          | Caching (has in-memory fallback) |

### Recovery

1. Identify the missing variable from logs.
2. Set it in Railway dashboard → Variables.
3. Railway auto-redeploys when variables change.

---

## Verification

After applying any fix:

1. **Check deployment succeeded:**

   ```bash
   railway deployment list
   ```

   Expected: Latest deployment shows `SUCCESS`

2. **Check health endpoint:**

   ```bash
   curl -s https://YOUR_DOMAIN/health | jq .
   ```

   Expected:

   ```json
   {
     "status": "OK",
     "message": "Thumbnail Maker API is running",
     "services": {
       "cache": "healthy",
       "database": "healthy",
       "events": "healthy",
       "replicateQueue": "healthy"
     }
   }
   ```

3. **Check logs for startup confirmation:**
   ```bash
   railway logs --tail 20
   ```
   Expected:
   ```
   🚀 Server is running on port 8550
   🎯 Health check: http://localhost:8550/health
   ```

---

## Escalation

Escalate if:

- Deployment fails 3+ times with the same error after applying fixes
- Database is unreachable and Railway PostgreSQL service shows issues → contact Railway support
- Silent failures persist across multiple redeploys → file Railway support ticket with deployment IDs

---

## Searchable Keywords

```
Build failed
Healthcheck failed
P3009 migrate found failed migrations
P1001 Can't reach database server
EADDRINUSE
ECONNREFUSED
Cannot find module
prepare script
npm ERR!
Deployment failed during healthcheck
service unavailable
```

---

## Related Runbooks

- [02-database-connection-issues.md](./02-database-connection-issues.md) — If the app starts but can't connect to the DB
- [05-high-error-rate.md](./05-high-error-rate.md) — If the app starts but returns errors
- [06-performance-degradation.md](./06-performance-degradation.md) — If the app starts but is slow
