# Agent Context Files

Modular reference docs for AI assistants. Loaded on demand by the root `AGENTS.md` based on task context.

## File Index

| File | Purpose | Load When |
|---|---|---|
| `authentication.md` | Auth flow, token strategy, session management, security patterns | Working on login, sessions, tokens, admin auth, password reset |
| `behavior-harness.md` | Conditional model gates, three reflexes (verify/pivot/no-repeat), IDE-aware termination guardrails | Model looping/repeating, switching models, using non-frontier models (MiMo, DeepSeek, Kimi, Minimax, GLM, Gemini, Qwen) |
| `cipher-integration.md` | Cipher MCP full tool guide (21 tools), salience scoring, memory type routing, milestone protocol, knowledge graph, reasoning loop | Using Cipher MCP, storing session summaries, working across IDEs, handling credentials |
| `codewords.md` | Codeword system usage and known codewords | Handling credentials, API keys, tokens |
| `dry-principle.md` | Config dedup patterns, enforcement checklist, exceptions | Changing config, model tiers, provider mappings |
| `modular-design.md` | Module structure, dependency rules, boundaries | New features, restructuring modules, code placement |
| `paradigm-map.md` | Paradigms by subsystem, mixing rules, type safety, testability | Choosing paradigms, architecture decisions, mixing patterns |
| `prisma-safety.md` | Schema change workflow, destructive change protocol | Modifying Prisma schema, DB migrations |
| `server-lifecycle.md` | Ports, commands, verification steps | Server restart, rebuild, port operations |
| `service-factory.md` | Factory pattern, auto-cleanup registry, DI conventions | Creating/modifying backend services |
| `test-credentials.md` | All seed.ts test accounts, primary account, auto-infer scope | Testing, logging in, E2E, Playwright, API testing |
| `testing-conventions.md` | Hub file — conditional loading table for all testing files | Any testing task |
| `testing-core.md` | Test pyramid, failure protocol, TDD, anti-patterns, pre-push | Any testing task (always load first) |
| `testing-security.md` | OWASP Top 10 patterns, IDOR, injection, auth bypass, AI/upload/payment security, tooling, pre-PR checklist | Security tests, penetration testing, OWASP validation |
| `testing-unit.md` | Jest hoisting, mock strategy, DI pattern, templates, naming | Unit tests, mocks |
| `testing-integration.md` | Supertest, DB integration, auth cookies, cleanup, leak debug | Integration tests |
| `testing-e2e.md` | Playwright, critical flows, selectors, login pattern, auto-infer | E2E tests, browser testing |

## How Loading Works

1. Root `AGENTS.md` contains always-on rules + a "Context Enhancement" trigger table
2. When a task matches a trigger, the agent reads the corresponding file before proceeding
3. Each file is self-contained with a "Load this file when:" header
