# Cipher MCP Integration

**Load this file when:** Using Cipher MCP, working across IDEs, handling credentials, troubleshooting memory retrieval, or storing session summaries.

---

## When to Use Cipher

### ALWAYS Check Cipher FIRST When:

- User asks about **past conversations** ("what did we discuss?", "remember when...")
- User mentions **codewords** or stored information
- User references **project history** not in current context
- User asks "what do you know about X?"
- Starting a **new conversation** (check for relevant context)
- User switches from another IDE and continues discussion

### ALWAYS Store in Cipher When:

- User shares **important decisions** ("we decided to...", "the approach is...")
- User provides **credentials, tokens, API keys** (store with codewords!)
- User defines **project-specific terminology**
- Completing **significant tasks** or making **discoveries**
- User explicitly says "remember this" or "save this"
- **At task milestones** — don't wait for session end (see Milestone Protocol)

### NEVER Assume You Know — Always Query Cipher:

- Don't say "I don't have that information" without checking Cipher first
- Don't assume user is asking for the first time
- Don't ignore context from other IDEs

---

## The 21 Cipher Tools — Which to Use When

Cipher has 21 tools. Most agents only use `ask_cipher`. This is the correct routing:

### Storage Tools

| Tool | When to Use |
|---|---|
| `cipher_extract_and_operate_memory` | **Primary store tool.** Pass raw conversation text or a summary — Cipher atomically extracts facts AND decides ADD/UPDATE/DELETE. Handles deduplication automatically. |
| `cipher_workspace_store` | Structured project state: feature progress, bugs, work context (branch, repo). Use after completing features or resolving bugs. |
| `cipher_store_reasoning_memory` | Store how a complex problem was solved (reasoning trace). Use after solving non-trivial bugs or architecture decisions. |
| `cipher_intelligent_processor` | Feed natural language → auto-extracts entities AND creates knowledge graph relationships. Use when a concept involves multiple related entities. |

### Retrieval Tools

| Tool | When to Use |
|---|---|
| `cipher_memory_search` | Semantic search over knowledge facts. Best for "what do we know about X?" queries. Default: top_k=5, threshold=0.3. |
| `cipher_workspace_search` | Search project/team context. Filterable by domain (frontend/backend/devops/QA), status (in-progress/blocked/completed), project. |
| `cipher_enhanced_search` | Graph + semantic + fuzzy search with relationship traversal (depth 1–3). Use when you need related entities, not just exact matches. |
| `cipher_search_reasoning_patterns` | Find how similar problems were solved before. Use at the START of a complex task — "how did we solve auth issues before?" |

### Graph Tools

| Tool | When to Use |
|---|---|
| `cipher_add_node` | Add a new entity node directly |
| `cipher_add_edge` | Link two entities with a typed relationship |
| `cipher_search_graph` | Search graph by entity name or type |
| `cipher_get_neighbors` | Get all entities connected to a given entity |
| `cipher_extract_entities` | Extract entity mentions from text |
| `cipher_update_node` | Update an existing entity node |
| `cipher_delete_node` | Remove an entity and its relationships |
| `cipher_query_graph` | Run structured graph queries |
| `cipher_relationship_manager` | Replace, merge, bulk-update entities (e.g., "rename ThumbnailService to ThumbnailSvc everywhere") |

### Reasoning Tools

| Tool | When to Use |
|---|---|
| `cipher_extract_reasoning_steps` | Extract step-by-step reasoning from user input for later storage |
| `cipher_evaluate_reasoning` | Score reasoning quality, detect loops, generate improvement suggestions |

### Utility Tools

| Tool | When to Use |
|---|---|
| `cipher_bash` | Execute shell commands via Cipher |
| `cipher_web_search` | Web search from within Cipher context |

---

## Memory Types — Route to the Right Store

Cipher has four distinct memory types. Use the right tool for each:

