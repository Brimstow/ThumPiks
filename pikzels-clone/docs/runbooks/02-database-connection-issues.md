# Runbook 02: Database Connection Issues

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P1 — Critical
**Expected Duration:** 10–45 minutes

---

## When to Use This Runbook

Use this runbook when:

- Health endpoint returns `"database": "unhealthy"` or HTTP 503
- Logs show `Can't reach database server` or `Connection terminated unexpectedly`
- Logs show `ECONNRESET`, `ECONNREFUSED`, or `ETIMEDOUT` for PostgreSQL
- Users see 500 errors on all authenticated routes
- Prisma errors: `P1001`, `P1002`, `P1008`, `P1017`, `P2024`

Do **NOT** use this runbook when:

- App won't start at all (build/deploy failure) → see [01-application-wont-start.md](./01-application-wont-start.md)
- Only specific queries are slow (not connection errors) → see [06-performance-degradation.md](./06-performance-degradation.md)
- Only Redis is down (database is fine) → see [06-performance-degradation.md](./06-performance-degradation.md)

---

## Prerequisites

- [ ] Railway CLI authenticated (`railway login`)
- [ ] Access to Railway dashboard (both app service and PostgreSQL service)
- [ ] Axiom access for log queries (if configured)

---

## Diagnosis

### Step 1: Confirm database is the problem

```bash
curl -s https://YOUR_DOMAIN/health | jq '.services.database'
```

**Expected (healthy):** `"healthy"`
**Expected (problem):** `"unhealthy"` or the entire request times out / returns 503

### Step 2: Check Railway PostgreSQL service status

1. Open Railway dashboard → select your project
2. Click the PostgreSQL service
3. Check if it shows "Running" or has any warnings
4. Check the Metrics tab for CPU/memory/disk usage

### Step 3: Check application logs for specific errors

```bash
railway logs --tail 100
```

Look for these patterns:

---

## Failure Pattern A: Connection Refused

### Symptoms

```
Error: P1001: Can't reach database server at `postgres.railway.internal:5432`
```

or

```
Error: connect ECONNREFUSED
```

### Diagnosis

The PostgreSQL service is either down, restarting, or has a networking issue.

1. **Check PostgreSQL service in Railway dashboard** — is it running?
2. **Check for Railway platform incidents:** https://status.railway.com
3. **Check if this is a "Mounting volume" stuck issue** (known Railway Feb 2026 bug):
   Look for repeated `Mounting volume on ...` in PostgreSQL service logs

### Recovery

**If PostgreSQL service is stopped:**

1. Go to Railway dashboard → PostgreSQL service
2. Click "Deploy" or "Restart"
3. Wait for it to show "Running" (may take 1–3 minutes)

**If PostgreSQL is stuck "Mounting volume":**

1. Wait 5 minutes — Railway may resolve automatically
2. If still stuck, try redeploying the PostgreSQL service
3. If still stuck after 15 minutes → escalate to Railway support

**If Railway platform incident:**

1. Check https://status.railway.com
2. Nothing to fix on your side — wait for Railway resolution
3. After resolution, redeploy your app service:
   ```bash
   railway up
   ```

---

## Failure Pattern B: Connection Pool Exhaustion

### Symptoms

```
Error: P2024: Timed out fetching a new connection from the connection pool
```

or

```
Error: too many clients already
```

### Diagnosis

The connection pool (configured at `connection_limit=10`) is exhausted. All 10 connections are in use and new requests can't get one within the `pool_timeout=10` seconds.

**Common causes:**

- Traffic spike overwhelming the pool
- Long-running queries holding connections
- Unreturned connections (missing `finally` blocks or missing `$disconnect()`)

**Check in Axiom:**

```apl
['thumbnail-maker']
| where _time > ago(30m) and message contains "P2024"
| summarize count() by bin(_time, 1m)
```

### Recovery

**Immediate (restart to clear stuck connections):**

```bash
# Redeploy the app service (not the database)
railway up
```

**If it recurs after restart:**

1. Check for long-running queries in logs:
   ```apl
   ['thumbnail-maker']
   | where category == 'performance' and duration > 5000 and _time > ago(1h)
   | order by duration desc
   | take 20
   ```
2. Consider increasing pool size in `DATABASE_URL`:
   Change `connection_limit=10` to `connection_limit=15`
   (Railway shared PostgreSQL supports ~97 total connections across all clients)

**If under heavy load:**

- The pool limit is intentionally conservative. Only increase if you've confirmed the connections are being released properly.

---

