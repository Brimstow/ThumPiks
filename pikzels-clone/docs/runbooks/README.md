# Production Runbooks — Thumbnail Maker Studio

**Last Updated:** 2026-03-11
**Last Tested:** N/A (test during next staging deployment)
**Owner:** Development Team

---

## Severity Levels

| Level  | Name     | Response Time       | Examples                                     |
| ------ | -------- | ------------------- | -------------------------------------------- |
| **P1** | Critical | Immediate (< 5 min) | App down, payments broken, data loss risk    |
| **P2** | Major    | Urgent (< 30 min)   | Degraded performance, partial feature outage |
| **P3** | Minor    | Same day            | Single feature broken, cosmetic issues       |
| **P4** | Low      | Next sprint         | Non-urgent improvements, minor bugs          |

---

## Runbook Index

| #   | Runbook                                                          | Severity | File                                                   |
| --- | ---------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| 1   | [Application Won't Start](./01-application-wont-start.md)        | P1       | Deploy failures, missing env vars, migration errors    |
| 2   | [Database Connection Issues](./02-database-connection-issues.md) | P1       | Prisma errors, health check 503, pool exhaustion       |
| 3   | [AI Generation Failures](./03-ai-generation-failures.md)         | P2       | OpenRouter/Replicate/Comet/ZenMux provider errors      |
| 4   | [Payment & Stripe Issues](./04-payment-stripe-issues.md)         | P1       | Checkout failures, webhook errors, subscription issues |
| 5   | [High Error Rate](./05-high-error-rate.md)                       | P2       | Axiom alerts, error spikes, request ID tracing         |
| 6   | [Performance Degradation](./06-performance-degradation.md)       | P2       | Redis failures, cache misses, slow queries             |

---

## General Incident Response Process

### Phase 1: Acknowledge (0–5 minutes)

1. **Check health endpoint:**
   ```bash
   curl -s https://YOUR_DOMAIN/health | jq .
   ```
2. **Check Railway deployment status:**
   ```bash
   railway status
   railway logs --tail 50
   ```
3. **Check Axiom for recent errors:**
   ```apl
   ['thumbnail-maker']
   | where _time > ago(15m) and level == 'error'
   | order by _time desc
   | take 20
   ```
4. **Assign severity** using the table above.

### Phase 2: Diagnose (5–15 minutes)

1. Identify which runbook applies based on symptoms.
2. Follow that runbook's diagnosis steps.
3. If multiple issues, start with the highest-severity runbook.

### Phase 3: Resolve (15–60 minutes)

1. Follow the runbook's recovery steps.
2. Verify using the runbook's verification checklist.
3. If the runbook doesn't resolve it, follow its escalation path.

### Phase 4: Post-Incident

1. Document what happened (timeline, root cause, resolution).
2. Update the relevant runbook if gaps were found.
3. Create follow-up tickets for prevention measures.

---

## Quick Reference: Infrastructure

| Component           | Details                                                                          |
| ------------------- | -------------------------------------------------------------------------------- |
| **Platform**        | Railway (Railpack builder)                                                       |
| **Backend**         | Node.js + Express + TypeScript                                                   |
| **Database**        | PostgreSQL (Prisma ORM, `connection_limit=10`)                                   |
| **Cache**           | Redis (port 8520) with LRU in-memory fallback (10K cap)                          |
| **Image CDN**       | Cloudinary                                                                       |
| **Payments**        | Stripe (subscriptions + credits)                                                 |
| **AI Providers**    | OpenRouter (primary), Replicate (SAM2/RMBG/SUPIR), Comet (FLUX), ZenMux (Gemini) |
| **Logging**         | Axiom (`@axiomhq/winston`, dataset: `thumbnail-maker`)                           |
| **Job Queue**       | BullMQ (Replicate async tasks)                                                   |
| **Health Endpoint** | `GET /health` → returns cache, database, events, replicateQueue status           |

## Quick Reference: Key Commands

```bash
# Railway CLI
railway logs                    # Live logs
railway logs --tail 100         # Last 100 lines
railway status                  # Current deployment status
railway deployment list         # Recent deployments
railway up                      # Deploy from local
railway variables               # View env vars

# Health check
curl -s https://YOUR_DOMAIN/health | jq .

# Axiom — recent errors
# Go to: https://app.axiom.co → Datasets → thumbnail-maker → Query
```

## Quick Reference: Axiom APL Queries

```apl
# Errors in last hour
['thumbnail-maker'] | where level == 'error' and _time > ago(1h) | order by _time desc

# Errors by route
['thumbnail-maker'] | where category == 'request' and statusCode >= 500 and _time > ago(1h) | summarize count() by url

# Trace a specific request
['thumbnail-maker'] | where requestId == 'YOUR_REQUEST_ID' | order by _time asc

# Error rate last 15 minutes
['thumbnail-maker'] | where category == 'request' and _time > ago(15m) | summarize errorRate = round(countif(statusCode >= 500) * 100.0 / count(), 2)

# Slow requests (> 2s)
['thumbnail-maker'] | where category == 'request' and duration > 2000 and _time > ago(1h) | order by duration desc | take 20
```

---

## Additional Scenarios (Quick Reference)

These are less common but worth knowing about:

### Cloudinary Outage / Quota Exceeded

- **Symptoms:** Broken images across the UI, upload failures, `CLOUDINARY_ERROR` in logs
- **Check:** https://status.cloudinary.com and Cloudinary console usage dashboard
- **Immediate:** If quota exceeded, upgrade plan or delete unused assets. If outage, wait for Cloudinary resolution — images already served are CDN-cached.

### Railway Platform Incident

- **Symptoms:** Multiple services affected simultaneously, deploy stuck, health checks failing but code hasn't changed
- **Check:** https://status.railway.com and https://blog.railway.com (post-mortems)
- **Immediate:** If Railway-wide, nothing to fix on your side. Redeploy after incident is resolved.

### Memory Leak / OOM Kill

- **Symptoms:** Railway metrics show steadily climbing memory, eventual container restart
- **Check:** Railway metrics dashboard for the service, look for sawtooth memory pattern
- **Immediate:** Redeploy (restarts container). Long-term: profile with `--inspect` flag locally.

### SSL/TLS Certificate Issues

- **Symptoms:** Browser shows certificate warnings, HTTPS errors
- **Check:** Railway auto-manages certs for `*.up.railway.app` domains. For custom domains, check DNS settings in Railway dashboard.
- **Immediate:** Remove and re-add custom domain in Railway settings to trigger cert re-issuance.

---

## Escalation (Solo Dev)

When you can't fix it yourself, go straight to the provider:

| Problem                                     | Who to Contact                                        |
| ------------------------------------------- | ----------------------------------------------------- |
| **Railway** (deploy, DB, Redis)             | https://railway.com/support or Railway Discord        |
| **Stripe** (payments, webhooks)             | https://support.stripe.com or Stripe Dashboard → Help |
| **OpenRouter** (AI generation)              | https://discord.gg/openrouter or status.openrouter.ai |
| **Replicate** (segment, upscale, remove BG) | https://replicate.com/support                         |
| **Cloudinary** (images)                     | https://support.cloudinary.com                        |
| **Axiom** (logging)                         | https://axiom.co/support                              |

### Future: Team Escalation Path

When you scale to a team, use this tiered structure:

| Level  | Contact           | When                                           |
| ------ | ----------------- | ---------------------------------------------- |
| **L1** | On-call developer | First responder for all alerts                 |
| **L2** | Team lead         | L1 can't resolve within 30 min, or P1 severity |
| **L3** | External support  | Use provider links above                       |

> **TODO:** Fill in names/handles/phone numbers when the team grows.

---

## Maintenance Schedule

- **Runbook review:** Quarterly (or after every incident where a runbook was used)
- **Game day testing:** Test one runbook per month in staging
- **Ownership:** Each runbook lists its owner in the metadata header
