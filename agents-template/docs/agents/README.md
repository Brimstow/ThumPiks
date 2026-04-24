# Agent Context Files

Modular reference docs for AI assistants. Loaded on demand by the root `AGENTS.md` based on task context.

## File Index

| File | Purpose | Load When |
|---|---|---|
| `behavior-harness.md` | Conditional model gates, three reflexes (verify/pivot/no-repeat), IDE-aware termination guardrails | Model looping/repeating, switching models, using non-frontier models |
| `cipher-integration.md` | Cipher MCP full tool guide, salience scoring, memory type routing, milestone protocol, knowledge graph | Using Cipher MCP, storing session summaries, working across IDEs, handling credentials |
| `codewords.md` | Codeword system usage and known codewords | Handling credentials, API keys, tokens |
| `dry-principle.md` | Config dedup patterns, enforcement checklist, exceptions | Changing config, repeated values across files, model tiers, provider mappings |
| `modular-design.md` | Module structure, dependency rules, boundaries | New features, restructuring modules, code placement |
| `paradigm-map.md` | Paradigms by subsystem, mixing rules, type safety, testability | Choosing paradigms, architecture decisions, mixing patterns |
| `server-lifecycle.md` | Ports, commands, verification steps | Server restart, rebuild, port operations |
| `testing-conventions.md` | Hub file — conditional loading table for all testing files | Any testing task |
| `testing-core.md` | Test pyramid, failure protocol, TDD, anti-patterns, pre-push | Any testing task (always load first) |
| `testing-security.md` | OWASP Top 10 patterns, IDOR, injection, auth bypass, security tooling, pre-PR checklist | Security tests, penetration testing, OWASP validation |

<!-- Add project-specific files below this line:
| `[CUSTOM_FILE].md` | [PURPOSE] | [TRIGGER_CONDITION] |
-->

## How Loading Works

1. Root `AGENTS.md` contains always-on rules + a "Context Enhancement" trigger table
2. When a task matches a trigger, the agent reads the corresponding file before proceeding
3. Each file is self-contained with a "Load this file when:" header
