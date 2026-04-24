// gate-keeper: Context Load Detector
//
// Watches file changes and emits context recommendations based on
// file path patterns. Maps the AGENTS.md "Context Enhancement" table
// into machine-enforceable, real-time detection.
//
// This module provides a SECOND trigger type alongside violation gates:
//   - Gates: "this file violates a rule" → alert/revert
//   - Context: "this file change implies you need X loaded" → signal

import { readFile } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { globToRegex } from './evaluator.mjs';

/**
 * @typedef {Object} ContextRule
 * @property {string} id - Rule identifier
 * @property {string[]} filePatterns - Glob patterns that trigger this context
 * @property {string[]} keywords - Content keywords that trigger this context
 * @property {string} contextFile - The doc to recommend loading
 * @property {string} description - What this context provides
 * @property {string} [source] - Where the rule was defined
 */

/**
 * @typedef {Object} ContextSignal
 * @property {string} contextFile - Recommended file to load
 * @property {string} reason - Why this context is recommended
 * @property {string} trigger - What triggered it (file path or keyword)
 * @property {'file'|'content'} matchType - How it was triggered
 * @property {number} confidence - 0-1 confidence score
 */

/**
 * Default context rules derived from a standard AGENTS.md Context Enhancement table.
 * These can be overridden or extended via ```context blocks in markdown.
 * @returns {ContextRule[]}
 */
export function getDefaultContextRules() {
  return [
    {
      id: 'prisma-safety',
      filePatterns: ['**/prisma/**', '**/schema.prisma', '**/*.prisma'],
      keywords: ['prisma', 'migrate', 'db push', '@prisma'],
      contextFile: 'docs/agents/prisma-safety.md',
      description: 'db push vs migrate dev, destructive change protocol',
    },
    {
      id: 'authentication',
      filePatterns: ['**/auth/**', '**/middleware/auth*', '**/login*', '**/session*', '**/token*', '**/password*'],
      keywords: ['authenticateToken', 'authenticateAdmin', 'jwt', 'bcrypt', 'cookie', 'session', 'refreshToken'],
      contextFile: 'docs/agents/authentication.md',
      description: 'Dual-token cookies, middleware chain, admin isolation',
    },
    {
      id: 'testing-conventions',
      filePatterns: ['**/*.test.*', '**/*.spec.*', '**/tests/**', '**/__tests__/**'],
      keywords: ['describe(', 'it(', 'test(', 'expect(', 'jest', 'vitest'],
      contextFile: 'docs/agents/testing-conventions.md',
      description: 'Hub — routes to core/unit/integration/e2e/security docs',
    },
    {
      id: 'testing-security',
      filePatterns: ['**/*.security.test.*', '**/security/**/*.test.*'],
      keywords: ['OWASP', 'injection', 'XSS', 'CSRF', 'IDOR', 'auth bypass', 'penetration'],
      contextFile: 'docs/agents/testing-security.md',
      description: 'OWASP Top 10 patterns, pre-PR checklist, security tooling',
    },
    {
      id: 'testing-e2e',
      filePatterns: ['**/e2e/**', '**/*.e2e.*', '**/playwright*'],
      keywords: ['playwright', 'page.goto', 'page.click', 'browser', 'chromium'],
      contextFile: 'docs/agents/testing-e2e.md',
      description: 'Playwright patterns, login flow, selectors, critical flows',
    },
    {
      id: 'server-lifecycle',
      filePatterns: ['**/server.ts', '**/server.js', '**/app.ts', '**/app.js', '**/index.ts'],
      keywords: ['listen(', 'createServer', 'express()', 'PORT', '.env.PORT'],
      contextFile: 'docs/agents/server-lifecycle.md',
      description: 'Ports, startup commands, verification steps',
    },
    {
      id: 'service-factory',
      filePatterns: ['**/services/**', '**/service.ts', '**/service.js'],
      keywords: ['createService', 'ServiceFactory', 'cleanup', 'dispose'],
      contextFile: 'docs/agents/service-factory.md',
      description: 'Factory pattern, auto-cleanup registry',
    },
    {
      id: 'modular-design',
      filePatterns: ['**/modules/**', '**/features/**'],
      keywords: ['module', 'boundary', 'subsystem', 'paradigm'],
      contextFile: 'docs/agents/modular-design.md',
      description: 'Paradigms by subsystem, dependency rules, boundaries',
    },
    {
      id: 'dry-principle',
      filePatterns: ['**/config/**', '**/constants/**', '**/.env*'],
      keywords: ['config', 'MODEL_TIER', 'PROVIDER_MAP', 'duplication'],
      contextFile: 'docs/agents/dry-principle.md',
      description: 'Dedup patterns, enforcement checklist, exceptions',
    },
    {
      id: 'cors-csp-security',
      filePatterns: ['**/cors*', '**/helmet*', '**/csp*', '**/security*middleware*'],
      keywords: ['cors(', 'helmet(', 'Content-Security-Policy', 'Access-Control'],
      contextFile: 'docs/agents/testing-security.md',
      description: 'CORS/CSP patterns, security middleware configuration',
    },
    {
      id: 'file-upload',
      filePatterns: ['**/upload*', '**/multer*', '**/storage*', '**/sharp*'],
      keywords: ['multer', 'sharp', 'upload', 'multipart', 'file-type', 'magic bytes'],
      contextFile: 'docs/agents/testing-security.md',
      description: 'File upload security patterns, validation, size limits',
    },
    {
      id: 'payment-billing',
      filePatterns: ['**/stripe*', '**/polar*', '**/billing*', '**/payment*', '**/subscription*', '**/webhook*'],
      keywords: ['stripe', 'polar', 'webhook', 'checkout', 'subscription', 'credit', 'billing'],
      contextFile: 'docs/agents/testing-security.md',
      description: 'Payment security, webhook verification, credit manipulation prevention',
    },
  ];
}

