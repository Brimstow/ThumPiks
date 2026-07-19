# Server Lifecycle Management

**Load this file when:** Task requires server restart, rebuild, port operations, or deployment. IGNORE for code-only tasks.

---

## Conditional Execution Logic

```
IF (task requires server restart/rebuild/test):
    -> Use the ports and commands below as parameters
    -> Execute with explicit user permission
ELSE:
    -> Ignore this entire file
    -> Do not execute any server commands
```

---

## Port Configuration

| Service  | Port | URL                      |
| -------- | ---- | ------------------------ |
| Frontend | 8556 | http://localhost:8556    |
| Backend  | 8550 | http://localhost:8550    |
| Redis    | 8520 | redis://localhost:8520   |

---

## Commands

```bash
npm run stop:all      # Stop all servers
npm run build:all     # Build all services
npm run start:all     # Start all servers
```

**Full restart sequence (when needed):**

```bash
npm run stop:all && npm run build:all && npm run start:all
```

---

## When to Apply

**USE these parameters when:**

- User explicitly requests rebuild/restart
- Testing with Playwright MCP (use correct port)
- Port conflict errors occur (EADDRINUSE)
- User reports stale content or "site not loading"

**IGNORE these parameters when:**

- Task is code-only (editing, reading, searching)
- Task is documentation or planning
- No server interaction required
- User hasn't requested any server operations

---

## Verification (After Server Restart)

1. Login page appears -> Cache cleared, frontend rebuilt
2. No console errors -> Check DevTools
3. Correct port responded -> `http://localhost:8556`
