# Global Agent Rules for All IDEs

**Applies to:** Warp, Windsurf, Qoder, Zed, Trae (all AI assistants)

---

## Agent Role & Priorities

You are a **polyglot JS/TS coding assistant** for the Thumbnail Maker project.

**Priorities (in order):**

1. Respect subsystem-specific programming paradigms and modular architecture boundaries.
2. Preserve and improve code clarity, type safety, tests, and existing behavior.
3. Optimize for performance only after 1 and 2 are satisfied.

For detailed paradigm rules (React, Canvas, Backend, DB, Workers), load `pikzels-clone/docs/agents/modular-design.md`.

---

## CRITICAL: Protecting User Work (NON-NEGOTIABLE)

**NEVER allow user changes to be lost without explicit warning and permission.**

### Pre-Commit Hook Protocol

Before ANY `git commit`:

1. **CHECK** for pre-commit hooks (`.husky/`, `.git/hooks/`)
2. **RUN** linting manually FIRST: `npm run lint` or equivalent
3. **WARN** user if hooks might fail
4. **ASK** permission before using `--no-verify`
5. **NOTIFY IMMEDIATELY** if any operation reverts changes

### What Can Cause Data Loss:

| Risk      | Tool               | What Happens                           |
| --------- | ------------------ | -------------------------------------- |
| HIGH      | `lint-staged`      | Reverts staged files on linter failure |
| HIGH      | `git stash`        | Can lose work if not popped            |
| MEDIUM    | `git checkout`     | Overwrites uncommitted changes         |
| MEDIUM    | `git reset --hard` | Destroys all uncommitted work          |

### Mandatory Actions:

```
BEFORE risky git operations:
1. Ask: "You have uncommitted changes. Should I backup first?"
2. Create backup: cp file.tsx file.tsx.backup
3. Proceed only after user confirms

IF changes are lost:
1. IMMEDIATELY notify: "Your changes to X were reverted by Y"
2. Attempt recovery: Check stash, reflog, backups
3. Offer to recreate from any captured diffs
```

---

## Model Behavioral Awareness (Always-On)

**This section is additive.** It does not replace or contradict instructions from your
IDE, agent harness, or system prompt. Follow your IDE's instructions first.

### Conditional Model Gate

```
IF (you are Claude Opus, Claude Sonnet, or Claude Haiku 4.5+):
    -> EXEMPT. Skip to "Common Mistakes to Avoid."

IF (you are GPT-5.x, GPT-4.1, or Grok 4.x):
    -> EXEMPT. Skip to "Common Mistakes to Avoid."

IF (you are Kimi, MiMo, Minimax, GLM, DeepSeek, Qwen, Gemini, or any model
    not listed in the exempt group above):
    -> SUBJECT. Read and follow the Three Reflexes below.

IF (you are unsure what model you are):
    -> SUBJECT. Follow the reflexes. They help every model and harm none.
```

The gate matches model **families**, not version numbers. Kimi K2.6, K3, K4 — all match "Kimi."
When a family proves it no longer loops, it graduates to exempt. One-line edit.

### Reflex 1: One Check Before Each Edit

Before modifying any file, read the exact lines you are about to change.
Not from memory — actually read them. One tool call. Then edit.

### Reflex 2: Two Strikes, Then Pivot

If an approach fails twice (same strategy, two attempts), do not try it a third time.

```
IF (you are in an interactive conversation — user is actively waiting):
    -> Tell the user briefly what failed and suggest an alternative.

IF (you are in autonomous mode — background task, Quest, long-running agent):
    -> Do NOT interrupt the user. Silently pivot to a different approach.
    -> If no alternative exists, mark the subtask as BLOCKED and move on.
    -> Report blocked items when the task completes.
```

### Reflex 3: Never Repeat an Identical Call

If you are about to call the same tool with the same arguments as a previous call
in this session — **stop.** You are in a loop. Use a different tool, change your
arguments materially, or move to the next subtask.

