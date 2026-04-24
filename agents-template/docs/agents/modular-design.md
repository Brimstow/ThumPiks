# Modular Design Policy

**Load this file when:** Creating new features, restructuring modules, adding new directories, or making architectural decisions about code placement.

---

## Agent Role & Priorities

You are a **[LANGUAGE] coding assistant** for the [PROJECT_NAME] project.

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
| [FRONTEND_NAME] | [FRONTEND_PARADIGM] | [FRONTEND_KEY_RULE] |
| [HEAVY_COMPUTE_NAME] | [HEAVY_COMPUTE_PARADIGM] | [HEAVY_COMPUTE_KEY_RULE] |
| [BACKEND_NAME] | [BACKEND_PARADIGM] | [BACKEND_KEY_RULE] |
| [DATABASE_NAME] | [DATABASE_PARADIGM] | [DATABASE_KEY_RULE] |
| [WORKER_NAME] | [WORKER_PARADIGM] | [WORKER_KEY_RULE] |

<!-- Add or remove rows to match your project's subsystems. -->

---

## Module Structure

### [BACKEND_DIR]: `[BACKEND_MODULE_PATH]/`

May contain:

- `[LAYER_1]` - [LAYER_1_PURPOSE]
- `[LAYER_2]` - [LAYER_2_PURPOSE]
- `[LAYER_3]` - [LAYER_3_PURPOSE]
- `[LAYER_4]` (optional) - [LAYER_4_PURPOSE]
- `types.[EXT]` - feature-specific types/interfaces
- `index.[EXT]` - module public API

<!-- Example for JS/TS backend:
- `*.routes.ts` - Express routers (HTTP wiring only)
- `*.controller.ts` - HTTP request/response handling; thin
- `*.service.ts` - business logic
- `*.repository.ts` (optional) - data access over Prisma
- `types.ts` - feature-specific types/interfaces
- `index.ts` - module public API
-->

### [FRONTEND_DIR]: `[FRONTEND_MODULE_PATH]/`

May contain:

- `[FRONTEND_LAYER_1]/` - [FRONTEND_LAYER_1_PURPOSE]
- `[FRONTEND_LAYER_2]/` - [FRONTEND_LAYER_2_PURPOSE]
- `[FRONTEND_LAYER_3]/` - [FRONTEND_LAYER_3_PURPOSE]
- `types.[EXT]` - feature-specific types
- `index.[EXT]` - feature public API

<!-- Example for React frontend:
- `components/` - feature-specific components
- `hooks/` - feature-specific hooks
- `services/` - feature-specific API clients/adapters
- `types.ts` - feature-specific types
- `index.ts` - feature public API
-->

### Shared UI: `[SHARED_UI_PATH]/`

Reusable UI primitives. **Must not** contain feature-specific business logic or direct backend calls.

### Cross-cutting: `[CROSS_CUTTING_PATH]`

Shared infra modules (logging, error types, config). Depended on by features, not the other way around.

---

## Dependency Rules

### [BACKEND_DIR] allowed direction:

`[LAYER_1]` -> `[LAYER_2]` -> `[LAYER_3]` -> `[LAYER_4]` -> [DATA_SOURCE].

### [BACKEND_DIR] must NOT:

- [BACKEND_MUST_NOT_1]
- [BACKEND_MUST_NOT_2]

<!-- Example:
- Call [DB_TOOL] directly from controllers or routes.
- Import deep internals of another feature module (use that module's `index.ts` public API instead).
-->

### [FRONTEND_DIR] allowed direction:

- [FRONTEND_ALLOWED_1]
- [FRONTEND_ALLOWED_2]
- [FRONTEND_ALLOWED_3]

<!-- Example:
- Features may depend on shared UI components, contexts, and shared services.
- UI primitives must not depend on specific features.
- Components should use services/clients for HTTP calls, not hard-code backend URLs.
-->

---

## Always/Ask/Never Boundaries

### Always

- [ALWAYS_1]
- [ALWAYS_2]
- [ALWAYS_3]
- [ALWAYS_4]
- [ALWAYS_5]

<!-- Example:
- Place new backend logic inside an existing or new feature folder and respect the layering.
- Place new frontend feature code under the features directory and reuse shared UI for generic components.
- Export a small, intentional surface from each module via its public API file.
- Keep reusable components and cross-cutting utilities free of feature-specific business logic.
- Use [FRONTEND_COMPONENT_PATTERN] and [STATE_MANAGEMENT_PATTERN].
-->

### Ask / Be Deliberate

- [ASK_1]
- [ASK_2]
- [ASK_3]

<!-- Example:
- When moving code between modules or splitting an existing module.
- When creating new shared modules under cross-cutting directories.
- When introducing new paradigm libraries or imperative performance hacks.
-->

### Never

- [NEVER_1]
- [NEVER_2]
- [NEVER_3]
- [NEVER_4]
- [NEVER_5]

<!-- Example:
- Access the database directly from controllers, routes, or frontend code.
- Import deep internals of another feature module from outside that module; use its public API instead.
- Put business logic into shared UI primitives.
- Directly manipulate the DOM in declarative components except in tightly scoped, pre-existing escape hatches.
- Disable type checks or rely on untyped values without strong justification.
-->
