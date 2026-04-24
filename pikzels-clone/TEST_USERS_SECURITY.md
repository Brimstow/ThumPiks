# Test Users - Security Advisory

## 🚨 CRITICAL: Production Security Warning

**Test users should NEVER exist in production environments.**

---

## ⚠️ Security Risks

### 1. **Known Credentials Vulnerability**

**Risk Level:** 🔴 **CRITICAL**

- Test passwords are **documented in the repository**
- Anyone with code access knows the credentials
- Credentials: `tester1@example.com` / `Test123!` (publicly known)

**Impact:**
- Unauthorized access to production application
- Data breaches
- Account takeover
- Privilege escalation

---

### 2. **Weak Password Pattern**

**Risk Level:** 🟠 **HIGH**

- `Test123!` is a common test password pattern
- Easily guessable by attackers
- First password tried in automated attacks
- Does not meet enterprise security standards

**Impact:**
- Brute force attacks succeed quickly
- Dictionary attacks effective
- Credential stuffing vulnerability

---

### 3. **Compliance Violations**

**Risk Level:** 🟠 **HIGH**

**Violates:**
- SOC 2 Type II (Access Control requirements)
- GDPR Article 32 (Security of processing)
- PCI DSS Requirement 8 (Identify and authenticate access)
- HIPAA Security Rule (if handling health data)
- ISO 27001 (Access control policy)

**Impact:**
- Failed audits
- Regulatory fines
- Loss of certifications
- Legal liability

---

### 4. **Audit Trail Contamination**

**Risk Level:** 🟡 **MEDIUM**

- Test users in production create false audit records
- Cannot distinguish legitimate from test activity
- Compliance reporting inaccuracies

**Impact:**
- Unreliable security monitoring
- Inability to detect real intrusions
- Audit evidence compromised

---

## ✅ Built-in Protection Mechanisms

### Automatic Production Skip

The seed script **automatically prevents** production seeding:

```typescript
// From prisma/seed.ts
if (nodeEnv === 'production') {
  console.log('⚠️ Skipping test user seeding in production');
  
  if (process.env.SEED_TEST_USERS !== 'true') {
    return; // EXIT - Does not seed
  }
}
```

### Explicit Override Required

Production seeding requires **two explicit overrides**:

1. Set `NODE_ENV=production`
2. Set `SEED_TEST_USERS=true`

```bash
# This will NOT seed (production detected)
NODE_ENV=production npm run prisma:seed

# This WILL seed (explicit override - DO NOT DO THIS)
NODE_ENV=production SEED_TEST_USERS=true npm run prisma:seed
```

---

## 🛡️ Best Practices by Environment

### ✅ Development

**SAFE TO USE:**
```bash
npm run prisma:seed
```

- Test users are **expected and safe**
- Credentials can be documented
- No security risk in local development

### ⚠️ Staging/QA

**CONSIDER ALTERNATIVES:**

**Option 1:** Use test users (lower security environment)
```bash
npm run prisma:seed
```

**Option 2:** Use separate test accounts with different credentials
```typescript
// Create staging-specific users
const STAGING_USERS = [
  { email: 'qa1@company.com', password: generateStrongPassword() }
];
```

**Recommendation:** If staging has production-like data, use Option 2.

### 🚫 Production

**NEVER USE TEST USERS:**

```bash
# ❌ NEVER DO THIS
NODE_ENV=production SEED_TEST_USERS=true npm run prisma:seed
```

**Instead:**
```bash
# ✅ Use proper admin creation
npm run admin:create
```

---

## 🆘 Emergency Response: Test Users in Production

### Step 1: Immediate Assessment

```bash
# Check if test users exist
npm run test:users:verify
```

Look for:
- `tester1@example.com`
- `tester2@example.com`
- `tester3@example.com`

### Step 2: Immediate Removal

```bash
# Remove test users (production only, requires confirmation)
NODE_ENV=production CONFIRM_REMOVE_TEST_USERS=yes npm run test:users:remove
```

**This will:**
- Delete all 3 test users
- Cascade delete their projects, thumbnails, templates
- Provide detailed deletion report

### Step 3: Verify Removal

```bash
# Confirm test users are gone
npm run prisma:studio
# Check User table - should not see tester1-3@example.com
```

### Step 4: Security Audit

**Check for unauthorized access:**

```sql
-- Review AuditLog for test user activity
SELECT * FROM "AuditLog" 
WHERE "userId" IN (
  SELECT id FROM "User" 
  WHERE email LIKE 'tester%@example.com'
)
ORDER BY timestamp DESC;

-- Check UserSession for test user logins
SELECT * FROM "UserSession"
WHERE "userId" IN (
  SELECT id FROM "User"
  WHERE email LIKE 'tester%@example.com'
);
```

