# Runbook 06: Performance Degradation

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P2 — Major (escalate to P1 if p95 > 10s or users can't complete actions)
**Expected Duration:** 15–60 minutes

---

## When to Use This Runbook

Use this runbook when:

- Axiom monitor fires "Slow Responses" alert (p95 > 2000ms over 5 minutes)
- Users report the app is "slow" or "loading forever"
- Health endpoint responds but takes > 2 seconds
- Dashboard/project pages take > 5 seconds to load
- Cache hit rate drops significantly

Do **NOT** use this runbook when:

- App won't start → see [01-application-wont-start.md](./01-application-wont-start.md)
- Specific routes return errors (not slowness) → see [05-high-error-rate.md](./05-high-error-rate.md)
- Only AI features are slow (other features are fast) → see [03-ai-generation-failures.md](./03-ai-generation-failures.md)

---

## Prerequisites

- [ ] Axiom access: https://app.axiom.co (dataset: `thumbnail-maker`)
- [ ] Railway CLI authenticated
- [ ] Railway dashboard access (for metrics: CPU, memory, network)

---

## Diagnosis

### Step 1: Confirm performance is degraded

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(15m)
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99),
    avgDuration = avg(duration)
```

**Healthy targets:**
| Metric | Target | Concern |
|--------|--------|---------|
| p50 | < 200ms | > 500ms |
| p95 | < 1000ms | > 2000ms |
| p99 | < 3000ms | > 5000ms |

### Step 2: Identify slow endpoints

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(15m)
| summarize
    avgDuration = avg(duration),
    p95 = percentile(duration, 95),
    requests = count()
  by url
| where p95 > 1000
| order by p95 desc
| take 20
```

### Step 3: Check infrastructure health

```bash
curl -s https://YOUR_DOMAIN/health | jq '.services'
```

Also check Railway dashboard → your service → Metrics:

- **CPU:** > 80% sustained = problem
- **Memory:** > 80% of limit = OOM risk
- **Network:** unusual spikes

---

## Failure Pattern A: Redis Down (In-Memory Fallback Active)

### Symptoms

- All cached routes are slow (projects, thumbnails, analytics, styles)
- Health endpoint shows `"cache": "unhealthy"`
- Logs show Redis connection errors
- BullMQ Replicate queue shows `"not initialized"`

### Diagnosis

```bash
curl -s https://YOUR_DOMAIN/health | jq '{cache: .services.cache, queue: .services.replicateQueue}'
```

**If cache is unhealthy:**

```apl
['thumbnail-maker']
| where _time > ago(15m) and (message contains "redis" or message contains "ECONNREFUSED" or message contains "ETIMEDOUT")
| order by _time desc
| take 10
```

The app has a **graceful fallback**: when Redis is down, it switches to an in-memory LRU cache (10K entry cap). This works but:

