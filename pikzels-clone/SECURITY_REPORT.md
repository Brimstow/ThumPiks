# Security Scan Report

**Generated:** 2025-10-03T17:45:18.000Z

## Summary

- **Total Scans:** 5
- **Passed:** ✅ 1
- **Failed:** ❌ 3
- **Warnings:** ⚠️ 1

## Dependencies Scan

**Status:** ERROR

**Error:** Command failed: npm audit --json


## Code Scan

**Status:** FAIL

### Issues Found:

- **JWT Secrets** (HIGH)
  - File: src\config\security.config.ts
- **API Keys** (HIGH)
  - File: src\generated\prisma\edge.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\index-browser.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\index.d.ts
- **API Keys** (HIGH)
  - File: src\generated\prisma\index.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\edge-esm.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\edge.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\index-browser.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\library.d.ts
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\library.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\react-native.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\wasm-compiler-edge.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\runtime\wasm-engine-edge.js
- **API Keys** (HIGH)
  - File: src\generated\prisma\wasm.js
- **JWT Secrets** (HIGH)
  - File: src\middleware\auth.middleware.ts
- **JWT Secrets** (HIGH)
  - File: src\modules\auth\auth.service.ts
- **JWT Secrets** (HIGH)
  - File: src\modules\auth\email.service.ts
- **API Keys** (HIGH)
  - File: src\modules\auth\mfa.service.ts
- **JWT Secrets** (HIGH)
  - File: src\services\jwt.enhanced.service.ts
- **JWT Secrets** (HIGH)
  - File: src\services\jwt.service.ts

## Configuration Scan

**Status:** WARN

### Issues Found:

- **Missing security scripts** (LOW)

## Environment Scan

**Status:** PASS

## Git Scan

**Status:** ERROR

**Error:** Command failed: find . -name "*.js" -o -name "*.ts" -o -name "*.json" | xargs ls -la | awk '$5 > 100000 {print $9, $5}' || echo "No large files"
Access denied - .
File not found - -NAME
File not found - -O
File not found - -NAME
'xargs' is not recognized as an internal or external command,
operable program or batch file.


