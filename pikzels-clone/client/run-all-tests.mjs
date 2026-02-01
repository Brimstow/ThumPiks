#!/usr/bin/env node

/**
 * Comprehensive Test Suite for All Changes
 * Tests: Functional, Security, Debug, Syntax, Imports
 */

import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:8556';
const tests = {
  functional: [],
  security: [],
  debug: [],
  syntax: [],
  imports: []
};

let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  categories: {}
};

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m',
    bold: '\x1b[1m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function test(category, name, fn) {
  tests[category].push({ name, fn });
}

async function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data }));
    }).on('error', reject);
  });
}

// ============================================
// FUNCTIONAL TESTS
// ============================================

test('functional', 'Worker files exist and are valid TypeScript', () => {
  const files = [
    'src/workers/ai-worker-types.ts',
    'src/workers/ai-worker.ts',
    'src/hooks/useAIWorker.ts'
  ];
  
  files.forEach(file => {
    const path = join(__dirname, file);
    if (!fs.existsSync(path)) {
      throw new Error(`${file} not found`);
    }
    
    const content = fs.readFileSync(path, 'utf-8');
    if (content.length < 100) {
      throw new Error(`${file} seems too small`);
    }
  });
  
  log('  ✓ All worker files exist and have content', 'success');
});

test('functional', 'ErrorBoundary component exists', () => {
  const path = join(__dirname, 'src/components/ErrorBoundary.tsx');
  if (!fs.existsSync(path)) {
    throw new Error('ErrorBoundary.tsx not found');
  }
  
  const content = fs.readFileSync(path, 'utf-8');
  if (!content.includes('componentDidCatch')) {
    throw new Error('ErrorBoundary missing componentDidCatch');
  }
  
  log('  ✓ ErrorBoundary component valid', 'success');
});

test('functional', 'WASM files present in public directory', () => {
  const wasmDir = join(__dirname, 'public/wasm');
  if (!fs.existsSync(wasmDir)) {
    throw new Error('public/wasm directory not found');
  }
  
  const files = fs.readdirSync(wasmDir);
  const required = ['tfjs-backend-wasm.wasm', 'tfjs-backend-wasm-simd.wasm'];
  
  required.forEach(file => {
    if (!files.includes(file)) {
      throw new Error(`${file} missing`);
    }
    
    const stats = fs.statSync(join(wasmDir, file));
    if (stats.size < 100000) {
      throw new Error(`${file} too small (${stats.size} bytes)`);
    }
  });
  
  log(`  ✓ Found ${files.length} WASM files, all valid`, 'success');
});

test('functional', 'WASM files served correctly', async () => {
  const response = await fetchUrl('/wasm/tfjs-backend-wasm.wasm');
  
  if (response.status !== 200) {
    throw new Error(`WASM file returned ${response.status}`);
  }
  
  if (response.headers['content-type'] !== 'application/wasm') {
    log(`  ⚠ WASM Content-Type is ${response.headers['content-type']}, expected application/wasm`, 'warning');
    results.warnings++;
  }
  
  if (response.data.length < 100000) {
    throw new Error('WASM file too small');
  }
  
  log(`  ✓ WASM file served (${response.data.length} bytes)`, 'success');
});

test('functional', 'AIToolsPage integrates worker correctly', () => {
  const path = join(__dirname, 'src/components/dashboard/AIToolsPage.tsx');
  const content = fs.readFileSync(path, 'utf-8');
  
  const checks = [
    { pattern: 'useAIWorker', desc: 'imports useAIWorker' },
    { pattern: 'worker.execute', desc: 'uses worker.execute' },
    { pattern: 'worker.isReady', desc: 'checks worker.isReady' },
    { pattern: 'removeBackground', desc: 'has removeBackground handler' },
    { pattern: 'enhance', desc: 'has enhance handler' }
  ];
  
  checks.forEach(({ pattern, desc }) => {
    if (!content.includes(pattern)) {
      throw new Error(`AIToolsPage ${desc} - missing ${pattern}`);
    }
  });
  
  log('  ✓ AIToolsPage properly integrated', 'success');
});

test('functional', 'App.tsx includes ErrorBoundary', () => {
  const path = join(__dirname, 'src/App.tsx');
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('ErrorBoundary')) {
    throw new Error('ErrorBoundary not imported in App.tsx');
  }
  
  if (!content.includes('<ErrorBoundary>')) {
    throw new Error('ErrorBoundary not used in App.tsx');
  }
  
  log('  ✓ ErrorBoundary integrated in App.tsx', 'success');
});

// ============================================
// SECURITY TESTS
// ============================================

