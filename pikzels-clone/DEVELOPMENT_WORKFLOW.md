# 🚀 Development Workflow Guide

This guide explains the automated quality assurance workflow for the Thumbnail Maker Studio project.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Development Commands](#development-commands)
- [Git Workflow](#git-workflow)
- [Code Quality Tools](#code-quality-tools)
- [Troubleshooting](#troubleshooting)

## 🎯 Quick Start

### 1. Setup Development Environment
```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Initialize git hooks (if not already done)
npx husky install
```

### 2. Daily Development Commands
```bash
# Format code automatically
npm run format:all

# Check and fix linting issues  
npm run lint:all

# Run all quality checks
npm run check

# Start development servers
npm run dev:all
```

## ⚡ Development Commands

### Code Quality
```bash
# Backend only
npm run format              # Format backend code
npm run lint               # Lint & fix backend code

# Frontend only  
npm run format:client      # Format client code
npm run lint:client        # Lint & fix client code

# Combined
npm run format:all         # Format everything
npm run lint:all          # Lint everything  
npm run check             # Format + lint everything
```

### Testing
```bash
# Backend tests
npm test                   # Run backend tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage

# Frontend tests
cd client && npm test      # Run frontend tests
```

### Database
```bash
npm run prisma:generate    # Generate Prisma client
npm run prisma:migrate     # Run migrations
npm run prisma:studio     # Open Prisma Studio
```

## 🔄 Git Workflow

### Automated Quality Checks

Every commit automatically runs:
1. **Lint-staged**: Checks only modified files
2. **Prettier**: Auto-formats code
3. **ESLint**: Fixes linting issues
4. **Tests**: Ensures nothing is broken

### Commit Message Format

Use conventional commits for consistency:

```bash
# Recommended: Use Commitizen for guided commits
npm run commit

# Or manually follow the format:
# <type>[optional scope]: <description>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix  
- `docs`: Documentation
- `style`: Code formatting
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```bash
feat: add user authentication
fix(api): resolve thumbnail upload issue  
docs: update installation guide
style: format code with prettier
```

### Branch Protection

The workflow includes:
- **Pre-commit hooks**: Run quality checks before each commit
- **Commit message validation**: Enforces conventional commits
- **CI/CD pipeline**: Runs on push/PR to main branches

## 🛠️ Code Quality Tools

### ESLint Configuration
- **Rules**: TypeScript recommended + custom naming conventions
- **Auto-fix**: Automatically fixes issues where possible
- **Scope**: Backend and frontend code

### Prettier Configuration  
- **Style**: 2 spaces, single quotes, trailing commas
- **Auto-format**: Runs on save and pre-commit
- **Scope**: All code files (TS, JS, JSON, MD)

### Pre-commit Hooks
```bash
# Located in .husky/pre-commit
npx lint-staged    # Format & lint staged files
npm run test       # Run tests
```

### CI/CD Pipeline
- **Quality checks**: ESLint, Prettier, tests
- **Multi-node testing**: Node.js 18.x and 20.x  
- **Build verification**: Ensures code compiles
- **Security audits**: Weekly vulnerability scans

## 🔍 Troubleshooting

### Pre-commit Hook Issues

**Problem**: Hook fails with linting errors
```bash
# Fix automatically
npm run lint:all

# Or check specific issues
npm run lint
```

**Problem**: Hook fails with formatting issues  
```bash
# Fix automatically
npm run format:all
```

### Commit Message Rejected
```bash
# Use guided commit tool
npm run commit

# Or follow the format manually:
# feat: your description here
```

### CI/CD Pipeline Failures

1. **Linting failures**: Run `npm run lint:all` locally
2. **Test failures**: Run `npm test` and fix issues
3. **Build failures**: Run `npm run build` locally

### Client-specific Issues

```bash
# Navigate to client directory first
cd client

# Then run client commands
npm run lint
npm run format  
npm test
npm run build
```

## 📈 Quality Metrics

The workflow tracks:
- **Code coverage**: Test coverage reports
- **Linting issues**: ESLint error/warning counts  
- **Security vulnerabilities**: Audit findings
- **Build success rate**: CI/CD pipeline status

## 🎮 Learning Tips

As a visual learner, you can see the workflow in action:

```
Code Change → Pre-commit Hook → Quality Checks → Commit → CI/CD → Deploy
     ↓              ↓               ↓            ↓        ↓         ↓
   Edit File → Format/Lint → Tests Pass → Git Commit → Build → Success! ✅
```

**Quality Gates:**
- ❌ **Blocked**: If quality checks fail
- ⚠️ **Warning**: If tests have issues  
- ✅ **Approved**: All checks pass

## 🚀 Next Steps

1. **Try the workflow**: Make a small change and commit
2. **Use guided commits**: Run `npm run commit`
3. **Monitor quality**: Check CI/CD pipeline results
4. **Iterate**: The tools learn your patterns over time

---

*This workflow ensures every commit maintains professional code quality standards!* ⭐