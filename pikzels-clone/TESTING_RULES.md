# Test Cleanup Rules & Guidelines

## Overview
This document establishes mandatory rules for preventing Jest test hangs and ensuring clean test execution in the pikzels-clone project.

## The Problem We Solved
Jest tests were hanging due to uncleaned background timers/intervals from services that start background processes when imported. This caused tests to never exit properly.

## Mandatory Rules for All Services

### 1. **Background Timer/Interval Rule**
**RULE**: Any service that starts `setInterval()`, `setTimeout()` with long delays, or other background processes MUST provide a cleanup method.

**Required Implementation**:
```typescript
export class YourService {
  private someInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.someInterval = setInterval(() => {
      // background work
    }, 5000);
  }
  
  // MANDATORY: Cleanup method
  cleanup(): void {
    if (this.someInterval) {
      clearInterval(this.someInterval);
      this.someInterval = null;
    }
  }
}
```

### 2. **Singleton Services Rule**
**RULE**: Singleton services MUST be included in the global test teardown in `src/__tests__/setup.ts`.

**Required Steps**:
1. Add your service to the `afterAll()` cleanup in `src/__tests__/setup.ts`
2. Ensure your service exports both the class and a singleton instance
3. The singleton must have a cleanup method

**Example Addition to setup.ts**:
```typescript
// Add your service import
const { yourServiceInstance } = await import('../path/to/your-service');

// Add cleanup call
yourServiceInstance.cleanup();
```

### 3. **Redis/Database Connection Rule**
**RULE**: Services that create Redis connections, database connections, or external service connections MUST clean them up.

**Required Implementation**:
```typescript
async cleanup(): Promise<void> {
  if (this.redis) {
    await this.redis.disconnect();
  }
  if (this.dbConnection) {
    await this.dbConnection.close();
  }
}
```

## Current Services Following These Rules

✅ **CacheService** - Clears memory cleanup & Redis retry intervals  
✅ **AnalyticsEventHandlers** - Clears batch processor interval  
✅ **SocialShareEventHandlers** - Clears retry processor interval  
✅ **SystemMonitoringService** - Clears health checks & metrics intervals  

## Testing Your Service

### Before Adding a New Service:
1. **Check for background processes**: Does your service start any intervals, timeouts, or background workers?
2. **Add cleanup method**: If yes, implement a `cleanup()` or `stop()` method
3. **Update global teardown**: Add your service to `src/__tests__/setup.ts`
4. **Test**: Run `npm test -- --detectOpenHandles` to verify no open handles

### Verification Commands:
```bash
# Test specific file without hanging
npm test -- --testPathPatterns=your-service.test.ts

# Check for open handles
npm test -- --detectOpenHandles

# Run full suite 
npm test
```

## Jest Configuration Rules

### Current Configuration (DO NOT MODIFY):
```javascript
// jest.config.js
{
  forceExit: true,           // Forces Jest to exit (safety net)
  testTimeout: 10000,        // 10 second timeout per test
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts']
}
```

**RULE**: The `forceExit: true` setting is a safety net but should NOT be relied upon. Always implement proper cleanup.

## Common Patterns That Cause Hangs

### ❌ BAD - Will cause hanging:
```typescript
export class BadService {
  constructor() {
    // This will keep Jest alive forever
    setInterval(() => {
      console.log('Background work');
    }, 30000);
  }
}
```

### ✅ GOOD - Proper cleanup:
```typescript
export class GoodService {
  private backgroundTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    this.backgroundTimer = setInterval(() => {
      console.log('Background work');
    }, 30000);
  }
  
  cleanup(): void {
    if (this.backgroundTimer) {
      clearInterval(this.backgroundTimer);
      this.backgroundTimer = null;
    }
  }
}
```

## Development Workflow

### When Creating New Services:
1. ⚠️  **BEFORE coding**: Ask "Does this service need background processes?"
2. 🔧 **DURING coding**: Implement cleanup methods alongside timer creation
3. 🧪 **AFTER coding**: Add to global teardown and test for hanging
4. ✅ **VERIFICATION**: Run `npm test -- --detectOpenHandles` to confirm

### When Modifying Existing Services:
1. Check if you're adding new timers/intervals
2. Update the cleanup method accordingly  
3. Test the specific service file for hanging
4. Verify full test suite still passes

## Emergency Debugging

If tests start hanging again:

1. **Identify the culprit**:
   ```bash
   npm test -- --detectOpenHandles
   ```

2. **Find the source**: Look at the stack trace to identify which service/file is creating uncleaned timers

3. **Fix pattern**: Add proper cleanup following the rules above

4. **Verify fix**: 
   ```bash
   npm test -- --testPathPatterns=problematic-file.test.ts
   ```

## Future Enforcement

**RULE**: All pull requests that add services with background processes MUST:
- [ ] Include cleanup methods
- [ ] Update global teardown in `setup.ts`
- [ ] Pass `npm test -- --detectOpenHandles` without warnings
- [ ] Include test execution time in PR description

---

**Remember**: Clean tests are fast tests. Following these rules ensures our test suite remains reliable and efficient.

*Last Updated: 2025-10-11*
*Established after resolving Jest hanging issues in project.service.test.ts*