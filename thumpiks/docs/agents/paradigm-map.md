# Polyglot Paradigm Map

**Load this file when:** Creating new features, choosing architectural patterns, introducing new libraries, or making decisions about how to structure logic within a subsystem.

---

## Paradigms by Subsystem

### 1. Functional — Data Transformations & Business Logic

**Where:** Service-layer pure logic, data mappers, validators, reducers, cache-aside fetch functions.

**Why:** Pure functions are the easiest to test, compose, and type-check. They have no hidden state, so they don't lie in tests.

**Patterns:**
- Pure functions for data shaping (`mapApiLayout`, `parseVisionResponse`, `buildThumbnailsApiUrl`)
- Immutable state updates (`setData(prev => ...)`, `useReducer`)
- Pipeline composition via `Array.map().filter().reduce()`
- Discriminated unions for type-safe error handling (`Result<T, E>` pattern)
- `Readonly<T>` and `as const` for compile-time immutability

**Codebase examples:**
- `composition-engine.ts` — `CompositionEngine.getMissingSlots()` and `getAutoRemoveBgSlots()` are pure functions that derive results from input data without mutation
- `useCompositionTemplates.ts` — `mapApiLayout()` is a pure mapper function
- `MyThumbnailsPage.tsx` — `filteredThumbnails` is a derived computation via `thumbnails.filter()`
- `vision.service.ts` — `parseVisionResponse()` is a pure data transform
- `replicate-ai.service.ts` — `calculateBackoffDelay()` and `parseRetryAfter()` are pure functions

**Rule:** If a function takes input and returns output with no side effects, write it as a pure function. Keep it outside of classes.

---

### 2. Reactive — Streams & Real-Time Data

**Where:** SSE streaming, WebSocket connections, real-time updates, UI event flows.

**Why:** Reactive patterns model time-varying values and async event sequences declaratively. They handle backpressure, cancellation, and composition that callbacks can't.

**Patterns:**
- SSE stream processing with `ReadableStream` readers (already in codebase)
- Event-driven pub/sub via `EventEmitter` (already in codebase)
- Cache-aside with singleflight deduplication (already in `cache.service.ts`)
- Observer pattern for state invalidation (SSE `invalidate` -> React Query refetch)

**Codebase examples:**
- `event-emitter.ts` — Full pub/sub with priority subscriptions, event persistence, and processing stats. This is the reactive backbone.
- `event-registry.ts` — Declarative handler registration (`this.register('thumbnail.created', handler)`)
- `sse.service.ts` — Server-side reactive stream: heartbeats, connection lifecycle, invalidation broadcasts
- `useNotifications.ts` — Client-side reactive loop: SSE `invalidate` event -> `queryClient.invalidateQueries()`
- `useRealtimeData.ts` — Polling-based reactive data with `useCallback` + `setInterval`
- `useChatStreaming.ts` / `useGlobalChatStreaming.ts` — Async iterator pump pattern with `ReadableStream.getReader()`
- `cache.service.ts` — `getOrSet()` implements singleflight (deduplicates concurrent cache misses)

**Rule:** When data changes over time and multiple consumers care about it, use the event system. When data flows as a stream, use the ReadableStream/SSE pattern.

---

### 3. Actor / Message-Passing — Workers & Isolated State

**Where:** Web Workers (AI processing, image manipulation), backend job queues, FFmpeg processing.

**Why:** Actors encapsulate state and communicate only via messages. This prevents shared-state bugs and enables true parallelism in the browser via Workers.

**Patterns:**
- `postMessage` / `onmessage` for worker communication (already in codebase)
- Message-type discrimination with `FFMessageType` enum
- Command pattern: `{ id, type: 'task', taskType, data }` -> `{ id, type, data }` response
- Isolated state per worker — no shared memory

**Codebase examples:**
- `ai-worker.ts` — Full actor pattern: `self.onmessage` receives typed `WorkerMessage`, dispatches by `taskType` (`removeBackground`, `enhance`), posts results back
- `worker.js` (FFmpeg) — Actor pattern with `FFMessageType` enum: RENAME, CREATE_DIR, LIST_DIR, MOUNT, etc. Each message gets an `id` for correlation.

**Rule:** Any heavy computation that would block the main thread MUST go in a Web Worker. The worker is an actor — it receives messages, processes them in isolation, and posts results. No shared state.

---

### 4. Dataflow — Processing Pipelines

**Where:** Image processing chains, AI enhancement pipelines, batch operations.

**Why:** Dataflow programming models computation as a graph of stages where data flows through. Each stage is independent, composable, and can be parallelized.

**Patterns:**
- Chain-of-responsibility: output of stage N feeds input of stage N+1
- Sharp.js pipeline for image processing (already in codebase)
- Transducer-style composition: `pipe(filter, map, reduce)` without intermediate arrays
- `Promise.all` / `Promise.allSettled` for parallel dataflow stages

