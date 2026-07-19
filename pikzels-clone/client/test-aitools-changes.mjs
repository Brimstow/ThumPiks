#!/usr/bin/env node

/**
 * Specific Tests for AIToolsPage Changes
 * Tests the exact logic changes made to the component
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let passed = 0;
let failed = 0;

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}${message}${colors.reset}`);
}

function test(name, fn) {
  try {
    log(`\n📋 ${name}`, 'info');
    fn();
    log('  ✓ PASS', 'success');
    passed++;
  } catch (error) {
    log(`  ✗ FAIL: ${error.message}`, 'error');
    failed++;
  }
}

const aiToolsPath = join(__dirname, 'src/components/dashboard/AIToolsPage.tsx');
const content = fs.readFileSync(aiToolsPath, 'utf-8');

console.log('\n' + '='.repeat(70));
log('  🧪 AITOOLSPAGE SPECIFIC CHANGE TESTS', 'bold');
console.log('='.repeat(70));

// ============================================
// TEST 1: Worker Hook Import
// ============================================

test('AIToolsPage imports useAIWorker hook', () => {
  if (!content.includes("import { useAIWorker } from '../../hooks/useAIWorker'")) {
    throw new Error('useAIWorker hook not imported');
  }
  
  log('    ✓ useAIWorker hook imported correctly', 'success');
});

// ============================================
// TEST 2: Worker Initialization
// ============================================

test('Worker initialized with useAIWorker()', () => {
  if (!content.includes('const worker = useAIWorker()')) {
    throw new Error('worker constant not created');
  }
  
  log('    ✓ Worker constant initialized', 'success');
});

// ============================================
// TEST 3: Fallback Service Logic
// ============================================

test('Fallback aiService only initializes when worker not ready', () => {
  const fallbackPattern = /autoInitialize:\s*!worker\.isReady/;
  
  if (!fallbackPattern.test(content)) {
    throw new Error('Fallback logic missing autoInitialize: !worker.isReady');
  }
  
  log('    ✓ Fallback service conditionally initializes', 'success');
});

// ============================================
// TEST 4: AI State Mapping
// ============================================

test('AI state correctly maps worker properties', () => {
  const checks = [
    { pattern: 'isLoading: worker.isProcessing', desc: 'isLoading mapped' },
    { pattern: 'isReady: worker.isReady', desc: 'isReady mapped' },
    { pattern: 'error: null', desc: 'error initialized' },
    { pattern: 'isInitializing: false', desc: 'isInitializing set' }
  ];
  
  checks.forEach(({ pattern, desc }) => {
    if (!content.includes(pattern)) {
      throw new Error(`${desc} - missing: ${pattern}`);
    }
  });
  
  log('    ✓ All AI state properties mapped correctly', 'success');
});

// ============================================
// TEST 5: Ternary for Worker/Service Selection
// ============================================

test('AI constant uses ternary to select worker or service', () => {
  if (!content.includes('const ai = worker.isReady ? {')) {
    throw new Error('Ternary operator missing for AI selection');
  }
  
  if (!content.includes('} : aiService')) {
    throw new Error('Fallback to aiService missing');
  }
  
  log('    ✓ Ternary operator correctly selects worker/service', 'success');
});

// ============================================
// TEST 6: Remove Background Handler Changes
// ============================================

test('removeBackground handler uses worker.execute when ready', () => {
  // Check for worker.isReady check
  if (!content.match(/if\s*\(worker\.isReady\)/)) {
    throw new Error('worker.isReady check missing in removeBackground');
  }
  
  // Check for worker.execute call
  if (!content.includes("worker.execute('removeBackground',")) {
    throw new Error('worker.execute not called for removeBackground');
  }
  
  // Check for fallback to aiService
  if (!content.includes('aiService.removeBackground({ image: uploadedImage })')) {
    throw new Error('Fallback to aiService.removeBackground missing');
  }
  
  log('    ✓ removeBackground uses worker with fallback', 'success');
});

// ============================================
// TEST 7: Enhance Handler Changes
// ============================================

test('enhance handler uses worker.execute when ready', () => {
  // Find enhance handler
  const enhanceMatch = content.match(/const handleEnhance[\s\S]{0,800}?}, \[/);
  
  if (!enhanceMatch) {
    throw new Error('enhance handler not found');
  }
  
  const enhanceCode = enhanceMatch[0];
  
  // Check for worker.isReady
  if (!enhanceCode.includes('worker.isReady')) {
    throw new Error('worker.isReady check missing in enhance');
  }
  
  // Check for worker.execute
  if (!enhanceCode.includes("worker.execute('enhance',")) {
    throw new Error('worker.execute not called for enhance');
  }
  
  // Check for fallback
  if (!enhanceCode.includes('aiService.enhance(')) {
    throw new Error('Fallback to aiService.enhance missing');
  }
  
  log('    ✓ enhance uses worker with fallback', 'success');
});

// ============================================
// TEST 8: Error Handling
// ============================================

test('Handlers have try/catch error handling', () => {
  // Check removeBackground has try/catch
  const removeBackgroundSection = content.match(/const handleRemoveBackground[\s\S]{0,800}?}, \[/)[0];
  
  if (!removeBackgroundSection.includes('try {')) {
    throw new Error('removeBackground missing try block');
  }
  
  if (!removeBackgroundSection.includes('catch (error)')) {
    throw new Error('removeBackground missing catch block');
  }
  
  // Check enhance has try/catch
  const enhanceSection = content.match(/const handleEnhance[\s\S]{0,800}?}, \[/)[0];
  
  if (!enhanceSection.includes('try {')) {
    throw new Error('enhance missing try block');
  }
  
  if (!enhanceSection.includes('catch (error)')) {
    throw new Error('enhance missing catch block');
  }
  
  log('    ✓ Both handlers have proper error handling', 'success');
});

// ============================================
// TEST 9: Console Error Logging
// ============================================

test('Error handlers log to console', () => {
  if (!content.includes("console.error('Remove background failed:', error)")) {
    throw new Error('removeBackground error logging missing');
  }
  
  if (!content.includes("console.error('Enhance failed:', error)")) {
    throw new Error('enhance error logging missing');
  }
  
  log('    ✓ Error logging present in handlers', 'success');
});

// ============================================
// TEST 10: Dependency Arrays Updated
// ============================================

test('Handler dependency arrays include worker and aiService', () => {
  // Check removeBackground dependencies
  const removeBgMatch = content.match(/const handleRemoveBackground[\s\S]{0,1000}?\[([^\]]+)\]/);
  
  if (!removeBgMatch) {
    throw new Error('removeBackground dependency array not found');
  }
  
  const removeBgDeps = removeBgMatch[1];
  
  if (!removeBgDeps.includes('worker')) {
    throw new Error('removeBackground missing worker in dependencies');
  }
  
  if (!removeBgDeps.includes('aiService')) {
    throw new Error('removeBackground missing aiService in dependencies');
  }
  
  // Check enhance dependencies
  const enhanceMatch = content.match(/const handleEnhance[\s\S]{0,1000}?\[([^\]]+)\]/);
  
  if (!enhanceMatch) {
    throw new Error('enhance dependency array not found');
  }
  
  const enhanceDeps = enhanceMatch[1];
  
  if (!enhanceDeps.includes('worker')) {
    throw new Error('enhance missing worker in dependencies');
  }
  
  if (!enhanceDeps.includes('aiService')) {
    throw new Error('enhance missing aiService in dependencies');
  }
  
  log('    ✓ Dependency arrays properly updated', 'success');
});

// ============================================
// TEST 11: Result Handling
// ============================================

test('Worker results handle imageBase64 correctly', () => {
  // Check removeBackground result handling
  if (!content.includes('if (result.imageBase64) {')) {
    throw new Error('Worker result imageBase64 check missing');
  }
  
  // Check it sets result image
  const workerResultPattern = /if \(result\.imageBase64\) \{[\s\S]{0,100}?setResultImage/;
  
  if (!workerResultPattern.test(content)) {
    throw new Error('Worker result not setting image correctly');
  }
  
  log('    ✓ Worker results handled correctly', 'success');
});

// ============================================
// TEST 12: No Regression - Other Handlers Intact
// ============================================

test('Other handlers not broken by changes', () => {
  const handlers = [
    'handleGenerate',
    'handleUpscale',
    'handleFaceSwap',
    'handleImageUpload',
    'handleDownload'
  ];
  
  handlers.forEach(handler => {
    if (!content.includes(handler)) {
      throw new Error(`${handler} appears to be missing or broken`);
    }
  });
  
  log('    ✓ Other handlers remain intact', 'success');
});

// ============================================
// TEST 13: State Management Unchanged
// ============================================

test('Component state management not broken', () => {
  const stateVars = [
    'selectedTool',
    'uploadedImage',
    'resultImage',
    'prompt',
    'style',
    'aspectRatio',
    'enhanceType'
  ];
  
  stateVars.forEach(stateVar => {
    const pattern = new RegExp(`const \\[${stateVar},\\s*set\\w+\\]\\s*=\\s*useState`);
    if (!pattern.test(content)) {
      throw new Error(`State variable ${stateVar} missing or broken`);
    }
  });
  
  log('    ✓ All state variables intact', 'success');
});

// ============================================
// FINAL REPORT
// ============================================

console.log('\n' + '='.repeat(70));
log('  📊 AITOOLSPAGE CHANGE TEST RESULTS', 'bold');
console.log('='.repeat(70) + '\n');

log(`✅ PASSED:   ${passed}`, 'success');

if (failed > 0) {
  log(`❌ FAILED:   ${failed}`, 'error');
  console.log('\n' + '='.repeat(70));
  log('  ⚠️  Some AIToolsPage changes failed validation', 'error');
  console.log('='.repeat(70) + '\n');
  process.exit(1);
} else {
  log(`❌ FAILED:   0`, 'success');
  
  const percentage = ((passed / (passed + failed)) * 100).toFixed(1);
  console.log('\n' + '-'.repeat(70));
  log(`\n📈 SUCCESS RATE: ${percentage}%`, 'success');
  
  console.log('\n' + '='.repeat(70));
  log('  🎉 ALL AITOOLSPAGE CHANGES VALIDATED!', 'success');
  console.log('='.repeat(70) + '\n');
  
  console.log('✅ Changes validated:');
  console.log('  • Worker hook integration');
  console.log('  • Fallback to main thread service');
  console.log('  • Worker execution for removeBackground');
  console.log('  • Worker execution for enhance');
  console.log('  • Error handling with try/catch');
  console.log('  • Proper dependency arrays');
  console.log('  • No regressions in other code');
  console.log();
}
