# Testing Core Principles

**Load this file when:** ANY task involves tests — this is the always-loaded foundation for all testing work. Other testing files build on these principles.

---

## Test Pyramid for [PROJECT_NAME]

```
         ┌─────────┐
         │   E2E   │  5-10%  — Critical user flows ([E2E_TOOL])
         │  [N1]   │  Target: <30 min suite
        ┌┴─────────┴┐
        │Integration │  20-25% — API routes, DB, service wiring
        │  [N2]      │  Target: <5 min suite
       ┌┴────────────┴┐
       │    Unit        │  60-70% — Pure functions, business logic, utils
       │   [N3]        │  Target: <10ms per test
       └────────────────┘
```

<!-- Adjust [N1], [N2], [N3] to your project's target test counts. Example: 10-30, 50-150, 200-500+ -->

**Coverage targets by layer:**

| Layer | Target | What Counts |
|---|---|---|
| Business logic / services | 90% | All service methods, edge cases, error paths |
| API routes / controllers | 85% | Request validation, auth, status codes |
| UI components | 70% | Rendering, user interactions, not internals |
| Utility functions | 95% | Pure functions — cheap to test, high ROI |
| Overall floor | [COVERAGE_FLOOR]% | Enforced by pre-push hooks |

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

- Run test suite before starting work (`[TEST_COMMAND]` or equivalent)
- Investigate root cause before modifying any code
- Fix implementation bugs, not tests (Category A)
- Run full test suite after fixes to check for regressions
- Ensure 100% passing tests before commits (per pre-push hook requirement)
- Maintain minimum [COVERAGE_FLOOR]% code coverage (enforced by pre-push hooks)
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
- Add untyped values or type-ignores to silence test-related type errors

---

## Retroactive Testing (Adding Tests to Existing Code)

**When:** The app was built first, and tests are being added retroactively. This is not TDD — it's inspection-driven coverage.

### Core Principles

- **Test what exists.** Do not redesign the app. Do not invent hypothetical features.
- **Small refactors only** — allowed only when needed to make existing behavior testable.
- **Use the project's existing test tools** if they exist. If not, add a practical setup.

### Step 1: Map the Current App

Before writing any test, understand what's already there:

- Frameworks and platforms
- Routing / navigation
- Auth / session behavior
- Main user workflows
- API / client modules
- Validation / business rules
- Existing test setup (if any)

### Step 2: Add E2E / Smoke Coverage for User Flows

Cover the paths users actually take through the app:

| Flow Category | Examples |
|---|---|
| Launch / landing | Homepage loads, redirect logic |
| Auth flows | Signup, login, logout, password reset, email verification |
| Onboarding | Profile setup, first-run experience |
| Main authenticated screen | Dashboard, primary workspace |
| Navigation | Primary nav paths, deep links |
| CRUD flows | Create, edit, delete resources |
| Upload flows | File upload, image processing |
| Search / filter | Search, sort, filter results |
| Settings / account | Preferences, account management |
| Protected routes | Route guards, unauthorized redirects |
| Session persistence | Reload preserves session, token refresh |
| Edge states | Loading, empty, and error states |

### Step 3: Add Unit Tests for Flow Logic

Unit-test the logic those user flows depend on:

- Validators and form validation
- Route guards and auth routing
- API mappers and data transformers
- State reducers and hooks
- Permissions and role checks
- Formatting helpers
- Upload / file helpers
- Business rules and domain logic

### Step 4: Apply Failure Protocol

When retroactive tests fail, use the standard Cat A/B/C protocol:

- **Category A (implementation bug):** This is the *point* of retroactive testing. Fix the code, not the test.
- **Category B (requirement changed):** Update test with documented justification.
- **Category C (test bug):** Fix the test only if the test itself is wrong.

**Default:** When in doubt, it's Cat A. The test found a real bug.

### Step 5: Respect the Pyramid

Follow the test pyramid when deciding coverage layer:

| What | Layer | Why |
|---|---|---|
| Validators, guards, mappers, reducers, helpers, business rules | **Unit (60-70%)** | Pure logic — fast, cheap, high ROI |
| API routes, DB wiring, auth cookies, service integration | **Integration (20-25%)** | Cross-component correctness |
| Signup, login, primary workflow | **E2E (5-10%)** | Critical paths only — expensive |

### Step 6: Report Results

When retroactive testing is complete, report:

1. **What user paths are now covered** (and which layer covers each)
2. **Test files added** (with paths)
3. **Commands added** (package.json scripts, etc.)
4. **Test results** (passing/failing, with failure categories)
5. **Remaining gaps** (uncovered flows, missing unit tests)
6. **Coverage metrics** (current % vs `[COVERAGE_FLOOR]%` floor)

---

## Security Testing Doctrine

Security testing is a **cross-cutting concern** — it spans unit, integration, and E2E layers. Load `testing-security.md` for full patterns and tooling.

### Core Principle: Adversarial Thinking

Functional tests verify the happy path works. Security tests verify the **adversarial path** fails safely. Every authenticated endpoint needs both:
1. A functional test proving it works for authorized users
2. A security test proving it rejects unauthorized access

### OWASP Top 10 as Baseline

All projects must cover the [OWASP Top 10](https://owasp.org/Top10/) at minimum:

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

**Note:** Retroactive testing (above) is a different workflow — you write tests for *existing* behavior, not new behavior. TDD applies when adding *new* features.

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
| `--forceExit` in [TEST_RUNNER] | Masks resource leaks | Fix the leak, use detection flags |

---

## Pre-Push Hook Integration

[PROJECT_NAME] enforces quality gates via pre-push hooks:

1. **Full test suite execution** — All tests must pass
2. **Coverage reporting** — Minimum [COVERAGE_FLOOR]% coverage required
3. **[TYPE_CHECKER] checking** — No type drift allowed
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
| [FRONTEND_DIR] tests | `[FRONTEND_TEST_CMD]` | `[FRONTEND_DIR]/` |
| [BACKEND_DIR] tests | `[BACKEND_TEST_CMD]` | `[BACKEND_DIR]/` |
| E2E tests | `[E2E_TEST_CMD]` | `[E2E_DIR]/` |
| Coverage report | `[COVERAGE_REPORT_PATH]` | Generated after test run |
| Pre-push config | `.husky/pre-push` | Workspace root |
