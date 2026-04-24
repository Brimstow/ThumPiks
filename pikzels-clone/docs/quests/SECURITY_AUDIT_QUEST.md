# Vibe Coding Remediation Quest: Complete Audit

**Priority:** P0 -- Comprehensive  
**Scope:** 18 findings across security, code quality, and architecture  
**Created:** 2026-05-15  
**Reference:** `scripts/security-scan.js`, `scripts/run-security-tests.js`, OWASP Top 10 2021, CWE/MITRE  
**Pre-audit grade:** B+ (85/100) -- target A (95+) post-remediation  
**Complements:** Phase 1-4 quests (no duplication -- only net-new findings)

---

## How to Use This Quest

> **IMPORTANT: Before starting any specification or coding work on these findings, read `AGENTS.md` (project root).** It contains context enhancement triggers, behavioral guidelines (model gate, three reflexes), verification stacks, and on-demand loading rules for `docs/agents/` files. Key triggers for this quest: security testing (`testing-security.md`), server lifecycle (`server-lifecycle.md`), paradigm boundaries (`modular-design.md`), and Prisma safety (`prisma-safety.md`).

Each finding is a self-contained task. Work through them in order (CRITICAL first). For each:

1. Read the **Root Cause** to understand the problem
2. Follow the **Remediation Steps** with exact file locations and code changes
3. Use the **Verification Checklist** to confirm the fix
4. Check off the task when all verification steps pass

**What this covers that Phase 1-4 quests do NOT:**
- Security vulnerabilities missed by the existing scanners
- AI-generated code quality issues (monolithic files, `any` types, dead patterns)
- Architectural inconsistencies typical of vibe-coded projects
- Frontend code hygiene (console.log, accessibility, incomplete features)

---

## Finding Index

### Part A: Security Vulnerabilities

| # | Severity | Title | File(s) | CWE |
|---|----------|-------|---------|-----|
| 1 | CRITICAL | JWT Fallback Secrets Without Production Guard | `src/services/jwt.enhanced.service.ts` | CWE-321 |
| 2 | CRITICAL | CSP Allows `unsafe-inline` and `unsafe-eval` | `src/middleware/security.middleware.ts` | CWE-79 |
| 3 | HIGH | Dual JWT Service Inconsistency | `jwt.service.ts` vs `jwt.enhanced.service.ts` | CWE-1188 |
| 4 | HIGH | X-Powered-By Header Race Condition | `src/middleware/security.middleware.ts` | CWE-200 |
| 5 | HIGH | Duplicate `zod` & Misplaced Dev Dependencies | `package.json` | CWE-1104 |
| 6 | MEDIUM | Regex-Based Input Sanitization Bypass | `src/middleware/security.middleware.ts` | CWE-79 |
| 7 | MEDIUM | Rate Limiter Fails Open on Errors | `src/middleware/security.middleware.ts` | CWE-636 |
| 8 | MEDIUM | No CSRF Protection for State-Changing Ops | `src/server.ts` | CWE-352 |
| 9 | LOW | PII Exposure in Security Logs | `src/middleware/security.middleware.ts` | CWE-532 |

### Part B: Vibe Coding -- Code Quality & Architecture

| # | Severity | Title | Scope |
|---|----------|-------|-------|
| 10 | HIGH | Monolithic Backend Files (19 files >500 lines) | `src/modules/` |
| 11 | HIGH | Monolithic Frontend Components (14 files >300 lines) | `client/src/components/` |
| 12 | HIGH | `console.log` Instead of Structured Logger (80+ files) | Backend + Frontend |
| 13 | HIGH | TypeScript `any` Type Erosion (130+ instances) | Backend + Frontend |
| 14 | MEDIUM | Duplicate OAuth Callback Patterns | `src/modules/auth/auth.routes.ts` |
| 15 | MEDIUM | 21 Unresolved TODO Comments (Incomplete Features) | Backend + Frontend |
| 16 | MEDIUM | Localhost URL Fallbacks in Production Code | 31 instances across `src/` |
| 17 | LOW | Frontend Accessibility Gaps | `client/src/components/` |
| 18 | LOW | Repeated Auth Guard Boilerplate in Controllers | `src/modules/*/` |

---

## Part A: Security Vulnerabilities

---

### Finding 1: JWT Fallback Secrets Without Production Guard

**Severity:** CRITICAL  
**CWE:** [CWE-321](https://cwe.mitre.org/data/definitions/321.html) -- Hard-coded Cryptographic Key  
**OWASP:** A02:2021 -- Cryptographic Failures  
**File:** `src/services/jwt.enhanced.service.ts`, lines 14-20  
**Actively used by:** `src/middleware/auth.middleware.ts`, line 3

#### Root Cause

`EnhancedJWTService` (the service actually used by `auth.middleware.ts`) silently falls back to hardcoded secrets:

```typescript
// src/services/jwt.enhanced.service.ts:14-20 (CURRENT - VULNERABLE)
private static getJwtSecret(): string {
  return process.env.JWT_SECRET ?? 'your-secret-key';
}
private static getRefreshSecret(): string {
  return process.env.REFRESH_TOKEN_SECRET ?? 'your-refresh-secret';
}
```

If env vars are unset (misconfigured deployment, Railway env var deletion), the app uses predictable secrets visible in source code. Any attacker can forge valid JWTs.

**Real-world precedent:** CVE-2024-36527 (FUXA), CVE-2025-26319 (Flowise), CVE-2025-24862 (NocoBase) -- all CVSS 9.8.

The sibling file `src/services/jwt.service.ts` (lines 10-21) has the correct pattern with a production guard, but `auth.middleware.ts` imports the unsafe one.

#### Remediation Steps

**Step 1:** Add production guard to `jwt.enhanced.service.ts`:

```typescript
// REPLACE lines 14-20 with:
import { isProductionLike } from '../utils/env';

private static getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'your-secret-key') {
    if (isProductionLike()) {
      logger.error('CRITICAL: JWT_SECRET not set in production environment');
      throw new Error('JWT_SECRET must be set in production/staging');
    }
    logger.warn('Using default JWT secret - not suitable for production');
    return 'your-secret-key';
  }
  return secret;
}

private static getRefreshSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET;
  if (!secret || secret === 'your-refresh-secret') {
    if (isProductionLike()) {
      logger.error('CRITICAL: REFRESH_TOKEN_SECRET not set in production environment');
      throw new Error('REFRESH_TOKEN_SECRET must be set in production/staging');
    }
    logger.warn('Using default refresh secret - not suitable for production');
    return 'your-refresh-secret';
  }
  return secret;
}
```

**Step 2:** Add startup validation in `src/server.ts` (before route registration):

```typescript
if (isProductionLike()) {
  const requiredSecrets = ['JWT_SECRET', 'REFRESH_TOKEN_SECRET', 'ENCRYPTION_KEY'];
  const missing = requiredSecrets.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required secrets in production: ${missing.join(', ')}`);
  }
}
```

#### Verification Checklist

- [ ] No bare `?? 'your-secret-key'` without production guard
- [ ] App throws on startup in production when `JWT_SECRET` missing
- [ ] App starts normally in development with default secrets
- [ ] `npx jest src/__tests__/security/auth.security.test.ts` passes
- [ ] `npx jest src/__tests__/security/config-audit.security.test.ts` passes
- [ ] `npm run security:scan` shows no hardcoded secret findings

**Before:** Silent fallback to predictable secret in any environment  
**After:** Throws in production/staging; fallback only in local dev

---

### Finding 2: CSP Allows `unsafe-inline` and `unsafe-eval`

**Severity:** CRITICAL  
**CWE:** [CWE-79](https://cwe.mitre.org/data/definitions/79.html) -- XSS  
**OWASP:** A03:2021 -- Injection  
**File:** `src/middleware/security.middleware.ts`, lines 8-37  
**Note:** Phase 1 Task 2 removed `unsafe-eval` but it may have been re-added. Verify current state.

#### Root Cause

```typescript
// security.middleware.ts:13
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https:'],
styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'data:', 'blob:'],
```

- `'unsafe-eval'` permits `eval()`, `Function()` -- direct XSS escalation
- `'unsafe-inline'` permits inline `<script>` -- defeats CSP entirely

#### Remediation Steps

**Phase A (immediate):** Remove `unsafe-eval`:

```typescript
scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
```

Test all frontend features. If something breaks, identify the specific dependency needing `eval()`.

**Phase B (follow-up):** Migrate to nonce-based CSP:

```typescript
import crypto from 'crypto';

