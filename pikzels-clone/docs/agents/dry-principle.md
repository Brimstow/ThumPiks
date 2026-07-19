# DRY Principle (Don't Repeat Yourself)

**Load this file when:** Working with configuration, model tiers, provider mappings, or any task involving repeated values across files.

---

## The Golden Rule

**NEVER duplicate configuration values across multiple locations. Always use a single source of truth.**

---

## Real-World Incident (February 2026)

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
  flash: "comet", // Change ONE line to switch ALL Flash tiers
  standard: "openrouter",
  pro: "openrouter",
};

// Helper functions resolve models from central config
modelId: getModelForTier("flash"); // DRY compliant
// NOT: modelId: 'flux-schnell'     // Hardcoded duplication
```

---

## DRY Violation Patterns to Avoid

### BAD: Hardcoded Duplication

```typescript
// Tool 1
const tool1Config = {
  flash: { modelId: "google/gemini-2.5-flash-image" }, // Hardcoded
};

// Tool 2
const tool2Config = {
  flash: { modelId: "google/gemini-2.5-flash-image" }, // Duplicated!
};

// Tool 3
const tool3Config = {
  flash: { modelId: "google/gemini-2.5-flash-image" }, // Duplicated!
};
```

**Problems:**

- Need to update 3+ places when changing model
- Easy to miss locations (inconsistency)
- No compile-time guarantee of consistency

### GOOD: Centralized Configuration

```typescript
// Single source of truth
const FLASH_MODEL = "google/gemini-2.5-flash-image";

// All tools reference the central value
const tool1Config = { flash: { modelId: FLASH_MODEL } };
const tool2Config = { flash: { modelId: FLASH_MODEL } };
const tool3Config = { flash: { modelId: FLASH_MODEL } };
```

### BETTER: Provider-Tier Mapping

```typescript
// Centralized provider-tier mapping
const TIER_PROVIDERS = {
  flash: "comet",
  standard: "openrouter",
  pro: "openrouter",
};

// Helper function resolves model dynamically
function getModelForTier(tier: TierId): string {
  const provider = TIER_PROVIDERS[tier];
  return PROVIDER_MODELS[provider][tier];
}

// All tools use the helper
const tool1Config = { flash: { modelId: getModelForTier("flash") } };
```

---

## When to Apply DRY

Apply DRY principle when you see:

1. **Same value repeated 2+ times** - Extract to constant/function
2. **Configuration data** - Use centralized config objects
3. **Model IDs, API keys, endpoints** - Single source of truth
4. **Tier definitions, pricing, credits** - Centralized tier catalog
5. **Provider mappings** - Central routing configuration

---

## Enforcement Checklist

Before committing configuration changes:

- [ ] Is this value used in multiple places?
- [ ] Did I update ALL occurrences?
- [ ] Can I extract this to a constant/function?
- [ ] Is there a single source of truth for this data?
- [ ] Would changing one line update all usages?

---

## Exception: When Duplication is OK

**Special Cases** (document why):

- Tool-specific overrides (e.g., face-swap uses Seedream, not generic Flash model)
- Performance-critical inline values (rare)
- Third-party API responses (can't control format)

**ALWAYS add a comment explaining the exception:**

```typescript
modelId: 'bytedance-seed/seedream-4.5',  // Special case: Seedream optimized for faces
```
