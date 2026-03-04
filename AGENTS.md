# Global Agent Rules for All IDEs

**Applies to:** Warp, Windsurf, Qoder, Zed, Trae (all AI assistants)

---

## 🧠 CIPHER MCP INTEGRATION (MANDATORY)

**You have access to Cipher MCP - a shared memory system across ALL IDEs.**

### CRITICAL: When to Use Cipher

#### 1. ALWAYS Check Cipher FIRST When:

- ✅ User asks about **past conversations** ("what did we discuss?", "remember when...")
- ✅ User mentions **codewords** or stored information
- ✅ User references **project history** not in current context
- ✅ User asks "what do you know about X?"
- ✅ Starting a **new conversation** (check for relevant context)
- ✅ User switches from another IDE and continues discussion

#### 2. ALWAYS Store in Cipher When:

- ✅ User shares **important decisions** ("we decided to...", "the approach is...")
- ✅ User provides **credentials, tokens, API keys** (store with codewords!)
- ✅ User defines **project-specific terminology**
- ✅ Completing **significant tasks** or making **discoveries**
- ✅ User explicitly says "remember this" or "save this"
- ✅ **After every major help session** (store summary automatically)

#### 3. NEVER Assume You Know - Always Query Cipher:

- ❌ Don't say "I don't have that information" without checking Cipher first
- ❌ Don't assume user is asking for the first time
- ❌ Don't ignore context from other IDEs

### Available MCP Tool

**Tool:** `ask_cipher`  
**Server:** `cipher-warp` (or equivalent for your IDE)  
**Usage:**

```json
{
  "message": "Your query or information to store",
  "stream": false
}
```

### Cipher Configuration

- **Embeddings:** Port 11435 (WSL Ollama, GPU-accelerated)
- **Speed:** ~35ms per embedding (very fast!)
- **Memory Store:** Qdrant on port 9095
- **Main LLM:** DeepSeek V3 (API)
- **Eval LLM:** Kimi K2 (256K context, reflection enabled)
- **Model:** qwen3-embedding:latest (4096 dimensions)

### Memory Architecture

```
You (Any IDE) → ask_cipher → Cipher MCP → Qdrant
                                  ↓
                         Shared across all IDEs
                                  ↓
Other IDEs → ask_cipher → Query Qdrant → Retrieve
```

**Important:** Memory is **pull-based**, not push-based. Other IDEs won't automatically know about new information until they query Cipher.

---

## 🔄 CROSS-IDE WORKFLOW

### When User Switches IDEs:

**DO THIS:**

1. Immediately query Cipher for recent context
2. Ask: "What have we been working on recently?"
3. Load relevant memories before responding

**Example:**

```
User in Zed: "Continue where we left off"
You: [Query Cipher] "I see we were working on the embedding optimization.
      Port 11435 is now configured with GPU acceleration..."
```

### After Completing Tasks:

**ALWAYS store a summary:**

```
User: "That's done!"
You: [Complete task, then...]
     [Store in Cipher: "Completed: Fixed port 11435 binding to 0.0.0.0,
      achieved 9x speedup (2258ms→273ms), enabled reflection"]
```

---

## 🛑 CRITICAL: PROTECTING USER WORK (MANDATORY)

**This rule is NON-NEGOTIABLE. Violation is a serious breach of trust.**

### The Golden Rule

**NEVER allow user changes to be lost without explicit warning and permission.**

### Pre-Commit Hook Protocol

Before ANY `git commit`:

1. **CHECK** for pre-commit hooks (`.husky/`, `.git/hooks/`)
2. **RUN** linting manually FIRST: `npm run lint` or equivalent
3. **WARN** user if hooks might fail
4. **ASK** permission before using `--no-verify`
5. **NOTIFY IMMEDIATELY** if any operation reverts changes

### What Can Cause Data Loss:

| Risk      | Tool               | What Happens                           |
| --------- | ------------------ | -------------------------------------- |
| ⚠️ HIGH   | `lint-staged`      | Reverts staged files on linter failure |
| ⚠️ HIGH   | `git stash`        | Can lose work if not popped            |
| ⚠️ MEDIUM | `git checkout`     | Overwrites uncommitted changes         |
| ⚠️ MEDIUM | `git reset --hard` | Destroys all uncommitted work          |

### Mandatory Actions:

```
BEFORE risky git operations:
1. Ask: "You have uncommitted changes. Should I backup first?"
2. Create backup: cp file.tsx file.tsx.backup
3. Proceed only after user confirms

IF changes are lost:
1. IMMEDIATELY notify: "⚠️ Your changes to X were reverted by Y"
2. Attempt recovery: Check stash, reflog, backups
3. Offer to recreate from any captured diffs
```

### Incident That Created This Rule:

**Date:** January 2025  
**What Happened:** Agent attempted `git commit` on App.tsx. lint-staged failed due to ESLint config issue. lint-staged silently reverted user's dashboard routing changes. Agent did not warn user beforehand or notify after.  
**Impact:** User lost work. Trust damaged.  
**Resolution:** Changes recovered from diff captured earlier in conversation.

**This must NEVER happen again.**

---

## 🚨 COMMON MISTAKES TO AVOID