export const securityHeaders = (req: any, res: any, next: any) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", `'nonce-${nonce}'`, 'https:'],
        styleSrc: ["'self'", `'nonce-${nonce}'`, 'https:', 'data:', 'blob:'],
        // ... rest of directives
      },
    },
    // ... rest of config
  })(req, res, next);
};
```

#### Verification Checklist

**Phase A:**
- [ ] `'unsafe-eval'` removed from `scriptSrc`
- [ ] Frontend loads without CSP errors breaking functionality
- [ ] Canvas/editor and AI generation still work
- [ ] `npm run test` passes

**Phase B (follow-up):**
- [ ] `'unsafe-inline'` replaced with nonce
- [ ] Each response has unique nonce in CSP header

**Before:** CSP allows `eval()` and inline scripts  
**After:** (A) `eval()` blocked; (B) Only nonced scripts execute

---

### Finding 3: Dual JWT Service Inconsistency

**Severity:** HIGH  
**CWE:** [CWE-1188](https://cwe.mitre.org/data/definitions/1188.html)  
**Files:** `src/services/jwt.service.ts` (540 lines, safe) vs `src/services/jwt.enhanced.service.ts` (89 lines, unsafe)

#### Root Cause

| Feature | `jwt.service.ts` | `jwt.enhanced.service.ts` |
|---------|-------------------|---------------------------|
| Production guard | Throws in prod | Silent fallback |
| Refresh token rotation | DB-stored hashed tokens | Simple sign/verify |
| Issuer/audience claims | Yes | None |
| **Used by auth middleware** | **No** | **Yes** |

Classic AI code generation artifact: "enhanced" service created with fewer safety features than the original.

#### Remediation Steps

**Recommended:** Consolidate into one service. Merge production guards + issuer/audience from `jwt.service.ts` into the class-based API of `jwt.enhanced.service.ts`. Delete the unused file. Update `auth.middleware.ts` import.

**Quick fix:** Completing Finding 1 mitigates the immediate risk. Full consolidation should follow.

#### Verification Checklist

- [ ] Only one JWT service file, or both have production guards
- [ ] `auth.middleware.ts` imports from the guarded service
- [ ] Tokens include `issuer` and `audience` claims
- [ ] `npx jest src/__tests__/security/auth.security.test.ts` passes
- [ ] `npx jest src/__tests__/security/security-integration.test.ts` passes

---

### Finding 4: X-Powered-By Header Race Condition

**Severity:** HIGH  
**CWE:** [CWE-200](https://cwe.mitre.org/data/definitions/200.html)  
**File:** `src/middleware/security.middleware.ts`, lines 415-424

#### Root Cause

```typescript
export const apiVersioning = (_req: any, res: any, next: any) => {
  res.set('X-API-Version', '1.0.0');
  res.set('X-Powered-By', 'Thumbnail Maker Studio');  // Sets it...
  res.removeHeader('X-Powered-By');                    // ...then removes it
  next();
};
```

Contradictory AI-generated code. Helmet already removes `X-Powered-By`.

#### Remediation

```typescript
export const apiVersioning = (_req: any, res: any, next: any) => {
  res.set('X-API-Version', '1.0.0');
  next();
};
```

#### Verification

- [ ] Response headers don't contain `X-Powered-By` (test with `curl -I`)
- [ ] `X-API-Version` still present
- [ ] `npx jest src/__tests__/security/cors-headers.security.test.ts` passes

---

### Finding 5: Duplicate `zod` & Misplaced Dev Dependencies

**Severity:** HIGH  
**CWE:** [CWE-1104](https://cwe.mitre.org/data/definitions/1104.html)  
**File:** `package.json`

#### Root Cause

1. `zod` listed twice in `dependencies` (second key silently overwrites first in JSON)
2. `prisma` and `typescript` in `dependencies` instead of `devDependencies` -- bloats production

#### Remediation

```bash
# Remove duplicate zod (keep one entry)
# Move build-only deps:
npm install --save-dev prisma typescript
```

#### Verification

- [ ] Exactly one `zod` entry in `package.json`
- [ ] `prisma` in `devDependencies`
- [ ] `typescript` in `devDependencies`
- [ ] `npm run build` succeeds
- [ ] `npm audit` clean

---

### Finding 6: Regex-Based Input Sanitization Bypass

**Severity:** MEDIUM  
**CWE:** [CWE-79](https://cwe.mitre.org/data/definitions/79.html)  
**File:** `src/middleware/security.middleware.ts`, lines 263-321

#### Root Cause

```typescript
return str
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/javascript:/gi, '')
  .replace(/on\w+\s*=/gi, '')
  .trim();
```

Known bypasses: `<img src=x onerror=alert(1)>`, `&#106;avascript:`, `<svg onload=...>`, null byte injection.

#### Remediation

Replace with `sanitize-html`:

```bash
npm install sanitize-html && npm install --save-dev @types/sanitize-html
```

```typescript
import sanitizeHtml from 'sanitize-html';

const sanitizeString = (str: string): string => {
  if (typeof str !== 'string') return str;
  return sanitizeHtml(str, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
};
```

#### Verification