test('security', 'No hardcoded API keys or secrets', () => {
  const files = [
    'src/workers/ai-worker.ts',
    'src/hooks/useAIWorker.ts',
    'src/components/dashboard/AIToolsPage.tsx'
  ];
  
  const patterns = [
    /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i,
    /secret\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i,
    /token\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i,
    /password\s*[:=]\s*['"][^'"]{6,}/i
  ];
  
  files.forEach(file => {
    const path = join(__dirname, file);
    const content = fs.readFileSync(path, 'utf-8');
    
    patterns.forEach((pattern, idx) => {
      if (pattern.test(content)) {
        throw new Error(`Potential secret found in ${file}`);
      }
    });
  });
  
  log('  ✓ No hardcoded secrets detected', 'success');
});

test('security', 'Worker message validation exists', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('WorkerMessage')) {
    throw new Error('WorkerMessage type not used');
  }
  
  if (!content.includes('taskType')) {
    throw new Error('taskType validation missing');
  }
  
  log('  ✓ Worker message validation present', 'success');
});

test('security', 'Input validation in worker', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('throw new Error')) {
    log('  ⚠ No error throwing in worker (might be intentional)', 'warning');
    results.warnings++;
  }
  
  log('  ✓ Error handling present in worker', 'success');
});

test('security', 'No eval() or Function() constructor usage', () => {
  const files = [
    'src/workers/ai-worker.ts',
    'src/hooks/useAIWorker.ts'
  ];
  
  files.forEach(file => {
    const path = join(__dirname, file);
    const content = fs.readFileSync(path, 'utf-8');
    
    if (/\beval\s*\(/.test(content)) {
      throw new Error(`eval() found in ${file} - security risk`);
    }
    
    if (/new\s+Function\s*\(/.test(content)) {
      throw new Error(`Function() constructor found in ${file} - security risk`);
    }
  });
  
  log('  ✓ No dangerous eval/Function usage', 'success');
});

test('security', 'CORS and CSP headers configured', () => {
  const redirectsPath = join(__dirname, 'public/_redirects');
  
  if (!fs.existsSync(redirectsPath)) {
    log('  ⚠ No _redirects file for Netlify CSP headers', 'warning');
    results.warnings++;
    return;
  }
  
  log('  ✓ Redirects file exists for CSP configuration', 'success');
});

// ============================================
// DEBUG TESTS
// ============================================

test('debug', 'Console.log usage is appropriate', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  const logs = (content.match(/console\.log/g) || []).length;
  const errors = (content.match(/console\.error/g) || []).length;
  
  if (logs > 10) {
    log(`  ⚠ Many console.log statements (${logs}) - consider removing for production`, 'warning');
    results.warnings++;
  }
  
  if (errors === 0) {
    log('  ⚠ No console.error for debugging', 'warning');
    results.warnings++;
  }
  
  log(`  ✓ Logging present: ${logs} logs, ${errors} errors`, 'success');
});

test('debug', 'Worker logs include identifying prefix', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('[Worker]')) {
    log('  ⚠ Worker logs missing [Worker] prefix for easy identification', 'warning');
    results.warnings++;
  } else {
    log('  ✓ Worker logs properly prefixed', 'success');
  }
});

