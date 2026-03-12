# Runbook 05: High Error Rate

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P2 — Major (escalate to P1 if error rate > 50%)
**Expected Duration:** 15–60 minutes

---

## When to Use This Runbook

Use this runbook when:

- Axiom monitor fires "High Error Rate" alert (error rate > 5% over 5 minutes)
- Multiple users report errors across different features
- Health endpoint returns 200 but many API routes return 4xx/5xx
- Axiom dashboard shows a spike in error rate

Do **NOT** use this runbook when:

- App won't start at all → see [01-application-wont-start.md](./01-application-wont-start.md)
- Only database errors → see [02-database-connection-issues.md](./02-database-connection-issues.md)
- Only AI features broken → see [03-ai-generation-failures.md](./03-ai-generation-failures.md)
- Only payment features broken → see [04-payment-stripe-issues.md](./04-payment-stripe-issues.md)
- App is slow but not erroring → see [06-performance-degradation.md](./06-performance-degradation.md)

---

## Prerequisites

- [ ] Axiom access: https://app.axiom.co (dataset: `thumbnail-maker`)
- [ ] Railway CLI authenticated
- [ ] Access to recent deployment history (`railway deployment list`)

---

## Diagnosis

### Step 1: Confirm the error rate

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(15m)
| summarize
    total = count(),
    errors = countif(statusCode >= 500),
    clientErrors = countif(statusCode >= 400 and statusCode < 500),
    errorRate = round(countif(statusCode >= 500) * 100.0 / count(), 2)
```

**Healthy:** `errorRate` < 1%
**Warning:** `errorRate` 1–5%
**Critical:** `errorRate` > 5%

### Step 2: Identify which routes are failing

```apl
['thumbnail-maker']
| where category == 'request' and statusCode >= 500 and _time > ago(15m)
| summarize count() by url, statusCode
| order by count_ desc
| take 20
```

This tells you if it's a single broken endpoint or a systemic issue.

### Step 3: Check if errors correlate with a recent deployment

```bash
railway deployment list
```

Compare the deployment timestamp with when errors started. If they align, the latest deploy likely introduced a bug.

### Step 4: Get error details via request ID

Pick a failing request from Step 2 and trace it:

```apl
['thumbnail-maker']
| where _time > ago(15m) and statusCode >= 500 and url == "/api/THE_FAILING_ROUTE"
| project _time, requestId, message, statusCode, duration
| take 5
```

Then trace the full request lifecycle using the request ID:

```apl
['thumbnail-maker']
| where requestId == 'THE_REQUEST_ID_FROM_ABOVE'
| order by _time asc
```

This shows every log entry for that single request, from entry to error.

---

## Failure Pattern A: Deployment Introduced a Bug

### Symptoms

- Error rate spiked immediately after a deployment
- Errors are on routes that were working before
- Error messages reference code/logic errors (not external service failures)

### Diagnosis

```apl
['thumbnail-maker']
| where level == 'error' and _time > ago(30m)
| summarize count() by bin(_time, 1m)
```

If the chart shows a cliff — zero errors then suddenly many — and it aligns with a deploy timestamp, it's a deploy regression.

### Recovery

**Rollback to previous deployment:**

1. Go to Railway dashboard → your service → Deployments
2. Find the last successful deployment (before the spike)
3. Click it → "Redeploy"

**Or from CLI:**

```bash
railway deployment list
# Note the ID of the last good deployment, then redeploy from source
railway up  # If you've reverted the code locally
```

**After rollback:**

1. Verify error rate drops
2. Investigate the bug in the reverted code locally
3. Fix and redeploy when ready

---

## Failure Pattern B: Authentication Errors Spike (401s)

### Symptoms

```apl
['thumbnail-maker']
| where category == 'request' and statusCode == 401 and _time > ago(15m)
| summarize count() by bin(_time, 1m)
```

Spike in 401 errors across multiple routes.

### Diagnosis

**Cause 1: JWT_SECRET changed**
If `JWT_SECRET` or `REFRESH_TOKEN_SECRET` was changed in Railway variables, all existing tokens become invalid. Every logged-in user gets 401.

**Cause 2: Auth middleware bug**
A code change broke the authentication flow.

**Cause 3: Clock skew**
JWT validation is time-sensitive. If the server clock is significantly off, tokens appear expired.

### Recovery

**If JWT secret was accidentally changed:**

1. Revert to the previous secret value:
   ```bash
   railway variables set JWT_SECRET=PREVIOUS_VALUE
   ```
2. Note: All existing sessions are already invalidated. Users will need to log in again.

**If auth middleware bug:**

- Rollback deployment (see Pattern A).

**If clock skew (unlikely on Railway):**

- Redeploy to get a fresh container with correct time.

---

## Failure Pattern C: External Service Cascade

### Symptoms

- Errors on multiple unrelated routes
- Error messages reference different external services
- Health endpoint shows degraded services

### Diagnosis

```bash
curl -s https://YOUR_DOMAIN/health | jq '.services'
```

```json
{
  "cache": "healthy|unhealthy",
  "database": "healthy|unhealthy",
  "events": "healthy|unhealthy",
  "replicateQueue": "healthy|not initialized"
}
```

**If database unhealthy:** → see [02-database-connection-issues.md](./02-database-connection-issues.md)
**If cache unhealthy:** → see [06-performance-degradation.md](./06-performance-degradation.md)
**If replicateQueue not initialized:** Redis is down → see [06-performance-degradation.md](./06-performance-degradation.md)

Also check:

```apl
['thumbnail-maker']
| where level == 'error' and _time > ago(15m)
| summarize count() by message
| order by count_ desc
| take 10
```

This groups errors by message — quickly reveals if one root cause dominates.

---

## Failure Pattern D: Rate Limiting Triggering False Errors

### Symptoms

- Spike in 429 (Too Many Requests) responses
- Legitimate users blocked
- Single IP or user causing excessive requests

### Diagnosis

```apl
['thumbnail-maker']
| where category == 'request' and statusCode == 429 and _time > ago(15m)
| summarize count() by ip
| order by count_ desc
| take 10
```

### Recovery

**If a single IP is abusive:**

- The rate limiter is working as intended. No action needed.
- If it's a legitimate user hitting limits, consider temporarily increasing limits.

**If many legitimate users are being rate limited:**

- Check if rate limit configuration is too aggressive:
  - General: 100 req/15min per IP, 200 req/15min per user
  - Auth: 5 req/15min per IP, 30 req/15min per user
  - Upload: 20 req/15min per IP, 50 req/15min per user
- Temporarily increase via env vars if needed:
  ```bash
  railway variables set RATE_LIMIT_MAX_REQUESTS=200
  ```

---

## Failure Pattern E: Unhandled Errors (No Specific Pattern)

### Symptoms

- 500 errors with generic "Internal Server Error"
- No clear pattern in which routes fail

### Diagnosis

**Get the actual error stack traces:**

```apl
['thumbnail-maker']
| where level == 'error' and _time > ago(15m)
| where error.stack != ""
| project _time, message, error.message, error.stack, requestId
| order by _time desc
| take 10
```

**Look for unhandled promise rejections:**

```apl
['thumbnail-maker']
| where _time > ago(15m) and message contains "unhandled" or message contains "UnhandledPromiseRejection"
| order by _time desc
```

### Recovery

1. Identify the root cause from stack traces.
2. If it's a known issue, apply the fix and redeploy.
3. If it's a new/unknown issue, rollback to the last stable deployment while investigating.
4. Add error handling to the identified code path to prevent generic 500s.

---

## Axiom Monitoring Queries

### Real-Time Error Dashboard

**Error rate over time (last hour):**

```apl
['thumbnail-maker']
| where category == 'request' and _time > ago(1h)
| summarize errorRate = countif(statusCode >= 500) * 100.0 / count()
  by bin(_time, 1m)
