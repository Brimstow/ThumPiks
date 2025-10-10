# 📘 Project Best Practices

## 1. Project Purpose
This repository implements a full‑stack thumbnail management and analytics platform. It provides a TypeScript/Node backend with modular domains (auth, admin, analytics, templates, social‑share, thumbnail, project, collaboration) and a React + Vite TypeScript frontend. Key capabilities include secure admin workflows (JWT, MFA, OAuth), image processing for thumbnails, social media sharing integrations, analytics/event tracking, and an admin dashboard. Persistence is managed via Prisma (PostgreSQL by default).

## 2. Project Structure
- Root
  - best_practices.md (this document)
  - DEPLOYMENT_SETUP.md, PORT_CONFIGURATION.md, PORT_STANDARDS.md: environment and service orchestration guidance
  - scripts/: system and diagnostic utilities
  - pikzels-clone/: main application (backend + frontend)
  - thumbnail-maker-studio/, database/, logs/: auxiliary assets and data
- pikzels-clone/
  - client/: React + Vite app (TypeScript, Tailwind, shadcn/ui components)
    - src/components/: UI components and admin views
    - src/contexts/: React Context providers (Auth, Theme, Dashboard)
    - src/hooks/: custom hooks (e.g., realtime data)
    - src/__tests__/: frontend tests (Jest + RTL)
    - tailwind/postcss/vite configs
  - src/: Node backend (TypeScript)
    - modules/: domain‑driven folders (auth, admin, analytics, social‑share, templates, thumbnail, project, collaboration)
      - Each domain follows routes → controller → service layering
    - middleware/: cross‑cutting concerns (auth, validation, security, performance, cache)
    - events/: event emitter/registry/handlers for analytics and social‑share
    - config/: security config
    - services/: shared services (jwt, cache)
    - types/: central TypeScript types (api, auth, database)
    - routes/: top‑level routes (e.g., performance)
    - __tests__/: backend tests, including security suites
    - server.ts: application entrypoint
  - prisma/: Prisma schema and migrations (PostgreSQL)
  - jest.config.js, tsconfig*.json, .eslintrc.js: tooling/configuration
  - docs/: security and admin documentation

Conventions
- Feature/module folders under src/modules encapsulate domain concerns and expose routes/controllers/services.
- Shared logic lives in src/services and src/utils.
- Request handling follows: route → controller → service → (events/cache/db).
- Validation/security/performance enforced via middleware before controller logic.

## 3. Test Strategy
Frameworks & Tools
- Jest for unit/integration testing (backend and frontend)
- React Testing Library for client component tests
- ts-jest / Babel as appropriate for TS

Organization & Naming
- Backend tests in pikzels-clone/src/__tests__ and module‑specific tests under src/modules/**/__tests__
- Frontend tests in pikzels-clone/client/src/__tests__ and component‑local __tests__ folders
- File names follow *.test.ts/tsx and domain‑specific patterns (e.g., admin‑auth.service.test.ts)

Philosophy
- Unit tests: services, utilities, event handlers, middleware logic (fast, isolated)
- Integration tests: routes/controllers with middleware stack and realistic request/response
- Security tests: explicit coverage for MFA, auth flows, validation, and security middleware
- Frontend: test behavior and accessibility via RTL; avoid testing implementation details

Mocking Guidelines
- Mock external services (social media clients, email, JWT signer) at boundaries
- Use in‑memory fakes for cache and event emitters when possible
- For DB, prefer Prisma test database or SQLite fallback for integration tests; mock Prisma client for pure unit tests

Coverage Targets
- Aim for 80%+ line coverage overall, with critical paths (auth, security middleware, payment/share triggers) higher
- Require tests for all new routes, controllers, and services

## 4. Code Style
Languages & Idioms
- TypeScript across backend and frontend; prefer explicit types for public APIs and boundary layers
- Use async/await; avoid promise chains; handle rejections with try/catch or central error middleware
- Favor immutability for data transformations; avoid in‑place mutation unless performance‑critical

