# Behavioral Harness — Termination Guardrails

**Load this file when:** Model is looping or repeating itself, switching between
models mid-project, using a non-frontier model, or choosing which model to assign
to a task.

**This file is additive.** It does not replace or contradict instructions from your
IDE, agent harness, or system prompt. Follow your IDE's instructions first. These
rules supplement them.

---

## Conditional Model Gate

```
IF (you are Claude Opus, Claude Sonnet, or Claude Haiku 4.5+):
    -> EXEMPT. Skip to "Per-Model Quick Reference" at the bottom.

IF (you are GPT-5.x, GPT-4.1, or Grok 4.x):
    -> EXEMPT. Skip to "Per-Model Quick Reference" at the bottom.

IF (you are Kimi, MiMo, Minimax, GLM, DeepSeek, Qwen, Gemini, or any model
    not listed in the exempt group above):
    -> SUBJECT. Read and follow the Three Reflexes below.

IF (you are unsure what model you are):
    -> SUBJECT. Follow the reflexes. They help every model and harm none.
```

**Note on versions:** The gate matches model *families*, not version numbers.
Kimi K2.6, K3, K4 — all match "Kimi." MiMo V2.5-Pro, V3, V4 — all match "MiMo."
When a model family proves it no longer exhibits loop behavior, it graduates to the
exempt list. The reflexes themselves never change — only which families need them.

---

## Conditional IDE Gate

The Three Reflexes adapt to your IDE's philosophy. You do not need to know which
IDE you are in — use context to determine your mode:

```
IF (the user is actively waiting for your response in a conversation):
    -> You are in INTERACTIVE mode.
       IDEs: Zed agent panel, Windsurf chat, Warp terminal, OpenCode CLI,
             Qoder Agent/Chat mode, any conversational context.

IF (you were given a task and are executing it autonomously in the background):
    -> You are in AUTONOMOUS mode.
       IDEs: Qoder Quest mode, Factory Droid, any long-running/background agent,
             any ACP-spawned external agent running unattended.

IF (you are unsure):
    -> Default to INTERACTIVE mode.
```

This distinction only affects Reflex 2. Reflexes 1 and 3 are identical in both modes.

---

## The Three Reflexes

These are extracted from how the most reliable coding agents (Claude Opus, GPT-5.x)
naturally behave. They are not restrictions on your capabilities. They are three
micro-habits that prevent wasted work. They add seconds per task, not minutes.

---

### Reflex 1: One Check Before Each Edit

**Applies to:** All subject models, all IDEs, all modes.

Before modifying any file, read the exact lines you are about to change.
Not from memory — actually read them. One tool call. Then edit.

```
BEFORE every file edit:
    1. Read the specific lines you plan to change (not the whole file)
    2. If calling a function, confirm it exists: grep for it
    3. If assuming a type or interface shape, read the definition

THEN proceed with your edit.
```

**Why this exists:** The #1 failure mode across all non-frontier models is editing
based on stale or hallucinated file content. A 2-second read prevents a 20-minute
retry loop.

**What this does NOT change:**
- Your speed — one read call, not a research session
- Your approach — edit however you edit, just verify the target first
- Your IDE's tool conventions — use whatever read/grep tools your IDE provides

---

### Reflex 2: Two Strikes, Then Pivot

**Applies to:** All subject models, all IDEs. Behavior differs by mode.

If an approach fails twice (same strategy, two attempts), do not try it a third time.

```
IF (first attempt fails):
    -> Try ONE different approach (change strategy, not just retry)

IF (second attempt with a different approach also fails):
    -> You have hit the two-strike limit for this subtask.

    IF (INTERACTIVE mode):
        -> Tell the user briefly:
           "I tried [approach A] and [approach B]. Both failed because [reason].
            Would you like me to try [approach C] or take a different direction?"

    IF (AUTONOMOUS mode):
        -> Do NOT interrupt the user. Instead:
           1. Log what you tried and why it failed
           2. Refer back to the spec, acceptance criteria, or original task description
           3. Pick a materially different approach based on that reference
           4. If no alternative approach exists, mark this subtask as BLOCKED
           5. Move to the next subtask
           6. Report all blocked items when the task completes
```

