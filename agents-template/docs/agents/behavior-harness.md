# Behavioral Harness — Termination Guardrails

**Load this file when:** Model is looping or repeating itself, switching between models mid-project, using a non-frontier model, or choosing which model to assign to a task.

**This file is additive.** It does not replace or contradict instructions from your IDE, agent harness, or system prompt. Follow your IDE's instructions first. These rules supplement them.

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
| GPT-5.x | Asks clarifying questions, strict instruction following, tight structured output | Naturally stops when uncertain |
| Grok 4.x | Fast, high instruction compliance, strong tool-call discipline | Reliable self-correction on failure |

<!-- Add models as they prove reliable across 10+ sessions. -->

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

<!-- Document your project's IDE-specific notes here. See the original Thumbnail Maker
behavior-harness.md for detailed per-IDE integration notes (Zed, Qoder, Windsurf,
Warp, OpenCode, Factory Droid). Key points:

1. No IDE auto-resolves file path references inside AGENTS.md
2. The three reflexes are inline in root AGENTS.md so every IDE sees them
3. This detail file is supplementary reference for per-model profiles and graduation
4. For guaranteed loading, use each IDE's native rules system:
   - Qoder: .qoder/rules/ or .qoder/skills/
   - Windsurf: .windsurf/rules/ with trigger: model_decision
   - Warp: .agents/skills/ (auto-discovered)
   - Zed: Rules Library (set as default)
   - OpenCode: opencode.json instructions field
   - Factory Droid: .factory/rules/
-->

---

## Cross-IDE Compatibility Summary

| IDE / CLI | Reads root `AGENTS.md`? | Inline reflexes visible? | Auto-loads referenced files? | Native alternative for guaranteed loading |
|---|---|---|---|---|
| **Zed** | Yes (if no higher-priority file exists) | Yes | No (model must choose to read) | Rules Library (set as default) |
| **Qoder** | Yes | Yes | No | `.qoder/rules/` or `.qoder/skills/` |
| **Windsurf** | Yes (always-on, best support) | Yes | No (but Cascade reads on demand) | `.windsurf/rules/` with `trigger: model_decision` |
| **Warp** | Yes (all caps required) | Yes | No (model must choose to read) | `.agents/skills/` (auto-discovered) |
| **OpenCode** | Yes (traverses upward) | Yes | No (explicit in docs) | `opencode.json` `instructions` field |
| **Factory Droid** | Yes (hierarchical) | Yes | No (but agent follows read instructions) | `.factory/rules/` |

**Key insight:** No IDE auto-resolves file path references inside `AGENTS.md`.
The "load on demand" pattern depends on the model choosing to use file-reading
tools. This is why the three reflexes are **inline in the root `AGENTS.md`**
— every IDE sees them immediately without any file-loading required.

---

**Last Updated:** [DATE]
**Structure:** Single file — conditional gates handle model and IDE selection internally.
Three reflexes are inline in root AGENTS.md; this file provides detailed reference.
**Maintenance:** Update the exempt/subject model lists as model families evolve.
Verify IDE instruction discovery behavior when IDEs ship major updates.
