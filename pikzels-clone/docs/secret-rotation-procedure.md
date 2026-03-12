# Secret Rotation Procedure — Thumbnail Maker Studio

**Last Updated:** 2026-03-11
**Owner:** Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Secret Inventory](#secret-inventory)
3. [Rotation Schedule](#rotation-schedule)
4. [Procedures by Category](#procedures-by-category)
   - [A. JWT & Session Secrets (self-managed)](#a-jwt--session-secrets-self-managed)
   - [B. Encryption Key (self-managed, requires migration)](#b-encryption-key-self-managed-requires-migration)
   - [C. Stripe Keys (provider-managed)](#c-stripe-keys-provider-managed)
   - [D. AI Provider API Keys (provider-managed)](#d-ai-provider-api-keys-provider-managed)
   - [E. OAuth Secrets (provider-managed)](#e-oauth-secrets-provider-managed)
   - [F. Infrastructure Secrets (provider-managed)](#f-infrastructure-secrets-provider-managed)
5. [Rotation Script](#rotation-script)
6. [Future Enhancement: Dual-Key JWT Validation](#future-enhancement-dual-key-jwt-validation)
7. [Rotation Log](#rotation-log)
8. [Emergency Rotation (Suspected Compromise)](#emergency-rotation-suspected-compromise)

---

## Overview

Secret rotation limits the blast radius when credentials are exposed. A leaked secret that was already rotated is useless to an attacker.

**Key Principle:** Use the **dual-credential pattern** where possible — keep the old secret valid while deploying the new one, then deactivate the old one. This avoids downtime.

**For solo dev reality:** Most third-party API keys (Stripe, OpenRouter, etc.) don't need scheduled rotation. Rotate them only on suspected compromise. Focus scheduled rotation on **secrets you control**: JWT secrets, encryption keys, session secrets.

---

## Secret Inventory

### Secrets You Control (Self-Managed)

| Secret                 | Used For                               | Rotation Impact                                                                                      |
| ---------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`           | Signing access tokens (15min expiry)   | All active sessions invalidated — users must re-login                                                |
| `REFRESH_TOKEN_SECRET` | Signing refresh tokens (7-day expiry)  | All refresh tokens invalidated — users must re-login                                                 |
| `ENCRYPTION_KEY`       | AES-256-GCM encryption of MFA settings | **Breaking change** — existing encrypted MFA data becomes unreadable without re-encryption migration |
| `SESSION_SECRET`       | Express session signing                | Active sessions invalidated                                                                          |

### Secrets Managed by Providers (Rotate on Compromise Only)

| Secret                  | Provider     | How to Rotate                                                    |
| ----------------------- | ------------ | ---------------------------------------------------------------- |
| `STRIPE_SECRET_KEY`     | Stripe       | Dashboard → Developers → API keys → Roll key                     |
| `STRIPE_WEBHOOK_SECRET` | Stripe       | Dashboard → Developers → Webhooks → Roll secret                  |
| `OPENROUTER_API_KEY`    | OpenRouter   | Dashboard → API Keys → Create new, delete old                    |
| `REPLICATE_API_KEY`     | Replicate    | Settings → API Tokens → Create new, delete old                   |
| `COMET_API_KEY`         | CometAPI     | Dashboard → API Token → Add Token, remove old                    |
| `ZENMUX_API_KEY`        | ZenMux       | Dashboard → Create new key, delete old                           |
| `GOOGLE_CLIENT_SECRET`  | Google Cloud | Console → Credentials → OAuth → Create new secret                |
| `GITHUB_CLIENT_SECRET`  | GitHub       | Settings → Developer settings → OAuth Apps → Generate new secret |
| `CLOUDINARY_URL`        | Cloudinary   | Console → Settings → Security → Regenerate API secret            |
| `JINA_API_KEY`          | Jina AI      | Dashboard → API Keys → Create new                                |
| `QDRANT_API_KEY`        | Qdrant Cloud | Dashboard → Cluster → API Keys → Create new                      |
| `AXIOM_TOKEN`           | Axiom        | Settings → API Tokens → Create new                               |
| `EMAIL_PASSWORD`        | Gmail/SMTP   | Google Account → App Passwords → Generate new                    |
| `YOUTUBE_API_KEY`       | Google Cloud | Console → Credentials → Create new key, restrict, delete old     |
| `SERPAPI_KEY`           | SerpAPI      | Dashboard → API Key → Regenerate                                 |
| `BING_SEARCH_API_KEY`   | Azure        | Portal → Resource → Keys → Regenerate                            |

### Managed by Platform (No Manual Rotation)

| Secret                         | Manager | Notes                                                                                                                                                                      |
| ------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                 | Railway | Railway manages PostgreSQL credentials. If you need to rotate: Railway dashboard → Database service → Variables → connection string is auto-generated. Redeploy app after. |
| `REDIS_URL` / `REDIS_PASSWORD` | Railway | Railway manages Redis credentials. Same process as DATABASE_URL.                                                                                                           |

---

## Rotation Schedule

| Secret                 | Frequency          | Trigger                                                        |
| ---------------------- | ------------------ | -------------------------------------------------------------- |
| `JWT_SECRET`           | Every 90 days      | Scheduled or on suspected compromise                           |
| `REFRESH_TOKEN_SECRET` | Every 90 days      | Same rotation window as JWT_SECRET                             |
| `SESSION_SECRET`       | Every 90 days      | Same rotation window as JWT_SECRET                             |
| `ENCRYPTION_KEY`       | Every 365 days     | Scheduled (requires re-encryption migration)                   |
| All provider API keys  | On compromise only | Security incident, employee departure, key leaked in logs/repo |

**Recommendation:** Rotate `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `SESSION_SECRET` together in one operation. They all cause session invalidation, so doing them together means users only need to re-login once.

---

## Procedures by Category

### A. JWT & Session Secrets (Self-Managed)

**Secrets:** `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET`
**Impact:** All active user sessions invalidated. Users must re-login.
**Downtime:** Zero (app keeps running, users just need to re-authenticate)
**Duration:** ~5 minutes

#### Steps

1. **Generate new secrets** using the rotation script:

   ```bash
   # From project root (Windows PowerShell)
   bash scripts/rotate-jwt-secrets.sh
   ```

   The script generates 3 cryptographically secure 64-character hex strings and prints `railway variables set` commands.

2. **Set new secrets in Railway:**
   Copy-paste the `railway variables set` commands output by the script. Railway auto-redeploys after each variable change, so set all three quickly:

   ```bash
   railway variables set JWT_SECRET="<new_value>"
   railway variables set REFRESH_TOKEN_SECRET="<new_value>"
   railway variables set SESSION_SECRET="<new_value>"
   ```

3. **Verify the deployment:**

   ```bash
   railway deployment list
   # Confirm latest deployment is SUCCESS

   curl -s https://YOUR_DOMAIN/health | jq '.status'
   # Expected: "OK"
   ```

4. **Test authentication:**
   - Open the app in a browser
   - You should be logged out (expected — old tokens are invalid)
   - Log in with valid credentials
   - Confirm dashboard loads normally

5. **Record the rotation** in the [Rotation Log](#rotation-log) below.

#### Rollback

If the new secrets cause issues (shouldn't happen, but just in case):

1. Set the old secrets back in Railway:
   ```bash
   railway variables set JWT_SECRET="<old_value>"
   ```
2. Keep old secrets stored securely until rotation is confirmed successful.

---

### B. Encryption Key (Self-Managed, Requires Migration)

**Secret:** `ENCRYPTION_KEY`
**Impact:** **Critical** — MFA settings are encrypted with this key. Rotating without re-encryption breaks MFA for all users who have it enabled.
**Downtime:** Brief (during migration script execution)
**Duration:** 15–30 minutes

#### Current Usage

`ENCRYPTION_KEY` is used in `src/config/security.config.ts` for AES-256-GCM encryption. Currently, only MFA data is encrypted with it:

- `mfa.service.ts` → `storeMFASettings()` encrypts TOTP secrets and backup codes
- `mfa.service.ts` → `getMFASettings()` decrypts them on login

Encrypted data is stored in `user.settings.mfa` as `{ encrypted, iv, authTag }`.

#### Steps

1. **Check if any users have MFA enabled:**

   ```sql
   -- Run via Prisma Studio or Railway's data explorer
   SELECT id, email FROM "User" WHERE settings::text LIKE '%mfa%';
   ```

2. **If no users have MFA:** Simple rotation — just generate a new key and set it:

   ```bash
   bash scripts/rotate-jwt-secrets.sh --encryption-key-only
   railway variables set ENCRYPTION_KEY="<new_value>"
   ```

3. **If users have MFA (requires re-encryption migration):**

   > **TODO: Implement re-encryption migration script when needed.**
   >
   > The script should:
   >
   > 1. Read `ENCRYPTION_KEY` (old) and `ENCRYPTION_KEY_NEW` (new) from env
   > 2. For each user with MFA settings:
   >    a. Decrypt with old key
   >    b. Re-encrypt with new key
   >    c. Update the database
   > 3. After all users migrated, swap `ENCRYPTION_KEY` to the new value
   > 4. Remove `ENCRYPTION_KEY_NEW`
   >
   > This is documented as a future enhancement since MFA may not have active users yet.

4. **Record the rotation** in the [Rotation Log](#rotation-log).

---

### C. Stripe Keys (Provider-Managed)

**Secrets:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
**When:** On suspected compromise only
**Impact:** Momentary — new key works immediately after Railway redeploy

#### Steps for STRIPE_SECRET_KEY

1. Go to [Stripe Dashboard → Developers → API keys](https://dashboard.stripe.com/apikeys)
2. Click **"Roll key"** on the Secret key
3. Stripe gives you a grace period (default 24 hours) where both old and new keys work
4. Copy the new key
5. Set in Railway:
   ```bash
   railway variables set STRIPE_SECRET_KEY="sk_live_NEW_KEY"
   ```
6. Verify: Make a test purchase or check Stripe Dashboard for successful API calls
7. After confirming, expire the old key in Stripe Dashboard

#### Steps for STRIPE_WEBHOOK_SECRET

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click your endpoint → **"Roll secret"**
3. Copy the new `whsec_` value
4. Set in Railway:
   ```bash
   railway variables set STRIPE_WEBHOOK_SECRET="whsec_NEW_SECRET"
   ```
5. Verify: Send a test webhook from Stripe Dashboard → confirm delivery success

---

### D. AI Provider API Keys (Provider-Managed)

**Secrets:** `OPENROUTER_API_KEY`, `REPLICATE_API_KEY`, `COMET_API_KEY`, `ZENMUX_API_KEY`
**When:** On suspected compromise only
**Impact:** AI features temporarily unavailable during the ~60s Railway redeploy

#### Generic Steps (Same for All Providers)

1. **Go to provider dashboard** and create a new API key
2. **Set in Railway:**
   ```bash
   railway variables set OPENROUTER_API_KEY="sk-or-NEW_KEY"
   # or
   railway variables set REPLICATE_API_KEY="r8_NEW_KEY"
   # etc.
   ```
3. **Verify:** Generate a test thumbnail using the relevant AI feature
4. **Delete the old key** in the provider dashboard

**Provider dashboards:**
| Provider | Key Management URL |
|----------|-------------------|
| OpenRouter | https://openrouter.ai/keys |
| Replicate | https://replicate.com/account/api-tokens |
| CometAPI | https://api.cometapi.com (Dashboard → API Token) |
| ZenMux | https://zenmux.ai (Dashboard) |

---

### E. OAuth Secrets (Provider-Managed)

**Secrets:** `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`
**When:** On suspected compromise only
**Impact:** Users can't use Google/GitHub login during redeploy (~60s). Existing sessions unaffected.

#### Steps

1. **Google:** [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client → Reset secret
2. **GitHub:** [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers) → Your app → Generate a new client secret
3. Set in Railway:
   ```bash
   railway variables set GOOGLE_CLIENT_SECRET="NEW_SECRET"
   # or
   railway variables set GITHUB_CLIENT_SECRET="NEW_SECRET"
   ```
4. Delete old secret from provider dashboard (if applicable)

---

### F. Infrastructure Secrets (Provider-Managed)

**Secrets:** `CLOUDINARY_URL`, `AXIOM_TOKEN`, `JINA_API_KEY`, `QDRANT_API_KEY`, `EMAIL_PASSWORD`
**When:** On suspected compromise only

#### Cloudinary

1. [Cloudinary Console → Settings → Security](https://console.cloudinary.com/settings/security) → Regenerate API Secret
2. Update the full `CLOUDINARY_URL` (it contains the secret):
   ```bash
   railway variables set CLOUDINARY_URL="cloudinary://api_key:NEW_api_secret@cloud_name"
   ```
3. Verify: Upload a test image

#### Axiom

1. [Axiom → Settings → API Tokens](https://app.axiom.co/settings/api-tokens) → Create new token → Delete old
2. ```bash
   railway variables set AXIOM_TOKEN="NEW_TOKEN"
   ```
3. Verify: Check Axiom dashboard for incoming logs after redeploy

#### Email (Gmail App Password)

1. [Google Account → Security → App Passwords](https://myaccount.google.com/apppasswords) → Generate new
2. ```bash
   railway variables set EMAIL_PASSWORD="NEW_APP_PASSWORD"
   ```
3. Verify: Trigger a password reset email from the app

---

## Rotation Script

**Location:** `scripts/rotate-jwt-secrets.sh`

This script generates cryptographically secure secrets and outputs ready-to-paste Railway CLI commands. It does **not** set the variables automatically — you review and paste them yourself.

```bash
# Generate JWT + session secrets
bash scripts/rotate-jwt-secrets.sh

# Generate only an encryption key
bash scripts/rotate-jwt-secrets.sh --encryption-key-only
```

See the script file for full details.

---

## Future Enhancement: Dual-Key JWT Validation

> **Status:** Documented for future implementation. Not coded yet.

### Problem

When `JWT_SECRET` is rotated, all existing access tokens become invalid immediately. Users get logged out mid-session.

### Solution: Accept Both Old and New Keys

During rotation, set two environment variables:

- `JWT_SECRET` — the new signing key (used for issuing new tokens)
- `JWT_SECRET_OLD` — the previous key (used only for verification, not signing)

### Implementation Plan

**File to modify:** Auth middleware (wherever `jwt.verify()` is called)

```typescript
// Pseudocode — not yet implemented
function verifyToken(token: string): JwtPayload {
  try {
    // Try new key first
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // If new key fails and old key exists, try old key
    if (process.env.JWT_SECRET_OLD) {
      return jwt.verify(token, process.env.JWT_SECRET_OLD);
    }
    throw err;
  }
}
```

**Grace period:** Keep `JWT_SECRET_OLD` set for the duration of `JWT_ACCESS_EXPIRY` (15 minutes). After that, all old tokens have expired naturally, and you can remove `JWT_SECRET_OLD`.

**Same pattern applies to:** `REFRESH_TOKEN_SECRET` (grace period = 7 days for refresh tokens).

### Rotation Flow with Dual-Key

1. Set `JWT_SECRET_OLD` = current `JWT_SECRET` value
2. Set `JWT_SECRET` = new value
3. Redeploy — app accepts both keys
4. Wait for grace period (15min for access, 7 days for refresh)
5. Remove `JWT_SECRET_OLD`
6. Redeploy — app only accepts new key

This eliminates user disruption entirely.

---

## Rotation Log

Track every rotation here for audit purposes.

| Date         | Secret(s) Rotated                        | Reason                   | Performed By | Notes         |
| ------------ | ---------------------------------------- | ------------------------ | ------------ | ------------- |
| _YYYY-MM-DD_ | _e.g., JWT_SECRET, REFRESH_TOKEN_SECRET_ | _Scheduled / Compromise_ | _Name_       | _Any issues?_ |

> **Tip:** After each rotation, add an entry here and commit. This creates a git-auditable rotation history.

---

## Emergency Rotation (Suspected Compromise)

If you suspect a secret has been leaked (committed to repo, visible in logs, shared accidentally):

### Immediate Actions (Do This NOW)

1. **Identify which secret(s) are compromised**
2. **Rotate immediately** — don't wait for scheduled rotation
3. **Check for unauthorized usage:**
   - Stripe: Dashboard → Events → look for unexpected charges
   - OpenRouter: Dashboard → Usage → look for unexpected API calls
   - Axiom: Check for log entries from unknown IPs
   - Database: Check for unfamiliar queries or data changes
4. **Rotate the secret** using the procedures above
5. **If the leak was in a git commit:**
   ```bash
   # The secret is in git history forever — rotating is the ONLY fix
   # Do NOT try to rewrite git history as a substitute for rotation
   ```
6. **Log the incident** in the Rotation Log with details

### Post-Incident

- Review how the leak happened
- Add preventive measures (`.gitignore`, `.secretlintrc.json`, pre-commit hooks)
- Consider enabling GitHub secret scanning if not already active
