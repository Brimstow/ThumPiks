# gate-keeper: Comprehensive Project Documentation

**Version:** 0.1.0  
**License:** MIT  
**Runtime:** Node.js >= 18.0.0  
**Type:** ESM Module  
**Single Dependency:** chokidar ^4.0.0  
**Status:** Prototype Complete  
**Total Source Lines:** ~2,425 (including CLI)  
**Last Updated:** 2026-05-11

---

## 1. Project Overview

### Description

gate-keeper is a standalone filesystem-watcher enforcement daemon. It is **IDE-agnostic, VCS-agnostic, and CLI-agnostic**. It watches project files for changes and evaluates them against rules ("gates") defined in existing markdown documentation or a `.gates.yml` file. When a violation is detected, it alerts, logs, or reverts.

### Core Differentiators

| Differentiator | Detail |
|---|---|
| Zero AI dependency | Deterministic regex evaluation — no LLM API key needed |
| Zero VCS dependency | Shadow copies for revert, not git |
| Zero IDE dependency | Watches filesystem directly via chokidar |
| Context detection | Recommends which docs to load based on file activity (novel, no competitor has this) |
| Gates embedded in docs | Documentation IS the source of truth — gates never go stale |
| Shadow-copy revert | File restoration without git history |
| Cross-platform | Windows, macOS, Linux |
| Response time | ~60ms detect → evaluate → enforce |
| Composable | Exit codes work with any automation tool |

---

## 2. Architecture

### Pipeline

```
parser → evaluator → watcher → enforcer → context-detector
```

### Flow Diagram

```
File saved (any editor/tool/script)
        |
        v
[Filesystem Event] --> chokidar detects change
        |
        v
[Gate Evaluation] --> check file against all matching gates
        |
    +---+---+
    |       |
  PASS    FAIL
    |       |
    v       v
 Update   Enforce (alert / revert / log)
 shadow
        |
        v
[Context Detection] --> recommend docs to load (independent of pass/fail)
        |
        v
 Write .gate-keeper/context.json
```

### Module Map

| Module | File | Lines | Responsibility |
|---|---|---|---|
| Parser | `src/parser.mjs` | 206 | Extracts gate definitions from markdown ` ```gate ` blocks and `.gates.yml` files |
| Evaluator | `src/evaluator.mjs` | 242 | Regex-based pattern matching, glob-to-regex converter, violation detection |
| Watcher | `src/watcher.mjs` | 174 | Chokidar filesystem watcher with debouncing and event coalescing |
| Enforcer | `src/enforcer.mjs` | 306 | Shadow-copy revert, violation logging, terminal output, severity-based actions |
| Context Detector | `src/context-detector.mjs` | 343 | Real-time context load detection (novel feature) |
| Public API | `src/index.mjs` | 13 | Re-exports all public symbols |
| CLI | `bin/gate-keeper.mjs` | 475 | CLI with commands: watch, check, context, init, list |
| Tests | `src/core.test.mjs` | 192 | 15 unit tests using `node:test` built-in runner |

### Directory Structure

```
tools/gate-keeper/
├── bin/
│   └── gate-keeper.mjs       (CLI entry point)
├── src/
│   ├── parser.mjs            (gate definition parser)
│   ├── evaluator.mjs         (rule evaluation engine)
│   ├── watcher.mjs           (chokidar wrapper)
│   ├── enforcer.mjs          (shadow store + enforcement actions)
│   ├── context-detector.mjs  (context detection - novel feature)
│   ├── index.mjs             (public API exports)
│   └── core.test.mjs         (unit tests)
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

### Runtime Artifacts (`.gate-keeper/` directory, gitignored)

```
.gate-keeper/
├── shadow/          (known-good file copies for revert)
├── context.json     (machine-readable context recommendations)
└── violations.log   (audit log of all violations)
```

---

## 3. CLI Commands

### `gate-keeper watch`

