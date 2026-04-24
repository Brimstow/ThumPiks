# Global Agent Rules for All IDEs

**Applies to:** [IDE_LIST — e.g., Warp, Windsurf, Qoder, Zed, Trae]

---

## Agent Role & Priorities

You are a **[LANGUAGE] coding assistant** for the [PROJECT_NAME] project.

**Priorities (in order):**

1. Respect subsystem-specific programming paradigms and modular architecture boundaries.
2. Preserve and improve code clarity, type safety, tests, and existing behavior.
3. Optimize for performance only after 1 and 2 are satisfied.

For detailed paradigm rules, load `docs/agents/paradigm-map.md`.
For module structure and dependency rules, load `docs/agents/modular-design.md`.

---

## CRITICAL: Protecting User Work (NON-NEGOTIABLE)

**NEVER allow user changes to be lost without explicit warning and permission.**

### Pre-Commit Hook Protocol

Before ANY `git commit`:

1. **CHECK** for pre-commit hooks (`.husky/`, `.git/hooks/`)
2. **RUN** linting manually FIRST: `[LINT_COMMAND]` or equivalent
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
2. Create backup: cp [FILE] [FILE].backup
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
load `docs/agents/behavior-harness.md`.

---

## CRITICAL: [DB_TOOL] Safety

<!-- Replace this section with your project's critical safety rule. Examples:
  - Prisma: ALWAYS use `npx prisma db push` during development. NEVER use `npx prisma migrate dev` unless explicitly asked.
  - Django: ALWAYS use `makemigrations` + `migrate`. NEVER edit migration files by hand unless explicitly asked.
  - Go: ALWAYS run `go mod tidy` after adding/removing dependencies.
  - If no DB tool, replace with another critical safety rule for your project.
-->

**ALWAYS [SAFE_OPERATION]. NEVER [UNSAFE_OPERATION] unless explicitly asked.**

For full workflow and destructive-change protocol, load `docs/agents/[RELEVANT_DETAIL_FILE].md`.

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
9. Violating DRY principle - Load `docs/agents/dry-principle.md` when working with config
10. Starting servers without checking if ports are in use - Check `[PORT_CHECK_COMMAND]` first
11. [DB_SPECIFIC_MISTAKE] - Load `docs/agents/[DB_SAFETY_FILE].md`
12. Mixing paradigms without understanding boundaries - Load `docs/agents/paradigm-map.md`
13. Leaking tokens in response bodies or logs - Never expose credentials
14. Guessing test credentials instead of looking them up - Check `[CREDENTIAL_SOURCE]`
15. Retrying identical tool calls in a loop — Three Reflexes are inline above; load `docs/agents/behavior-harness.md` for per-model details

<!-- Add project-specific mistakes below this line:
16. [YOUR_PROJECT_SPECIFIC_MISTAKE]
17. [ANOTHER_COMMON_PITFALL]
-->

---

## Context Enhancement (Load on Demand)

Detailed reference docs are split into modular files. **Only load these when the task requires them.** Do NOT load all files for every task.

| Trigger Condition | File to Load | Content |
|---|---|---|
| Using Cipher MCP, storing summaries, cross-IDE work | `docs/agents/cipher-integration.md` | Tool guide, salience scoring, memory type routing, milestone protocol |
| Server restart, rebuild, port operations | `docs/agents/server-lifecycle.md` | Ports, commands, verification steps |
| Config changes, repeated values across files | `docs/agents/dry-principle.md` | Dedup patterns, enforcement checklist, exceptions |
| New features, module structure, code placement | `docs/agents/modular-design.md` | Module structure, dependency rules, boundaries |
| Choosing paradigms, mixing patterns, architecture decisions | `docs/agents/paradigm-map.md` | Paradigms by subsystem, mixing rules, type safety |
| Model looping/repeating, non-frontier model behavior | `docs/agents/behavior-harness.md` | Conditional model gates, three reflexes, IDE-aware termination guardrails |
| Any testing task | `docs/agents/testing-conventions.md` | Hub — loads core/unit/integration/e2e based on task |
| [CUSTOM_TRIGGER_1] | `docs/agents/[CUSTOM_FILE_1].md` | [CUSTOM_CONTENT_1] |
| [CUSTOM_TRIGGER_2] | `docs/agents/[CUSTOM_FILE_2].md` | [CUSTOM_CONTENT_2] |

### How Loading Works

When a task matches a trigger condition, read the corresponding file before proceeding:

```
User: "Fix the failing test"
You: [Read docs/agents/testing-conventions.md first, then apply the patterns]
```

---

## Cipher Quick Reference (Always-On)

These rules apply to ALL conversations regardless of context loading:

- **Check Cipher FIRST** when user asks about past conversations or project history
- **Store in Cipher** after completing significant tasks or when user shares decisions/credentials
- **Use codewords** for sensitive data (see `docs/agents/codewords.md` for current list)
- **Never say "I don't know"** without checking Cipher first
- **Memory is pull-based** - other IDEs won't auto-receive your stored info

---

**This file ensures consistent behavior across all AI assistants in all IDEs.**

**Last Updated:** [DATE]
**Structure:** Modular - root AGENTS.md is the always-on hub; detailed rules in `docs/agents/` loaded on demand
