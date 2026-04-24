# 🔐 Sign-In Guide - Thumbnail Maker Studio

**Quick Reference:** Which login page should I use?

---

## 🎯 Two Ways to Sign In

Your application has **TWO DIFFERENT** sign-in systems. Use the right one for your role!

---

## 👤 Regular User Sign-In (Content Creators)

### When to Use This
- You want to create and manage thumbnails
- You're a content creator or team member
- You want to access your projects and analytics

### How to Sign In
1. **Go to:** http://localhost:8556/login
2. **Enter your credentials:**
   - Email: `tester1@example.com`
   - Password: `Test123!`
3. **Click:** "Login" button
4. **You'll be redirected to:** `/dashboard`

### Available Test Accounts
```
Email: tester1@example.com
Password: Test123!

Email: tester2@example.com
Password: Test123!

Email: tester3@example.com
Password: Test123!
```

### What You Can Access
- ✅ Dashboard - Your personal workspace
- ✅ Create Thumbnails - AI-powered thumbnail generation
- ✅ Projects - Organize your work
- ✅ Analytics - View your thumbnail performance
- ✅ Settings - Manage your profile
- ✅ Batch Editor - Edit multiple thumbnails
- ✅ Templates - Save and reuse designs

---

## 🛡️ Admin Portal Sign-In (System Administrators)

### When to Use This
- You need to manage users
- You want to view system analytics
- You need to moderate content
- You're managing system settings

### How to Sign In
1. **Go to:** http://localhost:8556/admin/login
2. **Enter admin credentials:**
   - Email: `admin@example.com`
   - Password: `AdminPass123!`
3. **Click:** "Login" button
4. **You'll be redirected to:** `/admin`

### Admin Credentials
```
Email: admin@example.com
Password: AdminPass123!
Role: Super Admin (Full Access)
```

### What You Can Access
- ✅ Admin Dashboard - System overview
- ✅ User Management - View, create, edit users
- ✅ Role Management - Assign admin roles
- ✅ Content Management - Moderate thumbnails and templates
- ✅ Analytics Dashboard - Platform-wide metrics
- ✅ System Health - Monitor performance
- ✅ Audit Logs - Track admin actions
- ✅ Settings - Configure system

---

## ⚠️ Common Sign-In Mistakes

### ❌ MISTAKE #1: Using Admin Credentials on Regular Login

**Wrong:**
```
URL: http://localhost:8556/login
Email: admin@example.com       ← Won't work!
Password: AdminPass123!
```

**Why it fails:** The regular login page doesn't check for admin roles. It will either:
- Not find the user, OR
- Log you in but you won't have admin features

**Solution:** Use the admin login page instead → `/admin/login`

---

### ❌ MISTAKE #2: Using Tester Credentials on Admin Login

**Wrong:**
```
URL: http://localhost:8556/admin/login
Email: tester1@example.com     ← Won't work!
Password: Test123!
```

**Why it fails:** Tester accounts don't have admin roles assigned. Admin login checks for:
- super_admin
- admin
- moderator
- analyst

**Solution:** Use the regular login page instead → `/login`

---

### ❌ MISTAKE #3: Forgetting Which Page You're On

**Problem:** You're on `/admin/login` but trying tester credentials, or vice versa.

**Solution:** Check your browser's address bar:
- See `/login`? Use tester accounts
- See `/admin/login`? Use admin account

---

## 🔄 How to Switch Between Accounts

### From User to Admin
1. Logout from user dashboard (if logged in)
2. Go to: http://localhost:8556/admin/login
3. Sign in with admin credentials

### From Admin to User
1. Logout from admin panel (if logged in)
2. Go to: http://localhost:8556/login
3. Sign in with tester credentials

---

## 📱 Visual Guide

```
┌─────────────────────────────────────────────────────────────┐
│                  THUMBNAIL MAKER STUDIO                      │
└─────────────────────────────────────────────────────────────┘

         ARE YOU A CONTENT CREATOR OR ADMIN?

    ┌──────────────────┐         ┌──────────────────┐
    │  CONTENT CREATOR │         │   ADMIN/MANAGER  │
    │                  │         │                  │
    │  • Make Thumbnails│         │ • Manage Users   │
    │  • View Analytics │         │ • View Reports   │
    │  • Use Templates  │         │ • System Health  │
    └──────────────────┘         └──────────────────┘
            ↓                            ↓
    ┌──────────────────┐         ┌──────────────────┐
    │   /login         │         │  /admin/login    │
    │                  │         │                  │
    │  tester1@...     │         │  admin@...       │
    │  Test123!        │         │  AdminPass123!   │
    └──────────────────┘         └──────────────────┘
            ↓                            ↓
    ┌──────────────────┐         ┌──────────────────┐
    │   /dashboard     │         │     /admin       │
    └──────────────────┘         └──────────────────┘
```

---

## 🚀 Quick Start Checklist

Before you try to sign in, make sure:

- [ ] All services are running
  ```bash
  npm run start:check
  ```

- [ ] You see:
  ```
  ✅ PostgreSQL is running on port 8565
  ✅ Redis is running on port 8520
  ✅ Backend API is running on port 8550
  ✅ Frontend is running on port 8556
  ```

- [ ] You know which login page to use:
  - Content creator? → `/login`
  - Administrator? → `/admin/login`

- [ ] You're using the right credentials for the right page

---

## 🆘 Troubleshooting

### "Invalid credentials" error

**Check:**
1. Are you on the right login page?
   - Regular users → `/login`
   - Admins → `/admin/login`
2. Is your email spelled correctly?
3. Is your password correct?
4. Are the services running? (Run `npm run start:check`)

### Can't access admin features after logging in

**Reason:** You probably logged in through `/login` instead of `/admin/login`

**Solution:**
1. Logout
2. Go to http://localhost:8556/admin/login
3. Use admin credentials

### "Network error" or "Cannot reach server"

**Check:**
1. Is the backend running?
   ```bash
   npm run start:check
   ```
2. Is the database running?
3. Check browser console for errors (F12)

### Database not running

**Fix:**
```bash
npm run start:databases
```

Wait 10 seconds, then check:
```bash
npm run start:check
```

---

## 🔐 Security Tips

1. **Different Tokens:** Regular users and admins use different authentication tokens
   - User token: stored as `token` in localStorage
   - Admin token: stored as `adminToken` in localStorage

2. **Separate Systems:** The two login systems are completely independent
   - Can't use admin credentials on user login
   - Can't use user credentials on admin login

3. **Role-Based Access:** Admin panel checks for specific roles:
   - `super_admin` - Full access
   - `admin` - Most features
   - `moderator` - Content moderation
   - `analyst` - Analytics only

---

## 📞 Need Help?

### For Development Issues
1. Check if all services are running: `npm run start:check`
2. Check browser console (F12) for errors
3. Check backend logs in terminal
4. Review this guide again

### For Production Setup
Remember to:
- ⚠️ Change all default passwords
- ⚠️ Use environment variables for credentials
- ⚠️ Enable HTTPS
- ⚠️ Set up proper CORS policies

---

## 📚 Related Documentation

- `TEST_CREDENTIALS.md` - Full list of test accounts
- `SIGNIN_ASSESSMENT.md` - Technical details and troubleshooting
- `ROUTES_GUIDE.md` - All available routes
- `PORT_CONFIGURATION.md` - Service port mappings

---

**Remember:** 
- 👤 Content creators → `/login` → Dashboard
- 🛡️ Administrators → `/admin/login` → Admin Panel

**Match the login page to your role, and you'll be good to go!** 🚀