- [ ] `<img src=x onerror=alert(1)>` stripped
- [ ] `&#106;avascript:` stripped
- [ ] Legitimate input (names, URLs) passes through
- [ ] `npx jest src/__tests__/security/validation.security.test.ts` passes

---

### Finding 7: Rate Limiter Fails Open on Errors

**Severity:** MEDIUM  
**CWE:** [CWE-636](https://cwe.mitre.org/data/definitions/636.html)  
**File:** `src/middleware/security.middleware.ts`, lines 134-147

#### Root Cause

All rate limiters (including auth and credit generation) silently allow requests through when Redis/memory errors occur. For billing-sensitive endpoints, this should fail closed.

#### Remediation

Add `failOpen` config option to `LimiterConfig`:

```typescript
interface LimiterConfig {
  // ... existing fields ...
  failOpen?: boolean; // true for general API, false for auth/credit
}
```

Set `failOpen: false` for `authRateLimit` and `creditGenerationRateLimit`. In the catch handler, return 503 when `failOpen` is false.

#### Verification

- [ ] `authRateLimit` blocks on limiter error
- [ ] `creditGenerationRateLimit` blocks on limiter error
- [ ] `generalRateLimit` still allows through on error
- [ ] `npx jest src/__tests__/security/rate-limiting.security.test.ts` passes

---

### Finding 8: No CSRF Protection

**Severity:** MEDIUM  
**CWE:** [CWE-352](https://cwe.mitre.org/data/definitions/352.html)  
**File:** `src/server.ts`

#### Root Cause

Cookie-based JWT auth without CSRF protection. Browser auto-attaches cookies on cross-origin requests. CORS doesn't protect against simple form submissions.

#### Remediation

**Option A:** Double-submit cookie pattern (new `src/middleware/csrf.middleware.ts`):
- Generate CSRF token, set as non-HttpOnly cookie
- Frontend reads cookie, sends in `X-CSRF-Token` header
- Middleware verifies match on POST/PUT/DELETE
- Skip for webhooks (signature-verified) and Bearer token auth

**Option B (simpler):** Ensure auth cookies use `SameSite=Strict`:

```typescript
res.cookie('token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000,
});
```

#### Verification

- [ ] Auth cookies include `SameSite=Strict` or `Lax`
- [ ] Webhook endpoints excluded from CSRF checks
- [ ] Bearer token auth still works without CSRF token

---

### Finding 9: PII Exposure in Security Logs

**Severity:** LOW  
**CWE:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html)  
**File:** `src/middleware/security.middleware.ts`, lines 350-369

#### Root Cause

Security logger logs full `req.body` (may contain passwords), `req.headers` (contains Authorization/Cookie), and `req.query` when suspicious patterns detected.

#### Remediation

Redact sensitive fields before logging:

```typescript
const safeBody = req.body ? {
  ...req.body,
  password: req.body.password ? '[REDACTED]' : undefined,
  currentPassword: req.body.currentPassword ? '[REDACTED]' : undefined,
  newPassword: req.body.newPassword ? '[REDACTED]' : undefined,
  token: req.body.token ? '[REDACTED]' : undefined,
  refreshToken: req.body.refreshToken ? '[REDACTED]' : undefined,
} : undefined;

const safeHeaders = {
  'content-type': req.headers['content-type'],
  'user-agent': req.headers['user-agent'],
  origin: req.headers.origin,
  referer: req.headers.referer,
};
```

#### Verification

- [ ] Logs don't contain password/token values
- [ ] Logs don't contain Authorization/Cookie headers
- [ ] IP, URL, method, User-Agent still logged

---

## Part B: Vibe Coding -- Code Quality & Architecture

---

### Finding 10: Monolithic Backend Files

**Severity:** HIGH  
**Impact:** Difficult to test, maintain, review. High cognitive load. Merge conflicts.  
**Scope:** 19 files exceed 500 lines

#### Research Context

AI code generation systematically produces monolithic files. Research confirms this is the #1 structural anti-pattern in vibe-coded projects:

- **DEV Community (2025):** *"Unsupervised vibe coding will often get you +1,000 lines of code per file... the AI keeps appending logic to the same file because it has the fullest context there."* [Source: "Keep AI-Generated Code Modular," dev.to]
- **DEV Community (2025):** *"Stop Vibecoding AI Monoliths"* -- as conversation context grows, the AI loses track of module boundaries and the repo becomes "spaghetti code with a bow on it." [Source: dev.to]
- **MITRIX (2025):** *"From vibe code to clean code"* -- AI accumulates logic in single files because each prompt builds on the previous output without refactoring. [Source: mitrix.io]
- **Variant Systems (2025):** Identifies "God Files" as one of "10 Anti-Patterns in AI-Generated Codebases" -- monoliths violate the Single Responsibility Principle and make change impact analysis impossible.

**Important counterpoint** -- **ThadeusB (2025):** *"Stop Splitting Your Code for AI Agents"* -- splitting a 1,000-line file into 20 micro-files is often worse. Split at **genuine domain boundaries** (3-4 cohesive files), not arbitrary line counts. Tests + type annotations + section comments may be better than over-splitting. [Source: ThadeusB blog post]

This project has a clear case: `thumbnail.controller.ts` (2,875 lines) handles 6+ distinct operations (generate, upscale, inpaint, face-swap, expand, text-gen) -- each is a genuine domain boundary.

#### Worst Offenders

| File | Lines | Issue |
|------|-------|-------|
| `src/modules/thumbnail/thumbnail.controller.ts` | **2,875** | Generate, upscale, inpaint, face-swap, expand, text-gen -- all in one file |
| `src/modules/thumbnail/openrouter-ai.service.ts` | **1,619** | Multiple providers + retry + fallback combined |
| `src/modules/thumbnail/replicate-ai.service.ts` | **1,586** | CV tasks (segment, remove-bg, upscale) bundled |
| `src/modules/analytics/analytics.service.ts` | **1,409** | Complex aggregation logic |
| `src/modules/thumbnail/ai-provider-load-balancer.ts` | **893** | Provider switching + retry |
| `src/modules/video-proxy/video-proxy.controller.ts` | **859** | YouTube proxy + frame extraction |
| `src/modules/brand-kit/brand-kit.controller.ts` | **837** | Brand generation + management |
| `src/modules/brand-kit/brand-kit.service.ts` | **748** | Brand extraction + storage |
| `src/modules/admin/system-monitoring.service.ts` | **737** | System metrics + health |
| `src/modules/project/project.service.ts` | **718** | Project CRUD + analytics |
| `src/modules/admin/analytics.service.ts` | **705** | Admin analytics queries |
| `src/modules/contact/contact.service.ts` | **686** | Contact form + email |
| `src/config/security.config.ts` | **661** | Security + CORS + rate limiting config |
| `src/modules/auth/auth.service.ts` | **653** | Auth + password reset + tokens |
| `src/modules/subscription/subscription.service.ts` | **652** | Subscription + pricing + credits |
| `src/modules/ai/ai-enhancement.service.ts` | **648** | Image enhancement tasks |
| `src/modules/admin/user-management.service.ts` | **614** | User admin CRUD |
| `src/modules/thumbnail/model-tiers.config.ts` | **594** | Model tier definitions |
| `src/modules/editor-command/tool-definitions.ts` | **545** | Tool catalog |

#### Remediation Strategy

**Split at genuine domain boundaries** (per ThadeusB counterpoint -- don't micro-split):

**Priority 1: `thumbnail.controller.ts` (2,875 lines)**

Split by operation into separate controllers (each is a distinct domain):
- `thumbnail-generate.controller.ts` -- core generation
- `thumbnail-upscale.controller.ts` -- upscaling
- `thumbnail-inpaint.controller.ts` -- inpainting
- `thumbnail-face-swap.controller.ts` -- face swap
- `thumbnail-text.controller.ts` -- AI text generation
- `thumbnail.routes.ts` -- route file delegates to appropriate controller

Each controller should be <400 lines.

**Priority 2: AI service files (1,600+ lines each)**

Split `openrouter-ai.service.ts` by capability:
- `openrouter-generate.service.ts` -- image generation
- `openrouter-edit.service.ts` -- image editing (inpaint, expand)
- `openrouter-common.ts` -- shared retry logic, error handling, config

Same pattern for `replicate-ai.service.ts`.

**Priority 3: Remaining 500+ line files**

Target <400 lines per file. Extract related logic into focused sub-services. For files near the boundary (545-660 lines), evaluate whether they have genuine split points before refactoring -- section comments and tests may suffice.

#### Verification Checklist

- [ ] `thumbnail.controller.ts` split into 5+ focused controllers
- [ ] Each new controller is <400 lines
- [ ] All existing routes still work (no URL changes)
- [ ] `npm run test` passes
- [ ] `npm run build` passes (no type errors)
- [ ] No behavior changes -- pure structural refactor

---

### Finding 11: Monolithic Frontend Components

**Severity:** HIGH  
**Impact:** Slow renders, impossible to unit test, prop management complexity  
**Scope:** 14 component files exceed 300 lines

#### Research Context

React component decomposition is one of the most-studied areas for AI-generated frontends:

- **Steve Kinney (React Performance, 2024):** *"Split along state boundaries, not arbitrary line counts."* A 500-line component where all state is cohesive may be fine; a 300-line component with 3 independent state regions should be split. [Source: frontendmasters.com]
- **Leapcell (2025):** Custom Hooks for logic reuse, child components for UI reuse. The key signal: *"when you find yourself scrolling past sections that have nothing to do with what you're editing."*
- **DEV Community (2025):** Rule of three -- extract a sub-component only when 3+ use cases exist. Premature extraction creates indirection without reuse.
- **OneUpTime (2025):** Feature-based organization over type-based. Group `QuickEdit/` as a feature folder with its sub-components, not scattered `components/Canvas.tsx`, `components/Toolbar.tsx`.
- **developerway (2025):** For large React apps, hierarchical folder structure with max 3-4 nesting levels prevents "folder maze."

#### Worst Offenders

| File | Lines | Issue |
|------|-------|-------|
| `client/src/components/dashboard/QuickEditView.tsx` | **3,613** | Should be 10+ sub-components |
| `client/src/components/editor/ThumbnailStudio.tsx` | **2,476** | Main editor -- toolbar, canvas, panels mixed |
| `client/src/components/ThumPiksLanding.tsx` | **1,958** | Landing page -- hero, features, pricing, footer |
| `client/src/components/account/AccountPage.tsx` | **1,905** | Profile, billing, subscription, settings tabs |
| `client/src/components/dashboard/AIToolsPage.tsx` | **1,828** | AI tool cards + modals + results |
| `client/src/components/editor/canvas/CanvasEngine.tsx` | **1,606** | Canvas rendering + interaction logic |
| `client/src/components/editor/panels/AIToolsPanel.tsx` | **1,563** | AI tool side panel |
| `client/src/components/dashboard/ProjectsPage.tsx` | **1,222** | Project grid + filters + modals |
| `client/src/components/dashboard/DashboardHome.tsx` | **1,012** | Dashboard widgets |
| `client/src/components/video/VideoThumbnailEditor.tsx` | **1,004** | Video frame extraction |
| `client/src/components/BatchEditor.tsx` | **984** | Batch processing UI |
| `client/src/components/dashboard/VisionToolPage.tsx` | **946** | Vision analysis tool |
| `client/src/components/dashboard/brand/BrandKitModal.tsx` | **932** | Brand kit editing modal |
| `client/src/components/preset-editor/PresetEditor.tsx` | **799** | Template preset editor |

#### Remediation Strategy

**Split along state boundaries** (per Kinney), organized as **feature folders** (per OneUpTime):

**Priority 1: `QuickEditView.tsx` (3,613 lines)**

Extract into feature folder `client/src/components/dashboard/quick-edit/`:
- `QuickEditToolbar.tsx` -- tool selection bar (own state: selected tool)
- `QuickEditCanvas.tsx` -- canvas rendering (own state: canvas objects)
- `QuickEditSidebar.tsx` -- property panel (own state: selected object props)
- `QuickEditExport.tsx` -- export options (own state: export format/quality)
- `useQuickEditState.ts` -- shared state hook (cross-cutting state)
- `QuickEditView.tsx` -- composition root (<100 lines)

**Priority 2: `ThumbnailStudio.tsx` (2,476 lines)**

Already has a `panels/` and `canvas/` directory structure. Move logic into those sub-components. The main file should be a layout shell. Extract state into `useThumbnailStudioState.ts` custom hook.

**Priority 3: `AccountPage.tsx` (1,905 lines)**

Split by tab (each tab manages independent state -- clear state boundary):
- `AccountProfile.tsx`
- `AccountBilling.tsx`
- `AccountSubscription.tsx`
- `AccountSettings.tsx`
- `AccountPage.tsx` -- tab router only

**General rule:** No component file should exceed 400 lines. If it does, look for independent state regions as split candidates (Kinney heuristic).

#### Verification Checklist

- [ ] Top 5 components split into sub-components
- [ ] No component file >400 lines
- [ ] All pages render correctly after split
- [ ] `npm run build` (client) passes
- [ ] No visual regressions (manual check or Playwright screenshot comparison)

---

### Finding 12: `console.log` Instead of Structured Logger

**Severity:** HIGH  
**Impact:** Logs bypass structured logging, no log levels, no request IDs, pollutes stdout, hard to search in Axiom  
**Scope:** 80+ files (30 backend + 51 frontend)

#### Research Context

Express.js official documentation explicitly warns against `console.log` in production:

- **Express.js Production Best Practices (Official):** *"`console.log()` and `console.error()` are synchronous when the destination is a terminal or a file, so they are not suitable for production."* Synchronous I/O blocks the event loop. [Source: expressjs.com/en/advanced/best-practice-performance.html]
- **Express.js recommends Pino** as the *"fastest and most efficient"* production logger. Pino benchmarks at ~7M ops/sec vs Winston at ~200K ops/sec -- a 35x throughput difference. [Source: getpino.io]
- **Node.js Structured Logging (2025):** Production logs should include correlation IDs (request tracing), child loggers (per-service context), and PII redaction. JSON structured output enables Axiom/Datadog queries. [Source: betterstack.com]
- **ESLint `no-console` rule:** Should be set to `"error"` for `src/` and `"warn"` for `client/src/`. Prevents regressions after cleanup. [Source: eslint.org/docs/rules/no-console]

This project already has Axiom logging (Phase 4 quest), making the `console.log` instances a gap -- log data goes to stdout instead of Axiom, creating blind spots in production observability.

#### Backend Offenders (Top 5)

| File | Count | Examples |
|------|-------|---------|
| `src/modules/thumbnail/thumbnail.controller.ts` | 10 | `console.error('[ensureBase64] Failed...')`, `console.log('[AI Service] Generated images:')` |
| `src/modules/thumbnail/openrouter-ai.service.ts` | 8 | `console.log('OpenRouter: Retry attempt...')`, `console.error('Failed to list models:')` |
| `src/modules/thumbnail/replicate-queue.service.ts` | 5+ | Retry and status logging |
| `src/modules/thumbnail/replicate-face-swap.service.ts` | 3+ | Processing status |
| Scattered across 20+ more files | 1-2 each | Error handling, debug output |

#### Frontend Offenders (Top 5)

| File | Count | Examples |
|------|-------|---------|
| `client/src/components/account/AccountPage.tsx` | 7 | Lines 808, 819, 835, 853, 862, 883, 903 |
| `client/src/components/admin/SitemapAdmin.tsx` | 5 | Lines 192, 197, 201, 210, 215 |
| `client/src/components/admin/AdminSettings.tsx` | 3 | Lines 85, 88, 92 |
| `client/src/components/admin/AdminLayout.tsx` | 1 | `console.log('Searching for:', query)` |
| Scattered across 40+ more files | 1-2 each | Data fetch errors, debug |

#### Remediation Steps

**Backend:** Replace all `console.*` with `logger.*`:

```typescript
// BEFORE:
console.log('[AI Service] Generated images:', images.length);
console.error('[ensureBase64] Failed:', err);

// AFTER:
logger.info('Generated images', { count: images.length, service: 'ai' });
logger.error('Failed to convert URL to base64', { error: err.message });
```

**Frontend:** Either remove console statements or gate behind environment:

```typescript
// BEFORE:
console.error('Error loading analytics:', error);

// AFTER (Option A - remove):
// Just handle the error in UI state, don't log

// AFTER (Option B - gate):
if (import.meta.env.DEV) {
  console.error('Error loading analytics:', error);
}
```

**Enforcement:** Add ESLint rule to prevent regressions:

```json
// .eslintrc.json (backend)
"no-console": "error"

// .eslintrc.json (client) -- allow in dev-gated blocks
"no-console": ["warn", { "allow": ["warn"] }]
```

#### Verification Checklist

- [ ] Zero `console.log` in `src/` (backend) -- use `logger` only
- [ ] Zero `console.error` in `src/` (backend) -- use `logger.error` only
- [ ] Frontend `console.*` either removed or gated behind `import.meta.env.DEV`
- [ ] Structured logs include context (service name, operation, relevant IDs)
- [ ] ESLint `no-console` rule added and `npm run lint` passes

---

### Finding 13: TypeScript `any` Type Erosion

**Severity:** HIGH  
**Impact:** No type safety for API responses, event payloads, error objects. Refactoring becomes risky. IDE autocomplete broken.  
**Scope:** 130+ instances across 80+ backend files and 34+ frontend instances

#### Research Context

Academic research quantifies this as the signature defect of AI-generated TypeScript:

- **ArXiv 2602.17955 (2025):** *"AI agents are 9x more prone to use the `any` keyword"* compared to human developers. Despite this, *"Agentic PRs have 1.8x higher acceptance rates"* -- the debt accumulates silently because reviewers trust AI output. [Source: arxiv.org/abs/2602.17955]
- **CodeScene (2025):** AI-generated code has *1.7x more defects* than human-written code, with type safety bypass being a primary contributor. [Source: codescene.com]
- **Antigravity Lab (2025):** AI tools are *"optimized for working code, not correct code"* -- `any` is the fastest way to silence a TypeScript error. The AI uses `any` to unblock itself rather than defining proper types.
- **CI/CD Quality Gates (2025):** `tsc --noEmit` catches ~40% of AI-introduced type bugs. `@typescript-eslint/no-explicit-any` should be `"error"`, not `"warn"`. [Source: typescript-eslint.io]
- **RuleSync TypeScript Rules (2025):** Replace `any` with `unknown` + type guards for external data. Use Zod for runtime validation at API boundaries. Enable `noUncheckedIndexedAccess` in `tsconfig.json`.

#### Backend Top Offenders

| File | `any` Count | Context |
|------|-------------|---------|
| `src/modules/thumbnail/openrouter-ai.service.ts` | 21 | API responses, error objects |
| `src/modules/thumbnail/thumbnail.controller.ts` | 9 | Constructor params, event deps |
| `src/modules/analytics/analytics.service.ts` | 7 | Event payloads, aggregation |
| `src/modules/project/project.service.ts` | 5 | Metadata, filter objects |
| `src/middleware/security.middleware.ts` | 15+ | All middleware params use `any` |

#### Frontend Top Offenders

| File | `any` Count | Context |
|------|-------------|---------|
| `client/src/components/editor/canvas/CanvasEngine.tsx` | 12+ | Layer rendering, canvas ops |
| `client/src/components/AnimatedBackground.tsx` | 8 | Animation refs |
| `client/src/components/admin/*.tsx` | 15+ | API response data |

#### Remediation Strategy

**Priority 1: Security middleware** (`security.middleware.ts`)

Replace `(req: any, res: any, next: any)` with Express types:

```typescript
import { Request, Response, NextFunction } from 'express';

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  // ...
};
```

**Priority 2: API response types**

Create interfaces for external API responses (use `unknown` + type guards per RuleSync):

```typescript
// src/modules/thumbnail/types/openrouter.types.ts
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: { content: string };
  }>;
  usage?: { total_tokens: number };
}

interface OpenRouterError {
  error: { message: string; code: string };
}

// Runtime validation at API boundary (per RuleSync):
function isOpenRouterResponse(data: unknown): data is OpenRouterResponse {
  return typeof data === 'object' && data !== null && 'choices' in data;
}
```

**Priority 3: Frontend -- replace `as any` with proper types**

For `CanvasEngine.tsx`, define layer types:

```typescript
interface CanvasLayer {
  id: string;
  type: 'image' | 'text' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  // ...
}
```

**Enforcement:** Add CI gate to prevent regression:

```json
// tsconfig.json
"noUncheckedIndexedAccess": true

// .eslintrc.json
"@typescript-eslint/no-explicit-any": "error"
```

#### Verification Checklist

- [ ] `security.middleware.ts` uses Express types, not `any`
- [ ] API response types defined for OpenRouter, Replicate
- [ ] `CanvasEngine.tsx` has typed layers
- [ ] `@typescript-eslint/no-explicit-any` set to `"error"` in `.eslintrc`
- [ ] `noUncheckedIndexedAccess` enabled in `tsconfig.json`
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run lint` passes

---

### Finding 14: Duplicate OAuth Callback Patterns

**Severity:** MEDIUM  
**Impact:** 8 nearly identical code blocks. Changing callback logic requires editing all 8. Bug fixes easily missed.  
**File:** `src/modules/auth/auth.routes.ts`, lines 226-380

#### Research Context

Code duplication is a hallmark of AI-generated code -- each OAuth provider was likely added in a separate prompt without referencing the existing implementations:

- **Variant Systems (2025):** "Copy-paste amplification" is one of 10 anti-patterns in AI-generated codebases. AI repeats patterns verbatim because each generation is context-independent.
- **DRY at real boundaries:** The 4 OAuth callbacks share identical token generation, cookie setting, and redirect logic. Only the provider name and Passport strategy differ. This is a genuine DRY violation, not premature abstraction.

#### Root Cause

Four OAuth providers (Google, GitHub, LinkedIn, Twitter) each have success + failure callback handlers with the same pattern:

```typescript
// Repeated 4x with minor variation:
const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
// ... token generation ...
res.redirect(`${clientUrl}/auth/callback?token=${accessToken}&...`);
```

#### Remediation

Extract a shared callback handler:

```typescript
function oauthCallbackHandler(provider: string) {
  return async (req: Request, res: Response) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
    try {
      const user = req.user;
      const tokens = EnhancedJWTService.createTokens(user.id, user.email);
      // ... set cookies, redirect ...
    } catch (error) {
      logger.error(`${provider} OAuth callback failed`, { error });
      res.redirect(`${clientUrl}/auth/callback?error=auth_failed`);
    }
  };
}

router.get('/google/callback', passport.authenticate('google', { session: false }), oauthCallbackHandler('google'));
router.get('/github/callback', passport.authenticate('github', { session: false }), oauthCallbackHandler('github'));
// etc.
```

#### Verification

- [ ] All OAuth callbacks use shared handler
- [ ] Each provider still works (test login flow)
- [ ] Error handling consistent across all providers

---

### Finding 15: 21 Unresolved TODO Comments

**Severity:** MEDIUM  
**Impact:** Incomplete features shipped to users. Dead code paths. False expectations.

#### Research Context

TODO comments in AI-generated code carry unique risks beyond traditional technical debt:

- **Aikido Security (2025):** *"TODO comments sometimes mark incomplete security implementations... attackers reviewing your code can identify exactly where defenses are missing."* In this project, `security.service.ts:180` has `TODO: Implement 2FA in database schema` -- publicly marking an unfinished security feature. [Source: aikido.dev]
- **Broken Windows Effect (2025):** Unresolved TODOs signal *"quality standards are negotiable"* to both human developers and AI agents. When the AI sees existing TODOs, it's more likely to generate new ones rather than completing features. Quality erosion becomes self-reinforcing.
- **Osedea (2025):** *"Use temporary TODOs as you work, treat them before merging."* TODOs that reach production are no longer todos -- they're bugs or missing features.
- **Technical Debt Prioritization (RIVER Framework):** Score each TODO by Risk, Impact, Visibility, Effort, Recurrence. High-visibility TODOs (user-facing broken buttons) should be prioritized over internal ones.
- **eslint-plugin-todo-plz (2025):** Enforce expiration dates on TODOs: `// TODO(2025-06-01): Complete mobile editor`. ESLint fails the build after the date passes.

#### Backend TODOs (8)

| File | TODO |
|------|------|
| `src/events/event-persistence.ts:19` | Restore automatic file cleanup functionality |
| `src/events/event-persistence.ts:308` | Restore automatic cleanup functionality |
| `src/scripts/performance-test.ts:3,12` | Use for performance testing (2 instances) |
| `src/modules/collaboration/collaboration.controller.ts:3` | Use for auth validation |
| `src/modules/security/security.service.ts:180` | Implement 2FA in database schema |
| `src/modules/storage/storage.service.ts:127` | Add Storacha as primary when credentials available |
| `src/modules/team/team.service.ts:126` | Implement when schema includes email/role fields |

#### Frontend TODOs (13)

| File | TODO |
|------|------|
| `client/src/components/dashboard/brand/BrandKitSetupWizard.tsx:188` | Import extracted brand assets |
| `client/src/components/dashboard/brand/BrandKitSetupWizard.tsx:216` | Import selected suggestion |
| `client/src/components/dashboard/TemplatesPage.tsx:65` | Navigate to editor with selected layout |
| `client/src/components/dashboard/TemplatesPage.tsx:164` | Navigate to template detail |
| `client/src/components/editor/mobile/MobileEditor.tsx:132` | Apply crop aspect ratio |
| `client/src/components/editor/mobile/MobileEditor.tsx:137` | Rotate canvas/layer 90 degrees |
| `client/src/components/editor/mobile/MobileEditor.tsx:156` | Call actual AI service |
| `client/src/components/editor/mobile/MobileEditor.tsx:196` | Generate canvas to blob |
| `client/src/components/editor/mobile/MobileEditor.tsx:202` | Generate preview image |
| `client/src/components/editor/mobile/MobileEditor.tsx:218` | Generate preview |
| `client/src/components/editor/mobile/MobileEditor.tsx:226` | Connect to actual AI command parser |
| `client/src/components/editor/ThumbnailStudio.tsx:909` | Show error toast to user |
| `client/src/components/templates/TemplateMarketplace.tsx:298` | Implement template usage |

#### Remediation

For each TODO, decide one of:
1. **Implement it** -- if the feature is needed for launch
2. **Remove the dead code** -- if the feature is deferred
3. **Gate it** -- disable the UI element so users don't encounter a no-op button

**Critical:** `MobileEditor.tsx` has 7 TODOs (lines 132-226). This entire component appears non-functional. Either complete it or remove/hide the mobile editor route.

**Security note (per Aikido):** `security.service.ts:180` advertising incomplete 2FA should be resolved first -- either implement it or remove the TODO and the partial code.

**Prevention:** Add `eslint-plugin-todo-plz` with expiration dates to prevent future TODO accumulation.

#### Verification

- [ ] Each TODO resolved (implemented, removed, or gated)
- [ ] No user-facing buttons that do nothing
- [ ] `MobileEditor.tsx` either functional or hidden
- [ ] `security.service.ts` 2FA TODO resolved
- [ ] `npm run build` passes

---

### Finding 16: Localhost URL Fallbacks in Production Code

**Severity:** MEDIUM  
**Impact:** If env vars missing in production, users see `localhost` URLs in emails, OAuth redirects, API responses  
**Scope:** 31 instances across `src/`

#### Research Context

Hardcoded localhost URLs are a documented deployment failure mode for AI-generated applications:

- **Afterbuild Labs (2025):** *"AI builders make this worse by hardcoding... `http://localhost:3000/api/`"* -- the AI generates working local code that silently breaks in production. The failure mode is insidious: the app starts fine, but users receive password reset emails pointing to `localhost:5173`. [Source: afterbuild.com]
- **reflectt-node PR #564 (2025):** Exact real-world example -- hardcoded `localhost` URL became unreachable after deploy. The fix was identical to what's needed here: environment variable with production guard. [Source: github.com/reflectt-node]
- **Express.js Security Best Practices:** CORS origins should be configurable per environment. Including `localhost` in production CORS weakens origin restrictions.

#### Three Distinct Patterns

**Pattern A: CORS/CSP origins (safe but redundant in production)**
- `src/server.ts:151` -- `const devOrigins = ['http://localhost:8556', ...]`
- `src/config/security.config.ts:63` -- `origins: ['http://localhost:8556', ...]`
- `src/middleware/security.middleware.ts:20-21` -- `connectSrc` includes localhost

**Pattern B: OAuth callback fallbacks (deployment risk)**
- `src/modules/auth/auth.routes.ts` -- 8 instances of `process.env.CLIENT_URL || 'http://localhost:8556'`

**Pattern C: Email URLs (user-visible if misconfigured)**
- `src/modules/email/email.service.ts:237,286` -- `process.env.FRONTEND_URL || 'http://localhost:5173'`
- `src/modules/credit/credit.service.ts:74` -- Fallback URL

#### Remediation

**Step 1:** For Pattern B and C, throw in production instead of falling back:

```typescript
function getRequiredUrl(envVar: string, fallback: string): string {
  const url = process.env[envVar];
  if (!url) {
    if (isProductionLike()) {
      throw new Error(`${envVar} must be set in production`);
    }
    return fallback;
  }
  return url;
}
```

**Step 2:** For Pattern A (CORS/CSP), gate localhost origins behind env check:

```typescript
connectSrc: [
  "'self'", 'https:', 'ws:', 'wss:',
  ...(process.env.NODE_ENV !== 'production' 
    ? ['http://localhost:8556', 'http://localhost:8550'] 
    : []),
],
```

#### Verification

- [ ] App throws in production when `CLIENT_URL` or `FRONTEND_URL` missing
- [ ] CORS/CSP don't include localhost in production
- [ ] OAuth redirects use correct production URL
- [ ] Password reset emails use correct URL
- [ ] Dev environment still works with localhost fallbacks

---

### Finding 17: Frontend Accessibility Gaps

**Severity:** LOW  
**Impact:** Screen reader users can't navigate. WCAG 2.2 Level A non-compliance.

#### Research Context

Accessibility is systematically ignored by AI code generation tools, which optimize for visual appearance over semantic HTML:

- **WCAG 2.2 (W3C, 2023):** Level AA compliance is the standard for commercial web applications. Key requirements: all interactive elements must be keyboard-accessible (2.1.1), have visible focus indicators (2.4.7), and convey meaning through proper semantics, not just visual styling.
- **React Aria Best Practices (Adobe, 2025):** *"Use native HTML elements first (`<button>`, `<a>`, `<input>`). Only add ARIA attributes when no native element exists for the pattern."* Adding `role="button"` to a `<div>` is a workaround, not a solution -- native `<button>` provides focus, keyboard events, and screen reader announcement for free.
- **eslint-plugin-jsx-a11y (2025):** Automated enforcement catches ~30% of accessibility violations at lint time. Rules like `click-events-have-key-events`, `no-static-element-interactions`, and `anchor-is-valid` prevent the most common AI-generated violations.
- **jest-axe (2025):** Automated CI testing with `toHaveNoViolations()` catches accessibility regressions. Run against each page/component in the test suite.

#### Issues Found

| File | Line | Issue |
|------|------|-------|
| `client/src/components/dashboard/widgets/ProjectsAndUploadsWidget.tsx` | 436 | Clickable `<div>` without `role="button"` or `aria-label` |
| `client/src/components/editor/panels/VideoFrameExtractor.tsx` | 552 | `<div onClick={togglePlayback}>` -- should be `<button>` |
| Multiple admin components | Various | Icon-only buttons use `title` instead of `aria-label` |
| Modal dialogs | Various | Missing `role="dialog"` and `aria-modal="true"` |

#### Remediation

**Prefer native HTML** (per React Aria):

```tsx
// BEFORE (div with click handler -- no keyboard support, no screen reader):
<div className="cursor-pointer" onClick={onClick}>

// AFTER (native button -- focus, keyboard, screen reader all work):
<button className="cursor-pointer" onClick={onClick} aria-label="Open project">
```

For modal overlays (acceptable pattern but add ARIA):

```tsx
<div role="dialog" aria-modal="true" aria-label="Confirm clear">
```

**Enforcement:** Add `eslint-plugin-jsx-a11y` and `jest-axe`:

```bash
npm install --save-dev eslint-plugin-jsx-a11y jest-axe @types/jest-axe
```

```json
// client/.eslintrc.json
"extends": ["plugin:jsx-a11y/recommended"]
```

#### Verification

- [ ] No `<div onClick>` without `role="button"` and `aria-label` (prefer native `<button>`)
- [ ] Modals have `role="dialog"` and `aria-modal="true"`
- [ ] Icon-only buttons have `aria-label` (not just `title`)
- [ ] Tab navigation works through all interactive elements
- [ ] `eslint-plugin-jsx-a11y` added and passing
- [ ] At least one `jest-axe` test per major page component

---

### Finding 18: Repeated Auth Guard Boilerplate

**Severity:** LOW  
**Impact:** Cluttered controllers, inconsistent error messages, easy to forget  
**Example:** `src/modules/ab-testing/ab-testing.controller.ts` -- same check repeated 8 times

#### Research Context

This pattern is a TypeScript narrowing limitation that AI code generation doesn't solve:

- **TypeScript Handbook (Microsoft):** TypeScript cannot narrow types across function boundaries. Even though `authenticateToken` middleware guarantees `req.user` is set, TypeScript's type system doesn't carry that guarantee into the next function in the Express middleware chain.
- **Express Typed Request Pattern (2025):** The standard solution is a typed request extractor function that narrows the type in a single location, or an `AuthenticatedRequest` type that makes `user` non-optional. This eliminates the redundant check while satisfying TypeScript.

#### Root Cause

```typescript
// Repeated in every route handler:
if (!req.user) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

This exists because `authenticateToken` middleware sets `req.user` but TypeScript doesn't narrow the type after middleware runs.

#### Remediation

**Option A (Recommended):** Create a typed request extractor:

```typescript
// src/utils/auth-helpers.ts
import { AuthRequest } from '../types/auth';

export function getAuthUser(req: AuthRequest) {
  if (!req.user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return req.user; // TypeScript narrows to non-null
}

// Usage in controllers:
const user = getAuthUser(req); // throws if not authenticated
```

**Option B:** If `authenticateToken` middleware is always applied before these routes (which it is), the check is redundant. Remove it and rely on middleware.

#### Verification

- [ ] Auth check either extracted to helper or removed (if middleware guarantees it)
- [ ] All protected routes still return 401 for unauthenticated requests
- [ ] `npm run test` passes

---

## Post-Remediation: Full Verification Suite

After completing all findings, run the complete verification:

```bash
# Security
npm run security:scan
npx jest src/__tests__/security/ --verbose
node scripts/run-security-tests.js
npm audit

# Code quality
npm run lint
npx tsc --noEmit

# Tests
npm test

# Build
npm run build
cd client && npm run build
```

---

## References

### Part A: Security Standards & CVEs

| Source | URL |
|--------|-----|
| CWE-321: Hard-coded Cryptographic Key | https://cwe.mitre.org/data/definitions/321.html |
| CWE-79: XSS | https://cwe.mitre.org/data/definitions/79.html |
| CWE-352: CSRF | https://cwe.mitre.org/data/definitions/352.html |
| CWE-532: Sensitive Info in Logs | https://cwe.mitre.org/data/definitions/532.html |
| CWE-636: Not Failing Securely | https://cwe.mitre.org/data/definitions/636.html |
| OWASP Top 10 2021 | https://owasp.org/Top10/ |
| OWASP CSP Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html |
| OWASP XSS Filter Evasion | https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html |
| OWASP Node.js Security Cheat Sheet | https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html |
| Helmet.js CSP Documentation | https://helmetjs.github.io/ |
| CVE-2024-36527 (FUXA hardcoded JWT) | https://nvd.nist.gov/vuln/detail/CVE-2024-36527 |
| CVE-2025-26319 (Flowise hardcoded JWT) | https://nvd.nist.gov/vuln/detail/CVE-2025-26319 |
| CVE-2025-24862 (NocoBase hardcoded JWT) | https://nvd.nist.gov/vuln/detail/CVE-2025-24862 |

### Part B: Vibe Coding Research & Industry Data

| Source | URL | Finding |
|--------|-----|---------|
| ArXiv 2602.17955 -- AI Agent Code Quality | https://arxiv.org/abs/2602.17955 | 13 |
| CodeScene -- AI Code Quality Study | https://codescene.com | 13 |
| DEV Community -- Keep AI-Generated Code Modular | https://dev.to | 10 |
| DEV Community -- Stop Vibecoding AI Monoliths | https://dev.to | 10 |
| MITRIX -- From Vibe Code to Clean Code | https://mitrix.io | 10 |
| Variant Systems -- 10 Anti-Patterns in AI Codebases | https://variantsystems.com | 10, 14 |
| ThadeusB -- Stop Splitting Code for AI Agents | https://thadeusb.com | 10 |
| Steve Kinney -- React Performance (Frontend Masters) | https://frontendmasters.com | 11 |
| Express.js -- Production Best Practices | https://expressjs.com/en/advanced/best-practice-performance.html | 12 |
| Pino -- Node.js Logger Benchmarks | https://getpino.io | 12 |
| BetterStack -- Node.js Structured Logging Guide | https://betterstack.com | 12 |
| ESLint -- no-console Rule | https://eslint.org/docs/rules/no-console | 12 |
| typescript-eslint -- no-explicit-any Rule | https://typescript-eslint.io | 13 |
| Antigravity Lab -- AI TypeScript Patterns | https://antigravity-lab.com | 13 |
| Aikido Security -- TODO Comments as Security Risk | https://aikido.dev | 15 |
| Afterbuild Labs -- AI Deployment Pitfalls | https://afterbuild.com | 16 |
| reflectt-node PR #564 -- Hardcoded Localhost Bug | https://github.com/nicolo-ribaudo/reflectt-node | 16 |
| WCAG 2.2 -- Web Content Accessibility Guidelines | https://www.w3.org/TR/WCAG22/ | 17 |
| React Aria -- Accessibility Patterns | https://react-spectrum.adobe.com/react-aria/ | 17 |
| eslint-plugin-jsx-a11y | https://github.com/jsx-eslint/eslint-plugin-jsx-a11y | 17 |
| jest-axe -- Accessibility Testing | https://github.com/nickcolley/jest-axe | 17 |

---

## Implementation Priority Order

Ordered by risk and effort. Dependencies noted.

### Tier 1: Quick Wins (low effort, high impact)
1. **Finding 1** -- JWT secret production guard (highest risk)
2. **Finding 2 Phase A** -- Remove `unsafe-eval` (single-line change)
3. **Finding 4** -- X-Powered-By cleanup (3-line fix)
4. **Finding 5** -- package.json dedup (npm commands)

### Tier 2: Security Hardening (moderate effort)
5. **Finding 9** -- Log PII redaction
6. **Finding 7** -- Rate limiter fail-closed for auth/credit
7. **Finding 3** -- JWT service consolidation (depends on #1)
8. **Finding 6** -- Sanitization library swap
9. **Finding 8** -- CSRF protection (requires frontend changes)

### Tier 3: Code Quality (larger effort, lower risk)
10. **Finding 12** -- Replace console.log with logger (mechanical)
11. **Finding 15** -- Resolve TODO comments (per-item decision)
12. **Finding 14** -- OAuth callback dedup
13. **Finding 16** -- Localhost URL hardening
14. **Finding 18** -- Auth guard extraction
15. **Finding 13** -- TypeScript `any` cleanup (ongoing, start with security middleware)

### Tier 4: Architecture (significant effort, plan carefully)
16. **Finding 10** -- Backend file splits (start with `thumbnail.controller.ts`)
17. **Finding 11** -- Frontend component splits (start with `QuickEditView.tsx`)
18. **Finding 2 Phase B** -- Nonce-based CSP (requires frontend coordination)
19. **Finding 17** -- Accessibility fixes (ongoing)
