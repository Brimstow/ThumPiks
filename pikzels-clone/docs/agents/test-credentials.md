# Test Credentials Reference

**Load this file when:** Testing the app (E2E, manual, Playwright, API), logging into staging/local, or any task requiring authentication against a running server.

**Canonical source:** `pikzels-clone/prisma/seed.ts` — if this file disagrees with seed.ts, seed.ts wins.

---

## Primary Test Account

| Field | Value |
|---|---|
| Email | `tester1@example.com` |
| Username | `tester1` |
| Password | `Test123!` |

Use this account for all general testing unless a specific scenario requires a different one.

---

## All Test Accounts

### Standard Testers

| Email | Username | Password | Use For |
|---|---|---|---|
| `tester1@example.com` | `tester1` | `Test123!` | General testing (default) |
| `tester2@example.com` | `tester2` | `Test123!` | Multi-user scenarios |
| `tester3@example.com` | `tester3` | `Test123!` | Multi-user scenarios |

### Special-Purpose Testers

| Email | Username | Password | Use For |
|---|---|---|---|
| `testerllm@example.com` | `testerLLM` | `LLMdemo2026!` | AI/LLM feature testing |
| `ultratester@thumpiks.com` | `ultratester` | `UltraTest2026!` | Custom domain email testing |
| `tester1.thumpiks@gmail.com` | `polartester` | `Test123!` | Polar/billing integration |
| `wm_freetester@example.com` | `wm_freetester` | `Test123!` | Watermark/free tier testing |
| `freeTest1@example.com` | `freeTest1` | `Test123!` | Free tier subscription testing |
| `creditpacktest1@example.com` | `creditPackTest1` | `Test123!` | Credit pack purchase testing |
| `addpacktest1@gmail.com` | `addPackTest1` | `Test123!` | Add-on pack testing |
| `noteTest1@example.com` | `noteTest1` | `Test123!` | Notification testing |

### Admin

| Email | Username | Password | Role |
|---|---|---|---|
| `admin@example.com` | `admin` | `AdminPass123!` | super_admin |

---

## Rules

1. **Never guess passwords.** If you're unsure, re-read this file or check `seed.ts` directly.
2. **Never use admin credentials for user-flow testing.** Admin auth is a separate system (see `docs/agents/authentication.md`).
3. **All test accounts get `ultra_pro` + 999999 credits** in staging (effectively unlimited for QA).
4. **Password is case-sensitive.** `Test123!` has capital T, number 123, exclamation mark.
5. **If login fails**, verify the database has been seeded: `npx prisma db seed` (runs seed.ts).

---

## Auto-Infer Test Scope

When staging URL (e.g., `staging--thumbnail-maker-studio.netlify.app`) and test credentials are already in context, infer the test scope automatically (e.g., "test auth flow on staging") rather than asking the user for clarification.
