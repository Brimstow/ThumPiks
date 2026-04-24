# DRY Principle (Don't Repeat Yourself)

**Load this file when:** Working with configuration, repeated values across files, model/API/feature tiers, or any task involving the same value appearing in multiple locations.

---

## The Golden Rule

**NEVER duplicate configuration values across multiple locations. Always use a single source of truth.**

---

## Real-World Incident

<!-- Document your project's DRY violation incidents here.
Example format:

**What Happened:**
[VALUE] was hardcoded [N] times across [M] files. When [EVENT] occurred, [N-X] locations were missed, causing [IMPACT].

**Impact:**
- [IMPACT_1]
- [IMPACT_2]

**Resolution:**
Refactored to use centralized [CONFIG_TYPE]:
-->

```[LANGUAGE]
// SINGLE SOURCE OF TRUTH
const [CONFIG_NAME] = {
  [KEY_1]: "[VALUE_1]", // Change ONE line to switch ALL usages
  [KEY_2]: "[VALUE_2]",
};

// Helper functions resolve values from central config
[PROPERTY]: get[Value]("[KEY_1]"); // DRY compliant
// NOT: [PROPERTY]: "[HARDCODED_VALUE]"  // Hardcoded duplication
```

---

## DRY Violation Patterns to Avoid

### BAD: Hardcoded Duplication

```[LANGUAGE]
// File 1
const config1 = {
  [KEY]: "[HARDCODED_VALUE]", // Hardcoded
};

// File 2
const config2 = {
  [KEY]: "[HARDCODED_VALUE]", // Duplicated!
};

// File 3
const config3 = {
  [KEY]: "[HARDCODED_VALUE]", // Duplicated!
};
```

**Problems:**

- Need to update 3+ places when changing the value
- Easy to miss locations (inconsistency)
- No compile-time guarantee of consistency

### GOOD: Centralized Configuration

```[LANGUAGE]
// Single source of truth
const [CONSTANT_NAME] = "[VALUE]";

// All modules reference the central value
const config1 = { [KEY]: [CONSTANT_NAME] };
const config2 = { [KEY]: [CONSTANT_NAME] };
const config3 = { [KEY]: [CONSTANT_NAME] };
```

### BETTER: Lookup-Based Configuration

```[LANGUAGE]
// Centralized mapping
const [MAPPING_NAME] = {
  [KEY_1]: "[VALUE_1]",
  [KEY_2]: "[VALUE_2]",
};

// Helper function resolves value dynamically
function get[Value]([keyParam]: [KeyType]): [ValueType] {
  return [MAPPING_NAME][keyParam];
}

// All modules use the helper
const config1 = { [KEY]: get[Value]("[KEY_1]") };
```

---

## When to Apply DRY

Apply DRY principle when you see:

1. **Same value repeated 2+ times** - Extract to constant/function
2. **Configuration data** - Use centralized config objects
3. **API keys, endpoints, URLs** - Single source of truth
4. **[DOMAIN_SPECIFIC_CONFIG_1]** - Centralized catalog
5. **[DOMAIN_SPECIFIC_CONFIG_2]** - Central routing configuration

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

- Module-specific overrides that intentionally differ from the central config
- Performance-critical inline values (rare, must justify)
- Third-party API responses (can't control format)
- [PROJECT_SPECIFIC_EXCEPTION]

**ALWAYS add a comment explaining the exception:**

```[LANGUAGE]
[PROPERTY]: "[OVERRIDE_VALUE]",  // Special case: [REASON]
```