**If you find unauthorized activity:**
1. Document all findings
2. Notify security team
3. Review data accessed/modified
4. Consider breach notification (if required by law)

### Step 5: Incident Report

**Document:**
- When test users were seeded
- How long they existed in production
- Any detected unauthorized access
- Remediation actions taken
- Preventive measures implemented

---

## 🔒 Prevention Checklist

### For Developers

- [ ] Never run seed scripts in production
- [ ] Never set `SEED_TEST_USERS=true` in production
- [ ] Use environment checks in deployment scripts
- [ ] Review environment variables before deployment

### For DevOps

- [ ] CI/CD pipeline excludes test seeding in production
- [ ] Production deployment scripts check `NODE_ENV`
- [ ] Automated checks for test users in production
- [ ] Alerts if test credentials detected

### For Security Teams

- [ ] Monitor for test user logins in production
- [ ] Include test credentials in banned password lists
- [ ] Regular production database audits
- [ ] Penetration testing includes test credential checks

---

## 📋 Deployment Pipeline Guards

### GitHub Actions Example

```yaml
# .github/workflows/deploy-production.yml
- name: Verify No Test Users in Production
  run: |
    if [ "$NODE_ENV" = "production" ]; then
      echo "Checking for test users..."
      
      # Fail deployment if SEED_TEST_USERS is set
      if [ "$SEED_TEST_USERS" = "true" ]; then
        echo "❌ ERROR: SEED_TEST_USERS=true in production!"
        exit 1
      fi
      
      # Verify test users don't exist
      npm run test:users:verify || true
    fi
  env:
    NODE_ENV: production
```

### Docker Example

```dockerfile
# Dockerfile
# Only seed in non-production builds
RUN if [ "$NODE_ENV" != "production" ]; then \
      npm run db:setup; \
    else \
      npm run prisma:migrate:deploy; \
      npm run prisma:generate; \
    fi
```

### Pre-deployment Script

```bash
#!/bin/bash
# pre-deploy.sh

if [ "$NODE_ENV" = "production" ]; then
  echo "🔍 Production deployment - checking for test users..."
  
  # Check environment variables
  if [ "$SEED_TEST_USERS" = "true" ]; then
    echo "❌ ERROR: SEED_TEST_USERS is set to true!"
    exit 1
  fi
  
  echo "✅ Environment checks passed"
fi
```

---

## 📊 Risk Matrix

| Environment | Test Users | Risk Level | Action |
|-------------|------------|------------|--------|
| Local Dev | ✅ Allowed | 🟢 None | Use freely |
| Dev Server | ✅ Allowed | 🟢 None | Use freely |
| QA/Test | ⚠️ Allowed | 🟡 Low | Consider alternatives |
| Staging | ⚠️ Caution | 🟠 Medium | Use separate accounts |
| Production | ❌ Forbidden | 🔴 Critical | Never use |

---

## 🔍 Detection Methods

### Automated Monitoring

**Set up alerts for:**

```sql
-- Alert if test users login to production
SELECT COUNT(*) FROM "UserSession"
WHERE "userId" IN (
  SELECT id FROM "User" 
  WHERE email LIKE 'tester%@example.com'
)
AND "loginAt" > NOW() - INTERVAL '24 hours';
```

### Regular Audits

```bash
# Weekly production check
npm run test:users:verify

# Should output:
# ❌ tester1@example.com - NOT FOUND (expected in production)
```

---

## 📞 Security Contact

If you discover test users in production:

1. **Immediately remove them** (see Emergency Response)
2. **Notify security team**
3. **Document the incident**
4. **Review access logs**

---

## 📚 Additional Resources

- **Setup Guide:** `TEST_USER_SETUP_GUIDE.md`
- **Quick Reference:** `TEST_USERS_QUICKREF.md`
- **Implementation:** `TEST_USER_IMPLEMENTATION.md`
- **Credentials:** `TEST_CREDENTIALS.md`

---

## ✅ Summary

### ✅ SAFE (Development/Test)
- Local development
- Development servers
- Automated test environments
- E2E test runs

### ⚠️ REVIEW (Staging)
- Depends on data sensitivity
- Consider separate accounts
- Use stronger passwords

### 🚫 FORBIDDEN (Production)
- **NEVER seed test users**
- **NEVER use test credentials**
- **Use proper admin accounts**
- **Remove immediately if found**

---

**Last Updated:** 2026-01-29  
**Classification:** Security Advisory  
**Severity:** Critical (if test users exist in production)