**Codebase examples:**
- `image-processing.service.ts` — Sequential dataflow pipeline: crop -> filter (grayscale/sepia/vintage/etc.) -> text overlays -> output. Each step transforms the image buffer.
- `thumbnail.service.ts` — `bulkMoveThumbnails()` uses parallel dataflow: collect source IDs -> batch update -> parallel cache invalidation
- `analytics.service.ts` — `getAnalyticsOverview()` fans out to four parallel data sources via `Promise.all`, then merges results
- `cache.service.ts` — `getOrSet()` is a dataflow stage: check cache -> miss? -> fetch -> store -> return

**Rule:** When processing has distinct sequential or parallel stages with data flowing between them, model it as a pipeline. Each stage should be a pure or near-pure function.

---

### 5. Layered / Object-Oriented — Service Architecture

**Where:** Backend module structure, service lifecycle management, dependency injection.

**Why:** Layered architecture enforces separation of concerns and makes the dependency graph explicit. OOP with DI gives you lifetime management, testability via injection, and clear interface boundaries.

**Patterns:**
- Routes -> Controller -> Service -> Repository -> Prisma (already in codebase)
- Constructor injection with optional dependencies (already in codebase)
- Service Factory pattern for centralized access (already in codebase)

**Codebase examples:**
- `thumbnail.service.ts` — Constructor injection: `constructor(dependencies: ThumbnailServiceDependencies = {})` with `dependencies.prisma || defaultPrisma`, `dependencies.cache || defaultCache`, etc.
- `service-factory.ts` — Centralized service registry with `getService('cache')`, `getService('sse')`
- `notification-router.service.ts` — Routes to multiple channels via `Promise.allSettled`, uses `getService('sse')` for cross-service communication
- Every `*.controller.ts` — Thin layer that validates input, calls service, returns response

**Rule:** Backend modules follow the `routes -> controller -> service -> repository -> Prisma` layering. Business logic lives in services. Controllers stay thin.

---

### 6. Declarative — Database & UI

**Where:** Prisma queries, React component rendering, schema definitions.

**Why:** Declarative code describes WHAT you want, not HOW to get it. The runtime (Prisma, React) optimizes execution. This reduces bugs from imperative sequencing errors.

**Patterns:**
- Prisma typed query API (no raw SQL unless justified)
- React function components + JSX (no imperative DOM manipulation)
- Zod/Joi schema validation for API boundaries
- CSS-in-JS or Tailwind for declarative styling

**Codebase examples:**
- Every Prisma call — `prisma.thumbnail.findMany({ where: { userId, deletedAt: null } })`
- Every React component — declarative JSX rendering
- `ThumbnailParametersSchema` — Zod validation for JSON column data

**Rule:** If Prisma or React can do it declaratively, never write it imperatively.

---

## Mixing Paradigms Within a Feature Module

### The Key Principle: Functional Core, Imperative Shell

```
┌─────────────────────────────────┐
│  Imperative Shell               │  ← I/O, side effects, lifecycle
│  (controller, worker message    │
│   handler, React useEffect)     │
├─────────────────────────────────┤
│  Functional Core                │  ← Pure logic, data transforms,
│  (service methods, helpers,     │     validators, pipelines
│   pure functions)               │
└─────────────────────────────────┘
```

The shell handles side effects (HTTP, DB, messages). The core is pure and testable. This is how React works (`useEffect` = shell, render = core), and how your backend services should work (controller = shell, service logic = core).

### When Different Paradigms Meet in One Module

| Boundary | Shell Paradigm | Core Paradigm | Example |
|---|---|---|---|
| Backend service | Layered OOP (DI, lifecycle) | Functional (pure business logic) | `ThumbnailService.createThumbnail()` |
| Worker | Actor (message handling) | Dataflow (processing pipeline) | `ai-worker.ts` onmessage -> removeBackground() |
| SSE streaming | Reactive (stream subscription) | Functional (parsing, transforming) | `useChatStreaming.ts` pump -> processSSELines |
| Event handler | Reactive (pub/sub) | Functional (event handler) | `event-registry.ts` subscribe -> handler |
| React component | Declarative (JSX render) | Functional (derived state) | `MyThumbnailsPage.tsx` render -> filteredThumbnails |

### Rules for Mixing

1. **Never put I/O in pure functions.** A pure function that calls `fetch` or `prisma.create` is no longer pure. Extract the I/O to the shell.

2. **Keep paradigm boundaries at module edges.** A service class can internally use pure helper functions. A worker can internally use a dataflow pipeline. But the public API of each module should match ONE paradigm.

3. **Inject cross-paradigm dependencies.** Don't let the event system (reactive) hardcode into the service layer (layered). Use constructor injection: `this.eventEmitter = dependencies.eventEmitter || eventEmitter`.

4. **Test each paradigm with its natural strategy.** Pure functions: direct assertion. Reactive: mock the stream, assert the output. Actor: send message, assert response. Layered: mock dependencies via constructor.