## Failure Pattern C: Cascading ECONNRESET

### Symptoms

```
Error: Connection terminated unexpectedly
```

Multiple workers/routes failing simultaneously with `ECONNRESET`.

### Diagnosis

This is typically a **server-side disconnection** — all connections dropped at the same time. Known causes:

- Railway PostgreSQL maintenance/failover
- Network partition between app container and database container
- SSL/TLS handshake failures (`SSL error: decryption failed or bad record mac`)

**Check Axiom for the blast radius:**

```apl
['thumbnail-maker']
| where _time > ago(30m) and message contains "ECONNRESET" or message contains "terminated unexpectedly"
| summarize count() by bin(_time, 1m)
```

### Recovery

1. **Wait 60 seconds** — Prisma's connection pool auto-reconnects after dropped connections.
2. **Check if the app recovered on its own:**
   ```bash
   curl -s https://YOUR_DOMAIN/health | jq '.services.database'
   ```
3. **If still unhealthy after 2 minutes, redeploy:**
   ```bash
   railway up
   ```
4. **If the issue recurs frequently:**
   - Check if app and database are in the **same Railway region** (cross-region = higher failure rate)
   - Check Railway status page for ongoing networking issues

---

## Failure Pattern D: Intermittent Connectivity

### Symptoms

- Some requests succeed, others fail with database errors
- Health check alternates between healthy and unhealthy
- Logs show sporadic `Connection reset by peer` or `unexpected EOF`

### Diagnosis

**Check error frequency:**

```apl
['thumbnail-maker']
| where _time > ago(1h) and level == 'error' and message contains "database" or message contains "prisma" or message contains "ECONNRESET"
| summarize count() by bin(_time, 5m)
```

**Common causes:**

- Railway internal networking instability (check status page)
- App and database in different regions
- SSL renegotiation failures

### Recovery

1. **Check Railway status:** https://status.railway.com
2. **If Railway shows an incident:** Wait for resolution, then redeploy.
3. **If no incident reported:**
   - Confirm app and database are in the same region (Railway dashboard → both services → Settings)
   - Redeploy the app to get a fresh container:
     ```bash
     railway up
     ```
4. **If it persists:** Add `connect_timeout=10` to `DATABASE_URL` (already configured in `.env.example`). Ensure the production `DATABASE_URL` has the same query params:
   ```
   ?connection_limit=10&pool_timeout=10&connect_timeout=10
   ```

---

## Verification

After applying any fix:

1. **Health check returns healthy:**

   ```bash
   curl -s https://YOUR_DOMAIN/health | jq '.services.database'
   ```

   Expected: `"healthy"`

2. **Status code is 200 (not 503):**

   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/health
   ```

   Expected: `200`

3. **No new database errors in Axiom (last 5 minutes):**

   ```apl
   ['thumbnail-maker']
   | where _time > ago(5m) and level == 'error' and (message contains "database" or message contains "prisma")
   | count
   ```

   Expected: `0`

4. **User-facing check:** Log in to the app, load the dashboard (triggers multiple DB queries). Confirm data loads without errors.

---

## Escalation

Escalate if:

- PostgreSQL service in Railway dashboard is not running and won't restart → **Railway support**
- "Mounting volume" stuck for 15+ minutes → **Railway support**
- Connection pool exhaustion recurs after increasing limits → investigate query performance
- Cascading ECONNRESET happens multiple times per day with no Railway incident → **Railway support** with deployment IDs and timestamps

---

## Rollback

Database connection issues rarely require code rollback. However:

- If the issue started immediately after a deployment that changed Prisma schema, rollback to the previous deployment:
  ```bash
  # In Railway dashboard → Deployments → click the previous successful deployment → Redeploy
  ```
- If a migration caused data issues, use `prisma migrate resolve` to mark it as rolled back (see Runbook 01, Pattern B).

---

## Searchable Keywords

```
P1001 Can't reach database server
P2024 Timed out fetching a new connection from the connection pool
P1002 database server started but not ready
P1008 Operations timed out
P1017 Server has closed the connection
ECONNRESET
ECONNREFUSED
ETIMEDOUT
Connection terminated unexpectedly
too many clients already
SSL error decryption failed
Mounting volume
```

---

## Related Runbooks

- [01-application-wont-start.md](./01-application-wont-start.md) — If the app won't start at all (migration failure during deploy)
- [06-performance-degradation.md](./06-performance-degradation.md) — If DB is connected but queries are slow
- [05-high-error-rate.md](./05-high-error-rate.md) — If errors are happening but not specifically DB-related
