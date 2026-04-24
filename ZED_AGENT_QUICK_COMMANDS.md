# ZED AGENT - QUICK COMMAND REFERENCE

## 🚨 CRITICAL: RUN MIGRATION FIRST

### **PowerShell Commands (Run in Order):**

```powershell
# 1. Navigate to project
cd B:\Thumbnail_maker\pikzels-clone

# 2. Verify location
Get-Location

# 3. Kill Node processes
taskkill /F /IM node.exe 2>$null

# 4. Delete migrations
Remove-Item -Recurse -Force .\prisma\migrations -ErrorAction SilentlyContinue

# 5. Delete Prisma cache
Remove-Item -Recurse -Force .\node_modules\.prisma -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .\node_modules\@prisma\client -ErrorAction SilentlyContinue

# 6. Reinstall Prisma
npm install prisma @prisma/client

# 7. Reset database
npx prisma db push --force-reset --accept-data-loss --schema=.\prisma\schema.prisma

# 8. Create migration
npx prisma migrate dev --name init_complete_auth_system --schema=.\prisma\schema.prisma

# 9. Generate client
npx prisma generate --schema=.\prisma\schema.prisma
```

---

## ✅ AFTER MIGRATION SUCCESS

### **Start Servers:**

**Terminal 1 - Backend:**
```bash
cd B:\Thumbnail_maker\pikzels-clone
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd B:\Thumbnail_maker\pikzels-clone\client
npm run dev
```

---

## 🧪 TESTING COMMANDS

### **Check Database:**
```bash
npx prisma studio
```

### **Test Registration API:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","name":"Test User","password":"Test123!@#"}'
```

### **Test Username Suggestions:**
```bash
curl -X POST http://localhost:5000/api/auth/suggest-usernames \
  -H "Content-Type: application/json" \
  -d '{"fullName":"John Smith","email":"john@example.com"}'
```

### **Test Username Availability:**
```bash
curl http://localhost:5000/api/auth/check-username/testuser
```

### **Test Login (Username):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"testuser","password":"Test123!@#"}'
```

### **Test Login (Email):**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"test@example.com","password":"Test123!@#"}'
```

---

## 🌐 URLS TO TEST

| Page | URL | Test |
|------|-----|------|
| Landing | http://localhost:8556/ | Sign-up/Sign-in modals |
| Register | http://localhost:8556/register | Full registration form |
| Login | http://localhost:8556/login | Username/email login |
| Dashboard | http://localhost:8556/dashboard | After login redirect |

---

## 🔍 DEBUGGING COMMANDS

### **Check if database exists:**
```bash
npx prisma db pull
```

### **View current schema:**
```bash
npx prisma format
```

### **Reset everything (nuclear option):**
```bash
npx prisma migrate reset --force
```

### **Check Prisma version:**
```bash
npx prisma --version
```

### **Kill all Node processes:**
```bash
taskkill /F /IM node.exe
```

---

## 📊 VERIFICATION CHECKLIST

### **After Migration:**
- [ ] No errors in migration output
- [ ] "✔ Generated Prisma Client" message appears
- [ ] Prisma Studio shows User table with new fields
- [ ] Backend starts without errors
- [ ] Frontend starts on port 8556

### **Database Fields to Check:**
- [ ] User.username exists
- [ ] User.emailVerificationToken exists
- [ ] User.emailVerificationExpiry exists
- [ ] User.displayPreference exists
- [ ] User.name is NOT NULL (required)

### **API Endpoints to Test:**
- [ ] POST /api/auth/register (with username)
- [ ] POST /api/auth/login (with username)
- [ ] POST /api/auth/login (with email)
- [ ] POST /api/auth/suggest-usernames
- [ ] GET /api/auth/check-username/:username
- [ ] GET /api/auth/verify-email/:token

### **Frontend to Test:**
- [ ] Register page shows all fields
- [ ] Username suggestions appear
- [ ] Password strength meter works
- [ ] Login accepts username/email
- [ ] Eye icons toggle password
- [ ] Landing modals updated

---

## 🚨 COMMON ERRORS & FIXES

### **Error: "PRAGMA syntax error"**
**Fix:** Delete migrations folder and recreate

### **Error: "Schema not found"**
**Fix:** Use `--schema=.\prisma\schema.prisma` flag

### **Error: "EPERM operation not permitted"**
**Fix:** Kill Node processes: `taskkill /F /IM node.exe`

### **Error: "Migration failed to apply"**
**Fix:** Run `npx prisma migrate resolve --rolled-back <migration_name>`

### **Error: "Cannot find module @prisma/client"**
**Fix:** Run `npm install @prisma/client`

---

## 📝 TEST USER CREDENTIALS

**After successful migration, create test user:**
- Username: `testuser`
- Email: `test@example.com`
- Name: `Test User`
- Password: `Test123!@#`

**Login with either:**
- `testuser` + password
- `test@example.com` + password

---

## 🎯 SUCCESS INDICATORS

### **Migration Success:**
```
✔ Database reset successful
✔ Generated Prisma Client (5.x.x)
Your database is now in sync with your schema.
```

### **Backend Success:**
```
Server running on port 5000
Database connected
✓ PostgreSQL connected
```

### **Frontend Success:**
```
VITE v5.x.x ready in XXX ms
➜  Local:   http://localhost:8556/
```

### **Registration Success:**
```json
{
  "user": {
    "id": "uuid",
    "username": "testuser",
    "email": "test@example.com",
    "name": "Test User",
    "isVerified": false
  },
  "token": "jwt_token",
  "message": "Registration successful. Please verify your email."
}
```

---

## 📞 QUICK CONTACT

**Status:** Waiting for migration
**Blocker:** SQLite→PostgreSQL conflict
**Next Step:** Run migration commands above
**ETA:** 5 minutes after migration

---

**Last Updated:** January 2025