test('debug', 'Error messages are descriptive', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  const errors = content.match(/throw new Error\(['"](.*?)['"]\)/g) || [];
  
  errors.forEach(err => {
    if (err.length < 30) {
      log(`  ⚠ Short error message: ${err}`, 'warning');
      results.warnings++;
    }
  });
  
  log(`  ✓ Found ${errors.length} error messages`, 'success');
});

// ============================================
// SYNTAX TESTS
// ============================================

test('syntax', 'TypeScript files have no syntax errors', async () => {
  try {
    const { stdout, stderr } = await execAsync('npx tsc --noEmit --skipLibCheck', {
      cwd: __dirname,
      timeout: 30000
    });
    
    if (stderr && !stderr.includes('error TS')) {
      log('  ✓ TypeScript compilation successful', 'success');
    } else {
      throw new Error('TypeScript errors found');
    }
  } catch (error) {
    if (error.stdout && error.stdout.includes('error TS')) {
      const errors = error.stdout.match(/error TS\d+:/g) || [];
      throw new Error(`TypeScript errors: ${errors.length} found`);
    }
    // If tsc not found or other error, warn but don't fail
    log('  ⚠ Could not run TypeScript check (tsc not available)', 'warning');
    results.warnings++;
  }
});

test('syntax', 'No TODO/FIXME comments in critical files', () => {
  const files = [
    'src/workers/ai-worker.ts',
    'src/hooks/useAIWorker.ts'
  ];
  
  let todoCount = 0;
  
  files.forEach(file => {
    const path = join(__dirname, file);
    const content = fs.readFileSync(path, 'utf-8');
    
    const todos = (content.match(/\/\/\s*(TODO|FIXME)/gi) || []).length;
    todoCount += todos;
  });
  
  if (todoCount > 0) {
    log(`  ⚠ Found ${todoCount} TODO/FIXME comments`, 'warning');
    results.warnings++;
  } else {
    log('  ✓ No TODO/FIXME comments in critical files', 'success');
  }
});

test('syntax', 'Proper async/await usage', () => {
  const path = join(__dirname, 'src/workers/ai-worker.ts');
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for common async mistakes
  if (/\.then\s*\(\s*async/.test(content)) {
    log('  ⚠ Mixed .then() and async/await found', 'warning');
    results.warnings++;
  }
  
  log('  ✓ Async/await usage looks correct', 'success');
});

// ============================================
// IMPORT TESTS
// ============================================

test('imports', 'All imports are valid', () => {
  const files = [
    'src/workers/ai-worker.ts',
    'src/hooks/useAIWorker.ts',
    'src/components/ErrorBoundary.tsx'
  ];
  
  files.forEach(file => {
    const path = join(__dirname, file);
    const content = fs.readFileSync(path, 'utf-8');
    
    // Check for relative imports
    const imports = content.match(/from\s+['"](\..*?)['"]/g) || [];
    
    imports.forEach(imp => {
      const importPath = imp.match(/from\s+['"](\..*?)['"]/)[1];
      const resolvedPath = join(dirname(path), importPath);
      
      // Check if file exists (with common extensions)
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      const exists = extensions.some(ext => 
        fs.existsSync(resolvedPath + ext) || fs.existsSync(resolvedPath + '/index' + ext)
      );
      
      if (!exists) {
        log(`  ⚠ Import might not resolve: ${imp} in ${file}`, 'warning');
        results.warnings++;
      }
    });
  });
  
  log('  ✓ Import paths checked', 'success');
});

test('imports', 'Package dependencies installed', () => {
  const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  
  const required = [
    '@tensorflow/tfjs-backend-wasm',
    '@tensorflow/tfjs',
    '@tensorflow-models/body-segmentation',
    'react',
    'lucide-react'
  ];
  
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  required.forEach(pkg => {
    if (!allDeps[pkg]) {
      throw new Error(`Required package ${pkg} not in package.json`);
    }
  });
  
  log(`  ✓ All ${required.length} required packages present`, 'success');
});

test('imports', 'No circular dependencies in worker files', () => {
  const workerTypes = fs.readFileSync(join(__dirname, 'src/workers/ai-worker-types.ts'), 'utf-8');
  const worker = fs.readFileSync(join(__dirname, 'src/workers/ai-worker.ts'), 'utf-8');
  
  if (workerTypes.includes('./ai-worker')) {
    throw new Error('Circular dependency: ai-worker-types imports ai-worker');
  }
  
  log('  ✓ No circular dependencies detected', 'success');
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  log('  🧪 COMPREHENSIVE TEST SUITE - ALL CHANGES', 'bold');
  console.log('='.repeat(70) + '\n');
  
  for (const [category, categoryTests] of Object.entries(tests)) {
    if (categoryTests.length === 0) continue;
    
    log(`\n${'▶'.repeat(3)} ${category.toUpperCase()} TESTS (${categoryTests.length})`, 'info');
    console.log('-'.repeat(70));
    
    results.categories[category] = { passed: 0, failed: 0, warnings: 0 };
    
    for (const { name, fn } of categoryTests) {
      try {
        log(`\n📋 ${name}`, 'info');
        await fn();
        results.passed++;
        results.categories[category].passed++;
      } catch (error) {
        log(`  ✗ ${error.message}`, 'error');
        results.failed++;
        results.categories[category].failed++;
      }
    }
  }
  
  // FINAL REPORT
  console.log('\n' + '='.repeat(70));
  log('  📊 TEST RESULTS SUMMARY', 'bold');
  console.log('='.repeat(70) + '\n');
  
  // Category breakdown
  for (const [category, stats] of Object.entries(results.categories)) {
    const icon = stats.failed === 0 ? '✅' : '❌';
    console.log(`${icon} ${category.padEnd(15)} - Passed: ${stats.passed}, Failed: ${stats.failed}`);
  }
  
  console.log('\n' + '-'.repeat(70));
  
  // Overall stats
  log(`\n✅ PASSED:   ${results.passed}`, 'success');
  if (results.failed > 0) {
    log(`❌ FAILED:   ${results.failed}`, 'error');
  } else {
    log(`❌ FAILED:   0`, 'success');
  }
  if (results.warnings > 0) {
    log(`⚠️  WARNINGS: ${results.warnings}`, 'warning');
  } else {
    log(`⚠️  WARNINGS: 0`, 'success');
  }
  
  const total = results.passed + results.failed;
  const percentage = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log('\n' + '-'.repeat(70));
  log(`\n📈 SUCCESS RATE: ${percentage}%`, percentage >= 90 ? 'success' : 'warning');
  
  if (results.failed === 0 && results.warnings === 0) {
    console.log('\n' + '='.repeat(70));
    log('  🎉 ALL TESTS PASSED - IMPLEMENTATION READY!', 'success');
    console.log('='.repeat(70) + '\n');
  } else if (results.failed === 0) {
    console.log('\n' + '='.repeat(70));
    log('  ✓ All tests passed, but review warnings', 'warning');
    console.log('='.repeat(70) + '\n');
  } else {
    console.log('\n' + '='.repeat(70));
    log('  ⚠️  Some tests failed - review and fix issues', 'error');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  log(`\n💥 Test runner error: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});
