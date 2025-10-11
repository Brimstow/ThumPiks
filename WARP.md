# Thumbnail_maker Project Rules

## Test Cleanup Rules (MANDATORY)

**Background**: Jest tests were hanging due to uncleaned background timers/intervals. This has been fixed but must be enforced for all future code.

### Service Development Rules:

1. **Timer/Interval Rule**: Any service that uses `setInterval()`, `setTimeout()` with delays > 1000ms, or background processes MUST implement a `cleanup()` method that clears all timers.

2. **Singleton Cleanup Rule**: All singleton services with cleanup methods MUST be added to the global teardown in `src/__tests__/setup.ts`.

3. **Connection Cleanup Rule**: Services creating Redis, database, or external connections MUST clean them up in their cleanup methods.

4. **Verification Rule**: Before committing code that adds services with background processes:
   - Run `npm test -- --detectOpenHandles` to verify no open handles
   - Ensure tests complete without hanging
   - Update `src/__tests__/setup.ts` if adding new singleton services

### Current Compliant Services:
- CacheService
- AnalyticsEventHandlers  
- SocialShareEventHandlers
- SystemMonitoringService

### Emergency Commands:
```bash
# Check for hanging tests
npm test -- --detectOpenHandles

# Test specific file
npm test -- --testPathPatterns=your-file.test.ts
```

**Reference**: See `pikzels-clone/TESTING_RULES.md` for complete implementation guidelines.

---

*These rules prevent Jest test hangs and ensure reliable CI/CD pipeline execution.*
