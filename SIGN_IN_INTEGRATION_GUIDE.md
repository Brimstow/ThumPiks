# Sign In Integration Guide

Complete guide for implementing authentication and sign-in functionality in the Thumbnail Maker project.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Setup](#backend-setup)
4. [Frontend Components](#frontend-components)
5. [API Endpoints](#api-endpoints)
6. [OAuth Integration](#oauth-integration)
7. [Security Best Practices](#security-best-practices)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses a robust authentication system with the following features:

- **Email/Password Authentication** - Traditional login with secure password hashing
- **OAuth 2.0 Support** - Google and GitHub sign-in
- **JWT Token Authentication** - Access and refresh tokens
- **Email Verification** - Optional email confirmation flow
- **Password Reset** - Secure password recovery
- **Multi-Factor Authentication (MFA)** - Additional security layer

### Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React, TypeScript, React Router
- **Authentication**: JWT, Passport.js (OAuth), bcrypt
- **Styling**: Tailwind CSS

---

## Architecture

### Authentication Flow

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Client    │─────▶│   Backend   │─────▶│   Database   │
│  (React)    │◀─────│  (Express)  │◀─────│ (PostgreSQL) │
└─────────────┘      └─────────────┘      └──────────────┘
      │                     │
      │                     │
      ▼                     ▼
 localStorage          JWT Service
   - accessToken       - Token Generation
   - refreshToken      - Token Verification
```

### Token Strategy

1. **Access Token**: Short-lived (15 minutes), used for API requests
2. **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
3. **Reset Token**: Time-limited (1 hour), used for password reset

---

## Backend Setup

### 1. Environment Variables

Create a `.env` file in your backend directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/thumbnail_maker"

# JWT Secrets (use strong, random strings)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production"
JWT_RESET_SECRET="your-super-secret-reset-key-change-this-in-production"

# Token Expiration
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
JWT_RESET_EXPIRES_IN="1h"

# Email Configuration
REQUIRE_EMAIL_VERIFICATION="false"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
FROM_EMAIL="noreply@thumbnailmaker.com"
FROM_NAME="Thumbnail Maker"

# OAuth - Google
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# OAuth - GitHub
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Application URLs
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:3000"

# Security
BCRYPT_ROUNDS="12"
SESSION_SECRET="your-session-secret-change-this-in-production"
```

### 2. Prisma Schema

Ensure your `schema.prisma` includes the User model:

```prisma
model User {
  id            String   @id @default(uuid())
  email         String   @unique
  passwordHash  String
  name          String?
  avatarUrl     String?
  isVerified    Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations
  projects      Project[]
  sessions      Session[]
  
  @@map("users")
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshToken String
  expiresAt    DateTime
  createdAt    DateTime @default(now())
  
  @@map("sessions")
}
```

### 3. Install Dependencies

```bash
cd pikzels-clone
npm install bcryptjs jsonwebtoken passport passport-google-oauth20 passport-github2
npm install --save-dev @types/bcryptjs @types/jsonwebtoken @types/passport @types/passport-google-oauth20 @types/passport-github2
```

### 4. Project Structure

```
pikzels-clone/
├── src/
│   ├── modules/
│   │   └── auth/
│   │       ├── auth.controller.ts      # Request handlers
│   │       ├── auth.service.ts         # Business logic
│   │       ├── auth.routes.ts          # Route definitions
│   │       ├── email.service.ts        # Email functionality
│   │       ├── oauth.service.ts        # OAuth integration
│   │       └── mfa.service.ts          # MFA logic
│   ├── middleware/
│   │   ├── auth.middleware.ts          # JWT verification
│   │   └── validation.middleware.ts    # Input validation
│   ├── services/
│   │   └── jwt.enhanced.service.ts     # JWT utilities
│   └── types/
│       └── auth.ts                     # Type definitions
```

---

## Frontend Components

### 1. Install Dependencies

```bash
cd thumpiks-landing
npm install react-router-dom
npm install --save-dev @types/react-router-dom
```

### 2. Auth Context Provider

Create `src/contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const register = async (email: string, password: string, name?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const refreshAuth = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      logout();
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setUser(data.user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 3. Protected Route Component

Create `src/components/ProtectedRoute.tsx`:

```typescript
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
```

### 4. Login Component (Existing - Reusable)

Location: `pikzels-clone/client/src/components/auth/Login.tsx`

Features:
- Email/password input with validation
- Loading states
- Error handling
- Navigation to register and forgot password
- Dark mode support

### 5. Register Component (Existing - Reusable)

Location: `pikzels-clone/client/src/components/auth/Register.tsx`

Features:
- Name, email, password inputs
- Password confirmation
- Form validation
- Error handling
- Navigation to login

### 6. Axios Interceptor for Token Refresh

Create `src/utils/api.ts`:

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Request interceptor - Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
```

---

## API Endpoints

### Authentication Endpoints

#### 1. Register
```
POST /api/auth/register
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}

Response (201):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isVerified": false
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### 2. Login
```
POST /api/auth/login
Content-Type: application/json

Request Body:
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "isVerified": true
  },
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token"
}
```

#### 3. Refresh Token
```
POST /api/auth/refresh
Content-Type: application/json

Request Body:
{
  "refreshToken": "current-refresh-token"
}

Response (200):
{
  "user": {...},
  "accessToken": "new-jwt-token",
  "refreshToken": "new-refresh-token"
}
```

#### 4. Request Password Reset
```
POST /api/auth/request-password-reset
Content-Type: application/json

Request Body:
{
  "email": "user@example.com"
}

Response (200):
{
  "message": "If your email is registered, you will receive a password reset link."
}
```

#### 5. Reset Password
```
POST /api/auth/reset-password
Content-Type: application/json

Request Body:
{
  "token": "reset-token",
  "newPassword": "NewSecurePass123!"
}

Response (200):
{
  "message": "Password successfully reset"
}
```

#### 6. Get Current User
```
GET /api/auth/me
Authorization: Bearer {accessToken}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": null,
    "isVerified": true
  }
}
```

---

## OAuth Integration

### Google OAuth Setup

1. **Go to Google Cloud Console**
   - Create a new project or select existing
   - Enable Google+ API

2. **Create OAuth Credentials**
   - Go to Credentials → Create Credentials → OAuth Client ID
   - Application Type: Web Application
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

3. **Add Routes to Backend**

```typescript
// In your main server file
import { OAuthService } from './modules/auth/oauth.service';
import passport from 'passport';

// Initialize OAuth
OAuthService.initializePassport();
app.use(passport.initialize());

// Google Auth Routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const tokens = await OAuthService.generateTokensForOAuthUser(req.user);
      // Redirect to frontend with tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&refresh=${tokens.refreshToken}`);
    } catch (error) {
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  }
);
```

4. **Frontend OAuth Button**

```typescript
// In your Login component
const handleGoogleLogin = () => {
  window.location.href = '/api/auth/google';
};

