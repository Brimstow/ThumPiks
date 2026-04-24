/**
 * gate-keeper: Filesystem Watcher
 * 
 * Watches the project directory for file changes using chokidar.
 * Triggers gate evaluation on change events.
 * Manages debouncing and event coalescing.
 */

import { resolve, relative } from 'node:path';

/**
 * @typedef {Object} WatcherConfig
 * @property {string} root - Project root to watch
 * @property {string[]} [include] - Glob patterns to include (default: all)
 * @property {string[]} [ignore] - Glob patterns to ignore
 * @property {number} [stabilityThreshold] - ms to wait for file to stabilize (default: 200)
 * @property {number} [pollInterval] - ms for polling (network drives, default: null = no polling)
 */

/** Default ignore patterns (things that should never trigger gates) */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.svn/**',
  '**/.hg/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/.cache/**',
  '**/tmp/**',
  '**/*.log',
  '**/.DS_Store',
  '**/Thumbs.db',
  // Gate-keeper's own shadow store
  '**/.gate-keeper/**',
];

/**
 * Create and start a file watcher
 * @param {WatcherConfig} config
 * @param {(filePath: string, event: string) => void} onFileChange - Callback for file changes
 * @returns {Promise<import('chokidar').FSWatcher>}
 */
export async function createWatcher(config, onFileChange) {
  // Dynamic import — chokidar is the only external dependency
  const { watch } = await import('chokidar');

  const root = resolve(config.root);
  const ignored = [...DEFAULT_IGNORE, ...(config.ignore || [])];

  const watchPaths = config.include && config.include.length > 0
    ? config.include.map(p => resolve(root, p))
    : [root];

  const watcher = watch(watchPaths, {
    ignored,
    persistent: true,
    ignoreInitial: true,
    // Wait for writes to finish (handles editors that write temp + rename)
    awaitWriteFinish: {
      stabilityThreshold: config.stabilityThreshold || 200,
      pollInterval: 50,
    },
    // Don't follow symlinks into node_modules etc.
    followSymlinks: false,
    // Use polling only if explicitly requested (for network drives)
    ...(config.pollInterval ? { usePolling: true, interval: config.pollInterval } : {}),
  });

  watcher.on('change', (filePath) => {
    onFileChange(resolve(filePath), 'change');
  });

  watcher.on('add', (filePath) => {
    onFileChange(resolve(filePath), 'add');
  });

  // Wait for initial scan to complete
  await new Promise((res) => watcher.on('ready', res));

  return watcher;
}

/**
 * Get the default watcher config from project root
 * Looks for .gate-keeper.yml or .gatekeeperrc or gatekeeper.config.mjs
 * Falls back to sensible defaults
 * @param {string} projectRoot
 * @returns {Promise<WatcherConfig>}
 */
export async function getWatcherConfig(projectRoot) {
  const { readFile } = await import('node:fs/promises');
  const { join } = await import('node:path');

  // Try to load config file
  const configFiles = [
    '.gate-keeper.yml',
    '.gatekeeperrc',
    'gate-keeper.config.yml',
  ];

  for (const configFile of configFiles) {
    try {
      const content = await readFile(join(projectRoot, configFile), 'utf-8');
      return { root: projectRoot, ...parseSimpleYaml(content) };
    } catch { /* not found, try next */ }
  }

  // Default config
  return {
    root: projectRoot,
    include: ['**/*.{ts,tsx,js,jsx,mjs,cjs,json,yml,yaml,env,md}'],
    ignore: [],
    stabilityThreshold: 200,
  };
}

/**
 * Minimal YAML parser for config files (key: value, arrays with -)
 * @param {string} content
 * @returns {Object}
 */
function parseSimpleYaml(content) {
  const result = {};
  let currentKey = null;
  let currentArray = null;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Array item
    if (trimmed.startsWith('- ') && currentKey) {
      if (!currentArray) currentArray = [];
      let val = trimmed.slice(2).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      currentArray.push(val);
      result[currentKey] = currentArray;
      continue;
    }

    // Key-value pair
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      // Save previous array if any
      currentArray = null;
      currentKey = kvMatch[1];
      let val = kvMatch[2].trim();

      if (!val) {
        // Next lines might be an array
        continue;
      }

      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }

      // Parse numbers
      if (/^\d+$/.test(val)) {
        val = parseInt(val, 10);
      }

      result[currentKey] = val;
    }
  }

  return result;
}
