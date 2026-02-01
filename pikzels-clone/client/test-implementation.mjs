#!/usr/bin/env node

/**
 * Automated test for Web Worker implementation
 * Tests the implementation without requiring manual browser interaction
 */

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:8556';
const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

async function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE_URL}${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

// Test 1: Check if worker files exist
test('Worker files exist in src', () => {
  const workerTypesPath = join(__dirname, 'src', 'workers', 'ai-worker-types.ts');
  const workerPath = join(__dirname, 'src', 'workers', 'ai-worker.ts');
  const hookPath = join(__dirname, 'src', 'hooks', 'useAIWorker.ts');
  
  if (!fs.existsSync(workerTypesPath)) {
    throw new Error('ai-worker-types.ts not found');
  }
  if (!fs.existsSync(workerPath)) {
    throw new Error('ai-worker.ts not found');
  }
  if (!fs.existsSync(hookPath)) {
    throw new Error('useAIWorker.ts not found');
  }
  
  log('  ✓ All worker files exist', 'success');
});

// Test 2: Check WASM files in public
test('WASM files exist in public/wasm', () => {
  const wasmDir = join(__dirname, 'public', 'wasm');
  
  if (!fs.existsSync(wasmDir)) {
    throw new Error('public/wasm directory not found');
  }
  
  const files = fs.readdirSync(wasmDir);
  const requiredFiles = [
    'tfjs-backend-wasm.wasm',
    'tfjs-backend-wasm-simd.wasm',
    'tfjs-backend-wasm-threaded-simd.wasm'
  ];
  
  requiredFiles.forEach(file => {
    if (!files.includes(file)) {
      throw new Error(`${file} not found in public/wasm`);
    }
  });
  
  log(`  ✓ Found ${files.length} WASM files`, 'success');
});

// Test 3: Check WASM files are served
test('WASM files are accessible via HTTP', async () => {
  const response = await fetchUrl('/wasm/tfjs-backend-wasm.wasm');
  
  if (response.status !== 200) {
    throw new Error(`WASM file returned status ${response.status}`);
  }
  
  if (response.data.length < 100000) {
    throw new Error('WASM file seems too small');
  }
  
  log(`  ✓ WASM file served (${response.data.length} bytes)`, 'success');
});

// Test 4: Check test page loads
test('Test page loads successfully', async () => {
  const response = await fetchUrl('/test-worker.html');
  
  if (response.status !== 200) {
    throw new Error(`Test page returned status ${response.status}`);
  }
  
  if (!response.data.includes('Web Worker')) {
    throw new Error('Test page content incorrect');
  }
  
  log('  ✓ Test page loads correctly', 'success');
});

// Test 5: Check AIToolsPage imports worker hook
test('AIToolsPage imports useAIWorker', () => {
  const aiToolsPath = join(__dirname, 'src', 'components', 'dashboard', 'AIToolsPage.tsx');
  
  if (!fs.existsSync(aiToolsPath)) {
    throw new Error('AIToolsPage.tsx not found');
  }
  
  const content = fs.readFileSync(aiToolsPath, 'utf-8');
  
  if (!content.includes('useAIWorker')) {
    throw new Error('useAIWorker not imported in AIToolsPage');
  }
  
  if (!content.includes('worker.execute')) {
    throw new Error('worker.execute not used in AIToolsPage');
  }
  
  log('  ✓ AIToolsPage properly integrated', 'success');
});

// Test 6: Check worker uses WASM backend
test('Worker configured to use WASM backend', () => {
  const workerPath = join(__dirname, 'src', 'workers', 'ai-worker.ts');
  const content = fs.readFileSync(workerPath, 'utf-8');
  
  if (!content.includes('tfjs-backend-wasm')) {
    throw new Error('WASM backend import not found');
  }
  
  if (!content.includes("setWasmPaths('/wasm/')")) {
    throw new Error('WASM paths not configured correctly');
  }
  
  if (!content.includes("setBackend('wasm')")) {
    throw new Error('WASM backend not set');
  }
  
  log('  ✓ Worker uses WASM backend', 'success');
});

// Test 7: Check package.json has WASM backend
test('WASM backend package installed', () => {
  const packagePath = join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  
  if (!packageJson.dependencies['@tensorflow/tfjs-backend-wasm']) {
    throw new Error('@tensorflow/tfjs-backend-wasm not in dependencies');
  }
  
  log('  ✓ WASM backend package present', 'success');
});

// Run all tests
async function runTests() {
  console.log('\n🧪 Testing Web Worker Implementation\n');
  console.log('='.repeat(60));
  
  for (const { name, fn } of tests) {
    try {
      log(`\n📋 ${name}`, 'info');
      await fn();
      passed++;
    } catch (error) {
      log(`  ✗ ${error.message}`, 'error');
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results\n');
  log(`✅ Passed: ${passed}`, 'success');
  
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, 'error');
    console.log('\n⚠️  Some tests failed. Implementation may have issues.');
    process.exit(1);
  } else {
    log('❌ Failed: 0', 'success');
    console.log('\n🎉 All tests passed! Web Worker implementation is ready.');
    console.log('\n📝 Next steps:');
    console.log('   1. Open browser to http://localhost:8556/test-worker.html');
    console.log('   2. Click "Test Worker Creation" button');
    console.log('   3. Click "Test WASM Loading" button');
    console.log('   4. Check browser console for worker logs');
    console.log('   5. Try AI Tools page: http://localhost:8556/dashboard/ai-tools');
    console.log('   6. Upload image and test "Remove Background"');
    console.log('   7. Verify UI stays responsive during processing\n');
  }
}

runTests().catch(err => {
  log(`\n💥 Test runner error: ${err.message}`, 'error');
  process.exit(1);
});