/**
 * Parse context rules from a markdown ```context block
 * 
 * Format:
 * ```context
 * id: my-context
 * filePatterns: ["src/auth/**", "**\/login*"]
 * keywords: ["jwt", "token"]
 * contextFile: docs/agents/authentication.md
 * description: Auth context
 * ```
 * 
 * @param {string} content - Block content
 * @param {string} sourceFile - Source file path
 * @returns {ContextRule|null}
 */
export function parseContextBlock(content, sourceFile) {
  const lines = content.trim().split(/\r?\n/);
  const rule = { source: sourceFile };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    }

    rule[key] = value;
  }

  if (!rule.id || !rule.contextFile) return null;

  // Normalize arrays
  if (typeof rule.filePatterns === 'string') rule.filePatterns = [rule.filePatterns];
  if (typeof rule.keywords === 'string') rule.keywords = [rule.keywords];
  if (!rule.filePatterns) rule.filePatterns = [];
  if (!rule.keywords) rule.keywords = [];

  return rule;
}

/**
 * Extract context rules from markdown
 * @param {string} markdown
 * @param {string} filePath
 * @returns {ContextRule[]}
 */
export function extractContextRules(markdown, filePath) {
  const rules = [];
  const regex = /```context\s*\r?\n([\s\S]*?)```/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    const sections = match[1].split(/^\s*---\s*$/m);
    for (const section of sections) {
      if (section.trim()) {
        const rule = parseContextBlock(section, filePath);
        if (rule) rules.push(rule);
      }
    }
  }

  return rules;
}

/**
 * Context Detector: evaluates file changes against context rules
 */
export class ContextDetector {
  #rules;
  #recentSignals; // Dedup: don't re-emit the same signal within cooldown
  #cooldownMs;

  /**
   * @param {ContextRule[]} rules
   * @param {Object} [options]
   * @param {number} [options.cooldownMs=30000] - Don't re-emit same signal within this window
   */
  constructor(rules, options = {}) {
    this.#rules = rules;
    this.#recentSignals = new Map(); // contextFile → timestamp
    this.#cooldownMs = options.cooldownMs || 30000; // 30s default
  }

  /**
   * Detect which context files should be loaded based on a file change
   * @param {string} filePath - Relative path of the changed file
   * @param {string} [content] - File content (for keyword matching)
   * @returns {ContextSignal[]}
   */
  detect(filePath, content = null) {
    const signals = [];
    const normalized = filePath.replace(/\\/g, '/');
    const now = Date.now();

    for (const rule of this.#rules) {
      // Check cooldown
      const lastEmit = this.#recentSignals.get(rule.contextFile);
      if (lastEmit && (now - lastEmit) < this.#cooldownMs) continue;

      let matched = false;
      let reason = '';
      let matchType = 'file';
      let confidence = 0;

      // File pattern matching
      for (const pattern of rule.filePatterns) {
        const regex = globToRegex(pattern);
        if (regex.test(normalized)) {
          matched = true;
          reason = `File matches pattern: ${pattern}`;
          matchType = 'file';
          confidence = 0.9;
          break;
        }
      }

      // Keyword matching (in content)
      if (!matched && content && rule.keywords.length > 0) {
        for (const keyword of rule.keywords) {
          if (content.includes(keyword)) {
            matched = true;
            reason = `Content contains keyword: "${keyword}"`;
            matchType = 'content';
            confidence = 0.7;
            break;
          }
        }
      }

      // Keyword in file path (lower confidence)
      if (!matched && rule.keywords.length > 0) {
        for (const keyword of rule.keywords) {
          if (normalized.toLowerCase().includes(keyword.toLowerCase())) {
            matched = true;
            reason = `Path contains keyword: "${keyword}"`;
            matchType = 'file';
            confidence = 0.5;
            break;
          }
        }
      }

      if (matched) {
        signals.push({
          contextFile: rule.contextFile,
          reason,
          trigger: filePath,
          matchType,
          confidence,
        });
        this.#recentSignals.set(rule.contextFile, now);
      }
    }

    // Sort by confidence (highest first), deduplicate by contextFile
    const seen = new Set();
    return signals
      .sort((a, b) => b.confidence - a.confidence)
      .filter(s => {
        if (seen.has(s.contextFile)) return false;
        seen.add(s.contextFile);
        return true;
      });
  }

  /**
   * Reset cooldowns (useful for testing or mode switches)
   */
  resetCooldowns() {
    this.#recentSignals.clear();
  }

  get ruleCount() {
    return this.#rules.length;
  }
}

/**
 * Load context rules from project (defaults + any custom ones in docs/agents/*.md)
 * @param {string} projectRoot
 * @returns {Promise<ContextRule[]>}
 */
export async function loadContextRules(projectRoot) {
  const rules = [...getDefaultContextRules()];

  // Also scan docs/agents/*.md for custom ```context blocks
  const docsDir = join(projectRoot, 'docs', 'agents');
  try {
    const { readdir } = await import('node:fs/promises');
    const entries = await readdir(docsDir);
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      try {
        const content = await readFile(join(docsDir, entry), 'utf-8');
        const custom = extractContextRules(content, join(docsDir, entry));
        rules.push(...custom);
      } catch { /* skip unreadable */ }
    }
  } catch { /* no docs/agents dir */ }

  return rules;
}
