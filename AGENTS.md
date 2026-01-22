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

| Risk | Tool | What Happens |
|------|------|--------------|
| ⚠️ HIGH | `lint-staged` | Reverts staged files on linter failure |
| ⚠️ HIGH | `git stash` | Can lose work if not popped |
| ⚠️ MEDIUM | `git checkout` | Overwrites uncommitted changes |
| ⚠️ MEDIUM | `git reset --hard` | Destroys all uncommitted work |

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

---

**This file ensures consistent behavior across all AI assistants in all IDEs.**

**Last Updated:** December 16, 2025  
**Configuration:** Port 11435 (GPU), Qdrant 9095, Reflection Enabled
