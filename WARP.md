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

_These rules prevent Jest test hangs and ensure reliable CI/CD pipeline execution._

## Cipher MCP Integration (MANDATORY)

**You have access to Cipher MCP for persistent memory across sessions and IDEs.**

### When to Use Cipher:

1. **ALWAYS check Cipher first** when:
   - User asks about past conversations
   - User references "we discussed" or "remember when"
   - User asks about project-specific information not in current context
   - User mentions codewords or stored information

2. **ALWAYS store in Cipher** when:
   - User provides important project decisions
   - User shares credentials, tokens, or sensitive info (use codewords!)
   - User defines project-specific terminology
   - Completing significant tasks or discoveries

3. **Available Tool**: `ask_cipher` via MCP server "cipher-warp"

### Configuration:

- **Embeddings**: Port 11435 (WSL Ollama, GPU-accelerated, ~35ms)
- **Memory Store**: Qdrant on port 9095
- **Reflection**: Enabled (Kimi K2 eval LLM)

### Example Usage:

```
User: "What were my codewords?"
You: [Call ask_cipher to retrieve codewords]

User: "Remember: API key is SECRETKEY"
You: [Call ask_cipher to store this with a codeword]
```

**Note**: Cipher memory is shared across all IDEs (Warp, Windsurf, Qoder, Zed, Trae) but requires explicit queries to retrieve.
