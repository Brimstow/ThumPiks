# 🔄 AI Session Sync Guide - ThumPiks Project

**Version:** 1.0  
**Created:** 2025-01-28  
**Purpose:** Keep all AI editors (Zed, Claude, ChatGPT, Gemini) in sync

---

## 🎯 WHAT IS THIS?

This guide shows you how to use the **ZED_AGENT_PROJECT_CONTEXT.md** file to keep multiple AI editors synchronized on the ThumPiks project.

**Problem:** Working with multiple AIs leads to:
- Context drift (AI A doesn't know what AI B did)
- Repeated work
- Conflicting decisions
- Lost progress

**Solution:** Single source of truth context file that ALL AIs read and update.

---

## 📋 THE SYSTEM

### Core Files
1. **ZED_AGENT_PROJECT_CONTEXT.md** - The main context file (source of truth)
2. **ZED_AGENT_SESSION_SYNC_GUIDE.md** - This guide
3. **Project files** - Your actual code/content

### How It Works
```
You → Start Session → AI reads PROJECT_CONTEXT.md → AI works on task
                           ↓
                    AI updates PROJECT_CONTEXT.md
                           ↓
                    You → End Session
                           ↓
                    Next AI reads updated context
                           ↓
                    Continues where you left off
```

---

## 🚀 QUICK START

### For You (Human)

#### Starting a New Session
1. Open `ZED_AGENT_PROJECT_CONTEXT.md`
2. Copy this prompt template:

```
I'm working on the ThumPiks project. Please read the project context file first:
B:\Thumbnail_maker\ZED_AGENT_PROJECT_CONTEXT.md

Then help me with: [YOUR TASK HERE]
```

3. Paste to your AI (Zed, Claude, ChatGPT, etc.)
4. The AI will read the context and continue from current state

#### Ending a Session
1. Ask AI to update the context file:
```
Please update ZED_AGENT_PROJECT_CONTEXT.md with:
- What we accomplished
- Any decisions made
- Next steps
- Update the timestamp
```

2. Verify the file was updated
3. Done! Next AI will see your progress

---

### For AI Editors

#### Session Start Protocol
```markdown
1. READ: ZED_AGENT_PROJECT_CONTEXT.md (entire file)
2. CHECK: "ACTIVE TASKS" section
3. CHECK: "RECENT DECISIONS" section
4. UNDERSTAND: "CRITICAL PRIORITIES"
5. CONFIRM: You know what NOT to do
6. PROCEED: Work on requested task
```

#### Session End Protocol
```markdown
1. UPDATE: "Recent Decisions" with what you did
2. MOVE: Completed tasks from "Up Next" to decisions
3. ADD: New tasks discovered to "Up Next"
4. UPDATE: "Last Updated" timestamp at top
5. ADD: Your AI name and date to "Version History"
6. SAVE: The context file
```

---

## 📝 TEMPLATES

### Template 1: Starting Fresh Work
```
Hi [AI Name],

I need help with the ThumPiks project. Please:
1. Read: B:\Thumbnail_maker\ZED_AGENT_PROJECT_CONTEXT.md
2. Focus on: [SPECIFIC TASK]
3. Keep priorities in mind (monetization first!)

Let me know when you've read the context and we'll begin.
```

### Template 2: Continuing Previous Work
```
Hi [AI Name],

Continuing ThumPiks project. Another AI worked on this earlier.

1. Read: B:\Thumbnail_maker\ZED_AGENT_PROJECT_CONTEXT.md
2. Review what was done in "Recent Decisions"
3. Continue from "Up Next" tasks

Ready to pick up where we left off?
```

### Template 3: Handing Off to Next AI
```
[At end of your session, tell current AI:]

Please update ZED_AGENT_PROJECT_CONTEXT.md:
- Add to "Recent Decisions": [WHAT WE DID]
- Update "Up Next": [REMAINING TASKS]
- Update "Last Updated": [TODAY'S DATE]
- Add to "Version History": [YOUR AI NAME] - [BRIEF SUMMARY]
```

---

## 🎭 EXAMPLE WORKFLOW

### Day 1: Zed Agent (Morning)
```
Human: "Zed, help me set up Stripe. Read PROJECT_CONTEXT.md first."

Zed reads context → Sees "Week 1: Stripe Integration" is priority
     ↓
Zed works on Stripe setup
     ↓
Zed updates context file:
  - Recent Decisions: "Created Stripe account, got API keys"
  - Up Next: "Create products in Stripe dashboard"
  - Last Updated: 2025-01-28
```

### Day 1: Claude (Afternoon)
```
Human: "Claude, continue ThumPiks Stripe work. Read PROJECT_CONTEXT.md."

Claude reads context → Sees Zed created account
     ↓
Claude continues: Creates Stripe products
     ↓
Claude updates context:
  - Recent Decisions: "Created 3 Stripe products ($19, $39, $79)"
  - Up Next: "Implement subscription routes in backend"
  - Last Updated: 2025-01-28
```

### Day 2: ChatGPT (Morning)
```
Human: "ChatGPT, help with backend routes. Read PROJECT_CONTEXT.md."

ChatGPT reads context → Sees Stripe products created
     ↓
ChatGPT implements subscription routes
     ↓
ChatGPT updates context:
  - Recent Decisions: "Added subscription.routes.ts"
  - Up Next: "Implement credit service"
  - Last Updated: 2025-01-29
```

**Result:** Seamless handoff between 3 different AIs!

---

## 🔍 WHAT TO SYNC

### Always Include in Context Updates

#### 1. What You Did
```
Recent Decisions:
- 2025-01-28 (Claude): Implemented Stripe checkout endpoint
  - File: src/routes/subscription.routes.ts
  - Status: Working, tested with test card
  - Next: Need to add webhook handler
```

#### 2. Files Changed
```
Files Modified:
- pikzels-clone/src/routes/subscription.routes.ts (created)
- pikzels-clone/prisma/schema.prisma (updated Subscription model)
- pikzels-clone/.env (added STRIPE_SECRET_KEY)
```

#### 3. Blockers Found
```
Known Issues:
- Stripe webhook secret not set (blocks production)
- Credit deduction logic not implemented
- Frontend pricing page needs to be created
```

#### 4. Next Steps
```
Up Next:
1. [ ] Set up Stripe webhook endpoint
2. [ ] Test webhook with Stripe CLI
3. [ ] Implement credit service
4. [ ] Build pricing page component
```

---

## 🚨 COMMON MISTAKES (AVOID THESE)

### ❌ DON'T DO THIS

**Mistake 1: Not Reading Context**
```
Human: "ChatGPT, help me add payments."
ChatGPT: "Sure! Let's use PayPal..."

❌ Wrong! Context says use Stripe, account already set up.
```

**Mistake 2: Not Updating Context**
```
[Works for 2 hours, makes major changes]
[Closes session without updating context]

❌ Next AI has no idea what happened!
```

**Mistake 3: Ignoring Priorities**
```
Human: "Claude, let's add dark mode to thumbnails."
Claude: "Great idea! Let me implement..."

❌ Wrong! Context says "monetization first, features second"
```

**Mistake 4: Creating Conflicting Files**
```
Zed creates: stripe-integration.ts
Claude creates: payment-service.ts (doing same thing)

❌ Duplicate work! Should have read context.
```

### ✅ DO THIS INSTEAD

**Solution 1: Always Read First**
```
Human: "ChatGPT, help me add payments."
ChatGPT: "Let me read PROJECT_CONTEXT.md first..."
ChatGPT: "I see Stripe is already chosen and account set up. 
          Shall I continue with implementing the routes?"

✅ Correct! Knows the state.
```

**Solution 2: Update Before Leaving**
```
[Before ending session]
Human: "Update PROJECT_CONTEXT.md with what we did."
AI: "Updated context with Stripe implementation details."

✅ Next AI will know!
```

**Solution 3: Respect Priorities**
```
Human: "Claude, let's add dark mode to thumbnails."
Claude: "I see monetization is Priority 0. Should we focus on 
         Stripe integration first? Dark mode can wait."

✅ Correct! Following priorities.
```

**Solution 4: Check Before Creating**
```
Human: "Add payment service."
AI reads context: "I see stripe-integration.ts exists. 
                   Shall I continue there instead?"

✅ No duplicate work!
```

---

## 📊 TRACKING PROGRESS

### Weekly Sync Check
Every Monday, verify:
```
[ ] PROJECT_CONTEXT.md updated in last 7 days
[ ] "Recent Decisions" has this week's work
[ ] "Up Next" is current (not outdated tasks)
[ ] "Known Issues" is accurate
[ ] "Last Updated" timestamp is recent
```

### When Things Get Out of Sync
If context is stale (>7 days):
```
1. Review actual project files
2. Update context with current reality
3. List all work done since last update
4. Reset "Up Next" tasks to current priorities
5. Clear completed items from "Known Issues"
```

---

## 🎯 BEST PRACTICES

### 1. Small, Frequent Updates
```
❌ Bad: Work 8 hours, update once at end
✅ Good: Update after each major task (1-2 hours)
```

### 2. Be Specific
```
❌ Bad: "Fixed some stuff in backend"
✅ Good: "Added Stripe webhook handler in src/routes/webhook.routes.ts, 
         handles subscription.created and payment.succeeded events"
```

### 3. Link to Resources
```
✅ Good:
"Implemented Stripe checkout:
- Guide followed: ZED_AGENT_IMPLEMENTATION_GUIDE.md (lines 120-250)
- Stripe docs: https://stripe.com/docs/billing
- Test card used: 4242 4242 4242 4242"
```

### 4. Note Blockers Immediately
```
✅ Good:
"Blocked: Can't test webhooks without ngrok/Stripe CLI
 Solution: Install Stripe CLI tomorrow
 Impact: Can't verify subscription activation"
```

### 5. Celebrate Wins
```
✅ Good:
"🎉 MILESTONE: First successful test payment!
 - User can subscribe to Pro plan ($39/mo)
 - Credits added to account (200)
 - Ready for public testing"
```

---

## 🛠️ TOOLS TO HELP

### Terminal AI Tools (Like the Video!)
If using Claude Code, Gemini CLI, or similar:
```bash
# Create project-level context file (like in video)
cd "B:\Thumbnail_maker\pikzels-clone"

# Gemini
gemini /init  # Creates gemini.md

# Claude Code
claude /init  # Creates claude.md

# Link them to our main context
ln -s ../ZED_AGENT_PROJECT_CONTEXT.md ./project-context.md
```

### Git for Version Control
```bash
# Track context changes
git add ZED_AGENT_PROJECT_CONTEXT.md
git commit -m "Updated context: Stripe integration complete"

# See what changed
git diff ZED_AGENT_PROJECT_CONTEXT.md

# Revert if needed
git checkout HEAD~1 ZED_AGENT_PROJECT_CONTEXT.md
```

### Automation Ideas
```bash
# Auto-commit context on changes
# Add to .git/hooks/pre-commit:
if git diff --cached --name-only | grep -q "PROJECT_CONTEXT.md"; then
    echo "✅ Context file updated"
fi
```

---

## 📞 TROUBLESHOOTING

### Problem: AIs Keep Repeating Work
**Solution:** They're not reading context file.
```
1. Start EVERY session with: "Read PROJECT_CONTEXT.md first"
2. Verify AI confirms it read the file
3. Ask AI to summarize current state before working
```

### Problem: Context File Too Long
**Solution:** Archive old decisions.
```
1. Create ZED_AGENT_PROJECT_HISTORY.md
2. Move old "Recent Decisions" there
3. Keep only last 2 weeks in main context
4. Link to history file for reference
```

### Problem: Conflicting Changes
**Solution:** Designate one AI as "Lead" per day.
```
Monday: Zed is lead (makes final decisions)
Tuesday: Claude is lead
Wednesday: ChatGPT is lead
etc.
```

### Problem: Can't Find Latest Changes
**Solution:** Add changelog section.
```
Recent Changes (Last 5):
1. 2025-01-28 15:30 - Claude - Added Stripe products
2. 2025-01-28 12:00 - Zed - Created Stripe account
3. 2025-01-27 18:00 - ChatGPT - Updated schema
4. 2025-01-27 14:00 - Zed - Competitive analysis
5. 2025-01-27 10:00 - Zed - Project rebranding
```

---

## 🎬 GETTING STARTED NOW

### Step 1: Verify Files Exist
```
[ ] ZED_AGENT_PROJECT_CONTEXT.md exists
[ ] This guide (SESSION_SYNC_GUIDE.md) exists
[ ] You understand how to use them
```

### Step 2: First Sync
```
1. Open PROJECT_CONTEXT.md
2. Read entire file (10 minutes)
3. Understand current priorities
4. Ready to work!
```

### Step 3: Test It
```
1. Pick a small task (e.g., "Review pricing strategy")
2. Tell your AI: "Read PROJECT_CONTEXT.md, then help with [task]"
3. After task, update context file
4. Switch to different AI, repeat
5. Verify second AI knows what first AI did
```

---

## 💡 PRO TIPS

### Tip 1: Use Code Blocks
When referencing files in context:
```typescript
// Added to src/routes/subscription.routes.ts
router.post('/checkout', authenticate, async (req, res) => {
  // Implementation here
});
```

### Tip 2: Use Checklists
```
Week 1 Tasks:
[x] Day 1: Stripe account created
[x] Day 2: Products configured
[ ] Day 3: Backend routes (IN PROGRESS)
[ ] Day 4: Credit service
[ ] Day 5: Frontend pricing page
```

### Tip 3: Link Everything
```
Related Files:
- Implementation: ZED_AGENT_IMPLEMENTATION_GUIDE.md (Section: Stripe)
- Reference: pikzels-clone/src/routes/subscription.routes.ts
- Docs: https://stripe.com/docs/billing/subscriptions
```

### Tip 4: Use Emojis
```
🚨 CRITICAL: Payment system not working
✅ DONE: Stripe account created
🔄 IN PROGRESS: Implementing routes
⏸️ BLOCKED: Waiting for API keys
💡 IDEA: Add annual discount option
```

---

## 🎯 SUCCESS CRITERIA

You know this system is working when:

✅ Any AI can pick up where another left off  
✅ No duplicate work happens  
✅ All AIs follow same priorities  
✅ Context file stays under 500 lines  
✅ Updates happen daily  
✅ Progress is visible and trackable  
✅ You feel in control of your project  

---

## 🚀 FINAL CHECKLIST

Before considering this system "active":

**Setup:**
- [ ] PROJECT_CONTEXT.md exists and is filled out
- [ ] This guide exists and you've read it
- [ ] You understand the workflow
- [ ] Your AI editors know to read context first

**Testing:**
- [ ] Tested with at least 2 different AIs
- [ ] Verified context updates work
- [ ] Confirmed no duplicate work
- [ ] Happy with the process

**Ongoing:**
- [ ] Update context after each session
- [ ] Review context weekly
- [ ] Archive old decisions monthly
- [ ] Refine process as needed

---

## 📚 RELATED DOCS

- **ZED_AGENT_PROJECT_CONTEXT.md** - The main context file
- **ZED_AGENT_START_HERE.md** - Project navigation
- **ZED_AGENT_ACTION_PLAN_WEEK_1.md** - Week 1 tasks
- **ZED_AGENT_IMPLEMENTATION_GUIDE.md** - Technical details

---

**🎉 You're ready! Start syncing those AI sessions!**

---

*Last Updated: 2025-01-28*  
*Maintained by: All AI Editors*  
*Questions? Update this guide!*