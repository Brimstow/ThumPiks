# Authentication Patterns

**Load this file when:** Working on login, sessions, tokens, admin auth, password reset, email verification, or any auth-related feature.

---

## Architecture Overview

```
Browser                    Backend
  |                          |
  | POST /api/auth/login    |
  |------------------------->|
  |                          | auth.service.login()
  |                          | -> EnhancedJWTService.createTokens()
  |                          | -> SessionCoordinator.storeSession()
  |                          |
  | Set-Cookie: token        |
  | Set-Cookie: refreshToken |
  |<-------------------------|
  |                          |
  | GET /api/thumbnails      |
  | Cookie: token            |
  |------------------------->|
  |                          | authenticateToken middleware
  |                          | -> EnhancedJWTService.verifyAccessToken()
  |                          | -> prisma.user.findUnique()
  |                          | -> attach SecureUser to req
  |<-------------------------|
```

---

## Token Strategy

### Dual-Token System

| Token | Storage | Lifetime | Purpose |
|---|---|---|---|
| Access token | HttpOnly cookie (`token`) | 15 minutes | Authenticate API requests |
| Refresh token | HttpOnly cookie (`refreshToken`) | 7 days | Renew access tokens |

### Cookie Configuration

```typescript
const cookieOptions = {
  httpOnly: true,                              // No JS access (XSS protection)
  secure: isProductionLike(),                  // HTTPS only in production
  sameSite: isProductionLike() ? 'lax' : 'strict',  // CSRF protection
};
```

**Why sameSite=lax in production:** Netlify proxies API requests to Railway, so the browser sees same-origin. `lax` also blocks cross-site POST (CSRF protection) while allowing top-level navigations.

### Token Flow

1. **Login/Register:** Controller calls `authService.login()` / `authService.register()`
2. **Service returns:** `{ accessToken, refreshToken, user, sessionId }`
3. **Controller sets:** Both tokens as HttpOnly cookies, returns `user` + `sessionId` in body (NOT tokens)
4. **Subsequent requests:** `authenticateToken` middleware reads cookie first, falls back to `Authorization` header
5. **Token refresh:** `POST /api/auth/refresh` reads `refreshToken` cookie, issues new pair
6. **Logout:** Both cookies cleared via `res.clearCookie()`

---

## Middleware Chain

### `authenticateToken` (User Auth)

1. Read token from `req.cookies.token`, fallback to `Authorization: Bearer <token>`
2. Verify via `EnhancedJWTService.verifyAccessToken(token)`
3. Look up user in DB (`prisma.user.findUnique`)
4. If `REQUIRE_EMAIL_VERIFICATION=true`, check `user.isVerified`
5. Attach `SecureUser` to `req.user` with: `id`, `email`, `name`, `role`, `permissions`, `sessionId`, `lastActivity`
6. Log successful auth for security monitoring

### `authenticateRefreshToken` (Token Refresh)

1. Read refresh token from `req.cookies.refreshToken`, fallback to `req.body.refreshToken`
2. Verify via `EnhancedJWTService.verifyRefreshToken(refreshToken)`
3. Look up user in DB
4. Attach `SecureUser` to `req.user`

### `requireFeature` (Feature Gating)

Checks if the authenticated user's subscription tier includes a specific feature.

### Security Middleware

- `securityLogger` — Detects injection attempts (eval, document.cookie), logs auth attempts
- `rateLimiter` — Applied to auth routes to prevent brute-force

---

## Session Coordination

`SessionCoordinator` (in `session-coordination.middleware.ts`) persists sessions across server restarts:

- **Primary storage:** Redis (`REDIS_URL`)
- **Fallback:** Filesystem (`temp/sessions/`)
- Tracks: `userId`, `userType` (admin/user), `permissions`, `loginTime`, `lastActivity`, `sessionId`
- `createSessionToken()` helper: creates JWT + stores session data in Redis

---

## Admin Auth (Separate System)

Admin auth is independent from user auth:

| Aspect | User Auth | Admin Auth |
|---|---|---|
| Cookie name | `token` / `refreshToken` | `admin_token` |
| sameSite | lax (prod) / strict (dev) | strict (always) |
| Auth service | `auth.service.ts` | `admin-auth.controller.ts` / `adminAuthService` |
| Roles | `user` (default) | `roles[]` + `permissions[]` from admin record |
| Audit | General logging | `adminAuthService.logAdminAction()` |
| Feature gate | `requireFeature` | Admin-specific middleware |

**Rule:** Never reuse user auth cookies for admin endpoints. Admin sessions always use `sameSite: strict`.

---

## Email Verification

- On registration, `auth.service.register()` creates a `verificationToken` and sends email via `EmailService.sendVerificationEmail()`
- Email failure does NOT block registration (logged as warning)
- `GET /api/auth/verify-email/:token` confirms the token
- `REQUIRE_EMAIL_VERIFICATION=true` (env var) controls whether unverified users are blocked from API access

---

## Password Reset Flow

1. `POST /api/auth/request-password-reset` — validates email, sends reset token via email
2. `POST /api/auth/reset-password` — validates reset token, updates password hash
3. Reset tokens are single-use and expire

---

## Demo Mode

When `DEMO_MODE=true`:
- Test credentials (`test@example.com` / `Test123!`) are accepted
- If test user doesn't exist, it's auto-created and auto-verified
- All demo logins are logged with `🎭` prefix
- **Never enable in production.** This is for demos and staging only.

---

## Security Checklist for Auth Changes

- [ ] Tokens never appear in response body (only in HttpOnly cookies)
- [ ] `sameSite` cookie attribute is set (lax or strict)
- [ ] `secure: true` in production (HTTPS only)
- [ ] No `Authorization: Bearer` token in URLs or logs
- [ ] Rate limiting applied to login/register/reset endpoints
- [ ] User lookup always follows token verification (not before)
- [ ] Admin and user auth paths are fully isolated
- [ ] Session data is persisted in Redis (survives restart)
- [ ] New auth routes are covered in tests (see `auth.middleware.test.ts`, `user-api-routes.test.ts`)

---

## Key Files

| File | Purpose |
|---|---|
| `src/modules/auth/auth.controller.ts` | Login, register, logout, refresh, verify-email, password reset |
| `src/modules/auth/auth.service.ts` | Auth business logic, demo mode, token creation |
| `src/services/jwt.enhanced.service.ts` | Access/refresh token creation and verification |
| `src/services/jwt.service.ts` | Legacy JWT helper (used by session coordinator) |
| `src/middleware/auth.middleware.ts` | `authenticateToken`, `authenticateRefreshToken`, `requireFeature` |
| `src/middleware/session-coordination.middleware.ts` | Redis/file session persistence across restarts |
| `src/modules/admin/admin-auth.controller.ts` | Admin login/logout, admin token in `admin_token` cookie |
| `src/middleware/__tests__/auth.middleware.test.ts` | Auth middleware unit tests |
| `src/__tests__/user-api-routes.test.ts` | Integration tests for auth routes |