- Cache is not shared across containers (if scaled)
- Cache is cold (everything is a miss initially)
- BullMQ queue stops working (Replicate async jobs won't process)

### Recovery

**Check Railway Redis service:**

1. Railway dashboard → Redis service → is it running?
2. Check Redis metrics: memory usage, connections

**If Redis service is down:**

1. Restart it from Railway dashboard
2. Wait 30 seconds for the app to reconnect (auto-retry every 30s)
3. Verify:
   ```bash
   curl -s https://YOUR_DOMAIN/health | jq '.services.cache'
   ```
   Expected: `"healthy"`

**If Redis is running but app can't connect:**

1. Verify `REDIS_URL` is correct:
   ```bash
   railway variables | grep REDIS_URL
   ```
2. Check if Redis and app are in the same Railway project/environment
3. Redeploy the app:
   ```bash
   railway up
   ```

**If Redis is at memory limit:**

- Check Redis memory usage in Railway dashboard
- The app uses LRU eviction, so Redis should self-manage. But if `maxmemory-policy` is `noeviction`, Redis will reject writes instead of evicting.
- Upgrade Redis plan if needed, or reduce cache TTLs.

---

## Failure Pattern B: Database Query Slowness

### Symptoms

- Slow responses on routes that query the database
- No Redis issues (cache is healthy)
- Health check is slow itself (it runs `SELECT 1`)

### Diagnosis

**Find slow queries via performance logs:**

```apl
['thumbnail-maker']
| where category == 'performance' and _time > ago(30m)
| where duration > 1000
| summarize count(), avgDuration = avg(duration), maxDuration = max(duration) by operation
| order by maxDuration desc
| take 15
```

**Check if slow requests correlate with specific routes:**

```apl
['thumbnail-maker']
| where category == 'request' and duration > 2000 and _time > ago(30m)
| summarize count(), avgDuration = avg(duration) by url
| order by avgDuration desc
| take 10
```

**Common causes:**

- Missing database index on a frequently queried column
- N+1 query pattern (many small queries instead of one joined query)
- Connection pool exhaustion (see [02-database-connection-issues.md](./02-database-connection-issues.md))
- Large dataset without pagination

### Recovery

**Immediate (reduce load):**

- If a specific endpoint is hammering the database, consider temporarily increasing its cache TTL
- Redeploy to clear any stuck connections:
  ```bash
  railway up
  ```

**If connection pool exhaustion:**
→ See [02-database-connection-issues.md](./02-database-connection-issues.md), Failure Pattern B

**Long-term:**

- Add indexes for frequently queried columns
- Optimize N+1 queries with Prisma `include` or `select`
- Add pagination to list endpoints

---

## Failure Pattern C: Cache Stampede (Thundering Herd)

### Symptoms

- Sudden spike in response times after a period of normal operation
- Database load spikes simultaneously
- Happens when a popular cached key expires and many requests hit the DB at once

### Diagnosis

```apl
['thumbnail-maker']
| where category == 'cache' and operation == 'get' and _time > ago(30m)
| summarize
    hitRate = countif(hit == true) * 100.0 / count(),
    total = count()
  by bin(_time, 1m)
```

If `hitRate` drops from ~80%+ to near 0% suddenly, then spikes back, it's a stampede.

### Recovery

**Immediate:**

- The spike is usually self-correcting — once the first request populates the cache, subsequent requests get cache hits.
- If it's causing cascading failures, redeploy to restart with a clean state:
  ```bash
  railway up
  ```

**Prevention (code changes for future):**

- Implement stale-while-revalidate: serve stale cache while refreshing in background
- Add jitter to cache TTLs: instead of all keys expiring at the same time, randomize TTLs slightly
- Use a lock/mutex for cache population: only one request fetches from DB, others wait

---

## Failure Pattern D: Memory Leak / High Memory Usage

### Symptoms

- Response times gradually increase over hours/days
- Railway metrics show steadily climbing memory
- Eventually, container is OOM-killed and restarts (sawtooth pattern)

### Diagnosis

**Check Railway dashboard:** Metrics → Memory

- Sawtooth pattern (grows → crash → restart → grows) = memory leak
- Sudden spike = one-time large allocation (image processing?)

**Check if a specific route correlates:**

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(6h)
| summarize avgDuration = avg(duration) by bin(_time, 30m)
```

If average duration increases over time = memory pressure causing GC pauses.

### Recovery

**Immediate:**

```bash
# Redeploy to restart the container with fresh memory
railway up
```

**If it recurs within hours:**

- Check for common Node.js memory leak patterns:
  - Event listeners not being removed
  - Growing arrays/maps that are never cleaned
  - Image buffers not being released after processing
- The in-memory cache has a 10K entry LRU cap with 80% warning — if it's growing beyond that, the cap isn't working

**Long-term:**

- Profile locally with `--inspect` flag and Chrome DevTools
- Add memory monitoring to the health endpoint
- Consider adding a periodic memory usage log entry

---

## Failure Pattern E: High CPU / Event Loop Blocking

### Symptoms

- All routes slow simultaneously
- Railway CPU metrics > 80%
- Logs show slow request warnings (> 1000ms)

### Diagnosis

**Check for CPU-intensive operations:**

```apl
['thumbnail-maker']
| where category == 'performance' and duration > 1000 and _time > ago(30m)
| summarize count() by operation
| order by count_ desc
```

**Common CPU-intensive operations in this app:**

- Image processing (sharp/canvas operations)
- JSON parsing of large payloads
- Encryption/hashing operations

### Recovery

**Immediate:**

```bash
# Redeploy (sometimes stale process state contributes)
railway up
```

**If caused by traffic spike:**

- Check request volume:
  ```apl
  ['thumbnail-maker']
  | where category == 'request' and _time > ago(1h)
  | summarize count() by bin(_time, 1m)
  ```
- If significantly higher than normal, consider scaling up (Railway dashboard → service → Settings → increase vCPU/RAM)

---

## Axiom Performance Queries

**Response time percentiles over time:**

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(1h)
| summarize
    p50 = percentile(duration, 50),
    p95 = percentile(duration, 95),
    p99 = percentile(duration, 99)
  by bin(_time, 5m)
```

**Cache hit rate over time:**

```apl
['thumbnail-maker']
| where category == 'cache' and operation == 'get' and _time > ago(1h)
| summarize hitRate = countif(hit == true) * 100.0 / count()
  by bin(_time, 5m)
```

**Requests per minute:**

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(1h)
| summarize count() by bin(_time, 1m)
```

---

## Verification

After applying any fix:

1. **p95 response time is within target:**

   ```apl
   ['thumbnail-maker']
   | where category == 'request' and _time > ago(5m)
   | summarize p95 = percentile(duration, 95)
   ```

   Expected: < 1000ms

2. **Cache is healthy:**

   ```bash
   curl -s https://YOUR_DOMAIN/health | jq '.services.cache'
   ```

   Expected: `"healthy"`

3. **No slow-request warnings:**

   ```apl
   ['thumbnail-maker']
   | where category == 'performance' and duration > 1000 and _time > ago(5m)
   | count
   ```

   Expected: `0` or very few

4. **User-facing check:** Load the dashboard, navigate to Projects, load My Thumbnails — all should feel responsive (< 2s).

---

## Escalation

Escalate if:

- Redis won't restart or connect after multiple attempts → **Railway support**
- Memory keeps climbing even after redeploy (leak in current code) → investigate with profiling
- CPU maxed with normal traffic levels → consider upgrading Railway plan
- p95 > 5s persists after all recovery steps → deeper performance investigation needed

---

## Searchable Keywords

```
slow response
timeout
ETIMEDOUT
cache miss
cache unhealthy
redis connection refused
redis ECONNREFUSED
BullMQ queue stuck
out of memory
OOM
memory limit
CPU throttled
p95 high
latency spike
performance degradation
cache stampede
thundering herd
```

---

## Related Runbooks

- [02-database-connection-issues.md](./02-database-connection-issues.md) — If slowness is caused by DB connection problems
- [03-ai-generation-failures.md](./03-ai-generation-failures.md) — If only AI features are slow (provider latency)
- [05-high-error-rate.md](./05-high-error-rate.md) — If slowness leads to timeouts and errors
