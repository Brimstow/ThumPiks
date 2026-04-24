# gate-keeper

Standalone filesystem-watcher enforcement daemon.  
**IDE-agnostic. VCS-agnostic. CLI-agnostic.**

## What It Does

Watches your project files for changes and evaluates them against rules ("gates") defined in your existing markdown documentation or a `.gates.yml` file. When a violation is detected, it alerts, logs, or reverts.

## Quick Start

```bash
# From tools/gate-keeper:
npm install

# Create starter gates
node bin/gate-keeper.mjs init --root ../..

# List loaded gates
node bin/gate-keeper.mjs list --root ../..

# One-shot check (CI/automation)
node bin/gate-keeper.mjs check --root ../..

# Real-time watch (start the daemon)
node bin/gate-keeper.mjs watch --root ../..
```

## How It Works

```
File saved (any editor/tool/script)
        │
        ▼
[Filesystem Event] ──→ chokidar detects change
        │
        ▼
[Gate Evaluation] ──→ check file against all matching gates
        │
    ┌───┴───┐
    │       │
  PASS    FAIL
    │       │
    ▼       ▼
 Update   Enforce (alert / revert / log)
 shadow
```

## Trigger Points

| Trigger | Command | Use Case |
|---------|---------|----------|
| Filesystem events | `gate-keeper watch` | Real-time enforcement while coding |
| One-shot CLI | `gate-keeper check` | CI pipelines, pre-deploy scripts |
| Cron/Task Scheduler | `gate-keeper check` | Periodic audits |
| npm scripts | `"pretest": "gate-keeper check"` | Before test runs |
| Any automation | Exit code 0/1 | Composable with any tool |

## Enforcement Modes

| Mode | Behavior |
|------|----------|
| `warn` (default) | Alert in terminal, exit 1 on violations |
| `strict` | Revert block-severity files to shadow copy + alert |
| `audit` | Silent — log to `.gate-keeper/violations.log` only |

## Gate Definition Format

Gates can live in two places:

### 1. Embedded in Markdown (recommended)

Inside any `docs/agents/*.md` file:

````markdown
```gate
id: no-secrets-in-source
trigger: "**/*.{ts,js,json,env}"
severity: block
pattern: /(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16})/
message: "API key detected in source"
exclude: ["**/*.test.*", "**/node_modules/**"]
```
````

Multiple gates in one block, separated by `---`.

### 2. Dedicated `.gates.yml`

Same format, just in a standalone file at project root.

### Gate Fields

| Field | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Unique identifier |
| `trigger` | Yes | Glob pattern — which files this gate applies to |
| `severity` | Yes | `block` / `warn` / `info` |
| `pattern` | One of | Regex — violation if FOUND (detect bad things) |
| `antipattern` | these | Regex — violation if NOT found (require good things) |
| `message` | Yes | Human-readable explanation |
| `exclude` | No | Glob patterns to skip |

## Architecture

- **Zero IDE dependency** — watches the filesystem directly
- **Zero VCS dependency** — uses shadow copies, not git
- **Zero config required** — sensible defaults, single dependency (chokidar)
- **Cross-platform** — Windows, macOS, Linux
- **~60ms response time** — detect → evaluate → enforce in one kernel tick
- **Composable** — exit codes work with any automation tool

## Dependencies

Just one: `chokidar` (filesystem watcher, zero native deps since v4).
