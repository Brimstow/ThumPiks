# 🚀 Quick Start Guide

## Starting Your Development Environment

### ✅ **RECOMMENDED: Automated Startup with Monitoring**

This is the **BEST** way to start your dev environment - all services start automatically and will auto-restart if they crash:

```bash
# Step 1: Start all services (PostgreSQL, Redis, Backend, Frontend)
npm run start:all

# Step 2: Start the service monitor (auto-restart when services crash)
npm run monitor:start

# Step 3: Start coding!
# The monitor will automatically restart any service that crashes
```

**What happens:**
- ✅ PostgreSQL starts on port 8565
- ✅ Redis starts on port 8520
- ✅ Backend API starts on port 8550
- ✅ Frontend starts on port 8556
- ✅ Monitor watches all services every 30 seconds
- ✅ If frontend crashes (e.g., you make changes) → auto-restart
- ✅ If backend crashes → auto-restart

---

## 📋 Quick Commands

### Starting Services

```bash
# Start everything at once
npm run start:all

# Start databases only (PostgreSQL + Redis)
npm run start:databases

# Start apps only (Backend + Frontend)
npm run start:apps

# Check what's running
npm run start:check
```

### Monitoring

```bash
# Start service monitor (auto-restart enabled)
npm run monitor:start

# Stop service monitor
npm run monitor:stop

# Restart service monitor
npm run monitor:restart

# View monitor dashboard in browser
npm run monitor:dashboard
```

### Manual Restarts

```bash
# Full restart (all 4 services)
npm run dev:restart

# Quick restart (backend + frontend only)
npm run dev:quick

# Stop all services
npm run dev:stop
```

### Health Checks

```bash
# Check service health
npm run dev:health

# Check for port conflicts
npm run dev:conflicts

# Detailed port check
npm run monitor:ports
```

### Cleanup

```bash
# Kill all Node.js zombie processes
npm run zombie:kill:all

# Kill specific service
npm run zombie:kill:backend
npm run zombie:kill:frontend

# Clean up all ports in range
npm run ports:cleanup
```

---

## 🔗 Service URLs

Once everything is running:

- **Frontend:** http://localhost:8556
- **Backend API:** http://localhost:8550
- **Health Check:** http://localhost:8550/health
- **Admin Panel:** http://localhost:8550/admin
- **Service Monitor Dashboard:** http://localhost:8577
- **PostgreSQL:** localhost:8565
- **Redis:** localhost:8520

---

## 🛠️ Troubleshooting

### "Port already in use"

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or kill specific port
node kill-zombies.js --port 8550
```

### "PostgreSQL won't start"

```bash
# Check if B drive path exists
dir B:\Thumbnail_maker\database\postgresql\bin\

# Try manual start
cd B:\Thumbnail_maker\database\postgresql\bin
pg_ctl.exe -D "B:\Thumbnail_maker\database\postgresql\data" start -o "-p 8565"
```

### "Service monitor says down but it's running"

```bash
# Restart the monitor
npm run monitor:restart

# Check actual ports
netstat -an | findstr :85
```

### "Everything is broken, start fresh"

```bash
# 1. Kill everything
taskkill /F /IM node.exe
npm run dev:stop

# 2. Clean ports
npm run ports:cleanup

# 3. Start fresh
npm run start:all
npm run monitor:start
```

---

## 📊 Port Reference

| Service | Port | URL |
|---------|------|-----|
| PostgreSQL | 8565 | localhost:8565 |
| Redis | 8520 | localhost:8520 |
| Backend API | 8550 | http://localhost:8550 |
| Frontend | 8556 | http://localhost:8556 |
| Service Monitor | 8577 | http://localhost:8577 |

**ALL ports must be in range 8500-8599** (enforced by PORT-COMPLIANCE-RULES.md)

---

## 🎯 Development Workflows

### Workflow 1: Full Stack Development (with auto-restart)

```bash
# Start everything
npm run start:all

# Enable auto-restart
npm run monitor:start

# Code away! Services will auto-restart when they crash
```

### Workflow 2: Backend Only Development

```bash
# Start databases
npm run start:databases

# Start backend manually
npm run dev
```

### Workflow 3: Frontend Only Development

```bash
# Make sure backend is running
npm run start:check

# If backend isn't running, start it
npm run start:apps
```

### Workflow 4: Manual Control (no auto-restart)

```bash
# Start databases
npm run start:databases

# Open 2 terminals
# Terminal 1: Backend
npm run dev

# Terminal 2: Frontend
npm run dev:frontend
```

---

## 🔍 Checking Status

### Visual Status (Recommended)

```bash
# Open dashboard in browser
npm run monitor:dashboard
# Opens: http://localhost:8577
```

### Command Line Status

```bash
# Quick status
npm run start:check

# Detailed health
npm run dev:health

# Check ports
netstat -an | findstr :85
```

---

## ⚡ Pro Tips

1. **Always use `npm run start:all`** for initial startup - it handles the correct sequence
2. **Enable the service monitor** - it saves you from manually restarting crashed services
3. **Check the dashboard** (http://localhost:8577) - it shows real-time status
4. **Use `npm run dev:quick`** - faster than full restart when only backend/frontend changed
5. **Check logs** when something fails:
   - Service Monitor: `logs/service-monitor.log`
   - PostgreSQL: `B:\Thumbnail_maker\database\postgresql\logs\postgresql.log`

---

## 📚 Learn More

- **PORT_CONFIGURATION.md** - Complete port documentation
- **SERVICE_STARTUP_FIXES.md** - Detailed explanation of how everything works
- **service-monitor.config.js** - Customize monitoring behavior
- **start-all-services.js** - Unified startup script (read the code!)

---

## 🆘 Emergency Commands

### Nuclear Option (Reset Everything)

```bash
# 1. Stop monitor
npm run monitor:stop

# 2. Kill all Node processes
taskkill /F /IM node.exe

# 3. Stop PostgreSQL
cd B:\Thumbnail_maker\database\postgresql\bin
pg_ctl.exe -D "B:\Thumbnail_maker\database\postgresql\data" stop

# 4. Wait 5 seconds

# 5. Start fresh
npm run start:all
npm run monitor:start
```

### Just the Monitor

```bash
# If monitor is acting weird
npm run monitor:stop
timeout /t 3 /nobreak
npm run monitor:start
```

---

**Quick Start Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** Ready to use! 🎉