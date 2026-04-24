/**
 * gate-keeper: Enforcement Actions
 * 
 * Handles what happens when a gate violation is detected.
 * Supports: alert, revert (shadow copy), log, and configurable actions.
 */

import { readFile, writeFile, mkdir, copyFile, stat } from 'node:fs/promises';
import { join, resolve, dirname, relative } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * @typedef {'alert'|'revert'|'log'|'block'} EnforcementAction
 */

/**
 * @typedef {Object} EnforcerConfig
 * @property {string} projectRoot - Project root directory
 * @property {'strict'|'warn'|'audit'} mode - Enforcement mode
 *   - strict: revert + alert for block-severity, alert for warn
 *   - warn: alert only (never revert), exit code still reflects violations
 *   - audit: log only (silent, writes to .gate-keeper/violations.log)
 * @property {string} [logFile] - Path to violation log (default: .gate-keeper/violations.log)
 * @property {boolean} [notifications] - Enable desktop notifications (default: false)
 * @property {boolean} [sound] - Enable terminal bell on violations (default: false)
 */

// ANSI color codes for terminal output
const COLORS = {
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
  reset: '\x1b[0m',
};

const ICONS = {
  block: `${COLORS.red}✖${COLORS.reset}`,
  warn: `${COLORS.yellow}⚠${COLORS.reset}`,
  info: `${COLORS.blue}ℹ${COLORS.reset}`,
  pass: `${COLORS.cyan}✓${COLORS.reset}`,
  revert: `${COLORS.red}↩${COLORS.reset}`,
};

/**
 * Shadow Store: maintains known-good copies of files for revert capability
 */
export class ShadowStore {
  #root;
  #shadowDir;

  constructor(projectRoot) {
    this.#root = resolve(projectRoot);
    this.#shadowDir = join(this.#root, '.gate-keeper', 'shadow');
  }

