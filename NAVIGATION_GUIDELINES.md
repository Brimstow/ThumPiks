# Navigation Best Practices Guide

## When to Use `replace: true`

### ✅ ALWAYS use `{ replace: true }` for:

1. **Authentication Redirects**
   - After successful login/signup → Replace landing/login page with dashboard
   - After logout → Replace dashboard with landing/login page
   - When token is invalid → Replace current page with login page

2. **Error Redirects**
   - 404 redirects
   - Permission denied redirects
   - Token validation failures

3. **Process Completion**
   - After completing a multi-step form
   - After successful payment/checkout
   - After confirming an action

### ❌ NEVER use `{ replace: true }` for:

1. **Normal Navigation**
   - Clicking navigation links/tabs
   - Opening new pages
   - Browsing through content

2. **User-Initiated Navigation**
   - Clicking buttons that navigate
   - Following links
   - Selecting items from menus

## Code Examples

### ✅ Good - Authentication
```typescript
// After successful login
if (result.success) {
  navigate('/dashboard', { replace: true }); // ✅ Removes login page from history
}

// Invalid token
if (!token) {
  navigate('/login', { replace: true }); // ✅ Replaces current page
}

// Logout
const handleLogout = () => {
  localStorage.removeItem('token');
  navigate('/', { replace: true }); // ✅ Replaces dashboard
};
```

### ✅ Good - Normal Navigation
```typescript
// Tab navigation
const handleTabChange = (tab: string) => {
  navigate(`/${tab}`); // ✅ Adds to history for back button
};

// Link clicks
<button onClick={() => navigate('/analytics')}> // ✅ Normal navigation
  View Analytics
</button>
```

## Current Status by Component

### ✅ Fixed Components
- [x] `Dashboard.tsx` - Uses routes for tabs, replace for auth redirects
- [x] `LandingPage.tsx` - Uses replace after sign-in
- [x] `ProtectedRoute.tsx` - Uses replace for auth redirects
- [x] `AuthContext.tsx` - Uses replace for logout
- [x] `AdminProtectedRoute.tsx` - Already uses replace correctly

### ⚠️ Needs Review
- [ ] `AdminLayout.tsx` - Line 232 (logout), 595, 646 (navigation)
- [ ] `AdminLogin.tsx` - Line 68 (after login)

## How to Apply for New Routes

When adding new routes, follow this checklist:

1. **Declare hooks first:**
   ```typescript
   const navigate = useNavigate();
   const location = useLocation(); // If needed
   ```

2. **For authentication pages:**
   ```typescript
   // After successful auth
   navigate('/target', { replace: true });
   ```

3. **For normal navigation:**
   ```typescript
   // User clicks
   navigate('/target'); // No replace
   ```

4. **For tab-based navigation:**
   - Use actual routes (e.g., `/dashboard`, `/analytics`)
   - Determine active tab from `location.pathname`
   - Don't use state for navigation

## Testing Checklist

After implementing navigation:

- [ ] Sign in → URL changes to dashboard
- [ ] Click tab → URL changes to new route
- [ ] Click browser back → Goes to previous dashboard page (not landing)
- [ ] Logout → Goes to landing page
- [ ] Click back after logout → Stays on landing page (not dashboard)
- [ ] Invalid token → Redirects to login without adding to history

## Common Mistakes

### ❌ Using state for navigation
```typescript
// BAD - no history entries created
const [activeTab, setActiveTab] = useState('dashboard');
onClick={() => setActiveTab('analytics')} // ❌
```

### ✅ Using routes for navigation
```typescript
// GOOD - creates history entries
const activeTab = location.pathname.includes('/analytics') ? 'analytics' : 'dashboard';
onClick={() => navigate('/analytics')} // ✅
```

### ❌ Not using replace for auth
```typescript
// BAD - login page stays in history
navigate('/dashboard'); // ❌
```

### ✅ Using replace for auth
```typescript
// GOOD - login page removed from history
navigate('/dashboard', { replace: true }); // ✅
```
