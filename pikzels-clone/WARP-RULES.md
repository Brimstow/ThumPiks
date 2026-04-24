# Warp Agent Rules for WelawerksM1

## 🔥 CRITICAL RULE - B: Drive First Priority

**ALWAYS scan B: drive FIRST for development tools and servers before checking anywhere else.**

### Development Tools Locations:
- PostgreSQL: `B:\Thumbnail_maker\database\postgresql\`
- Redis: `B:\Thumbnail_maker\database\redis\`  
- Python: `B:\Thumbnail_maker\database\postgresql\pgAdmin 4\python\`
- All custom databases and development servers are on B: drive

### Search Priority Order:
1. **B: drive** - Primary development tools location
2. System PATH - Secondary check
3. Standard Windows locations (C: drive) - third check
4. Docker - last check

### Smart Tool Finder:
Use `.\find-tools.ps1` script to automatically locate tools with B: drive priority.

### Examples:
- ❌ Don't assume: "Let me check C:\Program Files\PostgreSQL"
- ✅ Do this: "Let me scan B: drive first for PostgreSQL"
- ❌ Don't assume: "Is Docker running?"  
- ✅ Do this: "Let me check B:\Thumbnail_maker\database\ first"

### Commands to Remember:
```powershell
# PostgreSQL (B: drive)
& "B:\Thumbnail_maker\database\postgresql\bin\pg_ctl.exe" status
& "B:\Thumbnail_maker\database\postgresql\bin\pg_ctl.exe" start -D "B:\Thumbnail_maker\database\postgresql\data"

# Redis (B: drive)  
& "B:\Thumbnail_maker\database\redis\redis-server.exe"

# Smart scan for all tools
.\find-tools.ps1
```

## Other Rules:
- All development projects are in `B:\Thumbnail_maker\`
- PostgreSQL runs on port 8565 (not default 5432)
- Redis runs on port 8520 (not default 6379)
- Always verify tools are running before troubleshooting application errors