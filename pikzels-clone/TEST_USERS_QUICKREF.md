# Test Users - Quick Reference Card

## 🚀 Quick Commands

```bash
# Seed test users (idempotent - safe to run anytime)
npm run prisma:seed

# Complete database setup (fresh environment)
npm run db:setup

# Reset database and reseed (⚠️ deletes all data)
npm run db:reset
```

---

## 🔐 Test Credentials

| Username | Email | Password |
|----------|-------|----------|
| tester1 | tester1@example.com | Test123! |
| tester2 | tester2@example.com | Test123! |
| tester3 | tester3@example.com | Test123! |

**Note:** All test users have a default project pre-created.

---

## 🌐 Application URLs

- **Frontend:** http://localhost:8556
- **Backend API:** http://localhost:8550
- **Prisma Studio:** http://localhost:8560 (`npm run prisma:studio`)

---

## 📋 Common Workflows

### First-Time Setup
```bash
npm install
npm run db:setup
```

### After Redeployment
```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

### Verify Test Users
```bash
npm run prisma:studio
# Check User table for tester1@example.com
```

---

## 💡 Tips

✅ **Seed script is idempotent** - Won't create duplicates  
✅ **Auto-skips production** - Safe by default  
✅ **Each user has a project** - Ready for testing immediately  
✅ **E2E test compatible** - Used in Playwright tests  

---

📖 **Full Documentation:** See `TEST_USER_SETUP_GUIDE.md`
