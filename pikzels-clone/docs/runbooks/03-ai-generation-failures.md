# Runbook 03: AI Generation Failures

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P2 — Major
**Expected Duration:** 10–30 minutes

---

## When to Use This Runbook

Use this runbook when:

- Users report "generation failed" or "AI tool error" messages
- Logs show errors from OpenRouter, Replicate, Comet, or ZenMux
- AI tools page features (generate, inpaint, face swap, upscale, remove BG, etc.) all fail
- BullMQ Replicate queue shows growing `failed` count in `/health`
- Axiom shows spike in errors with `category: 'ai'` or on `/api/thumbnails/ai/*` routes

Do **NOT** use this runbook when:

- App won't start → see [01-application-wont-start.md](./01-application-wont-start.md)
- All API routes fail (not just AI) → see [02-database-connection-issues.md](./02-database-connection-issues.md) or [05-high-error-rate.md](./05-high-error-rate.md)
- AI works but is slow → see [06-performance-degradation.md](./06-performance-degradation.md)

---

## Prerequisites

- [ ] Railway CLI authenticated
- [ ] Access to provider dashboards:
  - OpenRouter: https://openrouter.ai/settings/keys
  - Replicate: https://replicate.com/account
  - Comet: https://api.cometapi.com (Dashboard)
  - ZenMux: https://zenmux.ai (Dashboard)
- [ ] Axiom access for log queries

---

## AI Provider Architecture

Understanding the provider chain is critical for diagnosis:

```
User Request
    │
    ├─ Generate/Inpaint/FaceSwap → OpenRouter (primary)
    │                                  ├─ gemini-2.5-flash-image (generate)
    │                                  ├─ gemini-3-pro-image-preview (inpaint)
    │                                  ├─ seedream-4.5 (face swap)
    │                                  └─ flux.2-max (upscale)
    │
    ├─ Generate (FLUX models) ──────→ Comet API (flux-dev)
    │                                  └─ fallback → OpenRouter
    │
    ├─ Generate (Gemini) ───────────→ ZenMux (gemini-2.5-flash-image)
    │
    ├─ Segment ─────────────────────→ Replicate (meta/sam-2)
    ├─ Remove Background ───────────→ Replicate (bria/remove-background)
    ├─ Upscale ─────────────────────→ Replicate (astramlco/supir)
    ├─ Expand ──────────────────────→ Replicate (bria/expand-image)
    │                                  └─ All Replicate: async via BullMQ queue
    │
    └─ Vision/CTR Analysis ─────────→ OpenRouter (gemini-2.5-flash-preview)
```

---

## Diagnosis

### Step 1: Identify which provider is failing

```apl
['thumbnail-maker']
| where _time > ago(30m) and level == 'error'
| where message contains "openrouter" or message contains "replicate" or message contains "comet" or message contains "zenmux" or message contains "ai" or url startswith "/api/thumbnails/ai"
| summarize count() by message
| order by count_ desc
| take 20
```

### Step 2: Check health endpoint for queue status

```bash
curl -s https://YOUR_DOMAIN/health | jq '.replicateQueue'
```

**Expected (healthy):**

```json
{
  "waiting": 0,
  "active": 0,
  "completed": 150,
  "failed": 2
}
```

**Problem indicators:**

- `waiting` growing with `active` at 0 → queue is stuck
- `failed` count significantly higher than `completed` → provider is down
- `replicateQueue` is `"not initialized"` → Redis connection issue (BullMQ needs Redis)

### Step 3: Check provider status pages

| Provider   | Status Page                  | Dashboard                           |
| ---------- | ---------------------------- | ----------------------------------- |
| OpenRouter | https://status.openrouter.ai | https://openrouter.ai/settings/keys |
| Replicate  | https://replicate.com/status | https://replicate.com/account       |
| Comet      | N/A (check dashboard)        | https://api.cometapi.com            |
| ZenMux     | N/A (check dashboard)        | https://zenmux.ai                   |

---

## Failure Pattern A: OpenRouter Down / Returning Errors

### Symptoms

```
OpenRouter API error: 500 Internal Server Error
```

or the misleading:

```
OpenRouter API error: 401 User not found
```

(OpenRouter returns `401` during outages due to cache invalidation — this does NOT mean your API key is wrong)

### Diagnosis

1. **Check OpenRouter status:** https://status.openrouter.ai
2. **Check your credit balance:** https://openrouter.ai/settings/keys
3. **Check if specific models are down vs all models:**
   ```apl
   ['thumbnail-maker']
   | where _time > ago(30m) and message contains "openrouter" and level == 'error'
   | summarize count() by message
   ```

### Recovery

**If OpenRouter is having an outage:**

- Wait for resolution. OpenRouter outages typically last 30–40 minutes (based on Feb 2026 incidents).
- Users will see errors for AI features that depend on OpenRouter. Non-AI features continue working.
- No action needed on your side.

**If your API key is invalid or credits exhausted:**

1. Go to https://openrouter.ai/settings/keys
2. Verify the key is active and has credits
3. If key needs regeneration:
   ```bash
   # Update in Railway
   railway variables set OPENROUTER_API_KEY=sk-or-v1-NEW_KEY_HERE
   ```
   Railway auto-redeploys after variable change.

**If specific models are unavailable:**

- The model may have been deprecated or renamed on OpenRouter.
- Check https://openrouter.ai/models for current model availability.
- Update the model env var if needed (e.g., `OPENROUTER_MODEL_GENERATE`).

---

## Failure Pattern B: Replicate Failures (Segment, Remove BG, Upscale, Expand)

### Symptoms