Naming
- Files: kebab‑case for routes/controllers/services; PascalCase for React components; *.service.ts, *.controller.ts, *.routes.ts
- Classes/Components: PascalCase; functions/variables: camelCase; constants: SCREAMING_SNAKE_CASE
- Tests: mirror source names with .test.ts/.test.tsx suffix

Comments & Docs
- Module/service headers: brief purpose and invariants
- Complex logic: inline comments focusing on “why”, not “what”
- Keep docs in docs/ up to date when changing domain flows or security behaviors

Error & Exception Handling
- Validate inputs in validation.middleware.ts before controller logic
- Throw domain‑meaningful errors in services; translate to HTTP responses in controllers/middleware
- Centralize error formatting/logging; avoid leaking internal details (stack traces) to clients
- Log with src/utils/logger.ts; include correlation/request IDs when available

Security
- Enforce auth and role checks via auth.middleware.ts and admin‑specific guards
- MFA and OAuth flows live in auth module; keep tokens short‑lived; refresh securely
- Sanitize/validate all inputs; never trust req.body/query/params without schema validation
- Follow docs/SECURITY_COMPLIANCE.md and SECURITY_SETUP.md

Frontend Style
- Keep components presentational where possible; business logic in hooks/contexts/services
- Use Contexts for cross‑cutting state (Auth/Theme/Dashboard); avoid prop drilling
- Tailwind for styling; prefer utility classes and shared component abstractions in components/ui

## 5. Common Patterns
- Layered architecture: route → controller → service with clear boundaries
- Event‑driven integrations: src/events with registry and handlers to decouple side‑effects (analytics, social share)
- Caching: cache.service + cache.middleware for hot paths
- JWT services: jwt.service and jwt.enhanced.service for auth tokens and claims
- Prisma as the data access layer; migrations tracked in prisma/migrations
- Admin module with dedicated routes, controllers, services, and client views
- React hooks (e.g., useRealtimeData) to encapsulate async data flows

## 6. Do's and Don'ts
✅ Do
- Keep controllers thin; delegate to services
- Validate all inputs at the edge; define schemas/types at boundaries
- Emit domain events for cross‑module side‑effects
- Write tests alongside new modules and features; include security scenarios
- Use TypeScript types from src/types to avoid duplication
- Use environment variables from .env; add new vars to .env.example and docs
- Follow port conventions in PORT_STANDARDS.md and PORT_CONFIGURATION.md
- Keep Prisma schema and migrations in sync; run migrations in CI/CD

❌ Don’t
- Access the database directly from controllers; go through services
- Bypass middleware for validation, auth, or security
- Leak secrets or stack traces in API responses or logs
- Commit local .env files or credentials
- Introduce tight coupling between modules; prefer events or service interfaces
- Add UI state in multiple contexts for the same concern; avoid duplicated sources of truth

## 7. Tools & Dependencies
Backend
- Node.js + TypeScript
- Express‑style HTTP server (see server.ts and routes)
- Prisma ORM with PostgreSQL (scripts for local setup/install included)
- Jest for testing
- Security middleware and JWT services

Frontend
- React + Vite + TypeScript
- Tailwind CSS + PostCSS
- Shadcn/ui components for consistent UI primitives
- React Testing Library + Jest

Setup
- Copy .env.example to .env and configure required variables
- Use provided scripts to set up PostgreSQL locally (install/verify/start)
- Run Prisma migrations and generate client
- Refer to DEPLOYMENT_SETUP.md for environment‑specific details

## 8. Other Notes
- Respect domain boundaries in src/modules; reuse shared services/types
- Extend the event system by registering new event types and handlers in src/events
- Keep security hardening front‑of‑mind; there are dedicated tests and workflows under .github/workflows
- When adding endpoints, provide: route, controller method, service method, validation schema, tests
- For frontend routes and admin screens, ensure protected routes wrap components requiring authentication
- Follow existing React Context patterns for global state; colocate component tests under __tests__ folders
