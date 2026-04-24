# Test User Setup & Management Guide

This guide explains how to set up and maintain persistent test credentials for the Thumbnail Maker application.

## 🎯 Overview

The application provides **automated test user seeding** to ensure consistent test accounts are available across deployments, restarts, and different environments.

### Key Features

✅ **Idempotent Seeding** - Safe to run multiple times, won't create duplicates  
✅ **Environment-Aware** - Automatically skips production unless explicitly enabled  
✅ **Consistent Credentials** - Same test users across all environments  
✅ **Auto-Project Creation** - Each test user gets a default project  
✅ **E2E Test Ready** - Pre-configured for Playwright tests  

---

## 📋 Test User Profiles

The system creates 3 test users with predefined credentials:

| Username | Email | Password | Display Name |
|----------|-------|----------|--------------|
| tester1 | tester1@example.com | Test123! | Tester One |
| tester2 | tester2@example.com | Test123! | Tester Two |
| tester3 | tester3@example.com | Test123! | Tester Three |

**Password Requirements Met:**
- ✅ At least 8 characters
- ✅ One uppercase letter (T)
- ✅ One lowercase letter (est)
- ✅ One number (123)
- ✅ One special character (!)

---

## 🚀 Quick Start

### Option 1: Complete Database Setup (New Environment)

```bash
# Set up database with migrations + seeding
npm run db:setup
```

This will:
1. Run all pending migrations (`prisma migrate deploy`)
2. Generate Prisma client (`prisma generate`)
3. Seed test users (`prisma db seed`)

### Option 2: Seed Test Users Only

```bash
# Using Prisma's built-in seed command
npm run prisma:seed

# OR using the legacy script (equivalent)
npm run test:users:create
```

### Option 3: Database Reset with Test Users

```bash
# WARNING: This deletes ALL data and rebuilds from migrations
npm run db:reset

# The reset command automatically runs the seed script after migrations
```

---

## 🔧 Integration Methods

### 1. **Manual Seeding (Recommended for Development)**

Run after initial setup or when you need fresh test users:

```bash
npm run prisma:seed
```

### 2. **Post-Migration Seeding**

Add to your deployment pipeline:

```bash
# Deploy migrations, then seed
npm run prisma:migrate:deploy && npm run prisma:seed
```

### 3. **Automated in CI/CD**

Add to your deployment script (`.github/workflows`, `docker-compose`, etc.):

```yaml
# Example: GitHub Actions
- name: Setup Database
  run: |
    npm run db:setup
  env:
    NODE_ENV: development
```

### 4. **Docker Integration**

Add to your `docker-compose.yml` or startup script:

```dockerfile
# Dockerfile
RUN npm run db:setup

# Or in docker-compose.yml
services:
  app:
    command: sh -c "npm run db:setup && npm start"
```

---

## 🌍 Environment Configuration

### Development/Test (Default Behavior)

Test users are **automatically seeded** in these environments:
- `NODE_ENV=development`
- `NODE_ENV=test`
- `NODE_ENV` not set (defaults to development)

```bash
# No special configuration needed
npm run prisma:seed
```

### Production (Protected by Default)

Test users are **NOT seeded** in production unless explicitly enabled:

```bash
# Option 1: Set environment variable
export SEED_TEST_USERS=true
npm run prisma:seed

# Option 2: One-time override
SEED_TEST_USERS=true npm run prisma:seed
```

**⚠️ Warning:** Seeding test users in production is **not recommended** for security reasons.

---

## 📁 Project Structure

```
pikzels-clone/
├── prisma/
│   ├── seed.ts              # New: Automated seed script
│   ├── schema.prisma        # Database schema
│   └── migrations/          # Migration files
├── create-test-users.ts     # Legacy: Manual test user creation
├── TEST_CREDENTIALS.md      # Test user documentation
├── package.json             # Scripts and Prisma config
└── .env.example             # Environment template
```

---

## 🔄 Maintaining Test Accounts Across Deployments

### Scenario 1: Fresh Database on New Server

```bash
# Clone repository
git clone <repo-url>
cd pikzels-clone

# Install dependencies
npm install

# Setup database (includes seeding)
npm run db:setup
```

### Scenario 2: Existing Database After Redeployment

```bash
# Pull latest code
git pull

# Install dependencies
npm install

# Run migrations (if any)
npm run prisma:migrate:deploy

# Seed test users (idempotent - won't duplicate)
npm run prisma:seed
```

### Scenario 3: Database Reset (Development)

```bash
# Reset database and reseed everything
npm run db:reset
```

---

## 🧪 Testing with Test Users

### E2E Tests (Playwright)

Test users are automatically available:

```typescript
// tests/e2e/thumbnail-operations.spec.ts
const TEST_USER = {
  username: 'tester1',
  email: 'tester1@example.com',
  password: 'Test123!',
};

await loginUser(page, TEST_USER);
```