```
Replicate prediction failed: ...
```

or BullMQ queue shows growing `failed` count.

### Diagnosis

**Replicate tasks are async (via BullMQ).** Check the queue:

```bash
curl -s https://YOUR_DOMAIN/health | jq '.replicateQueue'
```

**Check logs for specific errors:**

```apl
['thumbnail-maker']
| where _time > ago(30m) and message contains "replicate" and level == 'error'
| order by _time desc
| take 10
```

**Common Replicate errors:**

| Error                   | Cause                             | Fix                                      |
| ----------------------- | --------------------------------- | ---------------------------------------- |
| `Invalid API token`     | `REPLICATE_API_KEY` wrong/expired | Regenerate at replicate.com              |
| `Model not found`       | Model ID changed/deprecated       | Check model page on Replicate            |
| `Prediction timed out`  | Cold start or heavy load          | Retry — first request to a model is slow |
| `NSFW content detected` | Input image flagged               | Expected behavior, not a bug             |

### Recovery

**If API token invalid:**

1. Go to https://replicate.com/account/api-tokens
2. Generate a new token
3. Update in Railway:
   ```bash
   railway variables set REPLICATE_API_KEY=r8_NEW_TOKEN_HERE
   ```

**If model deprecated:**

1. Check the model page on Replicate for the current version
2. Update the env var (e.g., `REPLICATE_MODEL_REMOVE_BG`)
3. Railway auto-redeploys

**If cold start timeouts:**

- This is normal for Replicate models that haven't been called recently.
- The first request may take 30–60 seconds. Subsequent requests are faster.
- If timeouts persist, check Replicate status page.

**If queue is stuck (waiting > 0, active = 0):**

- This means BullMQ can't process jobs. Check Redis:
  ```bash
  curl -s https://YOUR_DOMAIN/health | jq '.services.cache'
  ```
- If cache is unhealthy → see [06-performance-degradation.md](./06-performance-degradation.md)
- If cache is healthy but queue is stuck, redeploy:
  ```bash
  railway up
  ```

---

## Failure Pattern C: Comet API Failures (FLUX Models)

### Symptoms

```
Comet API error: ...
```

FLUX model generation fails.

### Diagnosis

```apl
['thumbnail-maker']
| where _time > ago(30m) and message contains "comet" and level == 'error'
| order by _time desc
```

### Recovery

**If API key invalid/exhausted:**

1. Go to https://api.cometapi.com (Dashboard → API Token)
2. Verify token is active
3. Update if needed:
   ```bash
   railway variables set COMET_API_KEY=NEW_KEY_HERE
   ```

**If Comet is down:**

- Comet has fallback to OpenRouter built into the app. Check if OpenRouter is working.
- If both are down, AI generation is unavailable until one recovers.

---

## Failure Pattern D: ZenMux Failures (Gemini Models)

### Symptoms

```
ZenMux API error: ...
```

### Diagnosis

```apl
['thumbnail-maker']
| where _time > ago(30m) and message contains "zenmux" and level == 'error'
| order by _time desc
```

### Recovery

1. Check https://zenmux.ai dashboard for account status
2. Verify API key:
   ```bash
   railway variables | grep ZENMUX
   ```
3. Update if needed:
   ```bash
   railway variables set ZENMUX_API_KEY=NEW_KEY_HERE
   ```

---

## Failure Pattern E: Rate Limiting

### Symptoms

```
429 Too Many Requests
Rate limit exceeded
```

### Diagnosis

AI providers have their own rate limits on top of your app's rate limits.

**Check which provider is rate-limited:**

```apl
['thumbnail-maker']
| where _time > ago(30m) and (message contains "429" or message contains "rate limit")
| summarize count() by message
```

### Recovery

- Rate limits are temporary. They typically reset within 1–5 minutes.
- If a user hit the rate limit, their requests will start working again shortly.
- If your app is consistently hitting provider rate limits, you may need to:
  1. Add request queuing/throttling
  2. Upgrade your provider plan
  3. Distribute across more providers

---

## Verification

After applying any fix:

1. **Health check shows queue healthy:**

   ```bash
   curl -s https://YOUR_DOMAIN/health | jq '{queue: .replicateQueue, cache: .services.cache}'
   ```

2. **Test a generation:** Log into the app → Dashboard → try generating a thumbnail with a simple prompt.

3. **No new AI errors in Axiom (last 5 minutes):**
   ```apl
   ['thumbnail-maker']
   | where _time > ago(5m) and level == 'error' and (message contains "openrouter" or message contains "replicate" or message contains "comet" or message contains "zenmux")
   | count
   ```
   Expected: `0`

---

## Escalation

Escalate if:

- All AI providers are simultaneously down (extremely rare) → wait for provider recovery
- API keys are confirmed valid but all requests fail → check for IP-based bans (Railway's IP may be blocked by a provider)
- BullMQ queue is stuck even after Redis is confirmed healthy and app is redeployed → investigate BullMQ internals

---

## Searchable Keywords

```
OpenRouter API error
Replicate prediction failed
Comet API error
ZenMux API error
401 User not found
429 Too Many Requests
Rate limit exceeded
Invalid API token
Model not found
Prediction timed out
NSFW content detected
BullMQ queue stuck
replicateQueue not initialized
```

---

## Related Runbooks

- [06-performance-degradation.md](./06-performance-degradation.md) — If Redis is down (affects BullMQ queue)
- [05-high-error-rate.md](./05-high-error-rate.md) — If errors are broader than just AI
- [04-payment-stripe-issues.md](./04-payment-stripe-issues.md) — If credit deduction fails during AI operations
