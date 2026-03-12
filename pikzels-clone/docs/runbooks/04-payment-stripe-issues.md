# Runbook 04: Payment & Stripe Issues

**Last Updated:** 2026-03-11
**Last Tested:** N/A
**Owner:** Development Team
**Severity:** P1 — Critical
**Expected Duration:** 15–45 minutes

---

## When to Use This Runbook

Use this runbook when:

- Users report checkout failures ("payment didn't go through")
- Stripe dashboard shows failed webhook deliveries
- Logs show `Webhook signature verification failed`
- Users report they paid but didn't receive credits or subscription upgrade
- Stripe dashboard shows successful payments but app doesn't reflect them

Do **NOT** use this runbook when:

- App won't start → see [01-application-wont-start.md](./01-application-wont-start.md)
- All routes fail (not just payment) → see [02-database-connection-issues.md](./02-database-connection-issues.md)
- AI features fail after payment succeeds → see [03-ai-generation-failures.md](./03-ai-generation-failures.md)

---

## Prerequisites

- [ ] Access to Stripe dashboard: https://dashboard.stripe.com
- [ ] Railway CLI authenticated
- [ ] Know which Stripe mode is active (test vs live):
  - Test keys start with `sk_test_` / `pk_test_`
  - Live keys start with `sk_live_` / `pk_live_`
- [ ] Axiom access for log queries

---

## Stripe Architecture in This App

```
User clicks "Subscribe" or "Buy Credits"
    │
    ├─ Frontend calls POST /api/subscription/checkout
    │  or POST /api/credits/purchase
    │
    ├─ Backend creates Stripe Checkout Session
    │  → Redirects user to Stripe-hosted checkout page
    │
    ├─ User completes payment on Stripe
    │
    ├─ Stripe sends webhook to POST /api/subscription/webhook
    │  Events handled:
    │    ├─ checkout.session.completed → activate subscription or add credits
    │    ├─ customer.subscription.updated → plan change
    │    └─ customer.subscription.deleted → cancel subscription
    │
    └─ App updates database (subscription status, credit balance)
```

**Critical:** The webhook is the source of truth. If webhooks fail, payments succeed on Stripe's side but the app doesn't know about them.

---

## Diagnosis

### Step 1: Check Stripe dashboard for the event

1. Go to https://dashboard.stripe.com/events (or /test/events for test mode)
2. Look for recent events — are they showing green (delivered) or red (failed)?
3. Click a failed event to see the error details

### Step 2: Check app logs for webhook errors

```apl
['thumbnail-maker']
| where _time > ago(1h) and (message contains "webhook" or message contains "stripe" or url == "/api/subscription/webhook")
| order by _time desc
| take 30
```

### Step 3: Verify webhook endpoint is reachable

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST https://YOUR_DOMAIN/api/subscription/webhook
```

**Expected:** `400` (Bad Request — because there's no valid Stripe signature, but confirms the route exists and responds)
**Problem:** `404` (route not registered), `502`/`503` (app is down)

---

## Failure Pattern A: Webhook Signature Verification Failed

### Symptoms

```
Webhook signature verification failed
Webhook Error: No signatures found matching the expected signature for payload
```

This is the **#1 most common Stripe production bug**.

### Diagnosis

**Cause 1: Wrong webhook secret**
The `STRIPE_WEBHOOK_SECRET` in Railway doesn't match the webhook endpoint configured in Stripe dashboard.

1. Go to Stripe dashboard → Developers → Webhooks
2. Click your webhook endpoint
3. Click "Reveal" on the signing secret — it starts with `whsec_`
4. Compare with:
   ```bash
   railway variables | grep STRIPE_WEBHOOK_SECRET
   ```

**Cause 2: Body parsing interference**
If Express JSON middleware parses the body before Stripe's signature check, the raw body is lost and HMAC verification fails. This app stores the raw body via `verify` callback in `express.json()`:

```typescript
// server.ts — req.rawBody is set during JSON parsing
verify: (req: any, _res, buf) => {
  req.rawBody = buf;
},
```

If `req.body` is used instead of the raw buffer for verification, signatures won't match.

**Cause 3: Webhook URL mismatch**
The webhook URL in Stripe dashboard doesn't match the actual deployed URL.

### Recovery

**If webhook secret mismatch:**

1. Copy the signing secret from Stripe dashboard → Developers → Webhooks → your endpoint → Signing secret
2. Update in Railway:
   ```bash
   railway variables set STRIPE_WEBHOOK_SECRET=whsec_CORRECT_SECRET
   ```
3. Railway auto-redeploys.

**If webhook URL is wrong:**

1. Go to Stripe dashboard → Developers → Webhooks
2. Update the endpoint URL to: `https://YOUR_DOMAIN/api/subscription/webhook`
3. Make sure it uses HTTPS (Stripe requires it for live mode)

**After fixing, resend failed events:**

1. Go to Stripe dashboard → Developers → Webhooks → your endpoint
2. Click on failed events
3. Click "Resend" to replay them

---

## Failure Pattern B: Checkout Session Creation Fails

### Symptoms

Users click "Subscribe" or "Buy Credits" but nothing happens or they see an error.

### Diagnosis

```apl
['thumbnail-maker']
| where _time > ago(1h) and level == 'error' and (url contains "checkout" or url contains "purchase" or message contains "stripe")
| order by _time desc
| take 10
```

**Common causes:**

