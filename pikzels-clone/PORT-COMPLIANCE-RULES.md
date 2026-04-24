# Port Compliance Rules for Pikzels Clone Project

## 🚨 CRITICAL PORT RANGE RULE

**ALL application ports MUST be in the range 8500-8599**

### Current Port Assignments:
- **PostgreSQL**: 8565 (Database)
- **Redis**: 8520 (Cache/Sessions)
- **Backend API**: 8550 (Node.js Express)
- **Frontend**: 8556 (Vite React)

### ❌ FORBIDDEN PORTS:
- Port 3000 (commonly used by other dev servers - CAUSES CONFLICTS)
- Port 5000 (commonly used by Flask/Python)
- Port 8080 (commonly used by Java/Tomcat)
- Any port outside 8500-8599 range

## 📋 Configuration Files to Maintain:

### 1. `.env` - Environment Variables
```bash
PORT="8550"                           # Backend port
DATABASE_URL="...localhost:8565..."   # PostgreSQL port
REDIS_PORT="8520"                     # Redis port
CLIENT_URL="http://localhost:8556"    # Frontend port ONLY
CORS_ORIGIN="http://localhost:8556"   # Frontend port ONLY
```

### 2. `client/vite.config.ts` - Frontend Configuration
```typescript
server: {
  port: 8556,        // Must match .env
  strictPort: true,  // Fail if port unavailable
  proxy: {
    '/api': {
      target: 'http://localhost:8550'  // Must match backend port
    }
  }
}
```

### 3. `services-detector.js` - Service Detection
All ports must validate against `PORT_RANGE: { min: 8500, max: 8599 }`

## 🛡️ Port Validation Rules:

### Before ANY script creation or modification:
1. ✅ Check all ports are in 8500-8599 range
2. ✅ Verify no conflicts with existing services
3. ✅ Update all related configuration files
4. ✅ Test port availability

### When modifying ports:
1. ✅ Update `.env` file
2. ✅ Update `vite.config.ts`
3. ✅ Update any hardcoded port references
4. ✅ Update documentation
5. ✅ Test full application startup

## 🔍 Port Conflict Detection:

### Use these commands to check for conflicts:
```bash
# Check specific port
node services-detector.js --check

# Check for conflicts before starting
node services-detector.js --conflicts

# Kill process on specific port if needed
node services-detector.js --kill-port 8565
```

## 📁 B Drive Path Rules:

### Database installations (following WARP-RULES.md):
- PostgreSQL: `B:\Thumbnail_maker\database\postgresql\`
- Redis: `B:\Thumbnail_maker\database\redis\`
- Logs: `B:\Thumbnail_maker\database\postgresql\logs\`

### Search Priority:
1. **B: drive first** - Primary location
2. System PATH - Secondary
3. Standard locations - Last resort

## 🚫 Common Mistakes to AVOID:

### ❌ DON'T:
- Use port 3000 (causes conflicts)
- Use ports outside 8500-8599
- Assume PostgreSQL is on default port 5432
- Assume Redis is on default port 6379
- Reference C: drive paths for databases

### ✅ DO:
- Always validate port range compliance
- Check B: drive paths first
- Use the services-detector script
- Update all configuration files when changing ports
- Test startup sequence after changes

## 🔧 Automated Compliance:

The `services-detector.js` script will:
- ✅ Automatically validate port range compliance on startup
- ✅ Check B: drive paths first
- ✅ Detect conflicts before starting services
- ✅ Provide clear error messages for violations

## 📝 Configuration Change Checklist:

When making ANY port changes:

- [ ] Update `.env` file
- [ ] Update `client/vite.config.ts`
- [ ] Update `services-detector.js` if needed
- [ ] Run `node services-detector.js --check`
- [ ] Test full application startup
- [ ] Update this documentation
- [ ] Commit changes with clear description

## 🎯 Emergency Port Recovery:

If services conflict or hang:

```bash
# 1. Check what's running
node services-detector.js --check

# 2. Kill conflicting processes
node cleanup-ports.js --all

# 3. Restart PostgreSQL if needed
node services-detector.js --start-postgres

# 4. Validate all services
node services-detector.js --check
```

---

**Remember: Port compliance is CRITICAL for avoiding conflicts and ensuring smooth development experience!**