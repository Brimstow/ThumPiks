# Prisma Schema Changes

**Load this file when:** Modifying `prisma/schema.prisma`, running database migrations, or any task that touches the database schema.

---

## The Golden Rule

**ALWAYS use `npx prisma db push` for schema changes during development. NEVER use `npx prisma migrate dev` unless explicitly asked by the user.**

---

## Why This Matters

| Command                | What It Does                                                         | Risk                                                |
| ---------------------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| `prisma db push`       | Applies schema diff to DB directly. Warns before destructive changes. No migration files. | **Low** - warns you, won't silently drop data       |
| `prisma migrate dev`   | Creates SQL migration file, may prompt to reset DB if drift detected. | **HIGH** - can drop all data if schema drift exists |
| `prisma migrate reset` | Drops entire DB and re-applies all migrations from scratch.          | **EXTREME** - total data loss                       |

---

## Required Workflow

```
1. Edit prisma/schema.prisma
2. Stop the backend server (Prisma DLL is locked while running)
3. Run: npx prisma db push
4. Run: npx prisma generate  (regenerate the typed client)
5. Restart the backend server
```

---

## When `prisma db push` Warns About Destructive Changes

If `prisma db push` says it needs to drop a column or table:

1. **STOP** - do NOT accept the prompt
2. **WARN** the user: "This schema change would drop column X / table Y. Proceed?"
3. **Only continue** with explicit user approval
4. Consider creating a manual migration script if data migration is needed

---

## When `prisma migrate dev` IS Acceptable

- User explicitly says "create a migration" or "I want migration files"
- Preparing for production deployment (migrations are required for production)
- User explicitly asks for `prisma migrate dev`

---

## Incident That Created This Rule

**Date:** March 2026
**What Happened:** Agent used `prisma migrate dev` after schema changes. Prisma detected schema drift and prompted to reset the database. This risked dropping all development data.
**Resolution:** Switched to `prisma db push` workflow for development. Migration files created only when preparing for production.

**User's data is SACRED. Use `db push` first. Always.**

---

## Common Mistakes

- Running `prisma migrate dev` by default for schema changes
- Running `prisma migrate reset` without explicit user permission
- Accepting destructive prompts from `prisma db push` without warning the user
- Forgetting to stop the backend before running `prisma generate` (DLL locked on Windows)
- Forgetting to run `prisma generate` after `db push` (stale types in code)