  /**
   * Get the shadow path for a source file
   * @param {string} filePath - Absolute source path
   * @returns {string}
   */
  #getShadowPath(filePath) {
    const rel = relative(this.#root, resolve(filePath));
    return join(this.#shadowDir, rel);
  }

  /**
   * Snapshot a file (save known-good copy)
   * @param {string} filePath - Absolute path to snapshot
   */
  async snapshot(filePath) {
    const shadowPath = this.#getShadowPath(filePath);
    await mkdir(dirname(shadowPath), { recursive: true });
    await copyFile(filePath, shadowPath);
  }

  /**
   * Check if a shadow copy exists
   * @param {string} filePath
   * @returns {Promise<boolean>}
   */
  async has(filePath) {
    const shadowPath = this.#getShadowPath(filePath);
    try {
      await stat(shadowPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revert a file to its shadow copy
   * @param {string} filePath - Absolute path to revert
   * @returns {Promise<boolean>} - true if reverted, false if no shadow exists
   */
  async revert(filePath) {
    const shadowPath = this.#getShadowPath(filePath);
    try {
      await copyFile(shadowPath, filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update shadow after a file passes all gates (new known-good state)
   * @param {string} filePath
   */
  async update(filePath) {
    await this.snapshot(filePath);
  }

  get shadowDir() {
    return this.#shadowDir;
  }
}

/**
 * Violation Logger: writes violations to a log file
 */
export class ViolationLogger {
  #logPath;

  constructor(projectRoot, logFile) {
    this.#logPath = logFile || join(projectRoot, '.gate-keeper', 'violations.log');
  }

  /**
   * Append a violation entry to the log
   * @param {import('./evaluator.mjs').Violation} violation
   */
  async log(violation) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      ...violation,
    }) + '\n';

    await mkdir(dirname(this.#logPath), { recursive: true });
    const { appendFile } = await import('node:fs/promises');
    await appendFile(this.#logPath, entry);
  }

  get logPath() {
    return this.#logPath;
  }
}

/**
 * Main Enforcer: orchestrates enforcement actions based on violations
 */
export class Enforcer {
  #config;
  #shadow;
  #logger;
  #stats;

  /**
   * @param {EnforcerConfig} config
   */
  constructor(config) {
    this.#config = config;
    this.#shadow = new ShadowStore(config.projectRoot);
    this.#logger = new ViolationLogger(config.projectRoot, config.logFile);
    this.#stats = { violations: 0, reverts: 0, filesChecked: 0 };
  }

  /**
   * Handle violations for a single file
   * @param {string} filePath - Absolute path of the file
   * @param {import('./evaluator.mjs').Violation[]} violations
   * @returns {Promise<{reverted: boolean, blocked: boolean}>}
   */
  async enforce(filePath, violations) {
    if (violations.length === 0) {
      // File passes all gates — update shadow copy
      this.#stats.filesChecked++;
      await this.#shadow.update(filePath);
      return { reverted: false, blocked: false };
    }

    this.#stats.filesChecked++;
    let reverted = false;
    let blocked = false;

    for (const violation of violations) {
      this.#stats.violations++;

      // Always log
      await this.#logger.log(violation);

      // Display based on mode
      if (this.#config.mode !== 'audit') {
        this.#printViolation(violation);
      }

      // Revert on block-severity in strict mode
      if (this.#config.mode === 'strict' && violation.severity === 'block') {
        const didRevert = await this.#shadow.revert(filePath);
        if (didRevert) {
          reverted = true;
          this.#stats.reverts++;
          this.#printRevert(filePath);
        }
        blocked = true;
      }
    }

    // Sound alert if configured
    if (this.#config.sound && violations.some(v => v.severity === 'block')) {
      process.stdout.write('\x07'); // Terminal bell
    }

    return { reverted, blocked };
  }

  /**
   * Handle a file that passes all gates (update shadow)
   * @param {string} filePath
   */
  async markClean(filePath) {
    this.#stats.filesChecked++;
    await this.#shadow.update(filePath);
  }

  /**
   * Initialize shadow copies for existing files
   * @param {string[]} filePaths - Absolute paths to snapshot
   */
  async initShadows(filePaths) {
    for (const fp of filePaths) {
      if (!await this.#shadow.has(fp)) {
        await this.#shadow.snapshot(fp);
      }
    }
  }

  /**
   * Print a formatted violation to terminal
   * @param {import('./evaluator.mjs').Violation} violation
   */
  #printViolation(violation) {
    const icon = ICONS[violation.severity] || ICONS.warn;
    const loc = violation.line ? `:${violation.line}` : '';
    const matchStr = violation.match
      ? `${COLORS.gray} → "${violation.match}"${COLORS.reset}`
      : '';

    console.log(
      `  ${icon} ${COLORS.bold}${violation.gateId}${COLORS.reset} ` +
      `${violation.file}${loc}${matchStr}`
    );
    console.log(
      `    ${COLORS.gray}${violation.message}${COLORS.reset}`
    );
  }

  /**
   * Print revert notification
   * @param {string} filePath
   */
  #printRevert(filePath) {
    const rel = relative(this.#config.projectRoot, filePath);
    console.log(
      `  ${ICONS.revert} ${COLORS.red}REVERTED${COLORS.reset} ${rel} ` +
      `${COLORS.gray}(restored from shadow copy)${COLORS.reset}`
    );
  }

  /** Get current stats */
  get stats() {
    return { ...this.#stats };
  }

  /** Get shadow store (for external use) */
  get shadow() {
    return this.#shadow;
  }
}

/**
 * Print a summary line
 * @param {Object} stats
 * @param {number} gateCount
 */
export function printSummary(stats, gateCount) {
  const { violations, reverts, filesChecked } = stats;

  if (violations === 0) {
    console.log(
      `\n  ${ICONS.pass} ${COLORS.cyan}All clear${COLORS.reset} — ` +
      `${filesChecked} files checked against ${gateCount} gates\n`
    );
  } else {
    console.log(
      `\n  ${COLORS.red}${COLORS.bold}${violations} violation(s)${COLORS.reset} ` +
      `across ${filesChecked} files` +
      (reverts > 0 ? `, ${reverts} reverted` : '') +
      `\n`
    );
  }
}