```

**Top erroring endpoints:**

```apl
['thumbnail-maker']
| where category == 'request' and statusCode >= 500 and _time > ago(1h)
| summarize errors = count(), avgDuration = avg(duration) by url
| order by errors desc
```

**Error distribution by status code:**

```apl
['thumbnail-maker']
| where category == 'request' and statusCode >= 400 and _time > ago(1h)
| summarize count() by statusCode
| order by count_ desc
```

**Unique affected users:**

```apl
['thumbnail-maker']
| where category == 'request' and statusCode >= 500 and _time > ago(1h)
| summarize uniqueIPs = dcount(ip)
```

---

## Verification

After applying any fix:

1. **Error rate is dropping:**

   ```apl
   ['thumbnail-maker']
   | where category == 'request' and _time > ago(10m)
   | summarize errorRate = round(countif(statusCode >= 500) * 100.0 / count(), 2)
   ```

   Expected: < 1%

2. **Previously failing routes now work:**

   ```bash
   curl -s -o /dev/null -w "%{http_code}" https://YOUR_DOMAIN/health
   ```

   Expected: `200`

3. **No new 500 errors in last 5 minutes:**
   ```apl
   ['thumbnail-maker']
   | where category == 'request' and statusCode >= 500 and _time > ago(5m)
   | count
   ```
   Expected: `0`

---

## Escalation

Escalate if:

- Error rate > 50% and rollback didn't fix it → likely infrastructure issue
- Errors persist across multiple deployments (old and new code) → external service or platform issue
- Cannot identify root cause from logs → add more specific logging, redeploy, and reproduce

---

## Searchable Keywords

```
Internal Server Error
500
502 Bad Gateway
503 Service Unavailable
429 Too Many Requests
401 Unauthorized
UnhandledPromiseRejection
unhandled rejection
error rate spike
rate limit exceeded
JWT malformed
jwt expired
invalid token
```

---

## Related Runbooks

- [01-application-wont-start.md](./01-application-wont-start.md) — If errors are because the app is actually down
- [02-database-connection-issues.md](./02-database-connection-issues.md) — If root cause is database
- [03-ai-generation-failures.md](./03-ai-generation-failures.md) — If root cause is AI providers
- [04-payment-stripe-issues.md](./04-payment-stripe-issues.md) — If root cause is Stripe
- [06-performance-degradation.md](./06-performance-degradation.md) — If errors are caused by timeouts from slow performance
