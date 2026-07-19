# Testing Conventions

**This file is a hub.** For detailed testing conventions, load the appropriate file below based on your task. For general testing philosophy and failure resolution, always load `testing-core.md`.

---

## Conditional Loading

```
IF (task involves ANY testing):
    -> Load docs/agents/testing-core.md (always — philosophy, failure protocol, anti-patterns)

IF (task involves unit tests, mocks, Jest hoisting, DI):
    -> ALSO load docs/agents/testing-unit.md

IF (task involves integration tests, API routes, DB, resource cleanup):
    -> ALSO load docs/agents/testing-integration.md

IF (task involves E2E tests, Playwright, browser testing):
    -> ALSO load docs/agents/testing-e2e.md
    -> ALSO load docs/agents/test-credentials.md (for login credentials)

IF (task involves security tests, OWASP, auth bypass, injection, IDOR, penetration testing, security tooling):
    -> ALSO load docs/agents/testing-security.md
    -> ALSO load docs/agents/test-credentials.md (for multi-user IDOR testing)
```

---

## Quick Reference

| File | Content | Load When |
|---|---|---|
| `testing-core.md` | Test pyramid, failure protocol, TDD, anti-patterns, pre-push hooks | Any testing task |
| `testing-unit.md` | Jest hoisting, mock strategy, DI, templates, naming | Unit tests, mocks |
| `testing-integration.md` | API routes, DB tests, auth cookies, resource cleanup, leak debugging | Integration tests |
| `testing-e2e.md` | Playwright, critical flows, login pattern, selectors, auto-infer | E2E tests |
| `testing-security.md` | OWASP Top 10 patterns, IDOR, injection, auth bypass, AI security, file upload, pre-PR checklist | Security tests, penetration testing |
| `test-credentials.md` | All seed.ts test accounts | Logging in for testing |