// Add button
<button
  onClick={handleGoogleLogin}
  className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
>
  <img src="/google-icon.svg" alt="Google" className="w-5 h-5" />
  Continue with Google
</button>
```

5. **Handle OAuth Callback**

Create `src/pages/AuthCallback.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshAuth } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error) {
      navigate('/login?error=' + error);
      return;
    }

    if (token && refresh) {
      localStorage.setItem('accessToken', token);
      localStorage.setItem('refreshToken', refresh);
      refreshAuth().then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, navigate, refreshAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );
};
```

### GitHub OAuth Setup

Similar process to Google:

1. Go to GitHub Settings → Developer Settings → OAuth Apps
2. Create New OAuth App
3. Authorization callback URL: `http://localhost:3000/api/auth/github/callback`
4. Add routes similar to Google OAuth

---

## Security Best Practices

### 1. Password Requirements

- Minimum 8 characters
- Mix of uppercase, lowercase, numbers, symbols
- Check against common password lists
- Use bcrypt with cost factor of 12

### 2. Token Security

- **Access tokens**: Short-lived (15 minutes)
- **Refresh tokens**: Rotate on use
- **Store tokens securely**: HttpOnly cookies (production) or localStorage (development)
- **HTTPS only** in production

### 3. Rate Limiting

Add rate limiting to prevent brute force attacks:

```typescript
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to auth routes
router.post('/login', authLimiter, login);
router.post('/register', authLimiter, register);
```

### 4. CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 5. Input Validation

Always validate and sanitize user inputs:

```typescript
import { body, validationResult } from 'express-validator';

export const validateRegistration = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  body('name').optional().trim().escape(),
];
```

### 6. SQL Injection Prevention

- Use Prisma ORM (parameterized queries)
- Never concatenate user input into queries
- Validate all input types

### 7. XSS Prevention

- Sanitize HTML output
- Use Content Security Policy headers
- Escape user-generated content

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
```

---

## Testing

### Backend Tests

```typescript
// auth.service.test.ts
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const authService = new AuthService();

  describe('register', () => {
    it('should create a new user', async () => {
      const result = await authService.register(
        'test@example.com',
        'SecurePass123!',
        'Test User'
      );

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should reject duplicate emails', async () => {
      await expect(
        authService.register('test@example.com', 'pass123', 'User')
      ).rejects.toThrow('User already exists');
    });

    it('should reject weak passwords', async () => {
      await expect(
        authService.register('new@example.com', '123', 'User')
      ).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await authService.login('test@example.com', 'SecurePass123!');
      expect(result.accessToken).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      await expect(
        authService.login('test@example.com', 'wrongpass')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### Frontend Tests

```typescript
// Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

describe('Login Component', () => {
  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('shows error on invalid credentials', async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
    });
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Problem**: Frontend can't connect to backend
**Solution**:
```typescript
// Add to backend
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

#### 2. Token Expiration

**Problem**: User gets logged out too quickly
**Solution**: Implement token refresh mechanism (see Axios interceptor above)

#### 3. OAuth Redirect Not Working

**Problem**: OAuth callback fails
**Solution**:
- Check redirect URI matches exactly in OAuth provider settings
- Ensure callback route is registered before other routes
- Verify environment variables are set correctly

#### 4. Password Hashing Too Slow

**Problem**: Registration/login takes too long
**Solution**: Reduce bcrypt rounds (use 10-12, not 14+)

#### 5. Email Verification Not Working

**Problem**: Verification emails not sending
**Solution**:
- Check SMTP credentials
- Use app-specific password for Gmail
- Verify email service is enabled
- Check spam folder

### Debug Mode

Enable debug logging:

```typescript
// In your logger
logger.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
```

### Testing Endpoints with cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Get Current User
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Quick Start Checklist

### Backend Setup
- [ ] Install dependencies (`bcryptjs`, `jsonwebtoken`, `passport`)
- [ ] Configure environment variables
- [ ] Set up Prisma schema
- [ ] Run database migrations
- [ ] Initialize authentication routes
- [ ] Test API endpoints

### Frontend Setup
- [ ] Install `react-router-dom`
- [ ] Create AuthContext provider
- [ ] Add Login and Register components
- [ ] Implement ProtectedRoute component
- [ ] Set up Axios interceptor
- [ ] Configure routing
- [ ] Test authentication flow

### OAuth (Optional)
- [ ] Create Google/GitHub OAuth apps
- [ ] Add OAuth routes to backend
- [ ] Implement OAuth buttons in frontend
- [ ] Create OAuth callback handler
- [ ] Test OAuth flow

### Production Deployment
- [ ] Switch to HttpOnly cookies
- [ ] Enable HTTPS
- [ ] Set up rate limiting
- [ ] Configure CORS properly
- [ ] Enable security headers (helmet)
- [ ] Set up logging and monitoring
- [ ] Test in production environment

---

## Additional Resources

### Documentation
- [JWT.io](https://jwt.io/) - JWT decoder and documentation
- [Passport.js](http://www.passportjs.org/) - OAuth documentation
- [Prisma Docs](https://www.prisma.io/docs) - Database ORM
- [React Router](https://reactrouter.com/) - Frontend routing

### Security
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web security risks
- [bcrypt Documentation](https://www.npmjs.com/package/bcryptjs) - Password hashing

### Best Practices
- [Auth0 Blog](https://auth0.com/blog/) - Authentication best practices
- [12 Factor App](https://12factor.net/) - App development principles

---

## Support

For questions or issues with authentication:

1. Check existing auth components in `pikzels-clone/client/src/components/auth/`
2. Review backend services in `pikzels-clone/src/modules/auth/`
3. Consult this guide's troubleshooting section
4. Check project documentation in root directory

---

**Last Updated**: January 2025
**Version**: 1.0.0