**Why this exists:** Frontier models naturally change approach on failure. Loop-prone
models retry the same thing indefinitely. The two-strike rule forces a pivot without
removing initiative — you still get two full attempts at each approach before moving on.

**What this does NOT change:**
- Your decisiveness — you still act without hesitation for the first two attempts
- Your autonomy (in autonomous mode) — you never interrupt the user mid-task
- Your conversational style (in interactive mode) — you communicate naturally
- Your initiative — you still try bold approaches, just not the same one three times

**What this specifically protects against:**
- MiMo's infinite CoT loop (thinking the same thought repeatedly)
- MiMo/DeepSeek's repeated exec calls ("command still running" → re-issue same command)
- Any model's tendency to retry a failing test with the same fix

---

### Reflex 3: Never Repeat an Identical Call

**Applies to:** All subject models, all IDEs, all modes. No exceptions.

```
BEFORE every tool call:
    IF (this exact tool + these exact arguments = a call you already made):
        -> STOP. You are in a loop.
        -> Instead:
           1. Use a DIFFERENT tool, OR
           2. Change your arguments materially (not cosmetically), OR
           3. Mark this step as blocked and move to the next subtask

    IF (this is a genuinely different call):
        -> Proceed normally.
```

**Clarification — these are NOT repeats:**
- Polling a "still running" process with a poll/status command (different action)
- Reading a different section of the same file (different arguments)
- Retrying with genuinely different arguments (different approach)
- Running the same test after making code changes (different context)

**These ARE repeats:**
- Same tool, same arguments, expecting a different result
- Re-issuing an exec command after getting "still running" (use poll instead)
- Reading the same lines you just read without making changes in between
- Running the same grep with the same pattern you already ran

**Why this is the most important rule:** This single reflex prevents the most expensive
failure mode in agentic coding — the infinite loop. A MiMo CoT loop burned $400 in one
session. A DeepSeek exec retry spawned 7 duplicate processes. An unnamed agent called
the same API 2,847 times with a 128K context window. All of these are the same bug:
identical call, repeated indefinitely, zero progress.

---

## What These Reflexes Do NOT Change (Summary)

| What Stays the Same | Why |
|---|---|
| Your IDE's instructions and system prompt | The harness is subordinate to your IDE — always |
| Your IDE's tool-calling conventions | Use whatever tools your IDE provides, however it tells you to |
| Your IDE's output format and style | Format responses however your IDE expects |
| Your speed and initiative | Three micro-checks, not a research protocol |
| Your strengths | If you're great at generation, keep generating — just verify targets first |
| Your personality and approach | These are habits, not a personality transplant |
| Autonomous agents' autonomy | Reflex 2 pivots silently — never interrupts the user |
| Interactive agents' conversational flow | Reflex 2 communicates naturally — never robotic |

---

## Per-Model Quick Reference

This section is for ALL models (including exempt ones) — it documents known behavioral
patterns so you can self-correct and so users can make informed model choices.

### Exempt Models (Natural Guardrails)

| Family | Natural Behavior | Why Exempt |
|---|---|---|
| Claude (Opus, Sonnet 4.5+) | Self-verifies assumptions before acting, reads codebase before editing, adds safety checks unprompted | Naturally does all three reflexes without being told |
| GPT-5.x | Asks clarifying questions, strict instruction following, tight structured output | Naturally stops when uncertain (sometimes too much) |
| Grok 4.x | Fast, high instruction compliance, strong tool-call discipline | Reliable self-correction on failure |

### Subject Models (Known Failure Patterns)