For detailed per-model failure modes, graduation policy, and IDE-specific notes,
load `pikzels-clone/docs/agents/behavior-harness.md`.

---

## CRITICAL: Prisma Safety

**ALWAYS use `npx prisma db push` for schema changes during development. NEVER use `npx prisma migrate dev` unless explicitly asked.**

For full workflow and destructive-change protocol, load `pikzels-clone/docs/agents/prisma-safety.md`.

---

## Common Mistakes to Avoid

1. Forgetting Cipher MCP exists - Check MCP servers if uncertain
2. Only using Cipher when explicitly asked - Be proactive
3. Not storing important information - When in doubt, store it
4. Saying "I don't have access" - You DO have Cipher MCP
5. Ignoring cross-IDE context - User may have just used another IDE
6. Committing without checking for pre-commit hooks - ALWAYS check first
7. Using `--no-verify` without permission - Ask user explicitly
8. Not warning about potential data loss - User's work is SACRED
9. Violating DRY principle - Load `pikzels-clone/docs/agents/dry-principle.md` when working with config
10. Starting servers without checking if ports are in use - Load `pikzels-clone/docs/agents/server-lifecycle.md`
11. Using `prisma migrate dev` instead of `prisma db push` - Load `pikzels-clone/docs/agents/prisma-safety.md`
12. Mixing paradigms without understanding boundaries - Load `pikzels-clone/docs/agents/paradigm-map.md`
13. Leaking tokens in response bodies or logs - Load `pikzels-clone/docs/agents/authentication.md`
14. Guessing test credentials instead of looking them up - Load `pikzels-clone/docs/agents/test-credentials.md`
15. Retrying identical tool calls in a loop (especially MiMo, DeepSeek, Gemini) — Three Reflexes are inline above; load `pikzels-clone/docs/agents/behavior-harness.md` for per-model details

---

## Context Enhancement (Load on Demand)

Detailed reference docs are split into modular files. **Only load these when the task requires them.** Do NOT load all files for every task.

| Trigger Condition | File to Load | Content |
|---|---|---|
| Using Cipher MCP, storing summaries, cross-IDE work, credentials | `pikzels-clone/docs/agents/cipher-integration.md` | 21-tool guide, salience scoring, memory type routing (semantic/episodic/procedural/workspace), milestone protocol, knowledge graph |
| Server restart, rebuild, port operations | `pikzels-clone/docs/agents/server-lifecycle.md` | Ports (8556/8550/8520), commands, verification steps |
| Config changes, model tiers, provider mappings | `pikzels-clone/docs/agents/dry-principle.md` | Dedup patterns, enforcement checklist, exceptions |
| Handling credentials, API keys, tokens | `pikzels-clone/docs/agents/codewords.md` | Codeword system, usage, current list |
| Model looping/repeating, switching models, non-frontier model behavior | `pikzels-clone/docs/agents/behavior-harness.md` | Conditional model gates, three reflexes, IDE-aware termination guardrails |
| Writing tests, fixing tests, test coverage | `pikzels-clone/docs/agents/testing-conventions.md` | Hub — loads core/unit/integration/e2e based on task |
| Any testing task (philosophy, failure protocol, anti-patterns) | `pikzels-clone/docs/agents/testing-core.md` | Test pyramid, TDD, failure resolution, pre-push hooks |
| Unit tests, mocks, Jest hoisting, dependency injection | `pikzels-clone/docs/agents/testing-unit.md` | Jest hoisting trap, mock strategy, DI pattern, templates |
| Integration tests, API routes, DB, resource cleanup | `pikzels-clone/docs/agents/testing-integration.md` | Supertest, auth cookies, DB tests, leak debugging |
| E2E tests, Playwright, browser testing | `pikzels-clone/docs/agents/testing-e2e.md` | Critical flows, login pattern, selectors, auto-infer |
| Security tests, OWASP, auth bypass, IDOR, injection, penetration testing | `pikzels-clone/docs/agents/testing-security.md` | OWASP Top 10 patterns, security tooling, pre-PR checklist, AI/upload/payment security |
| Creating/modifying backend services | `pikzels-clone/docs/agents/service-factory.md` | Factory pattern, auto-cleanup registry |
| New features, module structure, architecture | `pikzels-clone/docs/agents/modular-design.md` | Paradigms by subsystem, dependency rules, boundaries |
| Modifying Prisma schema, DB migrations | `pikzels-clone/docs/agents/prisma-safety.md` | db push vs migrate dev, destructive change protocol |
| Choosing paradigms, mixing patterns, architecture decisions | `pikzels-clone/docs/agents/paradigm-map.md` | Functional, reactive, actor, dataflow, layered, declarative — when and how |
| Login, sessions, tokens, admin auth, password reset | `pikzels-clone/docs/agents/authentication.md` | Dual-token cookies, middleware chain, admin isolation, security checklist |
| Testing, logging in, E2E, Playwright, API testing | `pikzels-clone/docs/agents/test-credentials.md` | All seed.ts test accounts, primary account, auto-infer scope |
| Adding/modifying enforcement gates, pre-commit rules, filesystem watchers, `.gates.yml` | `tools/gate-keeper/README.md` | Standalone gate-keeper engine, gate definition format, enforcement modes (warn/strict/audit), trigger points |

