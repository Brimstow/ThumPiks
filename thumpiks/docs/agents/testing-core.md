# Testing Core Principles

**Load this file when:** ANY task involves tests — this is the always-loaded foundation for all testing work. Other testing files build on these principles.

---

## Test Pyramid for Thumbnail Maker

```
         ┌─────────┐
         │   E2E   │  5-10%  — Critical user flows (Playwright)
         │  10-30  │  Target: <30 min suite
        ┌┴─────────┴┐
        │Integration │  20-25% — API routes, DB, service wiring
        │  50-150    │  Target: <5 min suite
       ┌┴────────────┴┐
       │    Unit        │  60-70% — Pure functions, business logic, utils
       │   200-500+    │  Target: <10ms per test
       └────────────────┘
```

**Coverage targets by layer:**

| Layer | Target | What Counts |
|---|---|---|
| Business logic / services | 90% | All service methods, edge cases, error paths |
| API routes / controllers | 85% | Request validation, auth, status codes |
| UI components | 70% | Rendering, user interactions, not internals |
| Utility functions | 95% | Pure functions — cheap to test, high ROI |
| Overall floor | 80% | Enforced by pre-push hooks |

---

## Core Philosophy: Tests Are Contracts, Not Obstacles

Tests define the **expected behavior** of the system. When a test fails, it signals one of three things:

1. **The implementation is broken** — Fix this 95% of the time
2. **The requirements genuinely changed** — Update tests only with justification
3. **The test itself has a bug** — Rare, but possible

**Default Action:** Fix the implementation to match the test's expectations.

---

## Test Failure Resolution Protocol

### Step 1: Investigate Root Cause

Before touching ANY code, understand:

- What is the test expecting? (Read the test assertions)
- What is the implementation actually doing? (Debug or trace execution)
- Why is there a mismatch? (Logic error? Incorrect assumption? Typing issue?)

### Step 2: Classify the Failure

**Category A: Implementation Bug (FIX IMPLEMENTATION)**

- Test expectations are correct; implementation logic is wrong
- **Action:** Fix the implementation code, not the test
- Examples: wrong calculation, wrong status code, mutation instead of immutability, missing error handling, race condition

**Category B: Legitimate Requirement Change (UPDATE TEST)**

- Product requirements have evolved; API contract has intentionally changed
- **Action:** Update test AND document why in commit message
- Examples: "Changed password min length from 8 to 12 per security audit", "API now returns 204 instead of 200 for DELETE"

**Category C: Test Bug (FIX TEST)**

- Test has incorrect assertions, wrong mocking, or is flaky
- **Action:** Fix the test AND add comment explaining the fix
- Examples: mock doesn't match actual API contract, sync expectation for async code, brittle selectors

### Step 3: Apply Fix and Verify

1. Apply the appropriate fix (implementation, test, or both)
2. Run the full test suite to ensure no regressions
3. Document the change in commit message with category justification

---

## Always / Ask / Never Boundaries

### ALWAYS

- Run test suite before starting work (`npm test` or equivalent)
- Investigate root cause before modifying any code
- Fix implementation bugs, not tests (Category A)
- Run full test suite after fixes to check for regressions
- Ensure 100% passing tests before commits (per pre-push hook requirement)
- Maintain minimum 80% code coverage (enforced by pre-push hooks)
- Document requirement changes when updating tests (Category B)

### ASK / BE DELIBERATE

- When requirement changes necessitate test updates (Category B) — always explain the "why"
- When adding new tests for untested code paths
- When refactoring test structure for better maintainability
- When test suite is slow and optimization is needed
- When choosing between unit vs integration vs E2E test coverage

### NEVER

- Modify tests to make them pass without understanding root cause
- Delete failing tests to "fix" the build
- Use `skip` or `only` in committed test code (local debugging only)
- Adjust test expectations just because implementation is "different"
- Bypass test suite with `--no-verify` without explicit user permission
- Lower coverage thresholds to pass CI without justification
- Add `any` types or `@ts-ignore` to silence test-related TypeScript errors

