// gate-keeper: Gate Definition Parser
//
// Extracts machine-parseable gate definitions from markdown files.
// Gates are defined in fenced code blocks with `yaml gate` or `gate` language identifier,
// OR in a structured YAML frontmatter section.
//
// Gate Definition Format (in markdown):
//
//   ```gate
//   id: no-secrets-in-source
//   trigger: "src/**/*.{ts,js,env,json}"
//   severity: block
//   pattern: /(sk-|pk_live_|AKIA[A-Z0-9]{16})/
//   message: "Potential secret/API key detected"
//   ```

import { readFile, readdir } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';

/**
 * @typedef {Object} Gate
 * @property {string} id - Unique gate identifier
 * @property {string} trigger - Glob pattern for files this gate applies to
 * @property {'block'|'warn'|'info'} severity - Enforcement level
 * @property {string} [pattern] - Regex pattern to search for (violation if found)
 * @property {string} [antipattern] - Regex pattern required to be present (violation if absent)
 * @property {string} message - Human-readable violation message
 * @property {string} [source] - File this gate was parsed from
 * @property {string[]} [exclude] - Glob patterns to exclude
 */

/**
 * Parse a single gate code block content into a Gate object
 * @param {string} content - Raw YAML-like content from a gate code block
 * @param {string} sourceFile - Path of the markdown file containing this gate
 * @returns {Gate|null}
 */
export function parseGateBlock(content, sourceFile) {
  const lines = content.trim().split(/\r?\n/);
  const gate = { source: sourceFile };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    let value = rawValue.trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    // Parse arrays (simple comma-separated in brackets)
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1).split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    }

    gate[key] = value;
  }

  // Validate required fields
  if (!gate.id || !gate.trigger || !gate.severity || !gate.message) {
    return null;
  }

  // Validate severity
  if (!['block', 'warn', 'info'].includes(gate.severity)) {
    gate.severity = 'warn';
  }

  return gate;
}

/**
 * Extract all gate blocks from a markdown file's content
 * @param {string} markdown - Markdown file content
 * @param {string} filePath - Path of the file (for source tracking)
 * @returns {Gate[]}
 */
export function extractGates(markdown, filePath) {
  const gates = [];

  // Match fenced code blocks with gate language identifier
  // Supports: ```gate, ```yaml gate, ```gates
  const gateBlockRegex = /```(?:yaml\s+)?gates?\s*\r?\n([\s\S]*?)```/g;
  let match;

  while ((match = gateBlockRegex.exec(markdown)) !== null) {
    const blockContent = match[1];

    // A single block can contain multiple gates separated by ---
    const gateSections = blockContent.split(/^\s*---\s*$/m);

    for (const section of gateSections) {
      if (section.trim()) {
        const gate = parseGateBlock(section, filePath);
        if (gate) gates.push(gate);
      }
    }
  }

  return gates;
}

/**
 * Load gates from a gatefile (dedicated .gates.yml or .gates.yaml)
 * @param {string} content - File content
 * @param {string} filePath - Path of the file
 * @returns {Gate[]}
 */
export function extractGatesFromYaml(content, filePath) {
  const gates = [];
  // Simple YAML parser for gate files (avoids dependency on js-yaml)
  // Each gate is separated by ---
  const sections = content.split(/^---$/m);

  for (const section of sections) {
    if (section.trim()) {
      const gate = parseGateBlock(section, filePath);
      if (gate) gates.push(gate);
    }
  }

  return gates;
}

/**
 * Recursively find and load all gates from a directory
 * @param {string} dir - Directory to scan for gate definitions
 * @returns {Promise<Gate[]>}
 */
export async function loadGatesFromDirectory(dir) {
  const gates = [];
  const resolvedDir = resolve(dir);

  let entries;
  try {
    entries = await readdir(resolvedDir, { withFileTypes: true, recursive: true });
  } catch (err) {
    if (err.code === 'ENOENT') return gates;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const fullPath = join(entry.parentPath || entry.path, entry.name);
    const ext = extname(entry.name);

    try {
      if (ext === '.md') {
        const content = await readFile(fullPath, 'utf-8');
        gates.push(...extractGates(content, fullPath));
      } else if (entry.name.match(/\.gates\.(ya?ml)$/)) {
        const content = await readFile(fullPath, 'utf-8');
        gates.push(...extractGatesFromYaml(content, fullPath));
      }
    } catch (err) {
      // Skip files we can't read
      if (err.code !== 'EACCES') throw err;
    }
  }

  return gates;
}

/**
 * Load gates from the default locations in a project
 * @param {string} projectRoot - Project root directory
 * @returns {Promise<Gate[]>}
 */
export async function loadProjectGates(projectRoot) {
  const gates = [];
  const root = resolve(projectRoot);

  // Priority loading order:
  // 1. docs/agents/*.md (primary gate source)
  // 2. .gates/ directory (dedicated gate files)
  // 3. Root .gates.yml (project-level overrides)

  const searchPaths = [
    join(root, 'docs', 'agents'),
    join(root, '.gates'),
  ];

  for (const searchPath of searchPaths) {
    gates.push(...await loadGatesFromDirectory(searchPath));
  }

  // Also check for root gatefile
  try {
    for (const name of ['.gates.yml', '.gates.yaml', 'gates.yml']) {
      try {
        const content = await readFile(join(root, name), 'utf-8');
        gates.push(...extractGatesFromYaml(content, join(root, name)));
        break;
      } catch { /* not found, try next */ }
    }
  } catch { /* ignore */ }

  return gates;
}