| Memory Type | What It Stores | Store With | Retrieve With |
|---|---|---|---|
| **Semantic** | Durable facts ("JWT uses `sameSite: lax` in prod") | `cipher_extract_and_operate_memory` | `cipher_memory_search` |
| **Episodic** | Events with context ("Fixed JWT cookie April 20") | `cipher_extract_and_operate_memory` | `cipher_memory_search` |
| **Procedural** | How to solve ("Here's the Supertest auth pattern") | `cipher_store_reasoning_memory` | `cipher_search_reasoning_patterns` |
| **Workspace** | Project progress, bugs, feature status | `cipher_workspace_store` | `cipher_workspace_search` |

**Do NOT** conflate these — semantic facts need relevance-based retrieval; episodic needs recency; procedural needs pattern-matching. Routing to the wrong store degrades recall quality.

---

## Salience Scoring — What to Store vs. Skip

Not everything deserves storage. Storing low-value information degrades semantic search quality over time.

### HIGH salience (always store):
- User explicitly corrects agent behavior or changes direction
- Architecture decisions or security patterns
- Credentials, tokens, API keys (via codewords)
- Post-task summaries with progress/outcome
- Bug root causes with resolution
- Project-specific terminology the agent got wrong

### MEDIUM salience (store if genuinely novel):
- New patterns or anti-patterns discovered in the codebase
- Debugging approaches that took multiple attempts
- Integration gotchas (e.g., "Prisma doesn't support X")

### LOW salience (skip — don't store):
- Routine tool calls and status confirmations
- Information already documented in `docs/agents/` files
- Standard library behavior (not project-specific)
- Conversational filler ("thanks", "ok", "done")

**Rule:** If you would already find it in `docs/agents/` on next load, don't duplicate it in Cipher. Cipher is for what's **not** in files.

---

## Milestone Storage Protocol

**Don't wait for session end.** Store at natural task boundaries:

```
1. Bug resolved
   → cipher_workspace_store({ bugsEncountered: [{ description, severity, status: "fixed" }] })
   → cipher_extract_and_operate_memory(bug root cause + fix approach)

2. Feature completed
   → cipher_workspace_store({ currentProgress: { feature, status: "completed", completion: 100 } })

3. Architecture decision made
   → cipher_extract_and_operate_memory("Decided to use X because Y. Alternatives considered: Z")

4. Credential or codeword created
   → ask_cipher("Store: CODEWORD = [value]") immediately

5. Complex problem solved (non-trivial path)
   → cipher_store_reasoning_memory(trace) with quality evaluation

6. Session ending / conversation winding down
   → cipher_extract_and_operate_memory(full session summary)
```

---

## Retrieval at Conversation Start

When beginning a new conversation, before doing any work:

```
1. Query semantic facts relevant to the task domain:
   cipher_memory_search("query", top_k=10)

2. Query workspace for project status if continuing work:
   cipher_workspace_search("Thumbnail Maker current status", filters: { project: "pikzels-clone" })

3. Query reasoning patterns for complex tasks:
   cipher_search_reasoning_patterns("similar task description")
```

---

## Cross-IDE Workflow

### When User Switches IDEs:

1. Query Cipher for recent context immediately
2. Use `cipher_workspace_search` with status filter "in-progress" to find active work
3. Use `cipher_memory_search` for the specific domain being discussed
4. Load relevant memories before responding

**Example:**
```
User in Zed: "Continue where we left off"
You: [cipher_workspace_search("in-progress features")] → "I see you were working on face-swap integration. 
      The Seedream model was selected. Last status: testing in staging..."
```

### After Completing Tasks:
```
You: [Complete task]
     [cipher_workspace_store({ currentProgress: { feature: "X", status: "completed" } })]
     [cipher_extract_and_operate_memory("Summary: completed X. Key decisions: Y. Patterns found: Z")]
```

---

## Knowledge Graph — Use for Entity Relationships

When a fact involves multiple related entities, use `cipher_intelligent_processor` instead of freeform storage:

