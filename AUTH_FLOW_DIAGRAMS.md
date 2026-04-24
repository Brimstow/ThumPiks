# Authentication Flow Diagrams

Visual representation of authentication flows in the Thumbnail Maker project.

## Table of Contents
1. [Registration Flow](#registration-flow)
2. [Login Flow](#login-flow)
3. [Token Refresh Flow](#token-refresh-flow)
4. [Password Reset Flow](#password-reset-flow)
5. [OAuth Flow](#oauth-flow)
6. [Protected Route Flow](#protected-route-flow)

---

## Registration Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │  Server │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ POST /api/auth/register  │                           │
     │ { email, password }      │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Validate input            │
     │                          │ Check password strength   │
     │                          │                           │
     │                          │ Check if email exists     │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (email not found)         │
     │                          │                           │
     │                          │ Hash password (bcrypt)    │
     │                          │                           │
     │                          │ Create user record        │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (user created)            │
     │                          │                           │
     │                          │ Generate JWT tokens       │
     │                          │ - accessToken (15m)       │
     │                          │ - refreshToken (7d)       │
     │                          │                           │
     │                          │ Send welcome email        │
     │                          │ (async, non-blocking)     │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 201 Created              │                           │
     │ { user, accessToken,     │                           │
     │   refreshToken }         │                           │
     │                          │                           │
     │ Store tokens in          │                           │
     │ localStorage             │                           │
     │                          │                           │
     │ Redirect to /dashboard   │                           │
     │                          │                           │
```

### Error Cases

```
Registration Failed - User Exists:
Browser → Server: POST /register { email: "existing@example.com" }
Server → Database: Check email
Database → Server: User found
Server → Browser: 409 Conflict { error: "User already exists" }

Registration Failed - Weak Password:
Browser → Server: POST /register { password: "123" }
Server: Validate password
Server → Browser: 400 Bad Request { error: "Password must be at least 8 characters" }
```

---

## Login Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │  Server │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ POST /api/auth/login     │                           │
     │ { email, password }      │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Validate input            │
     │                          │                           │
     │                          │ Find user by email        │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (user data)               │
     │                          │                           │
     │                          │ Compare password          │
     │                          │ bcrypt.compare()          │
     │                          │                           │
     │                          │ ✓ Password valid          │
     │                          │                           │
     │                          │ Generate JWT tokens       │
     │                          │ - accessToken (15m)       │
     │                          │ - refreshToken (7d)       │
     │                          │                           │
     │                          │ Log successful login      │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 200 OK                   │                           │
     │ { user, accessToken,     │                           │
     │   refreshToken }         │                           │
     │                          │                           │
     │ Store tokens in          │                           │
     │ localStorage             │                           │
     │                          │                           │
     │ Update AuthContext       │                           │
     │ setUser(userData)        │                           │
     │                          │                           │
     │ Redirect to /dashboard   │                           │
     │                          │                           │
```

### Error Cases

```
Login Failed - Invalid Credentials:
Browser → Server: POST /login { email, password }
Server → Database: Find user
Server: bcrypt.compare() → false
Server → Browser: 401 Unauthorized { error: "Invalid credentials" }

Login Failed - User Not Found:
Browser → Server: POST /login { email: "nonexistent@example.com" }
Server → Database: Find user
Database → Server: User not found
Server → Browser: 401 Unauthorized { error: "Invalid credentials" }
(Same error to prevent email enumeration)
```

---

## Token Refresh Flow

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │  Server │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ GET /api/protected       │                           │
     │ Authorization: Bearer    │                           │
     │ {expiredAccessToken}     │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Verify JWT                │
     │                          │ ✗ Token expired           │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 401 Unauthorized         │                           │
     │ { error: "Token expired" }│                          │
     │                          │                           │
     │ [Axios Interceptor]      │                           │
     │ Detect 401 error         │                           │
     │                          │                           │
     │ POST /api/auth/refresh   │                           │
     │ { refreshToken }         │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Verify refresh token      │
     │                          │ ✓ Valid                   │
     │                          │                           │
     │                          │ Check user exists         │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (user found)              │
     │                          │                           │
     │                          │ Generate new tokens       │
     │                          │ - new accessToken         │
     │                          │ - new refreshToken        │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 200 OK                   │                           │
     │ { accessToken,           │                           │
     │   refreshToken }         │                           │
     │                          │                           │
     │ Update localStorage      │                           │
     │                          │                           │
     │ Retry original request   │                           │
     │ GET /api/protected       │                           │
     │ Authorization: Bearer    │                           │
     │ {newAccessToken}         │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ ✓ Token valid             │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 200 OK                   │                           │
     │ { data }                 │                           │
     │                          │                           │
```

---

## Password Reset Flow

### Part 1: Request Reset

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │  Server │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ User clicks              │                           │
     │ "Forgot Password"        │                           │
     │                          │                           │
     │ POST /api/auth/          │                           │
     │ request-password-reset   │                           │
     │ { email }                │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Find user by email        │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (user data)               │
     │                          │                           │
     │                          │ Generate reset token      │
     │                          │ (JWT, expires in 1 hour)  │
     │                          │                           │
     │                          │ Send email with link      │
     │                          │ https://app.com/reset?    │
     │                          │ token=xyz123              │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 200 OK                   │                           │
     │ { message: "Check email" }│                          │
     │                          │                           │
     │ Show success message     │                           │
     │                          │                           │
```

### Part 2: Reset Password

```
┌─────────┐                ┌─────────┐                ┌──────────┐
│ Browser │                │  Server │                │ Database │
└────┬────┘                └────┬────┘                └─────┬────┘
     │                          │                           │
     │ User clicks email link   │                           │
     │ GET /reset-password?     │                           │
     │ token=xyz123             │                           │
     │                          │                           │
     │ [Browser shows form]     │                           │
     │                          │                           │
     │ POST /api/auth/          │                           │
     │ reset-password           │                           │
     │ { token, newPassword }   │                           │
     ├─────────────────────────>│                           │
     │                          │                           │
     │                          │ Verify reset token        │
     │                          │ JWT.verify()              │
     │                          │ ✓ Valid & not expired     │
     │                          │                           │
     │                          │ Validate new password     │
     │                          │ (strength check)          │
     │                          │                           │
     │                          │ Hash new password         │
     │                          │ bcrypt.hash()             │
     │                          │                           │
     │                          │ Update user password      │
     │                          ├──────────────────────────>│
     │                          │                           │
     │                          │<──────────────────────────┤
     │                          │ (password updated)        │
     │                          │                           │
     │                          │ Invalidate all sessions   │
     │                          │ (security measure)        │
     │                          │                           │
     │<─────────────────────────┤                           │
     │ 200 OK                   │                           │
     │ { message: "Success" }   │                           │
     │                          │                           │
     │ Redirect to /login       │                           │
     │                          │                           │
```

---

## OAuth Flow (Google Example)

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐
│ Browser │    │  Server │    │  Google │    │ Database │
└────┬────┘    └────┬────┘    └────┬────┘    └─────┬────┘
     │              │              │               │
     │ Click        │              │               │
     │ "Sign in     │              │               │
     │ with Google" │              │               │
     │              │              │               │
     │ GET /api/auth/google        │               │
     ├────────────>│              │               │
     │              │              │               │
     │              │ Redirect to Google           │
     │<─────────────┤              │               │
     │              │              │               │
     │ https://accounts.google.com/│               │
     │ oauth2/auth?...             │               │
     ├────────────────────────────>│               │
     │              │              │               │
     │              │ [User signs in & authorizes] │
     │              │              │               │
     │              │ Redirect with auth code      │
     │<─────────────────────────────┤               │
     │              │              │               │
     │ GET /api/auth/google/        │               │
     │ callback?code=abc123        │               │
     ├────────────>│              │               │
     │              │              │               │
     │              │ Exchange code for tokens     │
     │              ├────────────>│               │
     │              │              │               │
     │              │<─────────────┤               │
     │              │ { access_token, id_token }   │
     │              │              │               │
     │              │ Get user profile             │
     │              ├────────────>│               │
     │              │              │               │
     │              │<─────────────┤               │
     │              │ { id, email, name, picture } │
     │              │              │               │
     │              │ Find or create user          │
     │              ├─────────────────────────────>│
     │              │              │               │
     │              │<──────────────────────────────┤
     │              │ (user record)                │
     │              │              │               │
     │              │ Generate JWT tokens          │
     │              │              │               │
     │              │ Redirect to frontend         │
     │<─────────────┤              │               │
     │ /auth/callback?token=xyz    │               │
     │              │              │               │
     │ Extract tokens from URL     │               │
     │ Store in localStorage       │               │
     │              │              │               │
     │ Redirect to /dashboard      │               │
     │              │              │               │
```

---

## Protected Route Flow

```
┌─────────┐                ┌─────────────┐
│ Browser │                │   Router    │
└────┬────┘                └──────┬──────┘
     │                            │
     │ Navigate to /dashboard     │
     ├───────────────────────────>│
     │                            │
     │                            │ <ProtectedRoute>
     │                            │
     │                            │ Check AuthContext
     │                            │ isAuthenticated?
     │                            │
     │                            │ ┌─ YES ────────────┐
     │                            │ │ Render children  │
     │<───────────────────────────┤ │ (Dashboard)      │
     │ Show Dashboard             │ └──────────────────┘
     │                            │
     │                            │ ┌─ NO ─────────────┐
     │                            │ │ <Navigate to     │
     │<───────────────────────────┤ │  /login>         │
     │ Redirect to Login          │ │ Save current URL │
     │                            │ │ in state         │
     │                            │ └──────────────────┘
     │                            │
```

### Detailed Auth Check

```
Protected Route Component Flow:

1. Component Mounts
   ↓
2. useAuth() hook called
   ↓
3. Check isLoading
   │
   ├─ TRUE → Show loading spinner
   │
   └─ FALSE → Continue
      ↓
4. Check isAuthenticated
   │
   ├─ TRUE → Render children (protected content)
   │
   └─ FALSE → Navigate to /login
              Save current location in state
              (for redirect after login)
```

---

## Complete User Journey

### New User Registration → First Login

```
1. Visit Landing Page
   ↓
2. Click "Sign Up"
   ↓
3. Fill Registration Form
   - Name
   - Email
   - Password
   ↓
4. Submit Form
   ↓
5. Server validates & creates user
   ↓
6. Receive JWT tokens
   ↓
7. Store in localStorage
   ↓
8. Update AuthContext (user state)
   ↓
9. Redirect to Dashboard
   ↓
10. Dashboard renders (authenticated)
```

### Returning User Flow

```
1. Visit App (Direct URL or bookmark)
   ↓
2. App loads
   ↓
3. AuthContext checks localStorage
   │
   ├─ Token found
   │  ↓
   │  Verify with server (GET /api/auth/me)
   │  │
   │  ├─ Valid → Set user state → Show Dashboard
   │  │
   │  └─ Invalid → Clear tokens → Redirect to Login
   │
   └─ No token
      ↓
      Redirect to Login
```

---

## State Management Diagram

```
┌────────────────────────────────────────────────┐
│           AuthContext State                    │
├────────────────────────────────────────────────┤
│                                                │
│  user: User | null                             │
│  isAuthenticated: boolean                      │
│  isLoading: boolean                            │
│                                                │
│  Methods:                                      │
│  - login(email, password)                      │
│  - register(email, password, name)             │
│  - logout()                                    │
│  - refreshAuth()                               │
│                                                │
└────────────────────────────────────────────────┘
                    │
                    │ Provides to
                    ↓
┌────────────────────────────────────────────────┐
│         All Child Components                   │
├────────────────────────────────────────────────┤
│                                                │
│  • Login Component                             │
│  • Register Component                          │
│  • Protected Routes                            │
│  • Navigation Bar                              │
│  • User Profile                                │
│  • Any component needing auth                  │
│                                                │
└────────────────────────────────────────────────┘
```

---

## Token Lifecycle

```
Token Generation & Usage:

Registration/Login
    ↓
Generate Tokens
├─ accessToken (15 min expiry)
│  ├─ Stored in localStorage
│  └─ Used for API requests
│
└─ refreshToken (7 day expiry)
   ├─ Stored in localStorage
   └─ Used to get new accessToken

Usage Pattern:
    ↓
API Request
    ↓
Include accessToken in header
    ↓
Server validates token
    │
    ├─ Valid → Process request
    │
    └─ Expired
        ↓
        Return 401
        ↓
        Frontend intercepts
        ↓
        Send refreshToken
        ↓
        Get new accessToken
        ↓
        Retry original request

Logout:
    ↓
Clear both tokens from localStorage
Clear user state
Redirect to login
```

---

## Security Layers

```
┌─────────────────────────────────────────┐
│         Multiple Security Layers        │
└─────────────────────────────────────────┘

Layer 1: Input Validation
├─ Email format validation
├─ Password strength requirements
└─ SQL injection prevention (Prisma ORM)

Layer 2: Authentication
├─ Password hashing (bcrypt, rounds=12)
├─ JWT token signing
└─ Token expiration enforcement

Layer 3: Authorization
├─ JWT verification on each request
├─ User role checking
└─ Resource ownership validation

Layer 4: Transport Security
├─ HTTPS only (production)
├─ Secure cookies (HttpOnly, Secure)
└─ CORS configuration

Layer 5: Rate Limiting
├─ Login attempts (5 per 15 min)
├─ Registration (5 per 15 min)
└─ Password reset (3 per hour)

Layer 6: Monitoring & Logging
├─ Failed login attempts
├─ Suspicious activities
└─ Token refresh patterns
```

---

## Error Handling Flow

```
┌─────────────────────────────────────────┐
│          Error Handling Chain           │
└─────────────────────────────────────────┘

1. Frontend Form Validation
   ├─ Empty fields → Show inline error
   ├─ Invalid format → Show inline error
   └─ Valid → Submit to server

2. Backend Validation
   ├─ Input validation → 400 Bad Request
   ├─ Business logic → 409 Conflict
   └─ Valid → Process request

3. Authentication Errors
   ├─ Invalid credentials → 401 Unauthorized
   ├─ Token expired → 401 Unauthorized
   └─ Token invalid → 401 Unauthorized

4. Authorization Errors
   ├─ Insufficient permissions → 403 Forbidden
   └─ Resource not found → 404 Not Found

5. Server Errors
   ├─ Database error → 500 Internal Error
   ├─ External service error → 503 Service Unavailable
   └─ Log error + return generic message

6. Frontend Error Display
   ├─ Toast notification
   ├─ Inline error message
   └─ Error page (for critical errors)
```

---

## Best Practices Summary

```
✓ Use HTTPS in production
✓ Store tokens securely (HttpOnly cookies in production)
✓ Implement token refresh mechanism
✓ Use short-lived access tokens (15 minutes)
✓ Hash passwords with bcrypt (12+ rounds)
✓ Validate all inputs
✓ Use parameterized queries (Prisma ORM)
✓ Implement rate limiting
✓ Log security events
✓ Use strong JWT secrets
✓ Implement CSRF protection
✓ Set proper CORS policies
✓ Sanitize error messages
✓ Implement account lockout after failed attempts
✓ Use secure session management
```

---

**For implementation details, see:**
- `SIGN_IN_INTEGRATION_GUIDE.md` - Complete integration guide
- `SIGN_IN_QUICK_START.md` - Quick setup instructions
- `pikzels-clone/src/modules/auth/` - Backend implementation
- `pikzels-clone/client/src/components/auth/` - Frontend components