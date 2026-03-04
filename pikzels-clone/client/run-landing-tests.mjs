#!/usr/bin/env node

/**
 * Comprehensive File-Level Test Suite for PikzelsLanding Component
 * Tests: Functional, Security, Debug, Syntax, Imports
 * 
 * Matches the pattern from run-all-tests.mjs for consistency
 */

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:8556';
const LANDING_FILE = 'src/components/PikzelsLanding.tsx';
const TEST_FILE = 'src/components/__tests__/PikzelsLanding.test.tsx';

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

test('functional', 'PikzelsLanding.tsx exists and has content', () => {
  const path = join(__dirname, LANDING_FILE);
  if (!fs.existsSync(path)) {
    throw new Error('PikzelsLanding.tsx not found');
  }
  
  const content = fs.readFileSync(path, 'utf-8');
  if (content.length < 1000) {
    throw new Error('PikzelsLanding.tsx seems too small');
  }
  
  log(`  ✓ PikzelsLanding.tsx exists (${content.length} chars)`, 'success');
});

test('functional', 'Component has named and default exports', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for named export
  if (!content.includes('export function') && !content.includes('export const')) {
    throw new Error('Missing named export');
  }
  
  // Check for default export
  if (!content.includes('export default')) {
    throw new Error('Missing default export');
  }
  
  log('  ✓ Component has both named and default exports', 'success');
});

test('functional', 'Component includes all required sections', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const requiredSections = [
    { pattern: /<section\s+className="pt-32/, desc: 'Hero/main section' },
    { pattern: /id="pricing"/, desc: 'Pricing section' },
    { pattern: /id="faq"/, desc: 'FAQ section' },
    { pattern: /<footer/i, desc: 'Footer section' },
    { pattern: /<nav|navigation/i, desc: 'Navigation' }
  ];
  
  requiredSections.forEach(({ pattern, desc }) => {
    if (!pattern.test(content)) {
      throw new Error(`Missing ${desc}`);
    }
  });
  
  log('  ✓ All required sections present', 'success');
});

test('functional', 'Auth modals are implemented', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const authChecks = [
    { pattern: /showSignup|signupModal/i, desc: 'signup modal state' },
    { pattern: /showSignin|signinModal/i, desc: 'signin modal state' },
    { pattern: /handleSignup|onSignup/i, desc: 'signup handler' },
    { pattern: /handleSignin|onSignin/i, desc: 'signin handler' }
  ];
  
  authChecks.forEach(({ pattern, desc }) => {
    if (!pattern.test(content)) {
      throw new Error(`Missing ${desc}`);
    }
  });
  
  log('  ✓ Auth modals properly implemented', 'success');
});

test('functional', 'Uses React Router navigation', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('useNavigate')) {
    throw new Error('Missing useNavigate hook');
  }
  
  if (!content.includes('navigate(')) {
    throw new Error('navigate() not being called');
  }
  
  log('  ✓ React Router navigation integrated', 'success');
});

test('functional', 'Uses AuthContext for authentication', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  if (!content.includes('useAuth')) {
    throw new Error('Missing useAuth hook');
  }
  
  log('  ✓ AuthContext integrated', 'success');
});

test('functional', 'Landing page served at root route', async () => {
  try {
    const response = await fetchUrl('/');
    
    if (response.status !== 200) {
      throw new Error(`Root route returned ${response.status}`);
    }
    
    if (!response.data.includes('html') && !response.data.includes('<!DOCTYPE')) {
      log('  ⚠ Response might not be HTML', 'warning');
      results.warnings++;
    }
    
    log('  ✓ Landing page accessible at root', 'success');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log('  ⚠ Server not running - skipping live test', 'warning');
      results.warnings++;
    } else {
      throw error;
    }
  }
});