| Family | Known Issues | Reflex That Helps Most |
|---|---|---|
| MiMo (all versions) | Infinite CoT loop in thinking mode, repeated exec calls, tool protocol breaks | Reflex 3 (prevents identical calls), Reflex 2 (forces pivot) |
| Kimi | Generally reliable; occasional context drift on very long sessions | Reflex 1 (verify before edit prevents stale-context bugs) |
| Minimax | Less documented in agentic scenarios; emerging model family | All three reflexes as baseline discipline |
| GLM | Strong IFEval scores; limited agentic field data | All three reflexes as baseline discipline |
| DeepSeek | Over-refactors working code, exec retry loops, scope creep | Reflex 2 (stops over-refactoring), Reflex 3 (stops exec retries) |
| Qwen | Good instruction following; can forget constraints in long contexts | Reflex 1 (re-read before edit), Reflex 2 (pivot on failure) |
| Gemini | CoT leakage, reasoning loops, fails to generate termination token | Reflex 3 (identical call detection), Reflex 2 (forces pivot) |

### Graduation Policy

When a model family demonstrates reliable behavior across multiple sessions without
exhibiting loop, repetition, or stall patterns, it moves to the exempt list:

```
To graduate a model family to exempt:
    1. Observe 10+ sessions without loop/repetition incidents
    2. Confirm the model self-corrects on failure (changes approach without being told)
    3. Confirm the model does not re-issue identical tool calls
    4. Move the family name from "Subject Models" to "Exempt Models" above
    5. Add a note about the version where behavior stabilized
```

This is a one-line edit. The reflexes themselves never change.

---

## IDE-Specific Notes

These notes document how the harness interacts with specific IDEs and CLIs.
The three reflexes are now **inline in the root AGENTS.md** so every IDE sees
them without needing to load this file. This file provides the detailed reference
(failure modes, per-model table, graduation policy) loaded on demand.

---

### Zed (Agent Panel + ACP)

**How Zed reads instructions:** Zed scans the project root for the **first match**
in this priority order and uses ONLY that file:

```
1. .rules
2. .cursorrules
3. .windsurfrules
4. .clinerules
5. .github/copilot-instructions.md
6. AGENT.md
7. AGENTS.md    ← your file (only if 1-6 don't exist)
8. CLAUDE.md
9. GEMINI.md
```

**⚠️ IMPORTANT:** If you have a `.rules`, `.cursorrules`, or `.windsurfrules` file
in the project root, Zed will read THAT file instead of `AGENTS.md`. Ensure no
higher-priority file exists, or include the three reflexes in whichever file Zed
actually reads.

**Zed does NOT have a `.zed/rules/` directory convention.** That is a common
misconception. Zed has a **Rules Library** (local GUI-based rules accessed via
`agent: open rules library` or `Cmd-Alt-L`). Rules Library entries can be set
as "default" (always-on) or `@`-mentioned on demand.

**No subdirectory support.** Zed reads ONE file from the project root. It does
not discover `docs/agents/*.md` or any subdirectory instruction files.

**ACP external agents** (Claude Code, Codex, Gemini CLI running inside Zed via
Agent Client Protocol): these agents use their OWN instruction discovery (CLAUDE.md,
AGENTS.md via their own mechanism). Zed does NOT pass its rules to external ACP
agents. Each agent reads instructions independently.

**Harness delivery:** The three reflexes are inline in root `AGENTS.md`, so Zed
sees them directly. This detailed file can be loaded if the model has file-reading
tools and follows the "load docs/agents/behavior-harness.md" instruction.

---

### Qoder (Quest Mode + Agent Mode)

**How Qoder reads instructions:** Qoder reads `AGENTS.md` from the project root
automatically. No configuration needed. In case of conflicts, `.qoder/rules/`
content takes precedence over `AGENTS.md`.

**Qoder does NOT auto-follow file references** within `AGENTS.md`. It treats the
file as flat text injected into the prompt. It will not automatically resolve
"load docs/agents/X.md" — the model must decide to use file-reading tools.

**Native rules system (`.qoder/rules/`):** For guaranteed loading, you can
optionally mirror critical content as Qoder rules:
- `.qoder/rules/behavior-harness.md` — type: Model Decision, description:
  "When model is looping, repeating, or exhibiting non-convergent behavior"
- 100,000 character limit across all active rule files
- Four activation types: Always Apply, Model Decision, Apply Manually, Specific Files

**SKILL.md support:** Qoder has a full skills system at `.qoder/skills/`.
As an alternative to rules, you can package this harness as a skill at
`.qoder/skills/behavior-harness/SKILL.md` for progressive-disclosure loading.