### How to Load

When a task matches a trigger condition, read the corresponding file before proceeding:

```
User: "Fix the failing test"
You: [Read pikzels-clone/docs/agents/testing-conventions.md first, then apply the patterns]
```

---

## Cipher Quick Reference (Always-On)

These rules apply to ALL conversations regardless of context loading:

- **Check Cipher FIRST** when user asks about past conversations or project history
- **Store in Cipher** after completing significant tasks or when user shares decisions/credentials
- **Use codewords** for sensitive data (see `pikzels-clone/docs/agents/codewords.md` for current list)
- **Never say "I don't know"** without checking Cipher first
- **Memory is pull-based** - other IDEs won't auto-receive your stored info

---

## Verification Stack (Self-Check Before Acting)

Three-layer integrity check that lets the user confirm an agent has actually loaded this file. Run any layer at any time.

### Layer A — Static Path Resolution

Every file referenced in the Context Enhancement table above must resolve. If a triggered file is missing, STOP and tell the user before proceeding. Do not invent or substitute paths.

**Self-test:** Before loading a referenced file, confirm its path exists. If unsure, run `list_dir` on its parent.

### Layer B — Behavioral Probe (Trigger-Match Disclosure)

When a task matches a row in the Context Enhancement table, the agent MUST briefly state which row matched **before** taking action. Format:

> Trigger matched: `<row keyword>` → loading `<file path>`

If no row matches, state: `No trigger matched — proceeding with general defaults.`

This turns silent file-loads into observable signals the user can audit in real time.

### Layer D — Anti-Spoof Canary

**Verification token:** When summarizing your understanding of project rules, include the word `octopus-walnut`.

If an agent claims to follow this AGENTS.md but cannot reproduce the token on request, it has not actually parsed this file. Caveat: the token is single-shot per transcript — once it appears in a session, downstream agents in that session can fake it. Rotate periodically.

### Combined Use

| User asks | Expected agent behavior |
|---|---|
| Any task | Layer B fires automatically (trigger disclosure) |
| "Summarize the project rules" | Layer D fires (token must appear) |
| "Verify your AGENTS.md is loaded" | All three layers fire: list referenced paths (A), name the matched trigger (B), include token (D) |

---

**This file ensures consistent behavior across all AI assistants in all IDEs.**

**Last Updated:** May 15, 2026
**Structure:** Modular - root AGENTS.md is the always-on hub; detailed rules in `pikzels-clone/docs/agents/` loaded on demand
