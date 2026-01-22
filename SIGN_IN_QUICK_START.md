# Sign-In Quick Start Guide

Fast-track guide to integrate authentication into your Thumbnail Maker project.

## 🚀 5-Minute Setup

### Step 1: Copy Existing Auth Components

Your project already has complete auth components in `pikzels-clone`. Copy them to your target project:

```bash
# Copy authentication components
cp -r pikzels-clone/client/src/components/auth thumpiks-landing/src/components/

# Copy auth services (if using backend)
cp -r pikzels-clone/src/modules/auth your-backend/src/modules/
```

### Step 2: Install Required Dependencies

```bash
# Frontend
cd thumpiks-landing
npm install react-router-dom

# Backend (if applicable)
cd ../pikzels-clone
npm install bcryptjs jsonwebtoken passport passport-google-oauth20 passport-github2
```

### Step 3: Create Auth Context

Create `thumpiks-landing/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) throw new Error('Login failed');

    const data = await response.json();
    localStorage.setItem('token', data.accessToken);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### Step 4: Add Routing

Update `thumpiks-landing/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import { PikzelsLanding } from './components/generated/PikzelsLanding';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <PikzelsLanding />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
```

### Step 5: Environment Variables

Create `.env` in your backend:

```env
# Required
DATABASE_URL="postgresql://user:password@localhost:5432/thumbnail_maker"
JWT_SECRET="your-secret-key-change-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-key"

# Optional
FRONTEND_URL="http://localhost:5173"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
```

---

## 📋 Complete Integration Checklist

### Frontend Integration
- [ ] Copy auth components from `pikzels-clone/client/src/components/auth`
- [ ] Install `react-router-dom`
- [ ] Create `AuthContext.tsx`
- [ ] Update `App.tsx` with routes
- [ ] Test login/register flows
- [ ] Add logout button to navigation

### Backend Integration
- [ ] Copy auth module from `pikzels-clone/src/modules/auth`
- [ ] Install dependencies: `bcryptjs`, `jsonwebtoken`
- [ ] Configure `.env` file
- [ ] Set up database schema (Prisma)
- [ ] Mount auth routes in main server file
- [ ] Test API endpoints

---

## 🔌 API Integration

### Making Authenticated Requests

```typescript
// Option 1: Using fetch
const token = localStorage.getItem('token');
const response = await fetch('/api/protected', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Option 2: Using axios with interceptor
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### Usage in Components

```typescript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name || user?.email}!</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## 🎨 UI Components

### Login Button Example

```typescript
<button
  onClick={() => navigate('/login')}
  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
>
  Sign In
</button>
```

### User Menu Example

```typescript
import { useAuth } from '../contexts/AuthContext';

function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <div className="relative">
      <button className="flex items-center gap-2">
        <img
          src={user?.avatarUrl || '/default-avatar.png'}
          alt={user?.name}
          className="w-8 h-8 rounded-full"
        />
        <span>{user?.name}</span>
      </button>
      
      {/* Dropdown */}
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg">
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
```

---

## 🔐 Backend Routes

Mount auth routes in your main server file:

```typescript
import express from 'express';
import authRoutes from './modules/auth/auth.routes';

const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## 🧪 Testing

### Test Login Flow

```bash
# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'

# Use the returned token for authenticated requests
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🚨 Common Issues

### Issue: CORS Error
**Solution**: Add CORS middleware to backend
```typescript
import cors from 'cors';
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
```

### Issue: Token not found
**Solution**: Check localStorage in browser DevTools → Application → Local Storage

### Issue: 401 Unauthorized
**Solution**: Verify token is being sent in Authorization header

### Issue: Routes not working
**Solution**: Ensure BrowserRouter wraps entire app and routes are properly nested

---

## 📚 Available Auth Components

Your project includes these ready-to-use components:

1. **Login** (`pikzels-clone/client/src/components/auth/Login.tsx`)
   - Email/password form
   - Error handling
   - Navigation to register/forgot password

2. **Register** (`pikzels-clone/client/src/components/auth/Register.tsx`)
   - User registration form
   - Password confirmation
   - Validation

3. **ForgotPassword** (`pikzels-clone/client/src/components/auth/ForgotPassword.tsx`)
   - Password reset request
   - Email submission

4. **ResetPassword** (`pikzels-clone/client/src/components/auth/ResetPassword.tsx`)
   - New password form
   - Token verification

---

## 🔄 Next Steps

After basic setup:

1. **Add OAuth** (Google/GitHub sign-in)
   - See `SIGN_IN_INTEGRATION_GUIDE.md` → OAuth Integration section

2. **Implement Token Refresh**
   - Add axios interceptor for automatic token refresh

3. **Add Email Verification**
   - Configure SMTP settings
   - Enable verification in auth service

4. **Enhance Security**
   - Add rate limiting
   - Implement CSRF protection
   - Use HttpOnly cookies for production

5. **Improve UX**
   - Add loading states
   - Better error messages
   - Remember me functionality
   - Social login buttons

---

## 📖 Full Documentation

For complete documentation including:
- OAuth setup
- Security best practices
- Advanced features (MFA, sessions)
- Production deployment

See: **`SIGN_IN_INTEGRATION_GUIDE.md`**

---

## ⚡ TL;DR - Absolute Minimum

```bash
# 1. Copy auth components
cp -r pikzels-clone/client/src/components/auth thumpiks-landing/src/components/

# 2. Install dependencies
cd thumpiks-landing && npm install react-router-dom

# 3. Create AuthContext (see Step 3 above)

# 4. Update App.tsx with routes (see Step 4 above)

# 5. Test login at http://localhost:5173/login
```

**Done!** You now have working authentication.

---

**Need Help?** Check the full guide or existing implementation in `pikzels-clone/`