---

## Security Testing Doctrine

Security testing is a **cross-cutting concern** — it spans unit, integration, and E2E layers. Load `testing-security.md` for full patterns and tooling.

### Core Principle: Adversarial Thinking

Functional tests verify the happy path works. Security tests verify the **adversarial path** fails safely. Every authenticated endpoint needs both:
1. A functional test proving it works for authorized users
2. A security test proving it rejects unauthorized access

### OWASP Top 10 as Baseline

All Thumbnail Maker security testing covers the [OWASP Top 10](https://owasp.org/Top10/) at minimum:

| # | Category | Test Minimum |
|---|---|---|
| A01 | Broken Access Control | IDOR + privilege escalation for every user-owned resource |
| A02 | Cryptographic Failures | No secrets in responses, strong randomness, proper hashing |
| A03 | Injection | SQL/XSS/command injection fuzzing on all input endpoints |
| A04 | Insecure Design | Rate limits enforced, business logic abuse prevented |
| A05 | Security Misconfiguration | Headers present, CORS locked down, no debug exposure |
| A06 | Vulnerable Components | `npm audit` clean, dependency scanning in CI |
| A07 | Auth Failures | Token tampering rejected, session fixation prevented |
| A08 | Software/Data Integrity | Supply-chain checks, webhook signature verification |
| A09 | Logging Failures | Audit logs fire, no sensitive data in logs |
| A10 | SSRF | Internal IP blocking on user-supplied URLs |

### When to Write Security Tests

- **New endpoint created** → Add auth bypass + IDOR test
- **New user-owned resource** → Add horizontal privilege escalation test
- **Input accepted from user** → Add injection fuzzing test
- **File upload added** → Add MIME/size/path-traversal tests
- **AI endpoint added** → Add prompt injection + rate limit test
- **Payment logic modified** → Add webhook forgery + manipulation test

### Pre-PR Security Gate

When a PR touches auth, uploads, AI, or payment code, the mandatory Pre-PR Security Checklist in `testing-security.md` must be verified before merge.

---

## TDD: Red-Green-Refactor

1. **RED** — Write a failing test that describes the desired behavior
2. **GREEN** — Write the minimal code to make the test pass
3. **REFACTOR** — Improve code quality without changing behavior (tests still pass)

**Key Insight:** If you skip to "green" without "red," you may be testing the wrong thing or not testing at all.

---

## Common Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Approach |
|---|---|---|
| "Test is wrong, let me fix it" | Assumes implementation is correct without proof | Investigate root cause first |
| `test.skip()` in committed code | Hides failures, creates false confidence | Fix or delete the test |
| Lowering coverage threshold | Masks untested code | Write tests for uncovered paths |
| Mocking everything | Tests become meaningless | Mock only external dependencies |
| Testing after coding | Miss design issues early | Write tests first (TDD) |
| Flaky tests tolerated | Erodes trust in test suite | Fix flakiness or delete test |
| `--forceExit` in Jest | Masks resource leaks | Fix the leak, use `--detectOpenHandles` |

---

## Pre-Push Hook Integration

Thumbnail Maker enforces quality gates via pre-push hooks:

1. **Full test suite execution** — All tests must pass
2. **Coverage reporting** — Minimum 80% coverage required
3. **Strict TypeScript checking** — No type drift allowed
4. **Integration test validation** — E2E flows must work

**If pre-push fails:**

- Do NOT use `--no-verify` without investigating
- Fix the failing tests using the failure resolution protocol
- If legitimate requirement change, update tests with documentation
- Only bypass hooks with explicit user permission (and document why)

---

## Test Suite Commands

| Scope | Command | Location |
|---|---|---|
| Frontend tests | `npm test` | `thumpiks/client/` |
| Backend tests | `npm run test:backend` | `thumpiks/` |
| E2E tests | Playwright MCP or `npx playwright test` | `thumpiks/tests/e2e/` |
| Coverage report | `coverage/lcov-report/index.html` | Generated after test run |
| Pre-push config | `.husky/pre-push` | Workspace root |