```
// BAD: flat text
ask_cipher("ThumbnailService uses Prisma and Redis cache")

// GOOD: entity relationships  
cipher_intelligent_processor("ThumbnailService depends on Prisma for DB access and Redis for caching via CacheService")
// → Creates nodes: ThumbnailService, Prisma, Redis, CacheService
// → Creates edges: DEPENDS_ON, USES
// → Later: cipher_enhanced_search("ThumbnailService") returns all related entities
```

Use `cipher_enhanced_search` with `relationDepth: 2` to traverse the graph — finds entities two hops away from your query.

---

## Reasoning Pattern Loop

For non-trivial problems, use the full reasoning pipeline:

```
1. BEFORE starting: cipher_search_reasoning_patterns("auth debugging")
   → Retrieves how similar problems were solved before

2. DURING: solve the problem

3. AFTER: 
   steps = cipher_extract_reasoning_steps(userInput)
   eval = cipher_evaluate_reasoning(steps)
   IF eval.qualityScore > 0.6:
     cipher_store_reasoning_memory(steps, eval)
   → Next time a similar auth problem appears, step 1 retrieves this trace
```

---

## Configuration

- **Embeddings:** Port 11435 (WSL Ollama, GPU-accelerated)
- **Speed:** ~35ms per embedding
- **Memory Store:** Qdrant on port 9095
- **Main LLM:** DeepSeek V3 (API)
- **Eval LLM:** Kimi K2 (256K context, reflection enabled)
- **Model:** qwen3-embedding:latest (4096 dimensions)
- **Memory is pull-based** — other IDEs won't auto-receive stored info; they must query

---

## Troubleshooting

### If Cipher Times Out:

**Root cause:** Multiple IDEs competing for resources (10–30s timeouts)

**Applied fix:** `~/cipher-workspace/.env` parallelism config:
- `QDRANT_MAX_CONNECTIONS=200`
- `CIPHER_TIMEOUT=30000`
- `ENABLE_REQUEST_QUEUE=true`
- `MAX_CONCURRENT_QUERIES=3`

**Expected latency:** Single IDE: 2–4s | 2–3 IDEs: 3–6s | 5+ IDEs: 5–10s (close unused IDEs)

**If still timing out:**
1. Restart IDE to pick up new `.env` settings
2. Check processes: `ps aux | grep "[c]ipher --mode mcp"`
3. Kill competing: `pkill -f "cipher --mode mcp"`

### If Cipher Seems Slow:
1. Check port 11435: `ss -tlnp | grep 11435`
2. Verify GPU active: embeddings should be <50ms
3. API latency (DeepSeek + Kimi): 1–3s is normal
4. Use `stream: false` to avoid streaming overhead

### If Cipher Doesn't Respond:
1. Check Qdrant: `curl http://localhost:9095/collections`
2. Check Ollama: `wsl -e bash -c 'ss -tlnp | grep 11435'`
3. Verify MCP connection in IDE settings
4. Check connections: `ss -tn | grep 9095 | wc -l` (should be < 200)

---

## IDE Source Tracking

Memories are tagged by IDE. Query by source:

```
ask_cipher("Show memories from Warp")
ask_cipher("What did we do in Qoder yesterday?")
ask_cipher("List all decisions made in Windsurf")
```

Tags: `IDE_SOURCE=warp` | `IDE_SOURCE=windsurf` | `IDE_SOURCE=qoder` | `IDE_SOURCE=zed` | `IDE_SOURCE=trae`

---

## Session Compliance Checklist

For every conversation session:

- [ ] Query Cipher at conversation start (semantic + workspace)
- [ ] Store at each milestone — don't wait for session end
- [ ] Use correct tool for memory type (semantic/episodic/procedural/workspace)
- [ ] Apply salience scoring — skip low-value facts
- [ ] Use codewords for sensitive data
- [ ] Store reasoning trace for complex multi-step solutions
- [ ] Final session summary via `cipher_extract_and_operate_memory`