---

## Integration with Service Factory & DI

### How Paradigms Connect Through the Factory

```typescript
// Layered service registered in factory
const sse = getService('sse');          // Reactive service
const cache = getService('cache');      // Dataflow/cache-aside service
const notificationRouter = getService('notificationRouter'); // Layered service

// Cross-paradigm communication:
// 1. Layered -> Reactive: service emits events via eventEmitter
await this.emitThumbnailCreated(userId, thumbnailId, ...);

// 2. Reactive -> Layered: event handler calls service
eventRegistry.register('thumbnail.created', async (event) => {
  await analyticsHandlers.handleThumbnailCreated(event);
});

// 3. Reactive -> Declarative: SSE invalidation triggers React Query refetch
sse.invalidateUser(userId);  // backend
queryClient.invalidateQueries({ queryKey: ['notifications'] });  // frontend

// 4. Layered -> Actor: service dispatches work to worker
aiWorker.postMessage({ id, type: 'task', taskType: 'enhance', data });
```

### DI Pattern for Cross-Paradigm Testing

```typescript
// Production: real dependencies
const service = new ThumbnailService();

// Test: inject pure function replacements
const service = new ThumbnailService({
  prisma: mockPrisma,                    // Layered -> mock DB
  cache: mockCache,                      // Dataflow -> mock cache
  eventEmitter: mockEmitter,             // Reactive -> mock events
  emitThumbnailCreated: jest.fn(),       // Reactive -> mock side effect
});
```

---

## Type Safety Across Paradigms

### Functional: Generics & Discriminated Unions

```typescript
// Type-safe Result for error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Type-safe event discrimination
type AppEvent =
  | ThumbnailCreatedEvent
  | ThumbnailUpdatedEvent
  | SocialShareRequestedEvent;
```

### Reactive: Typed Event Handlers

```typescript
// Already in codebase: event-types.ts
export type EventHandler<T extends AppEvent = AppEvent> = (event: T) => Promise<void> | void;
export type EventSubscription = {
  eventType: string;
  handler: EventHandler;
  priority?: number;
};
```

### Actor: Typed Messages

```typescript
// Already in codebase: ai-worker.ts
interface WorkerMessage {
  id: string;
  type: 'task';
  taskType: 'removeBackground' | 'enhance';
  data: WorkerTaskData;
}

interface WorkerResponse {
  id: string;
  type: 'result' | 'error';
  data: unknown;
}
```

### Dataflow: Typed Pipeline Stages

```typescript
// Each stage has input/output types
type ImagePipelineStage<I, O> = (input: I) => Promise<O>;

// Compose stages with type safety
const pipeline = pipe<Buffer, ProcessedImage>(
  cropStage,
  filterStage,
  overlayStage,
);
```

---

## Testability by Paradigm

| Paradigm | Test Strategy | Mock Strategy |
|---|---|---|
| Functional | Direct assertion on pure functions | No mocks needed |
| Reactive | Assert event emission / stream output | Mock `eventEmitter.subscribe` / `emitEvent` |
| Actor | Send message, assert response | Mock `postMessage` / `self.onmessage` |
| Dataflow | Feed input to pipeline, assert output | Mock individual stages |
| Layered | Mock dependencies via constructor injection | `new Service({ prisma: mock })` |
| Declarative | React Testing Library + query assertions | Mock API calls, not components |

---

## Decision Matrix: Which Paradigm When?

| Problem | Paradigm | Why |
|---|---|---|
| Transform data (map, filter, validate) | Functional | Pure, testable, composable |
| React to events over time | Reactive | Handles async, backpressure, cancellation |
| Run heavy computation off main thread | Actor | Isolated state, message-passing, parallel |
| Chain processing steps sequentially | Dataflow | Each stage independent, composable, parallelizable |
| Manage service lifecycle & dependencies | Layered/OOP | DI, lifetime control, clear boundaries |
| Describe UI or DB queries | Declarative | Runtime-optimized, fewer sequencing bugs |

---

## Anti-Patterns to Avoid

1. **Don't use RxJS for simple state.** If it's just a value that changes occasionally, use `useState`/`useReducer` or a service. RxJS adds complexity that's only justified for complex async flows.

2. **Don't put business logic in actors/workers.** Workers should dispatch to pure functions. The worker is the shell; the pure function is the core.

3. **Don't share mutable state between paradigms.** If the reactive layer and the layered layer both mutate the same object, you get race conditions. Use message-passing instead.

4. **Don't skip DI for cross-paradigm boundaries.** If a service directly imports `eventEmitter` instead of receiving it via constructor, you can't test it in isolation.

5. **Don't use classes for data.** Data should be plain objects/interfaces. Classes are for services with lifecycle and state. If it's just data, use `interface` + `type`.

6. **Don't use `any` to bridge paradigm boundaries.** Type each boundary explicitly (event types, message types, pipeline stage I/O). If TypeScript can't verify it, the test won't either.
