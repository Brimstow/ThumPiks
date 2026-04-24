# Testing Production Features Guide

## 🎯 Use Case: Testing Features That Require Production Environment

This guide is for when you need test credentials in a **production-like environment** to test features that don't work locally, such as:

- 🤖 **AI Thumbnail Generation** (requires production API keys)
- ☁️ **Cloud Services** (S3, Cloudinary, etc.)
- 📧 **Email Services** (SendGrid, SES)
- 💳 **Payment Processing** (Stripe, PayPal in test mode)
- 🔗 **OAuth Providers** (Google, GitHub with production callbacks)

---

## ✅ **Safe Approaches**

### **Option 1: Use Staging Environment (RECOMMENDED)**

Instead of `NODE_ENV=production`, use:

```bash
# .env
NODE_ENV=staging
DATABASE_URL="postgresql://..."
OPENAI_API_KEY="your-production-api-key"
```

Then seed test users normally:

```bash
npm run db:setup
# or
npm run prisma:seed
```

**Benefits:**
- ✅ Test users seed automatically (no override needed)
- ✅ Clear separation from "real" production
- ✅ No security warnings
- ✅ Use production API keys safely

**Supported environment names:**
- `staging`
- `demo`
- `qa`
- `test`

---

### **Option 2: Force Seed in Production Environment**

If you must use `NODE_ENV=production`:

```bash
# .env
NODE_ENV=production
SEED_TEST_USERS=true  # Allows test user seeding
DATABASE_URL="postgresql://..."
```

Then seed:

```bash
npm run prisma:seed
```

**When this is acceptable:**
- ✅ Pre-launch testing (no real users yet)
- ✅ Personal demo instance
- ✅ Testing AI/cloud features before going live
- ✅ You're the only user

**When this is NOT acceptable:**
- ❌ Real customers are using the system
- ❌ Production database has customer data
- ❌ Subject to compliance requirements (SOC 2, HIPAA, etc.)

---

### **Option 3: Create Production-Specific Test Accounts**

For ongoing production testing, create separate accounts with stronger credentials:

1. **Edit `prisma/seed.ts`:**

```typescript
// Add production test users with stronger credentials
const PRODUCTION_TEST_USERS: TestUser[] = [
  {
    email: 'ai-test@yourdomain.com',  // Use your actual domain
    password: 'ProductionTest2026!@#',  // Much stronger password
    name: 'AI Feature Tester',
    username: 'ai-tester-prod',
  },
  {
    email: 'demo@yourdomain.com',
    password: 'DemoAccount2026!@#',
    name: 'Demo Account',
    username: 'demo-prod',
  },
];
```

2. **Modify the main function:**

```typescript
async function main() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Use different users for production testing
  const usersToSeed = (nodeEnv === 'production' && process.env.SEED_TEST_USERS === 'true')
    ? PRODUCTION_TEST_USERS
    : TEST_USERS;
  
  await seedTestUsers(usersToSeed);
}
```

---

## 🚀 **Recommended Setup for Your Scenario**

### **Scenario: Testing AI Thumbnail Generation**

You need production OpenAI API keys but want test accounts.

**Best Setup:**

```bash
# .env.staging (or .env.demo)
NODE_ENV=staging

# Database (separate from real production)
DATABASE_URL="postgresql://user:pass@localhost:5432/thumbnail_maker_staging"

# Production API keys (for testing)
OPENAI_API_KEY="sk-prod-..."
COMET_API_KEY="..."
ZENMUX_API_KEY="..."

# Same ports as local dev
PORT=8550
CLIENT_URL=http://localhost:8556

# Enable test user seeding (optional, auto-enabled in staging)
SEED_TEST_USERS=true
```

**Deploy:**

```bash
# Setup database with test users
npm run db:setup

# Start application
npm run start:all

# Test AI features at http://localhost:8556
# Login with: tester1@example.com / Test123!
```

---

## 📊 **Environment Comparison**

| Environment | Purpose | Test Users | Production APIs | Real Customer Data |
|-------------|---------|------------|-----------------|-------------------|
| **Development** | Local coding | ✅ Yes | ❌ Mock/fake | ❌ No |
| **Staging** | Feature testing | ✅ Yes | ✅ Real keys | ❌ No |
| **Demo** | Customer demos | ✅ Yes | ✅ Real keys | ❌ Sample only |
| **QA** | Quality assurance | ✅ Yes | ✅ Real keys | ❌ Test data |
| **Production** | Real users | ❌ No* | ✅ Real keys | ✅ Yes |

*Unless explicitly forced for pre-launch testing

---

## 🔐 **Security Guidelines**

### ✅ **Safe to Use Test Credentials:**

- Pre-launch testing (no real users)
- Staging/demo environments
- Personal testing instances
- AI feature validation
- Integration testing with production APIs
- Customer demos (isolated environment)

