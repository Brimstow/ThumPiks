# Service Factory Pattern

**Load this file when:** Creating or modifying backend services, working with service registry, or dealing with singleton cleanup issues.

---

## Core Principle

**Always** use service factory functions instead of direct singleton access.

---

## Pattern Usage

### CORRECT:

```typescript
import { getService } from "../utils/service-factory";

// Type-safe service access
const cache = getService("cache");
await cache.set("user:123", userData, 300);
```

### INCORRECT:

```typescript
import { CacheService } from "../services/cache.service";

// Direct singleton access (discouraged)
const cache = CacheService.getInstance();
await cache.set("user:123", userData, 300);
```

---

## Why Factory Pattern

### Problems with Direct Singleton Access:

1. **Global State Coupling** - Hard to track who's using the singleton
2. **Manual Cleanup** - Developers must remember to update `setup.ts`
3. **Testing Complexity** - Difficult to mock or reset state

### Benefits of Factory Pattern:

1. **Centralized Control** - Single point of service access
2. **Automatic Cleanup** - Factory handles lifecycle management
3. **Type Safety** - TypeScript ensures valid service names
4. **Extensibility** - Easy to add new services to registry

---

## Auto-Cleanup Registry

Services using the factory are automatically cleaned up:

```typescript
import { getServiceWithAutoCleanup } from "../utils/auto-cleanup";

// Service automatically registered for cleanup
const cache = getServiceWithAutoCleanup("cache");
// cleanup() called automatically after test suite!
```

**Benefits:**

- No manual `setup.ts` updates needed
- Services cleaned up automatically after tests
- Graceful error handling (non-fatal)