**Quest Mode:** Autonomous — Reflex 2 uses silent pivot behavior. Qoder's spec
and acceptance criteria serve as the reference point for pivots. Long-running
quests (up to 26h) make Reflex 3 critical — an undetected loop in a 26-hour
quest is catastrophic.

**Agent Mode (chat):** Interactive — Reflex 2 communicates with the user.

**Qoder's planning agent, memory, and self-evolution:** All unaffected. The
harness prevents loop behavior; Qoder's own systems handle everything else.

---

### Windsurf (Cascade)

**How Windsurf reads instructions:** Windsurf has the **best AGENTS.md support**
of all IDEs tested. It feeds AGENTS.md into the same Rules engine that powers
`.windsurf/rules/`:

- **Root `AGENTS.md`:** Treated as `always_on` — full content in Cascade's
  system prompt on every message
- **Subdirectory `AGENTS.md`:** Treated as a `glob` rule scoped to that
  directory's `/**` — applied only when Cascade reads/edits files there
- Case insensitive — both `AGENTS.md` and `agents.md` work
- Git-aware — searches parent directories up to the git root

**Native rules system (`.windsurf/rules/*.md`):** Uses YAML frontmatter with
four activation modes:

| Mode | `trigger:` value | Behavior |
|---|---|---|
| Always On | `always_on` | Full content in system prompt every message |
| Model Decision | `model_decision` | Description shown; full file loaded when Cascade decides it's relevant |
| Glob | `glob` | Applied when files matching `globs:` pattern are touched |
| Manual | `manual` | Only when user types `@rule-name` |

**Character limits:** 12,000 per workspace rule file, 6,000 for global rules.
Root `AGENTS.md` has no documented hard limit.

**SKILL.md support:** Full support at `.windsurf/skills/` and `.agents/skills/`.

**Harness delivery:** Root `AGENTS.md` with inline reflexes is loaded as
always-on automatically. For this detailed file, Cascade has file-reading
tools and can follow the load instruction. Alternatively, mirror this file
as `.windsurf/rules/behavior-harness.md` with `trigger: model_decision` and
`description: "When model is looping, repeating, or using a non-frontier model"`
for precise activation control.

---

### Warp (Terminal Agents)

**How Warp reads instructions:** `AGENTS.md` is Warp's primary project rules format.

**⚠️ Case-sensitive:** Must be `AGENTS.md` (all caps). NOT `agents.md` or
`Agents.md`. Warp will not recognize lowercase variants.

**Discovery:**
- Root `AGENTS.md` — auto-applied in all agent conversations
- Subdirectory `AGENTS.md` — auto-applied when working in that directory;
  best-effort applied when editing files in that subdirectory from elsewhere
- Git-aware — includes rules from current directory up through repo root
- `WARP.md` — still supported for backwards compat; takes priority if both
  exist in the same directory
- `/init` — Warp can auto-generate an `AGENTS.md` when you first enter a repo

**SKILL.md support:** Most comprehensive of all IDEs. Warp scans 10+ skill
directory conventions: `.agents/skills/`, `.warp/skills/`, `.claude/skills/`,
`.codex/skills/`, `.cursor/skills/`, `.gemini/skills/`, `.copilot/skills/`,
`.factory/skills/`, `.github/skills/`, `.opencode/skills/`.

**Harness delivery:** Root `AGENTS.md` with inline reflexes is loaded
automatically. For on-demand loading of this detailed file, consider packaging
it as a skill at `.agents/skills/behavior-harness/SKILL.md` — Warp will
auto-discover it and the agent can invoke it when relevant.

**Precedence order:**
1. Rules in current subdirectory's `AGENTS.md` (most specific)
2. Rules in root directory's `AGENTS.md`
3. Global Rules (from Warp Drive)

---

### OpenCode (CLI)

**How OpenCode reads instructions:** Reads `AGENTS.md` by traversing **upward**
from the current directory. Falls back to `CLAUDE.md` if no `AGENTS.md` exists.

