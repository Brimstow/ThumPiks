# Codewords System

**Load this file when:** Handling credentials, API keys, tokens, or user asks about codewords.

---

## What Are Codewords?

- **Purpose:** Secure references to sensitive information
- **Storage:** Cipher stores the mapping (codeword -> actual value)
- **Usage:** Always use codewords for credentials, tokens, keys

---

## How to Use Codewords

### Storing:

```
User: "Remember: my API key is sk-abc123xyz"
You: [Store in Cipher with codeword]
     "Stored your API key as codeword TITANIUM"
```

### Retrieving:

```
User: "What's my API key?"
You: [Query Cipher] "Your API key is codeword TITANIUM (sk-abc123xyz)"
```

---

## Current Codewords

**The canonical list lives in Cipher.** Query Cipher (`ask_cipher`) for the latest codewords before assuming this list is complete.

Known stable codewords (examples — Cipher may have more):

1. **TITANIUM** - Port 11435 configuration
2. **ELITE** - (query Cipher for details)
3. **VIRGINIA** - (query Cipher for details)
4. **SIMPLE** - (query Cipher for details)
5. **RUMBLE** - (query Cipher for details)

**When adding a new codeword:** Store it in Cipher immediately, then update this list as a secondary reference only.
