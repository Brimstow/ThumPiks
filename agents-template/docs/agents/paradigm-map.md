# Polyglot Paradigm Map

**Load this file when:** Creating new features, choosing architectural patterns, introducing new libraries, or making decisions about how to structure logic within a subsystem.

---

## Paradigms by Subsystem

### 1. Functional — Data Transformations & Business Logic

**Where:** [FUNCTIONAL_WHERE — e.g., Service-layer pure logic, data mappers, validators, reducers, cache-aside fetch functions.]

**Why:** Pure functions are the easiest to test, compose, and type-check. They have no hidden state, so they don't lie in tests.

**Patterns:**
- Pure functions for data shaping
- Immutable state updates
- Pipeline composition via `map/filter/reduce` or equivalent
- Discriminated unions for type-safe error handling (`Result<T, E>` pattern)
- [LANGUAGE_SPECIFIC_PATTERN_1]

**Codebase examples:**
- [EXAMPLE_1] — [DESCRIPTION]
- [EXAMPLE_2] — [DESCRIPTION]

<!-- Example (JS/TS):
- `composition-engine.ts` — `getMissingSlots()` is a pure function that derives results from input data without mutation
- `useCompositionTemplates.ts` — `mapApiLayout()` is a pure mapper function
-->

**Rule:** If a function takes input and returns output with no side effects, write it as a pure function. Keep it outside of classes.

---

### 2. Reactive — Streams & Real-Time Data

**Where:** [REACTIVE_WHERE — e.g., SSE streaming, WebSocket connections, real-time updates, UI event flows.]

**Why:** Reactive patterns model time-varying values and async event sequences declaratively. They handle backpressure, cancellation, and composition that callbacks can't.

**Patterns:**
- [REACTIVE_PATTERN_1]
- [REACTIVE_PATTERN_2]
- [REACTIVE_PATTERN_3]

<!-- Example (JS/TS):
- SSE stream processing with `ReadableStream` readers
- Event-driven pub/sub via `EventEmitter`
- Cache-aside with singleflight deduplication
- Observer pattern for state invalidation
-->

**Codebase examples:**
- [REACTIVE_EXAMPLE_1]
- [REACTIVE_EXAMPLE_2]

**Rule:** When data changes over time and multiple consumers care about it, use the event system. When data flows as a stream, use the streaming pattern.

---

### 3. Actor / Message-Passing — Workers & Isolated State

**Where:** [ACTOR_WHERE — e.g., Web Workers, backend job queues, isolated compute processes.]

**Why:** Actors encapsulate state and communicate only via messages. This prevents shared-state bugs and enables true parallelism.

**Patterns:**
- `postMessage` / `onmessage` for worker communication (or equivalent)
- Message-type discrimination with typed enums
- Command pattern: `{ id, type, data }` -> `{ id, type, data }` response
- Isolated state per worker — no shared memory

**Codebase examples:**
- [ACTOR_EXAMPLE_1]
- [ACTOR_EXAMPLE_2]

**Rule:** Any heavy computation that would block the main thread MUST go in a Worker/isolated process. The worker is an actor — it receives messages, processes them in isolation, and posts results. No shared state.

---

### 4. Dataflow — Processing Pipelines

**Where:** [DATAFLOW_WHERE — e.g., Image processing chains, AI enhancement pipelines, batch operations.]

**Why:** Dataflow programming models computation as a graph of stages where data flows through. Each stage is independent, composable, and can be parallelized.

**Patterns:**
- Chain-of-responsibility: output of stage N feeds input of stage N+1
- Transducer-style composition
- Parallel stage execution (Promise.all / equivalent)

**Codebase examples:**
- [DATAFLOW_EXAMPLE_1]
- [DATAFLOW_EXAMPLE_2]

**Rule:** When processing has distinct sequential or parallel stages with data flowing between them, model it as a pipeline. Each stage should be a pure or near-pure function.

---

### 5. Layered / Object-Oriented — Service Architecture

**Where:** [LAYERED_WHERE — e.g., Backend module structure, service lifecycle management, dependency injection.]

**Why:** Layered architecture enforces separation of concerns and makes the dependency graph explicit. OOP with DI gives you lifetime management, testability via injection, and clear interface boundaries.

**Patterns:**
- [LAYER_1] -> [LAYER_2] -> [LAYER_3] -> [LAYER_4] -> [DATA_SOURCE]
- Constructor injection with optional dependencies
- Service Factory / Registry pattern for centralized access

**Codebase examples:**
- [LAYERED_EXAMPLE_1]
- [LAYERED_EXAMPLE_2]

**Rule:** Backend modules follow the layered architecture. Business logic lives in services. [CONTROLLER_EQUIVALENT] stays thin.

---

### 6. Declarative — Database & UI

**Where:** [DECLARATIVE_WHERE — e.g., ORM queries, component rendering, schema definitions.]

**Why:** Declarative code describes WHAT you want, not HOW to get it. The runtime optimizes execution. This reduces bugs from imperative sequencing errors.

**Patterns:**
- [ORM_TOOL] typed query API (no raw queries unless justified)
- [UI_FRAMEWORK] declarative rendering (no imperative DOM manipulation)
- Schema validation for API boundaries
- [STYLING_APPROACH] for declarative styling

**Codebase examples:**
- [DECLARATIVE_EXAMPLE_1]
- [DECLARATIVE_EXAMPLE_2]

