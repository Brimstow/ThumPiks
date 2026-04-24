# Integration Testing Conventions

**Load this file when:** Writing or fixing integration tests, testing API routes, database interactions, service wiring, or dealing with resource leaks.

**Prerequisite:** Load `docs/agents/testing-core.md` first for failure classification and Always/Ask/Never rules.

---

## What Integration Tests Cover

Integration tests verify that **components work together correctly** — API routes + services + database, not just isolated units.

| Test Type | What It Validates | Tool |
|---|---|---|
| API route tests | Request -> middleware -> controller -> service -> DB -> response | Supertest |
| Service + DB tests | Service logic against real (test) database | Prisma + Jest |
| Auth flow tests | Login -> token -> cookie -> authenticated request | Supertest |
| Event system tests | Service emits event -> handler processes -> side effect occurs | Jest + mocks |

**Key Insight (from research):** Integration tests give the best ROI. They catch SQL bugs, ORM misconfigurations, and service boundary issues that unit tests miss. Unit tests alone miss 60%+ of production bugs.

---

## API Route Testing with Supertest

### Structure

```typescript
import request from "supertest";
import { app } from "../app";
import { prisma } from "../utils/prisma-factory";

describe("POST /api/thumbnails", () => {
  beforeAll(async () => {
    // Ensure test DB is connected
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean test data between tests
    await prisma.thumbnail.deleteMany({ where: { userId: "test-user" } });
  });

  it("creates a thumbnail and returns 201", async () => {
    const response = await request(app)
      .post("/api/thumbnails")
      .set("Cookie", authToken) // HttpOnly cookie auth
      .send({ title: "Test", width: 1280, height: 720 });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.title).toBe("Test");
  });
});
```

### Auth in Integration Tests

Thumbnail Maker uses HttpOnly cookies, not Bearer tokens. To test authenticated routes:

```typescript
// Helper: get auth cookie for test user
async function getAuthCookie(email = "tester1@example.com", password = "Test123!") {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ identifier: email, password });

  // Extract the Set-Cookie header
  const cookies = response.headers["set-cookie"];
  return cookies; // Pass to .set("Cookie", cookies) in subsequent requests
}

// Usage
it("returns user thumbnails when authenticated", async () => {
  const cookies = await getAuthCookie();
  const response = await request(app)
    .get("/api/thumbnails")
    .set("Cookie", cookies);

  expect(response.status).toBe(200);
});
```

**For test credentials, always load `docs/agents/test-credentials.md`.**

---

## Database Integration Testing

### Rules

1. **Always use a test database**, never production or staging
2. **Clean up test data** in `beforeEach` or `afterEach`
3. **Use transactions** for test isolation when possible
4. **Never depend on seed data existing** — create what you need in the test
5. **Disconnect Prisma** in `afterAll` to prevent worker leaks

### Pattern: Create-Clean-Verify

```typescript
describe("Thumbnail CRUD", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.thumbnail.deleteMany({
      where: { userId: "integration-test-user" },
    });
  });

  it("creates and retrieves a thumbnail", async () => {
    // Create
    const created = await prisma.thumbnail.create({
      data: {
        userId: "integration-test-user",
        title: "Integration Test",
        width: 1280,
        height: 720,
      },
    });

    // Retrieve
    const found = await prisma.thumbnail.findUnique({
      where: { id: created.id },
    });

    // Verify
    expect(found).not.toBeNull();
    expect(found!.title).toBe("Integration Test");
  });
});
```

---

## Resource Cleanup and Leak Prevention

Improper cleanup causes worker process failures, memory leaks, and flaky tests. Jest runs tests in parallel workers; leaked resources prevent graceful exit.

### ALWAYS Cleanup

- Close database connections in `afterAll`: `await prisma.$disconnect()`
- Stop HTTP servers in `afterAll`: `await server.close()`
- Clear timers/intervals before test ends
- Remove event listeners in `afterEach` or `afterAll`
- Clear all mocks in `afterEach`: `jest.clearAllMocks()`
- Close file handles and streams
- Disconnect Redis clients: `await redis.quit()`

### Pattern: Full Cleanup

```typescript
describe("Feature Integration Tests", () => {
  let server: Server;
  let prisma: PrismaClient;

  beforeAll(async () => {
    server = app.listen(0); // Port 0 = random available port
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test("example", () => {
    /* ... */
  });
});
```

### Debugging Leaks

- Run `npm test -- --detectOpenHandles` to identify unclosed resources
- Jest will report specific handles (timers, connections, etc.)
- Fix the root cause; do NOT use `--forceExit` to mask issues

### Common Leak Sources

| Source | Fix |
|---|---|
| Prisma | `await prisma.$disconnect()` in `afterAll` |
| Express/HTTP | `await server.close()` in `afterAll` |
| Timers | Clear `setTimeout`/`setInterval` before test ends |
| Redis/Cache | `await redis.quit()` in `afterAll` |
| Event Emitters | Remove listeners in `afterEach` |

**Warning:** If you see `"A worker process has failed to exit gracefully..."` -> Tests have resource leaks. Use `--detectOpenHandles` to diagnose.

---

## Performance Targets for Integration Tests

| Metric | Target | Red Flag |
|---|---|---|
| Single test execution | 50-200ms | >1s (likely hitting real external API) |
| Full integration suite | <5 minutes | >10 minutes (missing cleanup or real I/O) |
| Database query per test | <50ms | >200ms (missing index or N+1 query) |

**If integration tests are slow:** Check for real external API calls (should be mocked at the HTTP client level), missing test data cleanup, or test database not being local.

---

## Codebase Examples

### Auth Middleware Integration Test

```typescript
// auth.middleware.test.ts pattern
it("should authenticate valid token from cookie", async () => {
  mockReq.cookies = { token: "valid-token" };
  (EnhancedJWTService.verifyAccessToken as jest.Mock).mockReturnValue({
    userId: "user-123",
    sessionId: "session-123",
  });
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);

  await authenticateToken(mockReq, mockRes, mockNext);

  expect(mockReq.user).toMatchObject({
    id: "user-123",
    email: "test@example.com",
    role: "user",
    permissions: expect.any(Array),
  });
  expect(mockNext).toHaveBeenCalled();
});
```

### API Route Integration Test

```typescript
// user-api-routes.test.ts pattern
it("should login and set HttpOnly cookies", async () => {
  const response = await request(createServer(app))
    .post("/api/auth/login")
    .send({ identifier: "tester1@example.com", password: "Test123!" });

  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty("user");
  expect(response.body).toHaveProperty("sessionId");
  expect(response.headers["set-cookie"]).toBeDefined();
});
```