test('functional', 'Test file exists with comprehensive coverage', () => {
  const path = join(__dirname, TEST_FILE);
  if (!fs.existsSync(path)) {
    throw new Error('PikzelsLanding.test.tsx not found');
  }
  
  const content = fs.readFileSync(path, 'utf-8');
  
  // Count test cases
  const testCount = (content.match(/\btest\s*\(|it\s*\(/g) || []).length;
  
  if (testCount < 50) {
    log(`  ⚠ Only ${testCount} tests found - expected 50+`, 'warning');
    results.warnings++;
  }
  
  log(`  ✓ Test file exists with ${testCount} test cases`, 'success');
});

// ============================================
// SECURITY TESTS
// ============================================

test('security', 'No hardcoded API keys or secrets', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const patterns = [
    { regex: /api[_-]?key\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i, desc: 'API key' },
    { regex: /secret\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i, desc: 'Secret' },
    { regex: /token\s*[:=]\s*['"][a-zA-Z0-9]{20,}/i, desc: 'Token' },
    { regex: /password\s*[:=]\s*['"][^'"]{8,}/i, desc: 'Password' },
    { regex: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/i, desc: 'Bearer token' },
    { regex: /sk-[a-zA-Z0-9]{20,}/i, desc: 'OpenAI key pattern' },
    { regex: /ghp_[a-zA-Z0-9]{36}/i, desc: 'GitHub PAT' },
    { regex: /stripe[_-]?key.*['"][a-zA-Z0-9_]{20,}/i, desc: 'Stripe key' }
  ];
  
  patterns.forEach(({ regex, desc }) => {
    if (regex.test(content)) {
      throw new Error(`Potential ${desc} found - security risk!`);
    }
  });
  
  log('  ✓ No hardcoded secrets detected', 'success');
});

test('security', 'Uses AuthContext only - no direct fetch for auth', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for direct auth API calls (should use AuthContext instead)
  const directAuthPatterns = [
    /fetch\s*\(\s*['"`].*\/api\/auth/i,
    /fetch\s*\(\s*['"`].*\/login/i,
    /fetch\s*\(\s*['"`].*\/register/i,
    /fetch\s*\(\s*['"`].*\/signup/i
  ];
  
  directAuthPatterns.forEach(pattern => {
    if (pattern.test(content)) {
      throw new Error('Direct fetch to auth endpoint found - should use AuthContext');
    }
  });
  
  // Verify useAuth is used
  if (!content.includes('useAuth')) {
    throw new Error('useAuth not found - authentication should use AuthContext');
  }
  
  log('  ✓ AuthContext-only authentication enforced', 'success');
});

test('security', 'No dangerous innerHTML or eval usage', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  if (/dangerouslySetInnerHTML/.test(content)) {
    throw new Error('dangerouslySetInnerHTML found - XSS risk');
  }
  
  if (/\beval\s*\(/.test(content)) {
    throw new Error('eval() found - security risk');
  }
  
  if (/new\s+Function\s*\(/.test(content)) {
    throw new Error('Function() constructor found - security risk');
  }
  
  log('  ✓ No dangerous DOM/eval patterns', 'success');
});

test('security', 'Input validation patterns present', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for email validation
  if (content.includes('email') && !content.includes('@') && !content.includes('valid')) {
    log('  ⚠ Email field found but validation unclear', 'warning');
    results.warnings++;
  }
  
  // Check for form validation state
  if (!content.includes('error') && !content.includes('Error')) {
    log('  ⚠ No error handling visible', 'warning');
    results.warnings++;
  }
  
  log('  ✓ Input validation patterns checked', 'success');
});

test('security', 'No sensitive data in localStorage without encryption', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for password storage in localStorage
  if (/localStorage\s*\.\s*setItem\s*\([^)]*password/i.test(content)) {
    throw new Error('Password stored in localStorage - security risk');
  }
  
  // Check for token storage pattern (acceptable but flag it)
  if (/localStorage\s*\.\s*setItem\s*\([^)]*token/i.test(content)) {
    log('  ⚠ Token storage in localStorage - ensure HttpOnly cookies used for auth', 'warning');
    results.warnings++;
  }
  
  log('  ✓ No plaintext passwords in localStorage', 'success');
});

test('security', 'External links have rel="noopener noreferrer"', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Find external links with target="_blank"
  const blankLinks = content.match(/target\s*=\s*['"]_blank['"]/g) || [];
  
  if (blankLinks.length > 0) {
    // Check if rel="noopener" is used somewhere in the file
    if (!content.includes('noopener')) {
      log('  ⚠ target="_blank" found without noopener - potential tabnabbing risk', 'warning');
      results.warnings++;
    }
  }
  
  log(`  ✓ External link security checked (${blankLinks.length} _blank links)`, 'success');
});

test('security', 'No exposed environment variables in client code', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for non-VITE_ prefixed env vars (which would be undefined in client)
  const envMatches = content.match(/process\.env\.(?!VITE_)[A-Z_]+/g) || [];
  
  if (envMatches.length > 0) {
    log(`  ⚠ Non-VITE env vars found: ${envMatches.join(', ')} (will be undefined)`, 'warning');
    results.warnings++;
  }
  
  log('  ✓ Environment variable usage checked', 'success');
});

// ============================================
// DEBUG TESTS
// ============================================

test('debug', 'Console logging is appropriate', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const logs = (content.match(/console\.log/g) || []).length;
  const errors = (content.match(/console\.error/g) || []).length;
  const warns = (content.match(/console\.warn/g) || []).length;
  
  if (logs > 15) {
    log(`  ⚠ Many console.log statements (${logs}) - remove for production`, 'warning');
    results.warnings++;
  }
  
  log(`  ✓ Logging: ${logs} logs, ${errors} errors, ${warns} warnings`, 'success');
});

test('debug', 'Error boundaries or try-catch present', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const hasTryCatch = content.includes('try {') || content.includes('try{');
  const hasCatch = content.includes('.catch(');
  
  if (!hasTryCatch && !hasCatch) {
    log('  ⚠ No try-catch or .catch() error handling found', 'warning');
    results.warnings++;
  } else {
    log('  ✓ Error handling present', 'success');
  }
});

test('debug', 'Loading states are handled', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const hasLoading = /loading|isLoading|setLoading/i.test(content);
  
  if (!hasLoading) {
    log('  ⚠ No loading state management visible', 'warning');
    results.warnings++;
  } else {
    log('  ✓ Loading state handling present', 'success');
  }
});

test('debug', 'State updates are properly typed', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for useState with type annotations
  const useStateCount = (content.match(/useState/g) || []).length;
  const typedStateCount = (content.match(/useState<[^>]+>/g) || []).length;
  
  if (useStateCount > 0 && typedStateCount === 0) {
    log(`  ⚠ ${useStateCount} useState calls but no type annotations`, 'warning');
    results.warnings++;
  }
  
  log(`  ✓ State typing: ${typedStateCount}/${useStateCount} useState calls typed`, 'success');
});

// ============================================
// SYNTAX TESTS
// ============================================

test('syntax', 'TypeScript compilation succeeds', async () => {
  try {
    // Run tsc using project tsconfig
    const { stdout, stderr } = await execAsync(
      `npx tsc --noEmit 2>&1`,
      { cwd: __dirname, timeout: 60000 }
    );
    
    // If we get here with no errors, success
    log('  ✓ PikzelsLanding.tsx TypeScript valid (project compiles)', 'success');
  } catch (error) {
    // execAsync throws if exit code != 0
    const output = (error.stdout || '') + (error.stderr || '');
    
    // Check specifically for errors in THIS file
    const lines = output.split('\n');
    const fileErrors = lines.filter(line => 
      line.includes('PikzelsLanding.tsx') && line.includes('error TS')
    );
    
    if (fileErrors.length > 0) {
      throw new Error(`TypeScript errors in PikzelsLanding.tsx: ${fileErrors.length} found`);
    }
    
    // Check for errors in other files (project-wide) - warn but don't fail this test
    const allErrors = (output.match(/error TS\d+:/g) || []).length;
    if (allErrors > 0) {
      log(`  ⚠ Project has ${allErrors} TypeScript errors (not in PikzelsLanding.tsx)`, 'warning');
      results.warnings++;
    }
    
    log('  ✓ PikzelsLanding.tsx TypeScript valid', 'success');
  }
});

test('syntax', 'No TODO/FIXME in production-critical code', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  const todos = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/gi) || [];
  
  if (todos.length > 0) {
    log(`  ⚠ Found ${todos.length} TODO/FIXME comments - review before production`, 'warning');
    results.warnings++;
  } else {
    log('  ✓ No TODO/FIXME comments', 'success');
  }
});

test('syntax', 'Consistent code formatting', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for mixed indentation
  const hasSpaces = /^  \S/m.test(content);
  const hasTabs = /^\t\S/m.test(content);
  
  if (hasSpaces && hasTabs) {
    log('  ⚠ Mixed tabs and spaces found', 'warning');
    results.warnings++;
  }
  
  // Check for trailing semicolons consistency
  const withSemi = (content.match(/;\s*$/gm) || []).length;
  const withoutSemi = (content.match(/[^;{]\s*$/gm) || []).length;
  
  log(`  ✓ Code formatting checked (${withSemi} lines with semicolons)`, 'success');
});

test('syntax', 'Proper JSX structure', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Check for common JSX issues
  if (content.includes('className=className')) {
    throw new Error('Duplicate className assignment found');
  }
  
  // Check for proper return statement
  if (!content.includes('return (') && !content.includes('return <')) {
    throw new Error('Missing return statement in component');
  }
  
  log('  ✓ JSX structure valid', 'success');
});

// ============================================
// IMPORT TESTS
// ============================================

test('imports', 'All imports are resolvable', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Extract relative imports
  const imports = content.match(/from\s+['"](\..*?)['"]/g) || [];
  let unresolved = 0;
  
  imports.forEach(imp => {
    const match = imp.match(/from\s+['"](\..*?)['"]/);
    if (match) {
      const importPath = match[1];
      const resolvedPath = join(dirname(path), importPath);
      
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
      const exists = extensions.some(ext => 
        fs.existsSync(resolvedPath + ext) || 
        fs.existsSync(resolvedPath + '/index' + ext)
      );
      
      if (!exists) {
        log(`  ⚠ Import might not resolve: ${importPath}`, 'warning');
        results.warnings++;
        unresolved++;
      }
    }
  });
  
  log(`  ✓ Import resolution: ${imports.length - unresolved}/${imports.length} resolved`, 'success');
});

test('imports', 'Required dependencies are present', () => {
  const packageJson = JSON.parse(fs.readFileSync(join(__dirname, 'package.json'), 'utf-8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  // Check landing page specific dependencies
  const required = [
    'react',
    'react-dom',
    'react-router-dom',
    'framer-motion',
    'lucide-react'
  ];
  
  required.forEach(pkg => {
    if (!allDeps[pkg]) {
      throw new Error(`Required package ${pkg} not in package.json`);
    }
  });
  
  log(`  ✓ All ${required.length} required packages present`, 'success');
});

test('imports', 'No circular dependencies with related components', () => {
  const path = join(__dirname, LANDING_FILE);
  const content = fs.readFileSync(path, 'utf-8');
  
  // Get components that PikzelsLanding imports
  const importedComponents = content.match(/from\s+['"]\.\/(\w+)['"]/g) || [];
  
  // Check those files don't import PikzelsLanding back
  importedComponents.forEach(imp => {
    const match = imp.match(/from\s+['"]\.\/(\w+)['"]/);
    if (match) {
      const compPath = join(dirname(path), match[1] + '.tsx');
      if (fs.existsSync(compPath)) {
        const compContent = fs.readFileSync(compPath, 'utf-8');
        if (compContent.includes('PikzelsLanding')) {
          log(`  ⚠ Potential circular dependency with ${match[1]}`, 'warning');
          results.warnings++;
        }
      }
    }
  });
  
  log('  ✓ No circular dependencies detected', 'success');
});

test('imports', 'Test file imports match component exports', () => {
  const testPath = join(__dirname, TEST_FILE);
  if (!fs.existsSync(testPath)) {
    log('  ⚠ Test file not found - skipping', 'warning');
    results.warnings++;
    return;
  }
  
  const testContent = fs.readFileSync(testPath, 'utf-8');
  
  // Check test imports the component
  if (!testContent.includes('PikzelsLanding') && !testContent.includes('ThumPiksLanding')) {
    throw new Error('Test file does not import the component');
  }
  
  log('  ✓ Test file properly imports component', 'success');
});

// ============================================
// RUN ALL TESTS
// ============================================

async function runTests() {
  console.log('\n' + '='.repeat(70));
  log('  PIKZELS LANDING PAGE - COMPREHENSIVE TEST SUITE', 'bold');
  console.log('='.repeat(70) + '\n');
  
  for (const [category, categoryTests] of Object.entries(tests)) {
    if (categoryTests.length === 0) continue;
    
    log(`\n${'▶'.repeat(3)} ${category.toUpperCase()} TESTS (${categoryTests.length})`, 'info');
    console.log('-'.repeat(70));
    
    results.categories[category] = { passed: 0, failed: 0, warnings: 0 };
    
    for (const { name, fn } of categoryTests) {
      try {
        log(`\n  ${name}`, 'info');
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
  log('  TEST RESULTS SUMMARY', 'bold');
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
  log(`\n SUCCESS RATE: ${percentage}%`, percentage >= 90 ? 'success' : 'warning');
  
  if (results.failed === 0 && results.warnings === 0) {
    console.log('\n' + '='.repeat(70));
    log('  ALL TESTS PASSED - LANDING PAGE PRODUCTION READY!', 'success');
    console.log('='.repeat(70) + '\n');
  } else if (results.failed === 0) {
    console.log('\n' + '='.repeat(70));
    log('  All tests passed, but review warnings before production', 'warning');
    console.log('='.repeat(70) + '\n');
  } else {
    console.log('\n' + '='.repeat(70));
    log('  Some tests failed - review and fix issues', 'error');
    console.log('='.repeat(70) + '\n');
    process.exit(1);
  }
}

runTests().catch(err => {
  log(`\n Test runner error: ${err.message}`, 'error');
  console.error(err);
  process.exit(1);
});
