/**
 * gate-keeper: Main Module
 *
 * Exports the public API and provides the orchestration layer
 * that connects parser → evaluator → watcher → enforcer → context.
 */

export { loadProjectGates, extractGates, parseGateBlock } from './parser.mjs';
export { evaluateFile, evaluateFiles, globToRegex, matchesTrigger } from './evaluator.mjs';
export { createWatcher, getWatcherConfig } from './watcher.mjs';
export { Enforcer, ShadowStore, ViolationLogger, printSummary } from './enforcer.mjs';
export { ContextDetector, loadContextRules, getDefaultContextRules } from './context-detector.mjs';
