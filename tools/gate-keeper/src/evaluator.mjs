/**
 * gate-keeper: Rule Evaluation Engine
 * 
 * Evaluates files against parsed gate definitions.
 * Handles glob matching, regex pattern evaluation, and violation reporting.
 */

import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

/**
 * @typedef {Object} Violation
 * @property {string} gateId - Which gate was violated
 * @property {string} file - File path that violated
 * @property {'block'|'warn'|'info'} severity - Enforcement level
 * @property {string} message - Human-readable explanation
 * @property {number} [line] - Line number of violation (if applicable)
 * @property {string} [match] - The matched content (truncated)
 * @property {string} source - Gate definition source file
 */

/**
 * Minimal glob-to-regex converter (handles common patterns without dependencies)
 * Supports: *, **, ?, {a,b}, [abc]
 * @param {string} glob - Glob pattern
 * @returns {RegExp}
 */
export function globToRegex(glob) {
  let regex = '';
  let i = 0;

  while (i < glob.length) {
    const c = glob[i];

    if (c === '*') {
      if (glob[i + 1] === '*') {
        // ** matches any path segment(s)
        if (glob[i + 2] === '/' || glob[i + 2] === '\\') {
          regex += '(?:.+[\\\\/])?';
          i += 3;
        } else {
          regex += '.*';
          i += 2;
        }
      } else {
        // * matches anything except path separator
        regex += '[^\\\\/]*';
        i++;
      }
    } else if (c === '?') {
      regex += '[^\\\\/]';
      i++;
    } else if (c === '{') {
      // Brace expansion {a,b,c}
      const close = glob.indexOf('}', i);
      if (close === -1) {
        regex += '\\{';
        i++;
      } else {
        const options = glob.slice(i + 1, close).split(',');
        regex += '(?:' + options.map(o => escapeRegex(o)).join('|') + ')';
        i = close + 1;
      }
    } else if (c === '[') {
      const close = glob.indexOf(']', i);
      if (close === -1) {
        regex += '\\[';
        i++;
      } else {
        regex += glob.slice(i, close + 1);
        i = close + 1;
      }
    } else if (c === '/' || c === '\\') {
      regex += '[\\\\/]';
      i++;
    } else {
      regex += escapeRegex(c);
      i++;
    }
  }

  return new RegExp('^' + regex + '$', 'i');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if a file path matches a gate's trigger glob
 * @param {string} filePath - Relative file path
 * @param {string} triggerGlob - Gate trigger pattern
 * @returns {boolean}
 */
export function matchesTrigger(filePath, triggerGlob) {
  // Normalize separators
  const normalized = filePath.replace(/\\/g, '/');
  const regex = globToRegex(triggerGlob);
  return regex.test(normalized);
}

/**
 * Check if a file path matches any of the exclude globs
 * @param {string} filePath - Relative file path
 * @param {string[]} excludeGlobs - Patterns to exclude
 * @returns {boolean}
 */
export function matchesExclude(filePath, excludeGlobs) {
  if (!excludeGlobs || excludeGlobs.length === 0) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return excludeGlobs.some(glob => globToRegex(glob).test(normalized));
}

/**
 * Evaluate a single gate against file content
 * @param {import('./parser.mjs').Gate} gate - Gate definition
 * @param {string} content - File content
 * @param {string} filePath - File path (relative)
 * @returns {Violation|null} - Violation if gate is violated, null if passes
 */
export function evaluateGate(gate, content, filePath) {
  // Pattern match: violation if regex IS found in content
  if (gate.pattern) {
    const regex = toRegex(gate.pattern);
    if (!regex) return null; // Invalid regex, skip

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(regex);
      if (match) {
        return {
          gateId: gate.id,
          file: filePath,
          severity: gate.severity,
          message: gate.message,
          line: i + 1,
          match: truncate(match[0], 60),
          source: gate.source,
        };
      }
    }
  }

  // Antipattern match: violation if regex is NOT found in content
  if (gate.antipattern) {
    const regex = toRegex(gate.antipattern);
    if (!regex) return null;

    if (!regex.test(content)) {
      return {
        gateId: gate.id,
        file: filePath,
        severity: gate.severity,
        message: gate.message,
        line: null,
        match: null,
        source: gate.source,
      };
    }
  }

  return null; // Gate passes
}

/**
 * Convert a pattern string to a RegExp.
 * Accepts: /pattern/flags or plain string (treated as literal)
 * @param {string} pattern
 * @returns {RegExp|null}
 */
function toRegex(pattern) {
  try {
    // Check if it's a regex literal: /pattern/ or /pattern/flags
    const regexMatch = pattern.match(/^\/(.+)\/([gimsuy]*)$/);
    if (regexMatch) {
      return new RegExp(regexMatch[1], regexMatch[2]);
    }
    // Otherwise treat as plain string pattern
    return new RegExp(escapeRegex(pattern));
  } catch {
    return null;
  }
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '...' : str;
}

/**
 * Evaluate all gates against a single file
 * @param {import('./parser.mjs').Gate[]} gates - All loaded gates
 * @param {string} filePath - Absolute path to the changed file
 * @param {string} projectRoot - Project root for relative path calculation
 * @returns {Promise<Violation[]>}
 */
export async function evaluateFile(gates, filePath, projectRoot) {
  const violations = [];
  const relPath = relative(resolve(projectRoot), resolve(filePath));

  // Filter gates that apply to this file
  const applicableGates = gates.filter(gate => {
    if (!matchesTrigger(relPath, gate.trigger)) return false;
    if (matchesExclude(relPath, gate.exclude)) return false;
    return true;
  });

  if (applicableGates.length === 0) return violations;

  // Read file content
  let content;
  try {
    content = await readFile(filePath, 'utf-8');
  } catch (err) {
    // File might have been deleted between event and evaluation
    if (err.code === 'ENOENT') return violations;
    throw err;
  }

  // Evaluate each applicable gate
  for (const gate of applicableGates) {
    const violation = evaluateGate(gate, content, relPath);
    if (violation) violations.push(violation);
  }

  return violations;
}

/**
 * Evaluate all gates against multiple files (batch mode / --check)
 * @param {import('./parser.mjs').Gate[]} gates
 * @param {string[]} filePaths - Absolute paths
 * @param {string} projectRoot
 * @returns {Promise<Violation[]>}
 */
export async function evaluateFiles(gates, filePaths, projectRoot) {
  const results = await Promise.all(
    filePaths.map(fp => evaluateFile(gates, fp, projectRoot))
  );
  return results.flat();
}
