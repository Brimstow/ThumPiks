# Unit Testing Conventions

**Load this file when:** Writing or fixing unit tests, creating mocks, dealing with Jest hoisting errors, or making code testable.

**Prerequisite:** Load `docs/agents/testing-core.md` first for failure classification and Always/Ask/Never rules.

---

## What to Unit Test

Unit tests target **pure functions and isolated business logic** — no database, no HTTP, no file system.

| What to Test | What NOT to Test |
|---|---|
| Service method logic (with mocked deps) | Internal/private methods directly |
| Data transformations and validators | Implementation details (variable names, order) |
| Utility functions and helpers | Framework internals (React lifecycle) |
| State reducers and derived computations | Third-party library behavior |
| Error handling paths | CSS class names or DOM structure |

**Test behavior, not implementation:**

```typescript
// BAD: Testing implementation details
test("uses useState internally", () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current._internalState).toBe(0); // Brittle!
});

// GOOD: Testing behavior
test("counter increments when increment is called", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1); // Public API
});
```

---

## Jest Hoisting Trap (Critical)

`jest.mock()` calls are **hoisted before all variable declarations**. Any mock factory that references a `const` or `let` variable declared in the same file will throw:

```
ReferenceError: Cannot access 'mockPrisma' before initialization
```

### CORRECT: Inline factory, inject via constructor

```typescript
// Factory uses only inline values — no external variable references
jest.mock("../../../utils/prisma-factory", () => ({
  getPrisma: jest.fn(() => ({})), // inline, no variable reference
}));

// Stable mock object declared AFTER the jest.mock calls
const mockPrisma: any = {
  user: { findUnique: jest.fn(), create: jest.fn() },
};

// Inject real mock via constructor in beforeEach
beforeEach(() => {
  service = new MyService(mockPrisma);
});
```

### CORRECT: Global storage for PrismaClient pattern

```typescript
jest.mock("@prisma/client", () => {
  const store = { myTable: { findMany: jest.fn(), create: jest.fn() } };
  (global as any).__myModuleMock = store; // store in global to avoid TDZ
  return { PrismaClient: jest.fn().mockImplementation(() => store) };
});

// Getter function reads from global — no TDZ risk
function getMock() {
  return (global as any).__myModuleMock;
}
```

### WRONG: References outer variable inside factory

```typescript
const mockPrisma = { user: { findUnique: jest.fn() } }; // TDZ: accessed before init
jest.mock("../../../utils/prisma-factory", () => ({
  getPrisma: jest.fn(() => mockPrisma), // crashes at runtime
}));
```

---

## Testability Pattern: Injectable Dependencies

When production code uses timing, I/O, or external calls inside private loops, make them injectable via an **optional constructor parameter**. Do NOT add fake timers to tests as the first solution — that's hacking the test.

**Production code (testable by design):**

```typescript
export class MyService {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(sleepFn?: (ms: number) => Promise<void>) {
    this.sleep =
      sleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  private async pollUntilDone(): Promise<void> {
    await this.sleep(1000); // Uses injected fn — instant in tests
  }
}
```

**Test (clean, no fake timers needed):**

```typescript
const noopSleep = () => Promise.resolve();

beforeEach(() => {
  service = new MyService(noopSleep); // polling resolves instantly
});
```

**When this applies:** Any service with retry loops, polling, backoff delays, or rate-limit waits.

---

## Terminal vs Retryable Errors

When a service has retry logic (exponential backoff), **terminal states must be explicitly marked** to prevent spurious retries:

```typescript
// WRONG — plain Error has no retryable=false, retry loop will retry it
throw new Error("Prediction was canceled");

// CORRECT — explicitly non-retryable
throw Object.assign(
  new Error("Prediction was canceled"),
  { isRetryable: false }, // retry loop checks this and bails immediately
);
```

Terminal states that must NEVER retry: `failed`, `canceled`, `invalid_input`, `forbidden`.

---

## Mock Strategy by Dependency Type

| Dependency | Mock Strategy | Example |
|---|---|---|
| Prisma / DB | Constructor injection with mock object | `new Service(mockPrisma)` |
| External API (Replicate, OpenRouter) | `jest.mock()` module mock | Mock the HTTP client module |
| Timing / delays | Optional constructor parameter | `new Service(noopSleep)` |
| Environment variables | Set in `beforeEach`, delete in `afterEach` | `process.env.KEY = 'test'` |
| File system | `jest.mock('fs')` or use memory buffers | Never touch real disk in unit tests |
| Logger | `jest.spyOn(logger, 'info').mockImplementation(() => {})` | Suppress noise, verify calls |

---

## Test Structure Template

```typescript
describe("ServiceName", () => {
  let service: ServiceName;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MY_API_KEY = "test-key";
    service = new ServiceName(noopSleep); // inject no-op for timing
  });

  afterEach(() => {
    delete process.env.MY_API_KEY;
  });

  describe("methodName", () => {
    it("describes expected behavior for given input", async () => {
      // arrange
      mockDep.method.mockResolvedValueOnce({ id: "1", status: "ok" });
      // act
      const result = await service.methodName("input");
      // assert
      expect(result).toBe("expected");
    });
  });
});
```

---

## Test Naming Convention

```typescript
// BAD
test('test1', () => { ... });
test('works', () => { ... });

// GOOD
test('returns 404 when thumbnail not found', () => { ... });
test('creates user with hashed password when valid data provided', () => { ... });
test('retries up to 3 times when API returns 429', () => { ... });
```

---

## Codebase Examples

### Pure Function: CompositionEngine

```typescript
// composition-engine.ts — static pure methods, no mocks needed
it("returns slots without values as missing", () => {
  const result = CompositionEngine.getMissingSlots(template, partialValues);
  expect(result).toEqual(["subtitle", "cta_text"]);
});
```

### Service with DI: ThumbnailService

```typescript
const service = new ThumbnailService({
  prisma: mockPrisma,
  cache: mockCache,
  eventEmitter: mockEmitter,
});

it("emits thumbnail.created event after creation", async () => {
  mockPrisma.thumbnail.create.mockResolvedValue(newThumbnail);
  await service.createThumbnail(userId, data);
  expect(mockEmitter.emit).toHaveBeenCalledWith(
    "thumbnail.created", expect.any(Object)
  );
});
```

### Retryable Service: ReplicateAI

```typescript
it("retries on transient errors", async () => {
  const sleepCalls: number[] = [];
  const trackingSleep = (ms: number) => { sleepCalls.push(ms); return Promise.resolve(); };
  const service = new ReplicateAIService(trackingSleep);

  mockFetch.mockRejectedValueOnce(new Error("timeout"));
  mockFetch.mockResolvedValueOnce({ ok: true, json: () => result });

  await service.generateImage(prompt);
  expect(sleepCalls).toHaveLength(1); // retried once
});
```
