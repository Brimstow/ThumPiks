# Modular Design Policy

**Load this file when:** Creating new features, restructuring modules, adding new directories, or making architectural decisions about code placement.

---

## Agent Role & Priorities

You are a **polyglot JS/TS coding assistant** for the Thumbnail Maker project.

**Priorities (in order):**

1. Respect subsystem-specific programming paradigms and modular architecture boundaries.
2. Preserve and improve code clarity, type safety, tests, and existing behavior.
3. Optimize for performance only after 1 and 2 are satisfied.

---

## Paradigms by Subsystem

For full paradigm details, codebase examples, and mixing rules, load **`docs/agents/paradigm-map.md`**.

Summary (detailed rules in paradigm-map.md):

| Subsystem | Paradigm | Key Rule |
|---|---|---|
| React frontend | Declarative + Functional | Function components + hooks only; immutable state updates |
| Canvas / Image editing | Imperative (dedicated modules) | Canvas helpers in isolated modules, never in React render |
| Backend API | Layered + Event-Driven | `routes -> controllers -> services -> Prisma`; thin controllers |
| Database | Declarative | Prisma typed queries; raw SQL only in justified helpers |
| Workers | Message-based | Web Workers for heavy AI/image work; postMessage/onmessage |

---

## Module Structure

### Backend: `src/modules/<feature>/`

May contain:

- `*.routes.ts` - Express routers (HTTP wiring only)
- `*.controller.ts` - HTTP request/response handling; thin
- `*.service.ts` - business logic
- `*.repository.ts` (optional) - data access over Prisma
- `types.ts` - feature-specific types/interfaces
- `index.ts` - module public API

### Frontend: `client/src/features/<feature>/`

May contain:

- `components/` - feature-specific components
- `hooks/` - feature-specific hooks
- `services/` - feature-specific API clients/adapters
- `types.ts` - feature-specific types
- `index.ts` - feature public API

### Shared UI: `client/src/components/ui/`

Reusable UI primitives. **Must not** contain feature-specific business logic or direct backend calls.

### Cross-cutting: `src/utils`, `src/services`

Shared infra modules (logging, error types, config). Depended on by features, not the other way around.

---

## Dependency Rules

### Backend allowed direction:

`routes` -> `controller` -> `service` -> `repository` -> Prisma client.

### Backend must NOT:

- Call Prisma directly from controllers or routes.
- Import deep internals of another feature module (use that module's `index.ts` public API instead).

### Frontend allowed direction:

- Features may depend on `client/src/components/ui/`, `client/src/contexts/`, and shared `client/src/services/`.
- UI primitives must not depend on specific features.
- Components should use services/clients for HTTP calls, not hard-code backend URLs everywhere.

---

## Always/Ask/Never Boundaries

### Always

- Place new backend logic inside an existing or new `src/modules/<feature>/` folder and respect the `routes -> controller -> service -> repository -> Prisma` layering.
- Place new frontend feature code under `client/src/features/<feature>/` and reuse `client/src/components/ui/` for generic UI.
- Export a small, intentional surface from each module via its `index.ts` and import other modules only through their public API.
- Keep reusable UI components and cross-cutting utilities free of feature-specific business logic.
- Use React functional components + hooks and immutable state updates.
- Use Prisma for all DB access.

### Ask / Be Deliberate

- When moving code between modules or splitting an existing module.
- When creating new shared modules under `src/utils`, `src/services`, or `client/src/services`.
- When introducing new paradigm libraries (e.g., RxJS, new state managers) or imperative performance hacks in React.

### Never

- Access Prisma or the database directly from controllers, routes, or React code.
- Import deep internals of another feature module from outside that module; use its `index.ts` instead.
- Put business logic into `client/src/components/ui/` or other generic shared UI primitives.
- Directly manipulate the DOM in React components except in tightly scoped, pre-existing escape hatches.
- Disable TypeScript checks (`// @ts-ignore`) or rely on `any` without strong justification.
