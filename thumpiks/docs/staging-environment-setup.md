# Staging Environment Setup Guide

> **Task 24** — Phase 4: Operational Excellence  
> Last updated: March 2026

## Overview

The staging environment mirrors production with separate infrastructure (database, Redis) but the same application code. It enables:

- Pre-deployment testing
- Load testing (Task 23)
- QA by team members
- Demo to stakeholders

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Railway Project                    │
│                                                      │
│  ┌─────────────────┐    ┌─────────────────────┐     │
│  │   PRODUCTION     │    │      STAGING         │     │
│  │   Environment    │    │      Environment     │     │
│  ├─────────────────┤    ├─────────────────────┤     │
│  │ NODE_ENV=prod    │    │ NODE_ENV=staging     │     │
│  │ PostgreSQL (prod)│    │ PostgreSQL (staging) │     │
│  │ Redis (prod)     │    │ Redis (staging)      │     │
│  │ Stripe LIVE keys │    │ Stripe TEST keys     │     │
│  │ Same app code    │    │ Same app code        │     │
│  └─────────────────┘    └─────────────────────┘     │
│                                                      │
│  Code: main branch ──────► staging branch            │
│        (auto-deploy)        (auto-deploy)            │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- Railway CLI installed: `npm i -g @railway/cli`
- Authenticated: `railway login`
- Project linked: `railway link`

## Step-by-Step Setup

### 1. Create the Staging Environment

**Option A: Railway Dashboard (recommended)**

1. Open your Railway project dashboard
2. Click the environment dropdown (top nav, shows "production")
3. Select **+ New Environment**
4. Name it `staging`
5. Select **Duplicate Environment** and choose `production` from the dropdown
6. Click **Create Environment**

**Option B: Railway CLI**

```bash
railway environment create staging
```

> **Note:** Duplicate copies all services, variables, and config. New PostgreSQL and Redis instances are auto-provisioned separately from production.

### 2. Configure the Staging Branch

Link the staging environment to auto-deploy from a `staging` git branch:

1. In Railway dashboard, switch to the `staging` environment
2. Go to your service → **Settings** → **Source**
3. Set **Branch** to `staging`

Then create the branch locally:

```bash
git checkout -b staging
git push -u origin staging
```

### 3. Override Staging Variables

Once the staging environment finishes building and deploying, switch to it and update these variables:

```bash
# Switch Railway CLI to staging
railway environment staging

# Set NODE_ENV
railway variables set NODE_ENV=staging

# Set CORS to your staging frontend URL
railway variables set CORS_ORIGIN=https://staging--thumbnail-maker-studio.netlify.app

# Set CLIENT_URL
railway variables set CLIENT_URL=https://staging--thumbnail-maker-studio.netlify.app

# Clear Stripe keys (or set test keys when you have them)
railway variables set STRIPE_SECRET_KEY=""
railway variables set STRIPE_PUBLISHABLE_KEY=""
railway variables set STRIPE_WEBHOOK_SECRET=""

# Optional: separate Axiom dataset for staging logs
railway variables set AXIOM_DATASET=thumbnail-maker-staging
```

> See `.env.staging.example` for the full list of variables that differ.

### 4. Verify Database Isolation

```bash
# Switch to staging environment
railway environment staging

# Check DATABASE_URL points to staging DB
railway variables get DATABASE_URL

# Run migrations on staging DB
railway run npx prisma migrate deploy

# Seed staging DB with test data
railway run npx prisma db seed
```

The seed script automatically detects `NODE_ENV=staging` and creates test users + admin + composition layouts.

### 5. Deploy to Staging

**Automatic (from staging branch):**

```bash
git checkout staging
git merge main
git push origin staging
# Railway auto-deploys to staging environment
```

**Manual (CLI fallback — use when git integration has issues):**

```bash
railway environment staging
railway up
```

### 6. Verify Staging

```bash
# Check deployment status
railway environment staging
railway deployment list

# Check logs
railway logs

# Health check
curl https://your-staging-url.up.railway.app/health
```

Expected health response:

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

## How NODE_ENV=staging Works

The application treats `staging` as a **production-like** environment:

| Behavior       | production | staging | development    |
| -------------- | ---------- | ------- | -------------- |
| Rate limiting  | Enabled    | Enabled | Disabled       |
| JWT expiry     | 15min      | 15min   | 24hr           |
| CORS           | Strict     | Strict  | localhost      |
| Secure cookies | Yes        | Yes     | No             |
| HTTPS redirect | Yes        | Yes     | No             |
| Trust proxy    | Yes        | Yes     | No             |
| Error details  | Hidden     | Hidden  | Visible        |
| JSON logging   | Yes        | Yes     | No (colorized) |
| DB seed users  | Blocked\*  | Auto    | Auto           |

\* Unless `SEED_TEST_USERS=true` is set.

This is controlled by the `isProductionLike()` helper in `src/utils/env.ts`.

## Promoting Staging to Production

After testing on staging is complete:

```bash
# Merge staging into main
git checkout main
git merge staging
git push origin main
# Railway auto-deploys to production
```

Or use Railway's manual promote feature in the dashboard.

## CLI Fallback Cheatsheet

When git integration has issues:

```bash
# Deploy to staging manually
railway environment staging
railway up

# Deploy to production manually
railway environment production
railway up

# Check deployment status
railway deployment list

# View logs
railway logs

# Run a command in the staging environment
railway run <command>
```

## Troubleshooting

### App won't start with NODE_ENV=staging

The security failsafe in `security.config.ts` blocks startup if a cloud environment is detected but `NODE_ENV` is not production-like. Since the March 2026 update, `staging` is recognized as production-like. If you see this error, ensure you're running the latest code.

### Database shows no data

Run the seed script:

```bash
railway environment staging
railway run npx prisma db seed
```

### Redis not connecting

If you duplicated the environment, Railway creates new Redis. Verify:

```bash
railway environment staging
railway variables get REDIS_URL
```

If `REDIS_URL` is empty, add a Redis plugin to the staging environment.

### Volumes not copied

Railway's duplicate environment does **not** copy volumes. If Redis uses a volume, add one manually:

```bash
railway volume add --mount-path /data --service Redis
```

### Stripe features not working

Expected if Stripe test keys aren't configured. The app works fine without Stripe — payment features just return errors. Set up Stripe test keys when ready:

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy `sk_test_...` and `pk_test_...`
3. Set them in Railway staging variables