### API Testing

```bash
# Login and get token
curl -X POST http://localhost:8550/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "tester1",
    "password": "Test123!"
  }'

# Use token in subsequent requests
curl -X GET http://localhost:8550/api/projects \
  -H "Authorization: Bearer <token>"
```

### Manual Testing

1. Navigate to http://localhost:8556
2. Click "Sign In"
3. Use any test credentials from the table above
4. Access pre-created projects immediately

---

## 🛠️ Customization

### Adding More Test Users

Edit `prisma/seed.ts`:

```typescript
const TEST_USERS: TestUser[] = [
  {
    email: 'tester1@example.com',
    password: 'Test123!',
    name: 'Tester One',
    username: 'tester1',
  },
  // Add your custom test user
  {
    email: 'admin-test@example.com',
    password: 'Admin123!',
    name: 'Admin Tester',
    username: 'admin-test',
  },
];
```

### Changing Test User Passwords

Update the password in `prisma/seed.ts`, then reseed:

```bash
npm run prisma:seed
```

### Adding Test Data Beyond Users

Add to `prisma/seed.ts`:

```typescript
async function seedTestThumbnails() {
  // Create test thumbnails for test users
}

async function main() {
  await seedTestUsers();
  await seedTestThumbnails(); // Add your custom seeding
}
```

---

## 📊 Verification

### Check Test Users Exist

```bash
# Open Prisma Studio
npm run prisma:studio

# Navigate to User model and look for:
# - tester1@example.com
# - tester2@example.com
# - tester3@example.com
```

### Verify Projects Were Created

```bash
# Using Prisma Studio (port 8560)
npm run prisma:studio

# Or via direct database query
psql -d thumbnail_maker -c "SELECT email, name FROM \"User\" WHERE email LIKE '%tester%';"
```

---

## 🔐 Security Best Practices

### Development/Testing

✅ Use test users freely  
✅ Credentials can be in documentation  
✅ Auto-seed on every deployment  

### Staging

⚠️ Consider using separate test accounts  
⚠️ Use stronger passwords if staging has real data  
⚠️ Disable auto-seeding if not needed  

### Production

❌ **Do NOT seed test users**  
❌ **Do NOT commit production credentials**  
❌ Use proper admin account creation tools  

### If Test Users Were Accidentally Seeded in Production

**Remove them immediately:**

```bash
# Production cleanup (requires confirmation)
NODE_ENV=production CONFIRM_REMOVE_TEST_USERS=yes npm run test:users:remove
```

**Security Impact:**
- Known credentials = security vulnerability
- Weak passwords documented in repository
- Unauthorized access to production data
- Compliance violations (SOC 2, GDPR, etc.)

---

## 🆘 Troubleshooting

### Issue: Test users not created

**Solution:**
```bash
# Check seed script output
npm run prisma:seed

# Look for errors in console
# Check database connection in .env
```

### Issue: Duplicate users error

**Solution:**
The seed script is idempotent. If users already exist, it will skip creation.

```bash
# To recreate, delete existing users first:
# Option 1: Through Prisma Studio
npm run prisma:studio

# Option 2: Reset database (WARNING: deletes all data)
npm run db:reset
```

### Issue: Seed script skipped in production

**Solution:**
This is intentional. To force seeding:

```bash
SEED_TEST_USERS=true npm run prisma:seed
```

### Issue: Wrong passwords or credentials

**Solution:**
Check `TEST_CREDENTIALS.md` for current credentials. If you modified `seed.ts`, re-run:

```bash
npm run prisma:seed
```

---

## 📚 Related Documentation

- **TEST_CREDENTIALS.md** - Quick reference for test user credentials
- **DEPLOYMENT_SETUP.md** - General deployment guide
- **package.json** - Available npm scripts
- **prisma/seed.ts** - Seed script implementation

---

## 🎬 Complete Deployment Workflow

### First-Time Setup

```bash
# 1. Clone and install
git clone <repo-url>
cd pikzels-clone
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database connection

# 3. Setup database
npm run db:setup

# 4. Verify
npm run prisma:studio
```

### After Every Deployment

```bash
# 1. Pull latest code
git pull

# 2. Install dependencies
npm install

# 3. Run migrations
npm run prisma:migrate:deploy

# 4. Seed test users (if needed)
npm run prisma:seed

# 5. Start application
npm start
```

---

## ✅ Checklist

Use this checklist after deployment:

- [ ] Database migrations applied
- [ ] Prisma client generated
- [ ] Test users seeded (development/test only)
- [ ] Can login as tester1@example.com
- [ ] Test users have default projects
- [ ] E2E tests can authenticate
- [ ] Prisma Studio accessible (port 8560)

---

**Last Updated:** 2026-01-29  
**Status:** ✅ Active and maintained
