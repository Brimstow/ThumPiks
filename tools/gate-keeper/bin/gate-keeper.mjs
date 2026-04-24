#!/usr/bin/env node

/**
 * gate-keeper CLI
 * 
 * Standalone enforcement daemon. IDE-agnostic. VCS-agnostic. CLI-agnostic.
 * 
 * Usage:
 *   gate-keeper watch [--mode strict|warn|audit] [--root <path>]
 *   gate-keeper check [--files <glob>] [--root <path>]
 *   gate-keeper init
 *   gate-keeper list
 * 
 * Commands:
 *   watch   Start the filesystem watcher (foreground process)
 *   check   One-shot evaluation of files (for CI/automation)
 *   init    Create a starter .gates.yml with example gates
 *   list    Show all loaded gates and their trigger patterns
 */

import { resolve, relative } from 'node:path';
import { readdir, stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import { loadProjectGates } from '../src/parser.mjs';
import { evaluateFile } from '../src/evaluator.mjs';
import { createWatcher, getWatcherConfig } from '../src/watcher.mjs';
import { Enforcer, printSummary } from '../src/enforcer.mjs';
import { globToRegex } from '../src/evaluator.mjs';
import { ContextDetector, loadContextRules } from '../src/context-detector.mjs';

// ─── Argument Parsing ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name, defaultValue = null) {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return defaultValue;
  return args[idx + 1] || defaultValue;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const projectRoot = resolve(getFlag('root', '.'));
const mode = getFlag('mode', 'warn');
const sound = hasFlag('sound');

// ─── ANSI Helpers ────────────────────────────────────────────────────────────

const C = {
  bold: '\x1b[1m', dim: '\x1b[2m', reset: '\x1b[0m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', gray: '\x1b[90m',
};

function banner() {
  console.log(`
  ${C.cyan}${C.bold}gate-keeper${C.reset} ${C.dim}v0.1.0${C.reset}
  ${C.gray}Standalone enforcement daemon${C.reset}
  ${C.gray}IDE-agnostic · VCS-agnostic · CLI-agnostic${C.reset}
  `);
}

// ─── Context Signal Helpers ──────────────────────────────────────────────────

function printContextSignal(signal, timestamp) {
  const confStr = signal.confidence >= 0.8 ? '' : ` ${C.gray}(${Math.round(signal.confidence * 100)}%)${C.reset}`;
  console.log(
    `  ${C.gray}${timestamp}${C.reset} ${C.cyan}⟡${C.reset} ` +
    `${C.bold}LOAD${C.reset} ${C.cyan}${signal.contextFile}${C.reset}${confStr}`
  );
  console.log(
    `    ${C.gray}${signal.reason}${C.reset}`
  );
}

async function writeContextSignals(signals) {
  const contextFile = resolve(projectRoot, '.gate-keeper', 'context.json');
  try {
    await mkdir(resolve(projectRoot, '.gate-keeper'), { recursive: true });
    const payload = {
      timestamp: new Date().toISOString(),
      signals: signals.map(s => ({
        contextFile: s.contextFile,
        reason: s.reason,
        trigger: s.trigger,
        confidence: s.confidence,
      })),
    };
    await writeFile(contextFile, JSON.stringify(payload, null, 2));
  } catch { /* non-critical */ }
}

// ─── Commands ────────────────────────────────────────────────────────────────

async function cmdWatch() {
  banner();

  // Load gates
  const gates = await loadProjectGates(projectRoot);
  if (gates.length === 0) {
    console.log(`  ${C.yellow}⚠ No gates found.${C.reset}`);
    console.log(`  ${C.gray}Run 'gate-keeper init' to create example gates,`);
    console.log(`  or add gate blocks to your docs/agents/*.md files.${C.reset}\n`);
    process.exit(0);
  }

  console.log(`  ${C.green}✓${C.reset} Loaded ${C.bold}${gates.length}${C.reset} gates from ${countSources(gates)} source(s)`);
  console.log(`  ${C.gray}Mode: ${mode} | Root: ${projectRoot}${C.reset}`);
  console.log(`  ${C.gray}Trigger: filesystem events (chokidar)${C.reset}`);

  // Load context detection rules
  const contextRules = await loadContextRules(projectRoot);
  const contextDetector = new ContextDetector(contextRules, {
    cooldownMs: hasFlag('no-cooldown') ? 0 : 30000,
  });
  const contextEnabled = !hasFlag('no-context');
  if (contextEnabled) {
    console.log(`  ${C.green}✓${C.reset} Context detection: ${C.bold}${contextDetector.ruleCount}${C.reset} rules active`);
  }
  console.log('');

  // Initialize enforcer
  const enforcer = new Enforcer({
    projectRoot,
    mode,
    sound,
  });

  // Get watcher config
  const watchConfig = await getWatcherConfig(projectRoot);

  // Start watching
  console.log(`  ${C.blue}◉${C.reset} Watching for changes... ${C.gray}(Ctrl+C to stop)${C.reset}\n`);

  const watcher = await createWatcher(watchConfig, async (filePath, event) => {
    const rel = relative(projectRoot, filePath);
    const timestamp = new Date().toLocaleTimeString();

    // Evaluate gates
    const violations = await evaluateFile(gates, filePath, projectRoot);

    if (violations.length > 0) {
      console.log(`  ${C.gray}${timestamp}${C.reset} ${C.dim}${event}${C.reset} ${rel}`);
      await enforcer.enforce(filePath, violations);
    } else {
      // File is clean — update shadow
      await enforcer.markClean(filePath);
      if (hasFlag('verbose')) {
        console.log(`  ${C.gray}${timestamp} ${event} ${rel} — ok${C.reset}`);
      }
    }

    // Context detection (independent of gate pass/fail)
    if (contextEnabled) {
      let content = null;
      try {
        const { readFile } = await import('node:fs/promises');
        content = await readFile(filePath, 'utf-8');
      } catch { /* skip binary/missing files */ }

      const signals = contextDetector.detect(rel, content);
      for (const signal of signals) {
        printContextSignal(signal, timestamp);
      }

      // Write signals to .gate-keeper/context.json for external consumers
      if (signals.length > 0) {
        await writeContextSignals(signals);
      }
    }
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log(`\n  ${C.gray}Stopping watcher...${C.reset}`);
    watcher.close();
    const stats = enforcer.stats;
    printSummary(stats, gates.length);
    process.exit(stats.violations > 0 ? 1 : 0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function cmdCheck() {
  banner();

  // Load gates
  const gates = await loadProjectGates(projectRoot);
  if (gates.length === 0) {
    console.log(`  ${C.yellow}⚠ No gates found.${C.reset}\n`);
    process.exit(0);
  }

  console.log(`  ${C.green}✓${C.reset} Loaded ${C.bold}${gates.length}${C.reset} gates`);
  console.log(`  ${C.gray}Running one-shot evaluation...${C.reset}\n`);

  // Find all files that match any gate trigger
  const allFiles = await collectFiles(projectRoot, gates);
  console.log(`  ${C.gray}Scanning ${allFiles.length} files...${C.reset}\n`);

  const enforcer = new Enforcer({
    projectRoot,
    mode: 'warn', // check mode never reverts
  });

  let totalViolations = 0;

  for (const filePath of allFiles) {
    const violations = await evaluateFile(gates, filePath, projectRoot);
    if (violations.length > 0) {
      totalViolations += violations.length;
      await enforcer.enforce(filePath, violations);
    }
  }

  printSummary(enforcer.stats, gates.length);
  process.exit(totalViolations > 0 ? 1 : 0);
}

async function cmdInit() {
  banner();

  const gateFile = resolve(projectRoot, '.gates.yml');
  const content = `# gate-keeper: Project Gate Definitions
# These gates are enforced automatically when files change.
# Place gates here or embed them in docs/agents/*.md files.
#
# Gate Format:
#   id:          Unique identifier
#   trigger:     Glob pattern for files this applies to
#   severity:    block | warn | info
#   pattern:     Regex — violation if FOUND (for detecting bad things)
#   antipattern: Regex — violation if NOT found (for requiring good things)
#   message:     Human-readable explanation
#   exclude:     [optional] Glob patterns to skip

---
id: no-secrets-in-source
trigger: "**/*.{ts,js,mjs,cjs,tsx,jsx,json,env}"
severity: block
pattern: /(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]+|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})/
message: "Potential API key or secret detected in source code"
exclude: ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]

---
id: no-console-log-in-prod
trigger: "src/**/*.{ts,tsx,js,jsx}"
severity: warn
pattern: /console\\.(log|debug|info)\\(/
message: "console.log left in production code (use a proper logger)"
exclude: ["**/*.test.*", "**/*.spec.*", "**/scripts/**"]

---
id: no-any-type
trigger: "**/*.{ts,tsx}"
severity: warn
pattern: /:\\s*any[\\s;,)]/
message: "Explicit 'any' type detected — use a specific type or 'unknown'"
exclude: ["**/*.test.*", "**/*.d.ts"]

---
id: no-disabled-eslint
trigger: "**/*.{ts,tsx,js,jsx}"
severity: info
pattern: /eslint-disable(?!-next-line)/
message: "File-level eslint-disable found — prefer eslint-disable-next-line for specific rules"
`;

  try {
    await writeFile(gateFile, content);
    console.log(`  ${C.green}✓${C.reset} Created ${C.bold}.gates.yml${C.reset} with example gates`);
    console.log(`  ${C.gray}Edit the file to customize gates for your project.${C.reset}`);
    console.log(`  ${C.gray}Run 'gate-keeper watch' to start enforcement.${C.reset}\n`);
  } catch (err) {
    console.error(`  ${C.red}✖ Failed to create .gates.yml:${C.reset} ${err.message}\n`);
    process.exit(1);
  }
}

async function cmdList() {
  banner();

  const gates = await loadProjectGates(projectRoot);
  if (gates.length === 0) {
    console.log(`  ${C.yellow}⚠ No gates found.${C.reset}\n`);
    process.exit(0);
  }

  console.log(`  ${C.bold}${gates.length} gate(s) loaded:${C.reset}\n`);

  const severityColor = { block: C.red, warn: C.yellow, info: C.blue };

  for (const gate of gates) {
    const color = severityColor[gate.severity] || C.gray;
    console.log(`  ${color}●${C.reset} ${C.bold}${gate.id}${C.reset} ${C.gray}[${gate.severity}]${C.reset}`);
    console.log(`    ${C.gray}trigger:${C.reset} ${gate.trigger}`);
    if (gate.pattern) console.log(`    ${C.gray}pattern:${C.reset} ${gate.pattern}`);
    if (gate.antipattern) console.log(`    ${C.gray}antipattern:${C.reset} ${gate.antipattern}`);
    console.log(`    ${C.gray}message:${C.reset} ${gate.message}`);
    if (gate.source) console.log(`    ${C.gray}source:${C.reset} ${relative(projectRoot, gate.source)}`);
    console.log('');
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function countSources(gates) {
  return new Set(gates.map(g => g.source)).size;
}

/**
 * Collect all files in the project that match at least one gate trigger
 * (for --check mode)
 */
async function collectFiles(root, gates, maxDepth = 10) {
  const files = [];
  const ignored = new Set(['node_modules', '.git', '.svn', '.hg', 'dist', 'build', 'coverage', '.next', '.gate-keeper']);

  async function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;

      const fullPath = resolve(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const rel = relative(root, fullPath).replace(/\\/g, '/');
        // Check if any gate applies to this file
        const applies = gates.some(g => {
          const regex = globToRegex(g.trigger);
          return regex.test(rel);
        });
        if (applies) files.push(fullPath);
      }
    }
  }

  await walk(root, 0);
  return files;
}

// ─── Context Command ─────────────────────────────────────────────────────────

async function cmdContext() {
  banner();

  const contextRules = await loadContextRules(projectRoot);
  const detector = new ContextDetector(contextRules, { cooldownMs: 0 });

  // If --file is specified, detect context for that file
  const targetFile = getFlag('file');
  if (targetFile) {
    const rel = relative(projectRoot, resolve(targetFile)).replace(/\\/g, '/');
    console.log(`  ${C.bold}Context detection for:${C.reset} ${rel}\n`);

    let content = null;
    try {
      content = await readFile(resolve(targetFile), 'utf-8');
    } catch { /* skip */ }

    const signals = detector.detect(rel, content);
    if (signals.length === 0) {
      console.log(`  ${C.gray}No context recommendations for this file.${C.reset}\n`);
    } else {
      for (const signal of signals) {
        const confStr = `${C.gray}(${Math.round(signal.confidence * 100)}%)${C.reset}`;
        console.log(
          `  ${C.cyan}⟡${C.reset} ${C.bold}${signal.contextFile}${C.reset} ${confStr}`
        );
        console.log(`    ${C.gray}${signal.reason}${C.reset}`);
        console.log('');
      }
    }
    return;
  }

  // Otherwise, show all context rules
  console.log(`  ${C.bold}${contextRules.length} context rule(s) loaded:${C.reset}\n`);

  for (const rule of contextRules) {
    console.log(`  ${C.cyan}⟡${C.reset} ${C.bold}${rule.id}${C.reset}`);
    console.log(`    ${C.gray}loads:${C.reset} ${rule.contextFile}`);
    if (rule.filePatterns.length > 0) {
      console.log(`    ${C.gray}files:${C.reset} ${rule.filePatterns.join(', ')}`);
    }
    if (rule.keywords.length > 0) {
      console.log(`    ${C.gray}keywords:${C.reset} ${rule.keywords.slice(0, 5).join(', ')}${rule.keywords.length > 5 ? '...' : ''}`);
    }
    console.log('');
  }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

function showHelp() {
  banner();
  console.log(`  ${C.bold}Usage:${C.reset}`);
  console.log(`    gate-keeper ${C.cyan}watch${C.reset}    [--mode strict|warn|audit] [--root <path>] [--verbose] [--sound]`);
  console.log(`    gate-keeper ${C.cyan}check${C.reset}    [--root <path>]`);
  console.log(`    gate-keeper ${C.cyan}context${C.reset}  [--file <path>] [--root <path>]`);
  console.log(`    gate-keeper ${C.cyan}init${C.reset}     [--root <path>]`);
  console.log(`    gate-keeper ${C.cyan}list${C.reset}     [--root <path>]`);
  console.log('');
  console.log(`  ${C.bold}Commands:${C.reset}`);
  console.log(`    ${C.cyan}watch${C.reset}     Start the filesystem watcher (real-time enforcement + context)`);
  console.log(`    ${C.cyan}check${C.reset}     One-shot gate evaluation (exits with code 1 on violations)`);
  console.log(`    ${C.cyan}context${C.reset}   Show context recommendations for a file or list all rules`);
  console.log(`    ${C.cyan}init${C.reset}      Create a starter .gates.yml with example gates`);
  console.log(`    ${C.cyan}list${C.reset}      Show all loaded gates and their trigger patterns`);
  console.log('');
  console.log(`  ${C.bold}Enforcement Modes:${C.reset}`);
  console.log(`    ${C.red}strict${C.reset}  Revert files on block-severity violations (shadow copy)`);
  console.log(`    ${C.yellow}warn${C.reset}    Alert only (default) — never modifies files`);
  console.log(`    ${C.gray}audit${C.reset}   Silent logging — writes to .gate-keeper/violations.log`);
  console.log('');
  console.log(`  ${C.bold}Watch Mode Features:${C.reset}`);
  console.log(`    • ${C.red}Gate enforcement${C.reset}      ${C.gray}Detect violations in real-time${C.reset}`);
  console.log(`    • ${C.cyan}Context detection${C.reset}    ${C.gray}Recommend which docs/agents/ to load${C.reset}`);
  console.log(`    • ${C.gray}--no-context${C.reset}         ${C.gray}Disable context signals (gates only)${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Gate Sources (checked in order):${C.reset}`);
  console.log(`    1. docs/agents/*.md   ${C.gray}(embedded \`\`\`gate blocks)${C.reset}`);
  console.log(`    2. .gates/ directory  ${C.gray}(dedicated gate files)${C.reset}`);
  console.log(`    3. .gates.yml         ${C.gray}(project root)${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Context Signal Output:${C.reset}`);
  console.log(`    • Terminal            ${C.gray}(real-time LOAD recommendations)${C.reset}`);
  console.log(`    • .gate-keeper/context.json  ${C.gray}(machine-readable, for IDE extensions)${C.reset}`);
  console.log('');
  console.log(`  ${C.bold}Trigger Points:${C.reset}`);
  console.log(`    • Filesystem events  ${C.gray}(file create, modify — via chokidar)${C.reset}`);
  console.log(`    • One-shot CLI       ${C.gray}(gate-keeper check / context — for CI/scripts)${C.reset}`);
  console.log(`    • Any automation     ${C.gray}(cron, task scheduler, npm scripts)${C.reset}`);
  console.log('');
}

switch (command) {
  case 'watch':
    cmdWatch();
    break;
  case 'check':
    cmdCheck();
    break;
  case 'context':
    cmdContext();
    break;
  case 'init':
    cmdInit();
    break;
  case 'list':
    cmdList();
    break;
  case '--help':
  case '-h':
  case 'help':
    showHelp();
    break;
  default:
    showHelp();
    if (command) {
      console.log(`  ${C.red}Unknown command: ${command}${C.reset}\n`);
      process.exit(1);
    }
}
