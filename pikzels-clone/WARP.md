# Warp Agent Rules - Pikzels Clone Project

## 🚨 CRITICAL PROJECT RULES

### 1. Server Startup Prevention Rule
**NEVER start the server directly when it's already running!**

Before ANY server startup command, ALWAYS run:
```bash
npm run dev:health
```

If services are already running, use:
```bash
npm run dev:restart  # Full restart with conflict resolution
# OR
npm run dev:quick    # Quick restart (backend+frontend only)
```

### 2. Port Range Compliance Rule
**ALL ports MUST be in range 8500-8599**

- PostgreSQL: 8565
- Redis: 8520  
- Backend API: 8550
- Frontend: 8556
- **FORBIDDEN**: Port 3000 (causes conflicts)

### 3. B Drive Database Rule
**ALWAYS check B: drive first for PostgreSQL and Redis**

Following the parent WARP-RULES.md:
- PostgreSQL: `B:\Thumbnail_maker\database\postgresql\`
- Redis: `B:\Thumbnail_maker\database\redis\`

### 4. Safe Startup Rule
**For daily development, ALWAYS use:**
```bash
npm run dev:safe
```

This command:
- ✅ Checks for conflicts automatically
- ✅ Validates port range compliance
- ✅ Ensures services start in correct order
- ✅ Prevents database connection errors

### 5. Error Recovery Rule
**If you see Prisma connection errors like:**
```
Can't reach database server at `localhost:8565`
```

**IMMEDIATELY run:**
```bash
npm run dev:restart
```

**Do NOT:**
- Try to start the server again without fixing conflicts
- Kill processes manually
- Ignore the error and continue

### 6. Shutdown Rule
**When ending development, use:**
```bash
npm run dev:stop
```

**Never just close terminal windows or kill processes manually.**

## 🎯 Quick Command Reference

### Daily Workflow:
```bash
# Start development
npm run dev:safe

# If issues occur
npm run dev:restart

# Quick backend/frontend restart
npm run dev:quick

# Check health anytime  
npm run dev:health

# End development
npm run dev:stop
```

### Emergency Commands:
```bash
# Emergency shutdown
node graceful-shutdown.js --emergency

# Force kill specific port
node services-detector.js --kill-port 8565

# Check conflicts
npm run dev:conflicts
```

## 🛡️ Conflict Prevention

This project has automatic conflict detection that:
- ✅ Prevents starting server when already running
- ✅ Validates all ports are in required range (8500-8599)
- ✅ Checks B: drive paths first (following parent WARP rules)
- ✅ Provides clear error messages for violations
- ✅ Handles graceful shutdown in proper order

## 📁 Related Documentation

- `SAFE-STARTUP-GUIDE.md` - Complete usage guide
- `PORT-COMPLIANCE-RULES.md` - Port range rules and validation
- `WARP-RULES.md` - Parent B: drive rules

---

**REMEMBER: This system prevents the crashes and database errors you experienced. Always use the safe startup commands!**