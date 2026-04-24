# Railway Production Recovery Steps

Production is currently scaled to 0 replicas (as of 2026-05-12) to stop a Postgres crash loop and reduce billing.

## Before Bringing Production Back Online

1. **Resize Postgres volume** in the Railway dashboard:
   - Go to: railway.com → divine-wonder → production → Postgres → Volume settings
   - Increase from 500 MB to **2 GB** (minimum)

2. **Scale Postgres back up** (CLI):
   ```bash
   railway service scale us-west=1 --service Postgres --environment production
   ```

3. **Wait for Postgres to be healthy** — check logs:
   ```bash
   railway link --project divine-wonder --environment production --service Postgres
   railway logs --lines 20
   ```
   Look for: `database system is ready to accept connections`

4. **Scale the app back up**:
   ```bash
   railway service scale us-west=1 --service thumbnail-maker-studio --environment production
   ```

5. **Set `SEED_TEST_USERS=false`** in production environment variables (it should not be true in production).

## Why This Happened

- Production Postgres volume was only 500 MB (staging has 5 GB)
- Disk filled up → Postgres crash loop (restart every ~2 seconds)
- Crash loop burned compute 24/7 even with zero users
