# 🔐 Git Hooks - Enterprise Quality Gates

This project uses strict git hooks to ensure code quality and prevent broken code from entering the repository.

## 📋 Overview

We use **Husky** for git hooks with a **strict enforcement policy**:

- ✅ **pre-commit**: Runs on every `git commit` (STRICT - blocks broken commits)
- ✅ **pre-push**: Runs on every `git push` (STRICT - blocks broken pushes)
- ✅ **commit-msg**: Validates commit message format (Conventional Commits)

## 🔵 Pre-Commit Hook

**When:** Every time you run `git commit`  
**Duration:** ~45-60 seconds  
**Policy:** STRICT - Blocks commit if any check fails

### Checks Performed:

1. **🔒 Sensitive File Check** (~1s)
   - Blocks `.env` and `.env.local` files
   - Prevents secrets from being committed

2. **🔐 Secret Scanning** (~5s)
   - Scans staged files for API keys, passwords, tokens
   - Uses `secretlint` with recommended rules

3. **🎨 Code Formatting & Linting** (~10s)
   - Runs `eslint --fix` on staged files
   - Runs `prettier --write` on staged files
   - Auto-fixes most issues

4. **🧪 Full Test Suite** (~30-45s)
   - Runs ALL 167 tests
   - Uses `--bail` (stops on first failure)
   - Parallel execution (`--maxWorkers=50%`)

5. **📘 TypeScript Compilation** (~5s)
   - Checks for type errors
   - **Non-blocking** (warnings only)
   - Helps catch issues early

### Bypassing (Emergency Only):

```bash
git commit -m "message" --no-verify
```

⚠️ **NOT RECOMMENDED** - Only use in emergencies!

---

## 🟢 Pre-Push Hook

**When:** Only when you run `git push`  
**Duration:** ~60-90 seconds  
**Policy:** STRICT - Blocks push if tests/coverage fails

### Checks Performed:

1. **🧪 Full Test Suite with Coverage** (~45-60s)
   - Runs all tests with coverage report
   - Enforces coverage thresholds (75% minimum)
   - Generates coverage report

2. **📊 Coverage Threshold Check** (automatic)
   - **Lines**: 75% minimum
   - **Branches**: 75% minimum
   - **Functions**: 75% minimum
   - **Statements**: 75% minimum

3. **📘 TypeScript Strict Compilation** (~10s)
   - Stricter than pre-commit
   - **Non-blocking** but strongly recommended

### Bypassing (Emergency Only):

```bash
git push --no-verify
```

⚠️ **NOT RECOMMENDED** - Breaks the safety net!

---

## 💬 Commit-Msg Hook

**When:** After writing commit message  
**Duration:** Instant  
**Policy:** STRICT - Blocks invalid messages

### Format Required:

```
<type>[optional scope]: <description>

[optional body]

[optional footer]
```

### Valid Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Maintenance tasks
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

### Examples:

```bash
✅ git commit -m "feat: add user authentication"
✅ git commit -m "fix(api): resolve thumbnail upload issue"
✅ git commit -m "docs: update installation guide"
❌ git commit -m "fixed stuff"
❌ git commit -m "WIP"
```

---

## 🛠️ Manual Testing

Test hooks manually before committing:

```bash
# Test pre-commit checks
npm run pre-commit

# Test pre-push checks  
npm run pre-push

# Run tests only
npm test

# Run tests with coverage
npm run test:coverage

# Run CI-style tests
npm run test:ci
```

---

## 📊 Current Stats

- **Total Tests**: 167
- **Test Suites**: 26
- **Current Coverage**: 17% → Target: 75%
- **Average Pre-Commit Time**: 45-60s
- **Average Pre-Push Time**: 60-90s

---

## 🎯 Design Rationale

### Why Strict Pre-Commit?

Based on commit analysis:
- You commit **2-3 times per week**
- That's **2-3 minutes per week** overhead
- Prevents hours of debugging broken code
- Ensures quality during long gaps between coding sessions

### Why Pre-Push Too?

- Double safety net
- Catches issues if pre-commit is bypassed
- Enforces coverage thresholds before sharing code
- Final gate before code reaches team/CI

### Why 75% Coverage Threshold?

- Industry standard for production code
- High enough to ensure quality
- Low enough to be achievable
- Currently at 17% → gradual improvement to 75%

---

## 🚨 Troubleshooting

### Pre-Commit is Slow

Normal! It runs all tests. Expected time: 45-60s

### Tests Fail on Commit

Fix the failing tests! The hook is working correctly.

```bash
# See detailed test output
npm test

# See which test failed
npm test -- --verbose
```

### Need to Commit Urgently

Use `--no-verify` but **fix issues immediately after**:

```bash
git commit -m "message" --no-verify
# Fix issues
git commit -m "fix: resolve test failures" --amend
```

### Linting Errors

Most are auto-fixed. If not:

```bash
npm run lint
npm run format
```

### Coverage Threshold Not Met

Write more tests! See `TESTING.md` for guidelines.

```bash
npm run test:coverage
# Shows exactly what's not covered
```

---

## 🔄 Updating Hooks

After pulling latest changes:

```bash
npm install
# Hooks auto-update via husky
```

Manually reinstall:

```bash
npx husky install
```

---

## 📚 Related Docs

- [TESTING.md](./TESTING.md) - Testing guidelines
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guide
- [Conventional Commits](https://www.conventionalcommits.org/) - Message format spec

---

**Questions?** Check the team wiki or ask in #development channel.