Start the filesystem watcher for real-time enforcement + context detection.

```bash
gate-keeper watch [--mode strict|warn|audit] [--root <path>] [--verbose] [--sound] [--no-context] [--no-cooldown]
```

**Behavior:**
- Loads gates from all sources (docs/agents/*.md, .gates/, .gates.yml)
- Loads context detection rules (default + custom)
- Watches all matching files for changes
- On each file change: evaluates gates + emits context signals
- Runs as foreground process until Ctrl+C

### `gate-keeper check`

One-shot gate evaluation for CI/automation.

```bash
gate-keeper check [--root <path>]
```

**Behavior:**
- Scans all files matching gate triggers
- Evaluates all gates
- Prints violations
- Exits with code 1 if any violations found, 0 otherwise
- Never reverts files (warn mode forced)

### `gate-keeper context`

Show context recommendations for a file or list all rules.

```bash
gate-keeper context [--file <path>] [--root <path>]
```

**Behavior:**
- With `--file`: Detects which docs should be loaded for that specific file
- Without `--file`: Lists all loaded context rules with their triggers

### `gate-keeper init`

Create a starter `.gates.yml` with example gates.

```bash
gate-keeper init [--root <path>]
```

### `gate-keeper list`

Show all loaded gates and their trigger patterns.

```bash
gate-keeper list [--root <path>]
```

---

## 4. Enforcement Modes

| Mode | Behavior | When to Use |
|---|---|---|
| `warn` (default) | Alert in terminal, exit 1 on violations. Never modifies files. | Day-to-day development |
| `strict` | Revert block-severity files to shadow copy + alert | Critical security rules, production branches |
| `audit` | Silent logging to `.gate-keeper/violations.log` only | Team analytics, compliance reporting |

### Enforcement Flow by Severity

| Severity | `warn` mode | `strict` mode | `audit` mode |
|---|---|---|---|
| `block` | Terminal alert + exit 1 | **Revert to shadow** + terminal alert + exit 1 | Log only |
| `warn` | Terminal alert + exit 1 | Terminal alert + exit 1 | Log only |
| `info` | Terminal alert (exit 0) | Terminal alert (exit 0) | Log only |

---

## 5. Gate Definition Format

### Fields

| Field | Required | Type | Description |
|---|---|---|---|
| `id` | Yes | string | Unique gate identifier |
| `trigger` | Yes | glob | Which files this gate applies to |
| `severity` | Yes | enum | `block` / `warn` / `info` |
| `pattern` | One of these | regex | Violation if FOUND (detect bad things) |
| `antipattern` | required | regex | Violation if NOT found (require good things) |
| `message` | Yes | string | Human-readable explanation |
| `exclude` | No | glob[] | Glob patterns to skip |

### Gate Definition in Markdown (Recommended)

Gates embedded inside any `docs/agents/*.md` file:

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

Multiple gates in one block, separated by `---`:

````markdown
```gate
id: gate-one
trigger: "**/*.ts"
severity: warn
pattern: /foo/
message: "Found foo"
---
id: gate-two
trigger: "**/*.js"
severity: block
pattern: /bar/
message: "Found bar"
```
````

### Gate Definition in `.gates.yml`

Same YAML-like format in a standalone file at project root:

```yaml
---
id: no-secrets-in-source
trigger: "**/*.{ts,js,mjs,cjs,tsx,jsx,json,env}"
severity: block
pattern: /(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]+|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})/
message: "Potential API key or secret detected in source code"
exclude: ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]