**Discovery hierarchy:**
1. Local: traverses up from current dir — `AGENTS.md`, then `CLAUDE.md`
2. Global: `~/.config/opencode/AGENTS.md`
3. Claude Code compat: `~/.claude/CLAUDE.md` (unless disabled)
- First match wins per category

**⚠️ OpenCode does NOT auto-follow file references** in `AGENTS.md`. Their docs
explicitly state this. However, OpenCode has a powerful alternative:

**`opencode.json` instructions field (recommended):** Add this to your project root
to ensure modular agent docs are loaded:

```json
{
  "instructions": [
    "docs/agents/behavior-harness.md",
    "docs/agents/prisma-safety.md",
    "docs/agents/dry-principle.md"
  ]
}
```

This supports glob patterns (e.g., `"docs/agents/*.md"`) and even remote URLs.
All instruction files are concatenated and included in the LLM's context.

**SKILL.md support:** Via Claude Code compatibility at `~/.claude/skills/`.

**Harness delivery:** Root `AGENTS.md` with inline reflexes works directly.
For this detailed file, add it to `opencode.json` `instructions` for guaranteed
loading, or rely on the model's file-reading tools to follow the load instruction.

---

### Factory Droid

**How Factory reads instructions:** `AGENTS.md` is the core instruction format.
Factory has hierarchical, multi-file discovery:

1. `./AGENTS.md` in the current working directory
2. Nearest parent directory up to the repo root
3. Any `AGENTS.md` in sub-folders the agent is working inside
4. Personal override: `~/.factory/AGENTS.md`

Multiple files coexist — the closer one to the file being edited takes precedence.

**Additional configuration:**
- `.droid.yaml` — YAML config at repo root for code review settings
- `.factory/memories.md` — project-level memory file (decisions, history)
- `~/.factory/memories.md` — personal memory file (preferences)
- `.factory/rules/` — rules directory for standards and patterns
- `.factory/settings.json` — settings (model choice, autonomy mode)

**Harness delivery:** Root `AGENTS.md` with inline reflexes is loaded
automatically. Factory's agents have file-reading tools and can follow explicit
"read this file before proceeding" instructions in AGENTS.md. Alternatively,
place harness content in `.factory/rules/behavior-harness.md` for native
integration with Factory's rules system.

**Autonomous execution:** Reflex 2 uses silent pivot behavior. Factory Droid
reports blocked items on completion.

---

## Cross-IDE Compatibility Summary

| IDE / CLI | Reads root `AGENTS.md`? | Inline reflexes visible? | Auto-loads referenced files? | Native alternative for guaranteed loading |
|---|---|---|---|---|
| **Zed** | ✅ Yes (if no higher-priority file exists) | ✅ Yes | ❌ No (model must choose to read) | Rules Library (set as default) |
| **Qoder** | ✅ Yes | ✅ Yes | ❌ No | `.qoder/rules/` or `.qoder/skills/` |
| **Windsurf** | ✅ Yes (always-on, best support) | ✅ Yes | ❌ No (but Cascade reads on demand) | `.windsurf/rules/` with `trigger: model_decision` |
| **Warp** | ✅ Yes (all caps required) | ✅ Yes | ❌ No (model must choose to read) | `.agents/skills/` (auto-discovered) |
| **OpenCode** | ✅ Yes (traverses upward) | ✅ Yes | ❌ No (explicit in docs) | `opencode.json` `instructions` field |
| **Factory Droid** | ✅ Yes (hierarchical) | ✅ Yes | ❌ No (but agent follows read instructions) | `.factory/rules/` |

**Key insight:** No IDE auto-resolves file path references inside `AGENTS.md`.
The "load on demand" pattern depends on the model choosing to use file-reading
tools. This is why the three reflexes are now **inline in the root `AGENTS.md`**
— every IDE sees them immediately without any file-loading required. This detailed
file serves as supplementary reference for per-model profiles and graduation policy.

---

**Last Updated:** April 2026
**Structure:** Single file — conditional gates handle model and IDE selection internally.
Three reflexes are inline in root AGENTS.md; this file provides detailed reference.
**Maintenance:** Update the exempt/subject model lists as model families evolve.
Verify IDE instruction discovery behavior when IDEs ship major updates.