### ⚠️ **Use Stronger Credentials:**

- Long-running test environments
- Shared staging servers
- Public demo instances
- Environments with sample customer data

### 🚫 **Never Use Test Credentials:**

- Production with real customers
- Production with customer data
- Systems under compliance audits
- Multi-tenant production environments

---

## 🎬 **Step-by-Step: Setting Up for AI Testing**

### **1. Create Staging Environment**

```bash
# Copy environment template
cp .env.example .env.staging

# Edit .env.staging
nano .env.staging
```

### **2. Configure for AI Testing**

```bash
# .env.staging
NODE_ENV=staging
DATABASE_URL="postgresql://user:pass@localhost:5432/thumbnail_maker_staging"

# Production AI keys (safe in staging)
OPENAI_API_KEY="sk-proj-real-key-here"
COMET_API_KEY="your-comet-key"
ZENMUX_API_KEY="your-zenmux-key"

# Same ports as development
PORT=8550
CLIENT_URL=http://localhost:8556
```

### **3. Setup Database with Test Users**

```bash
# Use staging environment
export NODE_ENV=staging
# or on Windows PowerShell:
$env:NODE_ENV="staging"

# Setup database (automatically seeds test users)
npm run db:setup
```

### **4. Start Application**

```bash
npm run start:all
```

### **5. Test AI Features**

```bash
# Navigate to: http://localhost:8556

# Login with test credentials:
Username: tester1
Password: Test123!

# Now you can test AI thumbnail generation with production API keys!
```

---

## 🧪 **Testing Workflow**

### **Daily Testing:**

```bash
# 1. Ensure staging environment
$env:NODE_ENV="staging"

# 2. Start services
npm run start:all

# 3. Login and test
# Use: tester1@example.com / Test123!

# 4. Test AI features
# Generate thumbnails with real AI models
# Test cloud uploads
# Test payment flows (in test mode)
```

### **After Code Changes:**

```bash
# 1. Pull latest code
git pull

# 2. Update database if needed
npm run prisma:migrate:deploy

# 3. Ensure test users exist (idempotent)
npm run prisma:seed

# 4. Restart application
npm run start:all
```

---

## 💡 **Pro Tips**

### **1. Use Different Databases**

Keep staging and production databases separate:

```bash
# Development
thumbnail_maker_dev

# Staging (for testing production features)
thumbnail_maker_staging

# Production (real customers)
thumbnail_maker_production
```

### **2. Use Environment-Specific Config Files**

```bash
.env.development   # Local dev with mock APIs
.env.staging       # Production APIs, test users
.env.production    # Production APIs, no test users
```

Load with:

```bash
# PowerShell
$env:NODE_ENV="staging"
npm start

# Bash
NODE_ENV=staging npm start
```

### **3. Document Your Testing Credentials**

Create a separate file for staging credentials:

```markdown
# STAGING_CREDENTIALS.md

## Staging Test Accounts

- tester1@example.com / Test123!
- tester2@example.com / Test123!

## Purpose
Testing AI thumbnail generation with production OpenAI API keys

## Environment
NODE_ENV=staging
Database: thumbnail_maker_staging
```

### **4. Remove Test Users When Going Live**

Before accepting real customers:

```bash
# Switch to production environment
$env:NODE_ENV="production"

# Remove test users (if any)
npm run test:users:remove
```

---

## 🔍 **Verify Your Setup**

```bash
# Check test users exist
npm run test:users:verify

# Should show:
# ✅ tester1@example.com
# ✅ tester2@example.com
# ✅ tester3@example.com

# Test login
# Navigate to http://localhost:8556
# Login with: tester1 / Test123!
# Try generating an AI thumbnail
```

---

## ✅ **Summary**

**For Your Use Case (Testing AI Features):**

1. ✅ **Use `NODE_ENV=staging`** - Best practice
2. ✅ **Use production API keys** - Required for AI testing
3. ✅ **Use test credentials** - Safe in staging
4. ✅ **Separate database** - Keep staging isolated
5. ✅ **Document clearly** - Know what environment you're in

**This is NOT a security risk because:**
- You're testing, not serving real customers
- Staging environment is isolated
- You can remove test users before going live
- Clear separation from production data

---

## 📚 **Related Documentation**

- **TEST_USERS_SECURITY.md** - Security considerations (when it becomes a risk)
- **TEST_USER_SETUP_GUIDE.md** - Complete setup guide
- **TEST_USERS_QUICKREF.md** - Quick command reference
- **.env.example** - Environment configuration template

---

**Last Updated:** 2026-01-29  
**Use Case:** Testing production features (AI, cloud services) with test credentials  
**Status:** ✅ Safe for staging/demo environments
