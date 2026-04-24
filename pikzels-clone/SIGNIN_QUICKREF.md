# 🔐 Sign-In Quick Reference Card

**Last Updated:** 2025-01-28  
**Status:** ✅ All Systems Operational

---

## 🎯 Which Login Should I Use?

### 👤 Regular User Login
**URL:** http://localhost:8556/login  
**For:** Content creators, thumbnail makers, team members

**Test Credentials:**
```
Email:    tester1@example.com
Password: Test123!
```

**Redirects to:** `/dashboard`

---

### 🛡️ Admin Portal Login
**URL:** http://localhost:8556/admin/login  
**For:** System administrators, moderators

**Admin Credentials:**
```
Email:    admin@example.com
Password: AdminPass123!
```

**Redirects to:** `/admin`

---

## ⚡ Quick Access Links

| Role | Login URL | Dashboard URL |
|------|-----------|---------------|
| **Content Creator** | http://localhost:8556/login | http://localhost:8556/dashboard |
| **Administrator** | http://localhost:8556/admin/login | http://localhost:8556/admin |

---

## ✅ Pre-Flight Checklist

Before signing in, verify services are running:

```bash
npm run start:check
```

**Expected Output:**
```
✅ PostgreSQL is running on port 8565
✅ Redis is running on port 8520
✅ Backend API is running on port 8550
✅ Frontend is running on port 8556
```

---

## 🚨 Common Mistakes

| ❌ Wrong | ✅ Right |
|---------|---------|
| Admin credentials on `/login` | Admin credentials on `/admin/login` |
| Tester credentials on `/admin/login` | Tester credentials on `/login` |
| Using expired/old passwords | Using current credentials from docs |

---

## 🔧 Quick Fixes

### Services Not Running?
```bash
npm run start:all
```

### Database Down?
```bash
npm run start:databases
```

### Need to Recreate Admin?
```bash
npx ts-node create-default-admin.ts
```

---

## 📋 All Test Accounts

### Regular Users
| Email | Password | Has Project? |
|-------|----------|--------------|
| tester1@example.com | Test123! | ✅ Yes |
| tester2@example.com | Test123! | ✅ Yes |
| tester3@example.com | Test123! | ✅ Yes |

### Admin Account
| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| admin@example.com | AdminPass123! | super_admin | All (15) |

---

## 🎯 Decision Tree

```
Need to sign in?
    │
    ├─ Creating thumbnails? ──> Use /login (tester1@example.com)
    │
    ├─ Managing users? ──> Use /admin/login (admin@example.com)
    │
    ├─ Viewing analytics (user)? ──> Use /login
    │
    └─ System administration? ──> Use /admin/login
```

---

## 📞 Need Help?

1. **Check services:** `npm run start:check`
2. **Review full guide:** `SIGNIN_GUIDE.md`
3. **Technical details:** `SIGNIN_ASSESSMENT.md`
4. **All credentials:** `TEST_CREDENTIALS.md`

---

**Remember:** Match the login page to your role! 🚀