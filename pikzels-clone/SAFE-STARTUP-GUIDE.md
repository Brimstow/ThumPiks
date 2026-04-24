# Safe Startup Guide - Pikzels Clone Project

## 🚀 Quick Start (Recommended)

### For Daily Development:
```bash
# 1. Check system health and start everything safely
npm run dev:safe

# 2. If you encounter issues, do a full restart
npm run dev:restart

# 3. For quick backend/frontend restart only
npm run dev:quick
```

## 🎯 The Problem This Solves

**Before:** Starting the server when it's already running causes crashes, database connection errors, and port conflicts.

**Now:** Automatic detection prevents conflicts and ensures clean startup every time.

## 📋 Available Commands

### NPM Scripts (Recommended):
```bash
npm run dev:safe       # Check health then start (safest option)
npm run dev:restart    # Full restart with conflict resolution
npm run dev:quick      # Quick restart (backend + frontend only)
npm run dev:stop       # Graceful shutdown of all services  
npm run dev:health     # Check system health and service status
npm run dev:conflicts  # Check for port conflicts
```

### Direct Script Usage:
```bash
# Service Detection
node services-detector.js --check          # Check all services
node services-detector.js --start-postgres # Start PostgreSQL only
node services-detector.js --kill-port 8565 # Kill process on specific port

# Graceful Shutdown
node graceful-shutdown.js --all            # Shutdown all services
node graceful-shutdown.js --service postgresql # Shutdown specific service
node graceful-shutdown.js --emergency      # Emergency force-kill all

# Smart Restart
node smart-restart.js --full               # Full restart with pre-flight checks
node smart-restart.js --quick              # Quick restart (backend+frontend)
node smart-restart.js --check              # Pre-flight checks only
```

## 🛡️ Automatic Conflict Prevention

### Port Range Enforcement:
- ✅ **PostgreSQL**: 8565 (Database)
- ✅ **Redis**: 8520 (Cache/Sessions)  
- ✅ **Backend**: 8550 (API Server)
- ✅ **Frontend**: 8556 (Vite Dev Server)
- ❌ **Port 3000**: REMOVED (causes conflicts)

### B Drive Path Priority:
Following `WARP-RULES.md`, all database tools are checked on B: drive first:
- PostgreSQL: `B:\Thumbnail_maker\database\postgresql\`
- Redis: `B:\Thumbnail_maker\database\redis\`

## 🔄 Startup Sequence

### Safe Startup Process:
1. **Pre-flight Checks**
   - Validate port range compliance (8500-8599)
   - Check for existing conflicts
   - Verify B drive database paths

2. **Graceful Shutdown** (if needed)
   - Frontend → Backend → Redis → PostgreSQL
   - Each service stopped properly before next

3. **Sequential Startup**
   - PostgreSQL → Redis → Backend → Frontend
   - Each service verified healthy before next

4. **Health Verification**
   - All services responding correctly
   - Database connections established
   - Frontend can communicate with backend

## 🚨 Error Recovery

### If Services Won't Start:
```bash
# 1. Emergency shutdown
npm run dev:stop

# 2. Check what's still running
npm run dev:health

# 3. Force kill conflicts if needed
node services-detector.js --kill-port 8565
node services-detector.js --kill-port 8550

# 4. Try full restart
npm run dev:restart
```

### If PostgreSQL Issues:
```bash
# Try alternative startup methods
node services-detector.js --start-postgres

# Or check PostgreSQL status manually
net start postgresql-x64-15
```

## 📊 Status Indicators

### Healthy System:
```
🟢 POSTGRESQL: RUNNING (PID: 1234)
🟢 REDIS:      RUNNING (PID: 5678) 
🟢 BACKEND:    RUNNING (PID: 9012)
🟢 FRONTEND:   RUNNING (PID: 3456)

🎯 System ready for application startup: ✅ YES
```

### Conflicted System:
```
🔴 POSTGRESQL: STOPPED
🔴 REDIS:      STOPPED
🚨 Conflicts detected:
   Port 8550: PID 1234 (conflicting process)
   Port 8565: PID 5678 (conflicting process)

🎯 System ready for application startup: ❌ NO
```

## ⚡ Quick Reference

### Most Common Scenarios:

**Starting development for the day:**
```bash
npm run dev:safe
```

**Server seems stuck/unresponsive:**
```bash
npm run dev:restart
```

**Backend changes made, need quick restart:**
```bash
npm run dev:quick
```

**Ending development session:**
```bash
npm run dev:stop
```

**Something's wrong, need to check:**
```bash
npm run dev:health
```

## 🔧 Configuration Files

### Critical Files (Auto-Maintained):
- `.env` - Port assignments (8500-8599 range)
- `client/vite.config.ts` - Frontend proxy configuration
- `services-detector.js` - Service detection logic
- `graceful-shutdown.js` - Shutdown procedures
- `smart-restart.js` - Restart orchestration

### Documentation:
- `PORT-COMPLIANCE-RULES.md` - Port range rules
- `WARP-RULES.md` - B drive path rules

## 🚫 What NOT to Do

❌ **Don't:**
- Run `npm run dev:all` directly without checking conflicts
- Use port 3000 for anything (causes conflicts)
- Kill processes manually with Task Manager
- Start services in wrong order
- Ignore health check warnings

✅ **Do:**
- Always use `npm run dev:safe` for first startup
- Use the provided scripts for shutdowns
- Check system health when things seem slow
- Follow the startup sequence for manual starts

## 🎓 Understanding the Scripts

### services-detector.js:
- Detects running services and conflicts
- Validates port range compliance  
- Can start PostgreSQL with multiple fallback methods
- Provides detailed health reports

### graceful-shutdown.js:
- Stops services in dependency order
- Tries graceful shutdown first, force-kill as last resort
- Handles service-specific shutdown procedures
- Prevents data corruption

### smart-restart.js:
- Orchestrates full restart sequence
- Runs pre-flight checks
- Handles service startup in correct order
- Provides comprehensive error reporting

---

**Remember: This system prevents the crashes and database connection errors you were experiencing. Always start with `npm run dev:safe`!** 🚀

<citations>
<document>
<document_type>RULE</document_type>
<document_id>9aHGc2Sai4Fd6VfsD6wL2p</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>JOMghyeSJPxDT5BrvoGOBK</document_id>
</document>
<document>
<document_type>RULE</document_type>
<document_id>ay5unP8aouFUfkFX6fnh9I</document_id>
</document>
</citations>