---
id: no-console-log-in-prod
trigger: "src/**/*.{ts,tsx,js,jsx}"
severity: warn
pattern: /console\.(log|debug|info)\(/
message: "console.log left in production code (use a proper logger)"
exclude: ["**/*.test.*", "**/*.spec.*", "**/scripts/**"]
```

### Gate Sources (Priority Order)

1. `docs/agents/*.md` — embedded ` ```gate ` blocks (primary source)
2. `.gates/` directory — dedicated gate files
3. `.gates.yml` — project root (project-level overrides)

### Pattern Types

**Pattern (detect bad things):**
- Regex that triggers a violation when found
- Example: `/console\.log/` — violation if console.log exists in file

**Antipattern (require good things):**
- Regex that triggers a violation when NOT found
- Example: `/authenticateToken/` — violation if auth middleware missing from route

### Regex Format

Accepts two formats:
- Regex literal: `/pattern/flags` (e.g., `/console\.log/i`)
- Plain string: treated as literal (escaped automatically)

---

## 6. Context Detection System (Novel Feature)

### Overview

The context detector is gate-keeper's unique differentiator. No competitor offers this feature. It watches file changes and emits recommendations for which documentation files should be loaded by the AI agent, based on file path patterns and content keywords.

### How It Works

1. A file change is detected by the watcher
2. The context detector evaluates the file path and content against context rules
3. If a rule matches, a "context signal" is emitted
4. The signal recommends loading a specific documentation file
5. Signals are output to terminal AND written to `.gate-keeper/context.json`

### Context Rule Format

```markdown
```context
id: prisma-safety
filePatterns: ["**/prisma/**", "**/schema.prisma"]
keywords: ["prisma", "migrate", "db push"]
contextFile: docs/agents/prisma-safety.md
description: db push vs migrate dev, destructive change protocol
```
```

### Default Context Rules (12 built-in)

| Rule ID | File Patterns | Keywords | Recommends Loading |
|---|---|---|---|
| `prisma-safety` | `**/prisma/**`, `**/*.prisma` | prisma, migrate, db push | `docs/agents/prisma-safety.md` |
| `authentication` | `**/auth/**`, `**/middleware/auth*` | jwt, bcrypt, cookie, session | `docs/agents/authentication.md` |
| `testing-conventions` | `**/*.test.*`, `**/*.spec.*` | describe(, it(, test(, jest | `docs/agents/testing-conventions.md` |
| `testing-security` | `**/*.security.test.*` | OWASP, injection, XSS | `docs/agents/testing-security.md` |
| `testing-e2e` | `**/e2e/**`, `**/*.e2e.*` | playwright, page.goto | `docs/agents/testing-e2e.md` |
| `server-lifecycle` | `**/server.ts`, `**/app.ts` | listen(, createServer, PORT | `docs/agents/server-lifecycle.md` |
| `service-factory` | `**/services/**` | createService, ServiceFactory | `docs/agents/service-factory.md` |
| `modular-design` | `**/modules/**`, `**/features/**` | module, boundary, subsystem | `docs/agents/modular-design.md` |
| `dry-principle` | `**/config/**`, `**/constants/**` | config, MODEL_TIER | `docs/agents/dry-principle.md` |
| `cors-csp-security` | `**/cors*`, `**/helmet*` | cors(, helmet(, CSP | `docs/agents/testing-security.md` |
| `file-upload` | `**/upload*`, `**/multer*` | multer, sharp, multipart | `docs/agents/testing-security.md` |
| `payment-billing` | `**/stripe*`, `**/billing*` | stripe, webhook, checkout | `docs/agents/testing-security.md` |

### Confidence Scoring

| Match Type | Confidence | Description |
|---|---|---|
| File pattern match | 90% | File path matches a glob pattern in the rule |
| Content keyword match | 70% | File content contains a keyword from the rule |
| Path keyword match | 50% | File path (not content) contains a keyword |

### Cooldown Deduplication

- Default cooldown: 30 seconds per context file
- Prevents spamming the same recommendation on rapid saves
- Configurable via `--no-cooldown` flag (useful for testing)
- Per-rule tracking (rule A cooldown doesn't affect rule B)

### Output Format (`.gate-keeper/context.json`)

```json
{
  "timestamp": "2026-05-10T12:34:56.789Z",
  "signals": [
    {
      "contextFile": "docs/agents/prisma-safety.md",
      "reason": "File matches pattern: **/prisma/**",
      "trigger": "prisma/schema.prisma",
      "confidence": 0.9
    }
  ]
}
```

### Custom Context Rules

Add custom rules via ` ```context ` blocks in any `docs/agents/*.md` file:

```markdown
```context
id: my-custom-context
filePatterns: ["src/billing/**"]
keywords: ["subscription", "payment"]
contextFile: docs/agents/billing-patterns.md
description: Billing system patterns and constraints
```
```

---

## 7. Shadow Store (Revert System)

### Architecture

The ShadowStore maintains known-good copies of files at `.gate-keeper/shadow/`. This mirrors the project structure:

```
.gate-keeper/shadow/
├── src/
│   ├── server.ts       (last known-good version)
│   └── routes/
│       └── api.ts      (last known-good version)
└── ...
```

### Lifecycle

1. **File passes all gates** → shadow copy is updated to current content
2. **File violates a block-severity gate in strict mode** → file is reverted to shadow copy
3. **New file created** → no shadow exists, so first violation cannot revert

### Key Design Decisions

- Shadow copies are NOT git-based — works in non-git projects
- Only updated when a file passes ALL gates (not on partial pass)
- Stored in `.gate-keeper/shadow/` (gitignored)
- Uses `fs.copyFile` for atomic operations

---

## 8. Watcher Configuration

### Default Behavior

- Watches: `**/*.{ts,tsx,js,jsx,mjs,cjs,json,yml,yaml,env,md}`
- Ignores: `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `.cache`, `tmp`, `.gate-keeper`
- Stability threshold: 200ms (waits for writes to finish)
- Follows: Does NOT follow symlinks

### Config File Locations (searched in order)

1. `.gate-keeper.yml`
2. `.gatekeeperrc`
3. `gate-keeper.config.yml`

### Config File Format

```yaml
# Override watcher settings
root: .
include:
  - "src/**/*.ts"
  - "lib/**/*.js"
ignore:
  - "**/generated/**"
stabilityThreshold: 300
pollInterval: 100  # Enable polling for network drives
```

### awaitWriteFinish

The watcher uses chokidar's `awaitWriteFinish` to handle editors that:
- Write to a temp file then rename (VS Code, Sublime)
- Write in multiple chunks
- Lock files during save

Default: 200ms stability threshold, 50ms poll interval.

---

## 9. Evaluator Engine

### Glob-to-Regex Converter

Built-in minimal glob converter (no dependency):

| Glob Pattern | Matches |
|---|---|
| `*` | Any characters except path separator |
| `**` | Any characters including path separators (recursive) |
| `?` | Single character except path separator |
| `{a,b,c}` | Brace expansion (alternatives) |
| `[abc]` | Character class |

### Evaluation Process

1. **Filter applicable gates** — match file path against each gate's trigger glob
2. **Check exclusions** — skip if file matches any exclude pattern
3. **Read file content** — only if at least one gate applies
4. **Evaluate each gate**:
   - Pattern: line-by-line regex scan, report first match as violation
   - Antipattern: full-content regex test, report if NOT found
5. **Return violations** — array of `{gateId, file, severity, message, line, match, source}`

### Violation Object

```typescript
interface Violation {
  gateId: string;        // Which gate was violated
  file: string;          // Relative file path
  severity: 'block' | 'warn' | 'info';
  message: string;       // Human-readable explanation
  line: number | null;   // Line number (pattern only)
  match: string | null;  // Matched content, truncated to 60 chars
  source: string;        // Gate definition source file
}
```

---

## 10. Integration Points

### With AGENTS.md

gate-keeper is referenced in the project's `AGENTS.md` as part of the Context Enhancement system. The "Context Enhancement (Load on Demand)" table in AGENTS.md maps triggers to documentation files — gate-keeper's context detector programmatically enforces this same mapping.

### With docs/agents/ Directory

Gates can be embedded directly in documentation files under `docs/agents/`. This means:
- Documentation IS the enforcement rules
- When docs are updated, gates update automatically
- No separate config file to maintain
- Teams can review gates in PRs alongside doc changes

### With CI/CD

```bash
# In CI pipeline (GitHub Actions, etc.)
npx gate-keeper check --root .
# Exit code 1 = violations found = fail the build
```

### With npm Scripts

```json
{
  "scripts": {
    "pretest": "node tools/gate-keeper/bin/gate-keeper.mjs check --root .",
    "gate:watch": "node tools/gate-keeper/bin/gate-keeper.mjs watch --root .",
    "gate:check": "node tools/gate-keeper/bin/gate-keeper.mjs check --root ."
  }
}
```

### With Pre-commit Hooks

```bash
# .husky/pre-commit
node tools/gate-keeper/bin/gate-keeper.mjs check --root .
```

---

## 11. Test Suite

### Running Tests

```bash
cd tools/gate-keeper
node --test src/core.test.mjs
```

### Test Coverage

15 tests across 3 describe blocks:

**Parser Tests (5):**
- `parseGateBlock` parses a valid gate
- `parseGateBlock` handles CRLF line endings
- `parseGateBlock` returns null for missing required fields
- `parseGateBlock` parses array values (exclude lists)
- `extractGates` finds gate blocks in markdown (multi-gate, separator support)

**Evaluator - Glob Matching Tests (5):**
- Matches simple extension pattern (`**/*.ts`)
- Matches brace expansion (`**/*.{ts,tsx}`)
- Matches nested paths (`src/**/*.tsx`)
- Matches specific file paths
- Handles Windows-style backslash paths

**Evaluator - Gate Evaluation Tests (5):**
- Pattern gate detects violation (line-level)
- Pattern gate passes when no match
- Antipattern gate detects missing required pattern
- Antipattern gate passes when pattern is found
- `extractGates` handles `yaml gate` language identifier

---

## 12. Competitive Landscape

| Tool | Similarities | gate-keeper Advantages |
|---|---|---|
| **Saguaro (Mesa)** | Markdown rules, YAML frontmatter, glob matching | No LLM API key required, has fs watching, has context detection |
| **AgentFirewall** | Filesystem watcher, YAML rules | Not security-only, JavaScript (not Python), supports code quality gates |
| **Agent RuleZ** | YAML policy engine | Not locked to Claude Code hooks, portable across all IDEs |
| **Spectral** | One-shot YAML linter | Has daemon mode (watch), has context detection |
| **ESLint/Biome** | Code quality rules | Works on ANY file type, not just JS/TS, embeds in docs |

---

## 13. Bugs Fixed During Development

| Bug | Root Cause | Fix |
|---|---|---|
| JSDoc comment with `*/` in glob pattern | Prematurely closed comment block | Converted to `//` comments |
| Windows CRLF line endings broke parsing | Regex split on `\n` missed `\r\n` | Added `\r?\n` splitting everywhere |
| Gate block regex failed on Windows | Fenced code block detection needed `\r?\n` | Updated regex in parser |
| Separator `---` not matching with whitespace | Regex was too strict | Changed to `/^\s*---\s*$/m` for tolerance |

---

## 14. Proposed Feature: Compaction Detection

### Problem Statement

When AI coding assistants experience context compaction (conversation summarization to free context window space), they lose adherence to instructions defined in AGENTS.md sub-files. The instructions get paraphrased in the compacted summary, and the AI model trusts the paraphrased "shadow copy" over the actual rules due to positional ordering in the context window.

### Research Findings

| Source | Finding |
|---|---|
| SysBench (ICLR 2025) | System message compliance drops from 87% (turn 1) to ~35% (turn 5) |
| Zoro (arXiv 2025) | Active rules = 80% compliance vs 51% for passive AGENTS.md |
| Position Effect Research (2026) | "U-shaped curve" — instructions at beginning (73%) and end get best attention; middle drops 30-50% |
| Claude Code Issue #48959 | Post-compaction drift is a **positioning problem**: compacted summary appears before CLAUDE.md, creating a "shadow copy" the model trusts more |
| Claude Code Issue #34556 | User's `compaction_watcher.py` reliably maintained state across 59 compactions by monitoring JSONL conversation files |
| Anthropic Context Engineering Guide | Recommends "just-in-time retrieval" — lightweight file references loaded dynamically |

### Proposed Architecture

```
gate-keeper (already watching filesystem)
  |
  v
[Compaction Detection] --> detects activity gap / conversation file mutation
  |
  v
[Regenerate] --> writes .gate-keeper/active-context.md with relevant docs
  |
  v
[AGENTS.md single instruction] --> "MANDATORY: read .gate-keeper/active-context.md before any edit"
```

### Detection Signals

| Signal | Reliability | Cross-IDE | Method |
|---|---|---|---|
| IDE conversation file mutation | 95%+ | Per-IDE adapter needed | Watch JSONL/session files for compaction markers |
| AGENTS.md re-read access event | 80%+ | Yes (OS-level) | inotify/FSEvents access events |
| File re-read patterns (behavioral) | 60-70% | Yes | Track "already read" set, detect amnesic re-reads |
| Activity gap (silence + resume) | ~60% | Yes | Timestamp analysis, but false positives (lunch, thinking) |

### Differentiating Compaction from Thinking Pauses

| Observable | During Thinking | During Compaction |
|---|---|---|
| IDE conversation file rewrite | No | Yes (summary block written) |
| AGENTS.md re-read by IDE | No (already in context) | Yes (IDE reinjects) |
| LLM re-reads same source files | Unlikely | Likely (lost memory) |
| Duration of silence | 5-60s typically | 10-45s |
| Filesystem activity during pause | Possible (temp/cache writes) | None (IDE is summarizing) |

### Recommended Implementation (Always-Fresh Approach)

Instead of detecting compaction perfectly (~60% precision), regenerate `active-context.md` on EVERY file save:

1. **AGENTS.md instruction** (1 line, primacy position):
   ```
   MANDATORY FIRST ACTION: If .gate-keeper/active-context.md exists and was modified in the last 10 minutes, read it before any edit.
   ```
2. **Gate-keeper regenerates on every save** — eliminates gap-detection problem entirely
3. **Include staleness header** — `Generated: <ISO timestamp>` so LLM can self-diagnose

Expected compliance: **70-85%** (based on first-turn instruction adherence at primacy position).

### IDE-Specific Adapter Architecture (Higher Precision)

```
tools/gate-keeper/src/adapters/
  qoder.mjs        -> watches task-*.session.execution.jsonl
  claude-code.mjs  -> watches conversations/*.jsonl
  windsurf.mjs     -> watches Windsurf session format
  generic.mjs      -> AGENTS.md access + file re-read patterns
```

---

## 15. Roadmap

| Priority | Feature | Description |
|---|---|---|
| 1 | MCP Server integration | Expose gates + context to AI IDEs via Model Context Protocol |
| 2 | `gate-keeper test` command | Fixture-based gate testing (validate gates against sample files) |
| 3 | Git hooks integration | Shift-left enforcement via husky/lefthook |
| 4 | Compaction detection | Activity-gap / conversation-file monitoring + active-context.md regeneration |
| 5 | `gate-keeper learn` command | Auto-generate rules from codebase patterns |
| 6 | Preset rule packs | `@gate-keeper/preset-security`, `@gate-keeper/preset-quality` |
| 7 | GitHub Action + SARIF output | CI integration with code scanning results |
| 8 | Config inheritance for monorepos | Parent/child gate configs |
| 9 | Analytics dashboard | Team feature (paid tier) — violation trends, compliance scores |
| 10 | Centralized policy server | Enterprise feature — org-wide gate management |
| 11 | AST plugin system | Optional tree-sitter analysis for structural rules |

---

## 16. Monetization Strategy

| Tier | Features | Price |
|---|---|---|
| Open Source Core | CLI, watch, check, context detection, all gate types | Free forever |
| Team | Dashboard, centralized policy, audit trail, compliance reports | $15-50/seat/month |
| Enterprise | Centralized policy server, SSO, org-wide management | Custom pricing |

### Competitive Moat

- **Context detection** is the unique IP — no competitor offers this
- **"No AI required"** appeals to regulated industries (finance, healthcare, government)
- Proven model: Cycode ($94M funding), Codacy (funded) — similar pattern

---

## 17. Public API (src/index.mjs)

```javascript
// Parser
export { loadProjectGates, extractGates, parseGateBlock } from './parser.mjs';

// Evaluator
export { evaluateFile, evaluateFiles, globToRegex, matchesTrigger } from './evaluator.mjs';

// Watcher
export { createWatcher, getWatcherConfig } from './watcher.mjs';

// Enforcer
export { Enforcer, ShadowStore, ViolationLogger, printSummary } from './enforcer.mjs';

// Context Detection
export { ContextDetector, loadContextRules, getDefaultContextRules } from './context-detector.mjs';
```

### Usage as Library

```javascript
import {
  loadProjectGates,
  evaluateFile,
  ContextDetector,
  loadContextRules
} from './src/index.mjs';

// Load gates from project
const gates = await loadProjectGates('/path/to/project');

// Evaluate a single file
const violations = await evaluateFile(gates, '/path/to/file.ts', '/path/to/project');

// Context detection
const rules = await loadContextRules('/path/to/project');
const detector = new ContextDetector(rules);
const signals = detector.detect('src/auth/login.ts', fileContent);
```

---

## 18. Configuration Reference

### package.json

```json
{
  "name": "gate-keeper",
  "version": "0.1.0",
  "description": "Standalone filesystem-watcher enforcement daemon. IDE-agnostic, VCS-agnostic, CLI-agnostic.",
  "type": "module",
  "bin": { "gate-keeper": "./bin/gate-keeper.mjs" },
  "main": "./src/index.mjs",
  "scripts": {
    "start": "node bin/gate-keeper.mjs watch",
    "check": "node bin/gate-keeper.mjs check",
    "test": "node --test src/**/*.test.mjs"
  },
  "dependencies": { "chokidar": "^4.0.0" },
  "engines": { "node": ">=18.0.0" },
  "keywords": ["enforcement", "file-watcher", "gates", "policy", "linting", "agent-rules"],
  "license": "MIT"
}
```

### .gitignore

```
node_modules/
.gate-keeper/
```

### Default Watcher Ignore Patterns

```
**/node_modules/**
**/.git/**
**/.svn/**
**/.hg/**
**/dist/**
**/build/**
**/coverage/**
**/.next/**
**/.nuxt/**
**/.cache/**
**/tmp/**
**/*.log
**/.DS_Store
**/Thumbs.db
**/.gate-keeper/**
```

---

## 19. Current Project Gates (`.gates.yml`)

```yaml
---
id: no-secrets-in-source
trigger: "**/*.{ts,js,mjs,cjs,tsx,jsx,json,env}"
severity: block
pattern: /(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]+|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})/
message: "Potential API key or secret detected in source code"
exclude: ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]

---
id: no-console-log-in-prod
trigger: "src/**/*.{ts,tsx,js,jsx}"
severity: warn
pattern: /console\.(log|debug|info)\(/
message: "console.log left in production code (use a proper logger)"
exclude: ["**/*.test.*", "**/*.spec.*", "**/scripts/**"]

---
id: no-any-type
trigger: "**/*.{ts,tsx}"
severity: warn
pattern: /:\s*any[\s;,)]/
message: "Explicit 'any' type detected - use a specific type or 'unknown'"
exclude: ["**/*.test.*", "**/*.d.ts"]

---
id: no-disabled-eslint
trigger: "**/*.{ts,tsx,js,jsx}"
severity: info
pattern: /eslint-disable(?!-next-line)/
message: "File-level eslint-disable found - prefer eslint-disable-next-line for specific rules"
```

---

## 20. Relationship to AGENTS.md Ecosystem

### How gate-keeper Fits

```
AGENTS.md (root hub - always loaded by all IDEs)
    |
    +-- "Context Enhancement (Load on Demand)" table
    |       |
    |       +-- Trigger conditions map to docs/agents/*.md files
    |       |
    |       +-- gate-keeper's context detector PROGRAMMATICALLY enforces this table
    |
    +-- docs/agents/*.md (sub-files loaded on demand)
            |
            +-- Can contain ```gate blocks (gates embedded IN documentation)
            |
            +-- Can contain ```context blocks (custom context rules)
            |
            +-- gate-keeper reads these for both gate definitions AND context rules
```

### The Key Insight

gate-keeper makes the AGENTS.md "load on demand" pattern **machine-enforceable**:
- AGENTS.md says "load testing-conventions.md when writing tests"
- gate-keeper DETECTS when you write tests and SIGNALS which file to load
- Without gate-keeper, this is voluntary compliance (~51%)
- With gate-keeper, this becomes active enforcement (~80%)

---

## 21. Cipher Memory Integration

### What Cipher Knows About gate-keeper

Cipher's knowledge graph contains:
- **Node:** `gate-keeper-project` (labels: Project, Tool, OpenSource)
- **Node:** `gate-keeper-architecture` (labels: Architecture, Pipeline)
- **Node:** `gate-keeper-context-detector` (labels: Module, NovelFeature, IP)
- **Edge:** gate-keeper-project → HAS_ARCHITECTURE → gate-keeper-architecture
- **Edge:** gate-keeper-project → HAS_NOVEL_FEATURE → gate-keeper-context-detector

### Recommended Cipher Queries

```
# Find all gate-keeper information
cipher_enhanced_search("gate-keeper", options: { relationDepth: 2 })

# Find gate-keeper architecture details
cipher_memory_search("gate-keeper architecture pipeline modules")

# Find gate-keeper in workspace context
cipher_workspace_search("gate-keeper implementation progress")
```

---

## 22. Quick Start for New Contributors

```bash
# 1. Navigate to gate-keeper
cd tools/gate-keeper

# 2. Install dependencies
npm install

# 3. Run tests
node --test src/core.test.mjs

# 4. Try listing gates from the project
node bin/gate-keeper.mjs list --root ../..

# 5. Run a one-shot check
node bin/gate-keeper.mjs check --root ../..

# 6. Start the daemon
node bin/gate-keeper.mjs watch --root ../..

# 7. Try context detection for a specific file
node bin/gate-keeper.mjs context --file ../../pikzels-clone/client/src/server.ts --root ../..
```

---

## 23. Design Principles

1. **Documentation is enforcement** — Gates live in docs, not separate config. When docs update, rules update.
2. **Zero dependencies beyond chokidar** — No build step, no transpilation, no native modules.
3. **Deterministic evaluation** — Same input always produces same output. No AI, no heuristics in gate evaluation.
4. **Graceful degradation** — If a file can't be read, skip it. If a regex is invalid, skip that gate. Never crash the daemon.
5. **Composable** — Exit codes, JSON output, and the library API make gate-keeper usable in any pipeline.
6. **Cross-platform first** — Normalize path separators, handle CRLF, test on Windows.
7. **Fast feedback loop** — 60ms from file save to violation alert. Developers shouldn't wait.
8. **Progressive enforcement** — Start with `audit` mode to understand violations, graduate to `warn`, then `strict`.