| Error                      | Cause                            | Fix                             |
| -------------------------- | -------------------------------- | ------------------------------- |
| `Invalid API Key provided` | `STRIPE_SECRET_KEY` is wrong     | Update key in Railway           |
| `No such price`            | Price ID doesn't exist in Stripe | Create the price or fix env var |
| `resource_missing`         | Product/price not configured     | Set up in Stripe dashboard      |

### Recovery

**If API key is invalid:**

1. Go to Stripe dashboard → Developers → API keys
2. Copy the Secret key
3. Update:
   ```bash
   railway variables set STRIPE_SECRET_KEY=sk_live_CORRECT_KEY
   ```

**If price IDs are wrong:**

1. Go to Stripe dashboard → Products
2. Find the product and click into it
3. Copy the Price ID (starts with `price_`)
4. Update the relevant env var:
   ```bash
   railway variables set STRIPE_PRICE_PRO_MONTHLY=price_CORRECT_ID
   ```

**If no Stripe key at all (demo fallback):**
The app has a demo fallback when `STRIPE_SECRET_KEY` is missing. This is fine for development but must have real keys in production.

---

## Failure Pattern C: Payment Succeeded but App Didn't Update

### Symptoms

- User says "I paid but I don't have credits" or "I subscribed but it shows free plan"
- Stripe dashboard shows successful payment
- Webhook shows delivery failure

### Diagnosis

1. **Find the event in Stripe dashboard:**
   Go to Events → find the `checkout.session.completed` event → check delivery status

2. **Check if webhook was received by the app:**

   ```apl
   ['thumbnail-maker']
   | where _time > ago(24h) and message contains "webhook" and message contains "checkout"
   | order by _time desc
   ```

3. **Check if database was updated:**
   The webhook handler updates the user's subscription/credits in the database. If the webhook was received but the DB update failed, you'll see errors in logs.

### Recovery

**If webhook was never delivered:**

1. Fix the webhook issue (Pattern A above)
2. Resend the event from Stripe dashboard

**If webhook was received but processing failed:**

1. Check logs for the specific error during processing
2. Fix the underlying issue (DB error, missing user, etc.)
3. Resend the event from Stripe dashboard

**Manual fix (last resort):**
If you can't resend the webhook and the user needs immediate resolution:

1. Confirm the payment in Stripe dashboard
2. Manually update the user's subscription/credits in the database via Prisma Studio or a SQL query
3. Document this manual fix for audit purposes

---

## Failure Pattern D: Webhook Handler Too Slow

### Symptoms

Stripe shows webhook delivery as "timed out" — Stripe expects a response within a few seconds.

### Diagnosis

```apl
['thumbnail-maker']
| where _time > ago(1h) and url == "/api/subscription/webhook"
| where category == 'request'
| project _time, duration, statusCode
| order by duration desc
| take 10
```

If `duration` > 5000ms (5 seconds), the handler is too slow.

### Recovery

The webhook handler should:

1. Verify the signature
2. Acknowledge receipt (return 200) as fast as possible
3. Process the event asynchronously if needed

If the handler is doing heavy processing synchronously, consider moving it to a background job. For now, check if the slowness is due to database issues → see [02-database-connection-issues.md](./02-database-connection-issues.md).

---

## Failure Pattern E: Stripe API Version Mismatch

### Symptoms

```
StripeInvalidRequestError: Received unknown parameter
```

or type errors during deployment.

### Diagnosis

The app uses `stripe` npm package which pins an API version. If Railway installs a newer version than local, you may get type mismatches.

```bash
# Check installed Stripe version
npm show stripe version
```

### Recovery

Pin the exact Stripe version in `package.json`:

```json
"stripe": "17.5.0"
```

(Use the exact version, not `^17.5.0`)

---

## Verification

After applying any fix:

1. **Webhook endpoint responds:**

   ```bash
   curl -s -o /dev/null -w "%{http_code}" -X POST https://YOUR_DOMAIN/api/subscription/webhook
   ```

   Expected: `400` (no valid signature, but route works)

2. **Resend a test event from Stripe:**
   Stripe dashboard → Developers → Webhooks → Send test webhook → `checkout.session.completed`
   Expected: Delivery shows success (200)

3. **Check Axiom for successful webhook processing:**

   ```apl
   ['thumbnail-maker']
   | where _time > ago(10m) and message contains "webhook" and level == 'info'
   | order by _time desc
   ```

4. **End-to-end test:** In test mode, complete a checkout and verify the subscription/credits update in the app.

---

## Escalation

Escalate if:

- Stripe dashboard shows your account is restricted or under review → contact Stripe support
- Webhooks consistently fail with 5xx even after verifying configuration → investigate app-level errors
- Users report charges but no service → **prioritize manual fix for affected users**, then fix the root cause

---

## Searchable Keywords

```
Webhook signature verification failed
Webhook Error
No signatures found matching the expected signature
Invalid API Key provided
No such price
resource_missing
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
STRIPE_WEBHOOK_SECRET
STRIPE_SECRET_KEY
whsec_
sk_live_
sk_test_
StripeInvalidRequestError
```

---

## Related Runbooks

- [01-application-wont-start.md](./01-application-wont-start.md) — If app is down entirely (webhooks will queue in Stripe)
- [02-database-connection-issues.md](./02-database-connection-issues.md) — If webhook received but DB update fails
- [05-high-error-rate.md](./05-high-error-rate.md) — If webhook failures are part of broader error spike