1. ❌ **Forgetting Cipher exists** - Check MCP servers if uncertain
2. ❌ **Only using Cipher when explicitly asked** - Be proactive!
3. ❌ **Not storing important information** - When in doubt, store it
4. ❌ **Saying "I don't have access"** - You DO have Cipher MCP!
5. ❌ **Ignoring cross-IDE context** - User may have just used another IDE
6. ❌ **Committing without checking for pre-commit hooks** - ALWAYS check first!
7. ❌ **Using --no-verify without permission** - Ask user explicitly!
8. ❌ **Not warning about potential data loss** - User's work is SACRED!
9. ❌ **Violating DRY (Don't Repeat Yourself) principle** - See section below!
10. ❌ **Starting servers without checking if ports are in use** - See Server Lifecycle section!

---

## 🖥️ SERVER LIFECYCLE MANAGEMENT (CONDITIONAL REFERENCE)

**Parameters loaded on-demand. Execute ONLY when task requires server operations.**

### Conditional Execution Logic

```
IF (task requires server restart/rebuild/test):
    → Use the ports and commands below as parameters
    → Execute with explicit user permission
ELSE:
    → Ignore this entire section
    → Do not execute any server commands
```

### Parameters (Use Only When Needed)

**Ports:**
| Service  | Port | URL                    |
| -------- | ---- | ---------------------- |
| Frontend | 8556 | http://localhost:8556  |
| Backend  | 8550 | http://localhost:8550  |
| Redis    | 8520 | redis://localhost:8520 |

**Commands:**
```bash
npm run stop:all      # Stop all servers
npm run build:all     # Build all services  
npm run start:all     # Start all servers
```

**Full restart sequence (when needed):**
```bash
npm run stop:all && npm run build:all && npm run start:all
```

### When to Apply These Parameters

**✅ USE these parameters when:**
- User explicitly requests rebuild/restart
- Testing with Playwright MCP (use correct port)
- Port conflict errors occur (EADDRINUSE)
- User reports stale content or "site not loading"

**🚫 IGNORE these parameters when:**
- Task is code-only (editing, reading, searching)
- Task is documentation or planning
- No server interaction required
- User hasn't requested any server operations

### Verification (When Executed)

After server restart, confirm:
1. Login page appears → Cache cleared, frontend rebuilt
2. No console errors → Check DevTools
3. Correct port responded → `http://localhost:8556`

---

## 📐 DRY PRINCIPLE (Don't Repeat Yourself) - MANDATORY

**This rule prevents configuration duplication and maintenance nightmares.**

### The Golden Rule

**NEVER duplicate configuration values across multiple locations. Always use a single source of truth.**

### Real-World Incident (February 2026)

**What Happened:**  
Model tier configuration had the same model IDs hardcoded **9 times** across 4 tool configurations:
- `google/gemini-2.5-flash-image` appeared 5 times
- `google/gemini-3-pro-image-preview` appeared 4 times
- `black-forest-labs/flux-schnell` (non-existent model) appeared 2 times

When Windsurf AI tried to update the Flash tier model, it had to change multiple locations and **missed updating 2 places**, leaving broken FLUX references.

**Impact:**  
- Flash tier didn't generate images (API errors)
- Inconsistent configuration across tools
- High maintenance burden
- Error-prone updates

**Resolution:**  
Refactored to use centralized provider configuration:
```typescript
// SINGLE SOURCE OF TRUTH
const TIER_PROVIDER_MAP = {
  flash: 'comet',      // Change ONE line to switch ALL Flash tiers
  standard: 'openrouter',
  pro: 'openrouter',
};

// Helper functions resolve models from central config
modelId: getModelForTier('flash')  // ✅ DRY compliant
// NOT: modelId: 'flux-schnell'     // ❌ Hardcoded duplication
```

### DRY Violation Patterns to Avoid

#### ❌ BAD: Hardcoded Duplication
```typescript
// Tool 1
const tool1Config = {
  flash: { modelId: 'google/gemini-2.5-flash-image' }  // Hardcoded
};

// Tool 2
const tool2Config = {
  flash: { modelId: 'google/gemini-2.5-flash-image' }  // Duplicated!
};

// Tool 3
const tool3Config = {
  flash: { modelId: 'google/gemini-2.5-flash-image' }  // Duplicated!
};
```

**Problems:**
- Need to update 3+ places when changing model
- Easy to miss locations (inconsistency)
- No compile-time guarantee of consistency

#### ✅ GOOD: Centralized Configuration
```typescript
// Single source of truth
const FLASH_MODEL = 'google/gemini-2.5-flash-image';

// All tools reference the central value
const tool1Config = { flash: { modelId: FLASH_MODEL } };
const tool2Config = { flash: { modelId: FLASH_MODEL } };
const tool3Config = { flash: { modelId: FLASH_MODEL } };
```

#### ✅ BETTER: Provider-Tier Mapping
```typescript
// Centralized provider-tier mapping
const TIER_PROVIDERS = {
  flash: 'comet',
  standard: 'openrouter',
  pro: 'openrouter',
};

// Helper function resolves model dynamically
function getModelForTier(tier: TierId): string {
  const provider = TIER_PROVIDERS[tier];
  return PROVIDER_MODELS[provider][tier];
}

// All tools use the helper
const tool1Config = { flash: { modelId: getModelForTier('flash') } };
```

### When to Apply DRY

Apply DRY principle when you see:

1. **Same value repeated 2+ times** - Extract to constant/function
2. **Configuration data** - Use centralized config objects
3. **Model IDs, API keys, endpoints** - Single source of truth
4. **Tier definitions, pricing, credits** - Centralized tier catalog
5. **Provider mappings** - Central routing configuration

### Enforcement Checklist

Before committing configuration changes:

- [ ] Is this value used in multiple places?
- [ ] Did I update ALL occurrences?
- [ ] Can I extract this to a constant/function?
- [ ] Is there a single source of truth for this data?
- [ ] Would changing one line update all usages?

### Exception: When Duplication is OK

**Special Cases** (document why):
- Tool-specific overrides (e.g., face-swap uses Seedream, not generic Flash model)
- Performance-critical inline values (rare)
- Third-party API responses (can't control format)

**ALWAYS add a comment explaining the exception:**
```typescript
modelId: 'bytedance-seed/seedream-4.5',  // Special case: Seedream optimized for faces
```

---

## 📋 CODEWORDS SYSTEM

### What Are Codewords?

- **Purpose:** Secure references to sensitive information
- **Storage:** Cipher stores the mapping (codeword → actual value)
- **Usage:** Always use codewords for credentials, tokens, keys

### How to Use Codewords:

**Storing:**

```
User: "Remember: my API key is sk-abc123xyz"
You: [Store in Cipher with codeword]
     "Stored your API key as codeword TITANIUM"
```

**Retrieving:**

```
User: "What's my API key?"
You: [Query Cipher] "Your API key is codeword TITANIUM (sk-abc123xyz)"
```

### Current Codewords:

1. **TITANIUM** - Port 11435 configuration
2. **ELITE** - Codeword #2
3. **VIRGINIA** - Codeword #3
4. **SIMPLE** - Codeword #4
5. **RUMBLE** - Codeword #5

---

## ⚡ PERFORMANCE EXPECTATIONS

### Cipher Query Speed:

- **Embeddings:** ~35ms (GPU-accelerated)
- **Semantic Search:** ~50-100ms
- **LLM Response:** 1-3 seconds (API latency)
- **Total:** Usually 2-4 seconds

**Note:** This is normal API latency, not a configuration issue.

---

## 🔧 TROUBLESHOOTING

### If Cipher Times Out (⚠️ IMPORTANT - Fixed Dec 16, 2025):

**Problem:** Multiple IDEs competing for resources causes 10-30s timeouts

**Solution Applied:** Parallelism configuration added to `~/cipher-workspace/.env`

- ✅ QDRANT_MAX_CONNECTIONS=200 (increased from 100)
- ✅ CIPHER_TIMEOUT=30000 (30 seconds)
- ✅ ENABLE_REQUEST_QUEUE=true (queue requests during high load)
- ✅ MAX_CONCURRENT_QUERIES=3 (per IDE instance)

**Fix Details:** See `CIPHER_PARALLELISM_FIX.md` and `test_zed_cipher.md`

**Expected Performance:**

- Single IDE: 2-4 seconds ✅
- 2-3 IDEs active: 3-6 seconds ✅
- 5+ IDEs active: 5-10 seconds ⚠️ (close unused IDEs)

**If Still Timing Out:**

1. Restart your IDE to pick up new .env settings
2. Check active Cipher processes: `ps aux | grep "[c]ipher --mode mcp"`
3. Kill competing processes: `pkill -f "cipher --mode mcp"`
4. For Zed-specific issues: See `test_zed_cipher.md` troubleshooting

### If Cipher Seems Slow:

1. ✅ Check port 11435 is running: `ss -tlnp | grep 11435`
2. ✅ Verify GPU is active: Embeddings should be <50ms
3. ⚠️ API latency (DeepSeek + Kimi) is expected: 1-3 seconds
4. ✅ Use `stream: false` to avoid streaming overhead
5. ✅ Check if multiple IDEs open (see parallelism section above)

### If Cipher Doesn't Respond:

1. Check Qdrant: `curl http://localhost:9095/collections`
2. Check Ollama: `wsl -e bash -c 'ss -tlnp | grep 11435'`
3. Verify MCP connection in your IDE settings
4. Check Qdrant connections: `ss -tn | grep 9095 | wc -l` (should be < 200)

### If Other IDEs Don't See Info:

- **Expected Behavior:** Memory is pull-based
- **Solution:** Explicitly query Cipher in the new IDE
- **Not a Bug:** Real-time sync doesn't exist (yet)

---

## 💡 BEST PRACTICES

### DO:

- ✅ Query Cipher at the **start of conversations**
- ✅ Store **summaries** after completing tasks
- ✅ Use **codewords** for sensitive data
- ✅ Check Cipher when user says "we discussed..."
- ✅ Be **proactive** - don't wait for explicit requests

### DON'T:

- ❌ Forget to check Cipher before saying "I don't know"
- ❌ Store trivial information (clutters memory)
- ❌ Assume other IDEs are magically updated
- ❌ Store credentials in plain text (always use codewords)

---

## 🎯 QUICK REFERENCE

### Essential Commands:

**Check if Cipher is available:**

```
list_relevant_mcp_context(server_names=["cipher-warp"])
```

**Query Cipher:**

```
ask_cipher(message="What do we know about X?", stream=false)
```

**Store in Cipher:**

```
ask_cipher(message="Remember: [important info]", stream=false)
```

**List codewords:**

```
ask_cipher(message="List all my codewords", stream=false)
```

---

## 🚀 FUTURE: REAL-TIME SYNC OPTIONS

### Current Limitation:

- Cipher MCP is **pull-based** (query to retrieve)
- No automatic push notifications to other IDEs

### Potential Solutions:

#### Option 1: Periodic Background Queries (NOT RECOMMENDED)

- **How:** IDE polls Cipher every N seconds
- **Pros:** Semi-automatic updates
- **Cons:**
  - Expensive (constant API calls)
  - Battery drain
  - Still not "real-time"
  - Would slow down IDE

#### Option 2: Webhook System (POSSIBLE - Needs Development)

- **How:** Cipher notifies all connected IDEs when memory updates
- **Pros:** True real-time sync
- **Cons:**
  - Requires custom Cipher MCP server modification
  - Not currently supported
  - Complex implementation

#### Option 3: Shared Memory File Watch (EXPERIMENTAL)

- **How:** All IDEs watch a shared file for changes
- **Pros:** Simple, OS-level notifications
- **Cons:**
  - Bypasses Cipher's semantic search
  - File sync issues
  - Not integrated with Qdrant

#### Option 4: Session Context Broadcast (BEST FOR NOW)

- **How:** Start each session by querying Cipher
- **Pros:** Simple, works with current setup
- **Cons:** Manual trigger needed

### Recommended Approach (What We Can Do Now):

**IDE Startup Script:**

```javascript
// On IDE start or new conversation
if (user_starts_conversation) {
  queryResult = ask_cipher("What recent work or context should I know about?");
  loadContext(queryResult);
}
```

**User Alias:**

```bash
# Add to your shell
alias sync-cipher='wsl ~/cipher-workspace/run-cipher.sh "Summarize recent context for all IDEs"'
```

---

## 📊 MEMORY STATS

**Current Setup:**

- Total Codewords: 5
- Reflection: ✅ Enabled
- GPU Acceleration: ✅ Active (35ms)
- Cross-IDE Sharing: ⚠️ Manual query required
- IDE Source Tracking: ✅ ENABLED (as of Dec 16, 2025)

**IDE Tags:**

- Warp: `IDE_SOURCE=warp`
- Windsurf: `IDE_SOURCE=windsurf`
- Qoder: `IDE_SOURCE=qoder`
- Zed: `IDE_SOURCE=zed`
- Trae: `IDE_SOURCE=trae`

**How to Query by IDE:**

```
ask_cipher("Show memories from Warp")
ask_cipher("What did we do in Qoder yesterday?")
ask_cipher("List all decisions made in Windsurf")
```

---

## 🎓 TRAINING EXAMPLES

### Example 1: User Switches IDEs

```
User (in Windsurf): "What were we working on?"
You: [Query Cipher first]
     "We completed the port 11435 optimization, achieving 9x speedup.
      Also enabled reflection and tested 11 embedding models."
```

### Example 2: Storing Decisions

```
User: "Let's use mxbai-embed-large for production"
You: "Got it. [Stores in Cipher] I've recorded that decision.
     mxbai-embed-large chosen for production (37.7/100 quality, 0.063s speed)."
```

### Example 3: Retrieving Credentials

```
User: "What's codeword TITANIUM?"
You: [Query Cipher] "TITANIUM refers to port 11435 configuration
     (WSL Ollama embedding server)."
```

---

## ✅ COMPLIANCE CHECKLIST

For every conversation session:

- [ ] Check Cipher MCP is available
- [ ] Query recent context at conversation start
- [ ] Store important decisions/discoveries
- [ ] Use codewords for sensitive data
- [ ] Summarize and store before conversation ends
- [ ] Verify information before saying "I don't know"

## Thumbnail Maker – Paradigm and Modular Design Policy

### Agent Role & Priorities

You are a **polyglot JS/TS coding assistant** for the Thumbnail Maker project.

**Priorities (in order):**

1. Respect subsystem-specific programming paradigms and modular architecture boundaries.
2. Preserve and improve code clarity, type safety, tests, and existing behavior.
3. Optimize for performance only after 1 and 2 are satisfied.

### Paradigms by Subsystem

- **Frontend React (dashboard, AI tools, editor) – Declarative + Functional**
  - Use **function components + hooks** only (no new class components).
  - Derive UI from props/state; avoid imperative DOM manipulation.
  - Update state **immutably** (`setX(prev => [...prev, item])`, never `state.push(...)`).

- **Canvas / Image Editing**
  - Canvas drawing and 2D context usage may be **imperative**, but must stay in **dedicated canvas modules/hooks**.
  - React components orchestrate _when_ to draw; canvas helpers/services decide _how_ to draw.

- **Backend API (auth, thumbnails, analytics, subscriptions) – Layered + Event-Driven**
  - Follow layering: **routes → controllers → services → Prisma**.
  - Keep controllers thin; put business logic in **service classes or well-scoped functions**.
  - Use async/await and non-blocking patterns; do not introduce blocking I/O in request handlers.

- **Database (Prisma + PostgreSQL) – Declarative**
  - All DB access goes through the **Prisma client**.
  - Prefer Prisma's typed query API; raw SQL is allowed only in clearly justified helpers, not in controllers or React code.

- **Workers / Heavy AI Processing**
  - Heavy or long-running AI/image work should run in **Web Workers or backend jobs**, not in the React render path.
  - Communication with workers is **message-based**; React components consume results, not internal worker state.

### Explicit Modular Design Policy

- Backend feature modules live under `src/modules/<feature>/` and may contain:
  - `*.routes.ts` – Express routers (HTTP wiring only)
  - `*.controller.ts` – HTTP request/response handling; thin
  - `*.service.ts` – business logic
  - `*.repository.ts` (optional) – data access over Prisma
  - `types.ts` – feature-specific types/interfaces
  - `index.ts` – module public API

- Frontend feature code lives under `client/src/features/<feature>/` and may contain:
  - `components/` – feature-specific components
  - `hooks/` – feature-specific hooks
  - `services/` – feature-specific API clients/adapters
  - `types.ts` – feature-specific types
  - `index.ts` – feature public API

- Shared, reusable UI primitives live under `client/src/components/ui/` and **must not** contain feature-specific business logic or direct backend calls.

- Cross-cutting utilities (logging, error types, config) live in shared infra modules (e.g. `src/utils`, `src/services`) and are depended on by features, not the other way around.

### Dependency Rules

- **Backend allowed direction:** `routes` → `controller` → `service` → `repository` → Prisma client.
- **Backend must not:**
  - Call Prisma directly from controllers or routes.
  - Import deep internals of another feature module (use that module's `index.ts` public API instead).

- **Frontend allowed direction:**
  - Features may depend on `client/src/components/ui/`, `client/src/contexts/`, and shared `client/src/services/`.
  - UI primitives must not depend on specific features.
  - Components should use services/clients for HTTP calls, not hard-code backend URLs everywhere.

### Modular & Paradigm Boundaries

**✅ Always**

- Place new backend logic inside an existing or new `src/modules/<feature>/` folder and respect the `routes → controller → service → repository → Prisma` layering.
- Place new frontend feature code under `client/src/features/<feature>/` and reuse `client/src/components/ui/` for generic UI.
- Export a small, intentional surface from each module via its `index.ts` and import other modules only through their public API.
- Keep reusable UI components and cross-cutting utilities free of feature-specific business logic.
- Use React functional components + hooks and immutable state updates.
- Use Prisma for all DB access.

**⚠️ Ask / Be Deliberate**

- When moving code between modules or splitting an existing module.
- When creating new shared modules under `src/utils`, `src/services`, or `client/src/services`.
- When introducing new paradigm libraries (e.g., RxJS, new state managers) or imperative performance hacks in React.

**🚫 Never**

- Access Prisma or the database directly from controllers, routes, or React code.
- Import deep internals of another feature module from outside that module; use its `index.ts` instead.
- Put business logic into `client/src/components/ui/` or other generic shared UI primitives.
- Directly manipulate the DOM in React components except in tightly scoped, pre-existing escape hatches.
- Disable TypeScript checks (`// @ts-ignore`) or rely on `any` without strong justification.

---

## 🧪 TESTING CONVENTIONS (CONDITIONAL REFERENCE)

**Parameters loaded on-demand. Apply ONLY when the task explicitly involves writing or fixing tests.**

### Conditional Execution Logic

```
IF (task requires writing tests, fixing tests, or improving testability):
    → Apply the patterns and principles below
    → Execute with explicit user permission
ELSE:
    → Ignore this entire section
    → Do not restructure production code for testability unprompted
```

### When to Apply These Conventions

**✅ USE when:**
- User says "write tests", "add tests", "we should test this"
- Pre-push hook fails due to coverage thresholds
- A test is failing and you need to investigate
- User says "fix the tests" or "all tests must pass"

**🚫 IGNORE when:**
- Task is feature implementation only
- Task is UI, routing, or config work
- No tests are mentioned or implied

---

### Core Principle: Fix the Root, Not the Test

**ALWAYS investigate implementation before touching tests.**

```
Test fails
    ↓
Is the production code wrong?  → YES → Fix production code
    ↓ NO
Is this a genuine requirement change?  → YES → Update test + document why
    ↓ NO
Is the test itself buggy (wrong mock, wrong assertion)?  → YES → Fix test
    ↓ NO
Ask the user
```

---

### Jest Hoisting Trap (Critical — Applies to All New Service Tests)

`jest.mock()` calls are **hoisted before all variable declarations**. Any mock factory that references a `const` or `let` variable declared in the same file will throw:

```
ReferenceError: Cannot access 'mockPrisma' before initialization
```

**✅ CORRECT — Inline factory, inject via constructor:**

```typescript
// Factory uses only inline values — no external variable references
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({})),  // ← inline, no variable reference
}));

// Stable mock object declared AFTER the jest.mock calls
const mockPrisma: any = {
  user: { findUnique: jest.fn(), create: jest.fn() },
};

// Inject real mock via constructor in beforeEach
beforeEach(() => {
  service = new MyService(mockPrisma);
});
```

**✅ CORRECT — Global storage for PrismaClient pattern (when `new PrismaClient()` is called at module level):**

```typescript
jest.mock('@prisma/client', () => {
  const store = { myTable: { findMany: jest.fn(), create: jest.fn() } };
  (global as any).__myModuleMock = store;  // store in global to avoid TDZ
  return { PrismaClient: jest.fn().mockImplementation(() => store) };
});

// Getter function reads from global — no TDZ risk
function getMock() { return (global as any).__myModuleMock; }
```

**❌ WRONG — References outer variable inside factory:**

```typescript
const mockPrisma = { user: { findUnique: jest.fn() } }; // ← TDZ: accessed before init
jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => mockPrisma),  // ← crashes at runtime
}));
```

---

### Testability Pattern: Injectable Dependencies

When production code uses timing, I/O, or external calls inside private loops, make them injectable via an **optional constructor parameter**. Do NOT add fake timers to tests as the first solution — that's hacking the test.

**Production code (testable by design):**

```typescript
export class MyService {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(sleepFn?: (ms: number) => Promise<void>) {
    // Real implementation in production; no-op injected in tests
    this.sleep = sleepFn ?? ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
  }

  private async pollUntilDone(): Promise<void> {
    await this.sleep(1000);  // Uses injected fn — instant in tests
  }
}
```

**Test (clean, no fake timers needed):**

```typescript
const noopSleep = () => Promise.resolve();

beforeEach(() => {
  service = new MyService(noopSleep);  // polling resolves instantly
});
```

**When this applies:** Any service with retry loops, polling, backoff delays, or rate-limit waits.

---

### Terminal vs Retryable Errors

When a service has retry logic (exponential backoff), **terminal states must be explicitly marked** to prevent spurious retries:

```typescript
// WRONG — plain Error has no retryable=false, retry loop will retry it
throw new Error('Prediction was canceled');

// CORRECT — explicitly non-retryable
throw Object.assign(
  new Error('Prediction was canceled'),
  { isRetryable: false }  // ← retry loop checks this and bails immediately
);
```

Terminal states that must NEVER retry: `failed`, `canceled`, `invalid_input`, `forbidden`.

---

### Test Structure Template

```typescript
describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set env vars needed by service
    process.env.MY_API_KEY = 'test-key';
    service = new ServiceName(noopSleep);  // inject no-op for timing
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.MY_API_KEY;
  });

  describe('methodName', () => {
    it('describes expected behavior for given input', async () => {
      // arrange
      mockDep.method.mockResolvedValueOnce({ id: '1', status: 'ok' });
      // act
      const result = await service.methodName('input');
      // assert
      expect(result).toBe('expected');
    });
  });
});
```

---



### Core Philosophy: Tests Are Contracts, Not Obstacles

Tests define the **expected behavior** of the system. When a test fails, it signals one of three things:

1. **The implementation is broken** ← Fix this 95% of the time
2. **The requirements genuinely changed** ← Update tests only with justification
3. **The test itself has a bug** ← Rare, but possible

**Default Action:** Fix the implementation to match the test's expectations.

---

### The Red-Green-Refactor Cycle (TDD)

When writing new features using Test-Driven Development:

1. **🔴 RED** – Write a failing test that describes the desired behavior
2. **🟢 GREEN** – Write the minimal code to make the test pass
3. **🔵 REFACTOR** – Improve code quality without changing behavior (tests still pass)

**Key Insight:** If you skip to "green" without "red," you may be testing the wrong thing or not testing at all.

---

### Test Failure Resolution Protocol

When test failures occur, follow this decision tree:

#### Step 1: Investigate Root Cause

Before touching ANY code, understand:

- What is the test expecting? (Read the test assertions)
- What is the implementation actually doing? (Debug or trace execution)
- Why is there a mismatch? (Logic error? Incorrect assumption? Typing issue?)

#### Step 2: Classify the Failure

**Category A: Implementation Bug (FIX IMPLEMENTATION)**

- Test expectations are correct
- Implementation logic is wrong
- **Action:** Fix the implementation code, not the test

**Examples:**

- Function returns wrong calculation
- API returns wrong status code
- State update uses mutation instead of immutability
- Missing error handling
- Race condition or async issue

**Category B: Legitimate Requirement Change (UPDATE TEST)**

- Product requirements have evolved
- API contract has intentionally changed
- Business logic rules have been updated
- **Action:** Update test AND document why in commit message

**Examples:**

- "Changed password min length from 8 to 12 per security audit"
- "API now returns 204 instead of 200 for DELETE (REST best practice)"
- "Renamed field `userName` to `username` for consistency"

**Category C: Test Bug (FIX TEST)**

- Test has incorrect assertions
- Test setup/mocking is wrong
- Test is flaky or timing-dependent
- **Action:** Fix the test AND add comment explaining the fix

**Examples:**

- Mock doesn't match actual API contract
- Test expects sync behavior but implementation is async
- Test hardcodes timestamp instead of using relative time
- Test uses brittle CSS selectors

#### Step 3: Apply Fix and Verify

1. Apply the appropriate fix (implementation, test, or both)
2. Run the full test suite to ensure no regressions
3. Document the change in commit message with category justification

---

### Always/Ask/Never Boundaries

**✅ ALWAYS**

- Run test suite before starting work (`npm test` or equivalent)
- Investigate root cause before modifying any code
- Fix implementation bugs, not tests (Category A)
- Run full test suite after fixes to check for regressions
- Ensure 100% passing tests before commits (per pre-push hook requirement)
- Maintain minimum 80% code coverage (enforced by pre-push hooks)
- Document requirement changes when updating tests (Category B)

**⚠️ ASK / BE DELIBERATE**

- When requirement changes necessitate test updates (Category B) – always explain the "why"
- When adding new tests for untested code paths
- When refactoring test structure for better maintainability
- When test suite is slow and optimization is needed
- When choosing between unit vs integration vs E2E test coverage

**🚫 NEVER**

- Modify tests to make them pass without understanding root cause
- Delete failing tests to "fix" the build
- Use `skip` or `only` in committed test code (local debugging only)
- Adjust test expectations just because implementation is "different"
- Bypass test suite with `--no-verify` without explicit user permission
- Lower coverage thresholds to pass CI without justification
- Add `any` types or `@ts-ignore` to silence test-related TypeScript errors

---

### Test Design Best Practices

#### What to Test: Behavior, Not Implementation

**✅ DO:**

- Test public APIs and interfaces
- Test expected outputs for given inputs
- Test error conditions and edge cases
- Test user-facing behavior and workflows

**❌ DON'T:**

- Test internal/private methods directly
- Test implementation details (e.g., specific variable names)
- Couple tests to internal class structure
- Test framework internals (e.g., React lifecycle methods)

**Example:**

```typescript
// ❌ BAD: Testing implementation details
test("uses useState internally", () => {
  const { result } = renderHook(() => useCounter());
  expect(result.current._internalState).toBe(0); // Brittle!
});

// ✅ GOOD: Testing behavior
test("counter increments when increment is called", () => {
  const { result } = renderHook(() => useCounter());
  act(() => result.current.increment());
  expect(result.current.count).toBe(1); // Public API
});
```

#### Test Independence

- Each test must run independently (no shared mutable state)
- Tests must not depend on execution order
- Use proper setup (`beforeEach`) and teardown (`afterEach`)
- Mock external dependencies (APIs, databases, time, randomness)

### Test Cleanup and Resource Management

**Why:** Improper cleanup causes worker process failures, memory leaks, and flaky tests. Jest runs tests in parallel workers; leaked resources prevent graceful exit.

**✅ ALWAYS Cleanup:**

- Close database connections in `afterAll` (e.g., `await prisma.$disconnect()`)
- Stop HTTP servers in `afterAll` (e.g., `await server.close()`)
- Clear timers/intervals before test ends
- Remove event listeners in `afterEach` or `afterAll`
- Clear all mocks in `afterEach` (e.g., `jest.clearAllMocks()`)
- Close file handles and streams

**Pattern:**

```typescript
describe("Feature Tests", () => {
  let server: Server;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Setup - create resources
    server = app.listen(3001);
    prisma = new PrismaClient();
  });

  afterAll(async () => {
    // Teardown - ALWAYS close resources
    await prisma.$disconnect();
    await new Promise((resolve) => server.close(resolve));
  });

  afterEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  test("example", () => {
    /* ... */
  });
});
```

**Debugging Leaks:**

- Run `npm test -- --detectOpenHandles` to identify unclosed resources
- Jest will report specific handles (timers, connections, etc.)
- Fix the root cause; do NOT use `--forceExit` to mask issues

**Common Leak Sources:**

1. **Prisma** - Missing `await prisma.$disconnect()`
2. **Express/HTTP** - Missing `await server.close()`
3. **Timers** - `setTimeout`/`setInterval` not cleared
4. **Redis/Cache** - Missing `await redis.quit()`
5. **Event Emitters** - Listeners not removed

**Warning Message:**
If you see: `"A worker process has failed to exit gracefully..."` → Tests have resource leaks. Use `--detectOpenHandles` to diagnose.

#### Test Naming Convention

Use descriptive names that explain WHAT and WHEN:

```typescript
// ❌ BAD
test('test1', () => { ... });
test('works', () => { ... });

// ✅ GOOD
test('returns 404 when thumbnail not found', () => { ... });
test('creates user with hashed password when valid data provided', () => { ... });
```

---

### Pre-Push Hook Integration

Thumbnail Maker enforces quality gates via pre-push hooks:

1. **Full test suite execution** – All tests must pass
2. **Coverage reporting** – Minimum 80% coverage required
3. **Strict TypeScript checking** – No type drift allowed
4. **Integration test validation** – E2E flows must work

**If pre-push fails:**

- Do NOT use `--no-verify` without investigating
- Fix the failing tests using the protocol above
- If legitimate requirement change, update tests with documentation
- Only bypass hooks with explicit user permission (and document why)

---

### Common Anti-Patterns to Avoid

| Anti-Pattern                    | Why It's Wrong                                  | Correct Approach                |
| ------------------------------- | ----------------------------------------------- | ------------------------------- |
| "Test is wrong, let me fix it"  | Assumes implementation is correct without proof | Investigate root cause first    |
| `test.skip()` in committed code | Hides failures, creates false confidence        | Fix or delete the test          |
| Lowering coverage threshold     | Masks untested code                             | Write tests for uncovered paths |
| Mocking everything              | Tests become meaningless                        | Mock only external dependencies |
| Testing after coding            | Miss design issues early                        | Write tests first (TDD)         |
| Flaky tests tolerated           | Erodes trust in test suite                      | Fix flakiness or delete test    |

---

### Real-World Examples from Thumbnail Maker

#### Example 1: Password Validation

**Scenario:** Test fails after implementing OWASP password requirements

```typescript
// Test expectation (correct)
test("rejects password shorter than 12 characters", () => {
  expect(validatePassword("Short1!")).toBe(false);
});

// Old implementation (wrong)
function validatePassword(pwd) {
  return pwd.length >= 8; // ❌ Doesn't meet new OWASP requirement
}

// Fixed implementation (correct)
function validatePassword(pwd) {
  return pwd.length >= 12; // ✅ Matches test and OWASP requirement
}
```

**Resolution:** Fix implementation (Category A)

#### Example 2: API Contract Change

**Scenario:** REST API changed DELETE response from 200 to 204

```typescript
// Old test (outdated)
test("DELETE /thumbnails/:id returns 200", async () => {
  const res = await request(app).delete("/thumbnails/123");
  expect(res.status).toBe(200); // ❌ Old expectation
});

// Updated test (correct) - Category B: Legitimate requirement change
test("DELETE /thumbnails/:id returns 204 No Content per REST convention", async () => {
  const res = await request(app).delete("/thumbnails/123");
  expect(res.status).toBe(204); // ✅ Updated to match new API contract
});
```

**Resolution:** Update test with justification (Category B)  
**Commit Message:** "test: update DELETE response expectation to 204 per REST best practices"

#### Example 3: Flaky Test

**Scenario:** Test fails intermittently due to timing

```typescript
// Flaky test (bug in test)
test("shows success message after save", () => {
  fireEvent.click(screen.getByText("Save"));
  expect(screen.getByText("Saved!")).toBeInTheDocument(); // ❌ Race condition
});

// Fixed test (correct)
test("shows success message after save", async () => {
  fireEvent.click(screen.getByText("Save"));
  await waitFor(() => {
    expect(screen.getByText("Saved!")).toBeInTheDocument(); // ✅ Waits for async
  });
});
```

**Resolution:** Fix test (Category C)

---

### Enforcement & Consequences

**For AI Assistants:**

- Violations of this policy (adjusting tests without investigation) are considered **serious errors**
- Always explain your reasoning when modifying tests
- If uncertain whether to modify test or implementation, **always ask the user**

**For Developers:**

- Pre-push hooks enforce 80% coverage and passing tests
- CI/CD pipelines will block merges if tests fail
- Test modifications require code review justification

---

### Quick Decision Flowchart

```
Test fails
    ↓
Investigate root cause
    ↓
Is implementation wrong? → YES → Fix implementation (Category A)
    ↓
    NO
    ↓
Did requirements change? → YES → Update test + document (Category B)
    ↓
    NO
    ↓
Is test itself buggy? → YES → Fix test + document (Category C)
    ↓
    NO
    ↓
Ask user for clarification
```

---

### Resources & References

**Research Sources:**

- [The Art of Unit Testing](https://www.manning.com/books/the-art-of-unit-testing-third-edition) – Roy Osherove
- [Test-Driven Development: By Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/) – Kent Beck
- [Clean Code](https://www.oreilly.com/library/view/clean-code-a/9780136083238/) – Robert C. Martin
- [Testing Best Practices](https://testingjavascript.com/) – Kent C. Dodds

**Thumbnail Maker Specific:**

- Pre-push hook configuration: `/.husky/pre-push`
- Test suite: `npm test` (frontend), `npm run test:backend` (backend)
- Coverage reports: `coverage/lcov-report/index.html`
- E2E tests: `/tests/e2e/` (Playwright)

---

## 🏭 SERVICE FACTORY PATTERN (MANDATORY)

**This pattern reduces singleton complexity and ensures proper cleanup.**

### Core Principle

**Always** use service factory functions instead of direct singleton access.

### Pattern Usage

**✅ CORRECT:**

```typescript
import { getService } from "../utils/service-factory";

// Type-safe service access
const cache = getService("cache");
await cache.set("user:123", userData, 300);
```

**❌ INCORRECT:**

```typescript
import { CacheService } from "../services/cache.service";

// Direct singleton access (discouraged)
const cache = CacheService.getInstance();
await cache.set("user:123", userData, 300);
```

### Why Factory Pattern

**Problems with Direct Singleton Access:**

1. **Global State Coupling** - Hard to track who's using the singleton
2. **Manual Cleanup** - Developers must remember to update `setup.ts`
3. **Testing Complexity** - Difficult to mock or reset state

**Benefits of Factory Pattern:**

1. **Centralized Control** - Single point of service access
2. **Automatic Cleanup** - Factory handles lifecycle management
3. **Type Safety** - TypeScript ensures valid service names
4. **Extensibility** - Easy to add new services to registry

### Auto-Cleanup Registry

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

**This file ensures consistent behavior across all AI assistants in all IDEs.**

**Last Updated:** February 4, 2026  
**Configuration:** Port 11435 (GPU), Qdrant 9095, Reflection Enabled