**Rule:** If [ORM_TOOL] or [UI_FRAMEWORK] can do it declaratively, never write it imperatively.

---

## Mixing Paradigms Within a Feature Module

### The Key Principle: Functional Core, Imperative Shell

```
┌─────────────────────────────────┐
│  Imperative Shell               │  ← I/O, side effects, lifecycle
│  (controller, worker message    │
│   handler, [UI_EFFECT_EQUIV])   │
├─────────────────────────────────┤
│  Functional Core                │  ← Pure logic, data transforms,
│  (service methods, helpers,     │     validators, pipelines
│   pure functions)               │
└─────────────────────────────────┘
```

The shell handles side effects (HTTP, DB, messages). The core is pure and testable. This is how [UI_FRAMEWORK] works ([EQUIVALENT_OF_useEffect] = shell, render = core), and how your backend services should work (controller = shell, service logic = core).

### When Different Paradigms Meet in One Module

| Boundary | Shell Paradigm | Core Paradigm | Example |
|---|---|---|---|
| Backend service | Layered OOP (DI, lifecycle) | Functional (pure business logic) | [EXAMPLE_1] |
| Worker | Actor (message handling) | Dataflow (processing pipeline) | [EXAMPLE_2] |
| Stream processing | Reactive (stream subscription) | Functional (parsing, transforming) | [EXAMPLE_3] |
| Event handler | Reactive (pub/sub) | Functional (event handler) | [EXAMPLE_4] |
| [UI_FRAMEWORK] component | Declarative (render) | Functional (derived state) | [EXAMPLE_5] |

### Rules for Mixing

1. **Never put I/O in pure functions.** A pure function that calls `fetch` or DB writes is no longer pure. Extract the I/O to the shell.

2. **Keep paradigm boundaries at module edges.** A service class can internally use pure helper functions. A worker can internally use a dataflow pipeline. But the public API of each module should match ONE paradigm.

3. **Inject cross-paradigm dependencies.** Don't let the event system (reactive) hardcode into the service layer (layered). Use constructor injection.

4. **Test each paradigm with its natural strategy.** Pure functions: direct assertion. Reactive: mock the stream, assert the output. Actor: send message, assert response. Layered: mock dependencies via constructor.

---

## Integration with Service Factory & DI

<!-- Fill in with your project's DI pattern. Example:

### How Paradigms Connect Through the Factory

```[LANGUAGE]
// Layered service registered in factory
const [SERVICE] = get[SERVICE]('[NAME]');

// Cross-paradigm communication:
// 1. Layered -> Reactive: service emits events
// 2. Reactive -> Layered: event handler calls service
// 3. Layered -> Actor: service dispatches work to worker
```

### DI Pattern for Cross-Paradigm Testing

```[LANGUAGE]
// Production: real dependencies
const service = new [ServiceClass]();

// Test: inject replacements
const service = new [ServiceClass]({
  [dep1]: mock[Dep1],
  [dep2]: mock[Dep2],
});
```
-->

---

## Type Safety Across Paradigms

### Functional: Generics & Discriminated Unions

```[LANGUAGE]
// Type-safe Result for error handling
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

// Type-safe event discrimination
type [AppEvent] =
  | [EventType1]
  | [EventType2]
  | [EventType3];
```

### Reactive: Typed Event Handlers

```[LANGUAGE]
type [EventHandler]<T extends [AppEvent] = [AppEvent]> = (event: T) => Promise<void> | void;
```

### Actor: Typed Messages

```[LANGUAGE]
interface [WorkerMessage] {
  id: string;
  type: '[TASK]';
  [taskTypeField]: [TaskTypeEnum];
  data: [TaskData];
}

interface [WorkerResponse] {
  id: string;
  type: 'result' | 'error';
  data: unknown;
}
```

### Dataflow: Typed Pipeline Stages

```[LANGUAGE]
type [PipelineStage]<I, O> = (input: I) => Promise<O>;
```

---

## Testability by Paradigm

| Paradigm | Test Strategy | Mock Strategy |
|---|---|---|
| Functional | Direct assertion on pure functions | No mocks needed |
| Reactive | Assert event emission / stream output | Mock event subscriptions / emissions |
| Actor | Send message, assert response | Mock message passing |
| Dataflow | Feed input to pipeline, assert output | Mock individual stages |
| Layered | Mock dependencies via constructor injection | `new Service({ dep: mock })` |
| Declarative | [UI_TEST_LIBRARY] + query assertions | Mock API calls, not components |

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

1. **Don't use [COMPLEX_REACTIVE_LIB] for simple state.** If it's just a value that changes occasionally, use [SIMPLE_STATE_PATTERN]. [COMPLEX_REACTIVE_LIB] adds complexity that's only justified for complex async flows.

2. **Don't put business logic in actors/workers.** Workers should dispatch to pure functions. The worker is the shell; the pure function is the core.

3. **Don't share mutable state between paradigms.** If the reactive layer and the layered layer both mutate the same object, you get race conditions. Use message-passing instead.

4. **Don't skip DI for cross-paradigm boundaries.** If a service directly imports a dependency instead of receiving it via constructor, you can't test it in isolation.

5. **Don't use classes for data.** Data should be plain objects/interfaces. Classes are for services with lifecycle and state. If it's just data, use `interface` + `type`.

6. **Don't use untyped values to bridge paradigm boundaries.** Type each boundary explicitly (event types, message types, pipeline stage I/O). If the type system can't verify it, the test won't either.
