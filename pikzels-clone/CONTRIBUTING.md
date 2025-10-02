# 🤝 Contributing to Thumbnail Maker Studio

Thank you for your interest in contributing! This guide will help you get started with our development workflow and quality standards.

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or 20.x
- npm 8.x or higher
- Git

### Initial Setup
```bash
# Clone the repository
git clone <repository-url>
cd pikzels-clone

# Install dependencies
npm install
cd client && npm install && cd ..

# Set up git hooks
npx husky install
```

## 📝 Development Process

### 1. Create a Feature Branch
```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Your Changes
- Write clean, readable code
- Follow existing patterns and conventions
- Add tests for new functionality
- Update documentation as needed

### 3. Use Quality Tools
```bash
# Format your code
npm run format:all

# Fix linting issues
npm run lint:all

# Run tests
npm test
cd client && npm test
```

### 4. Commit Your Changes
```bash
# Use guided commits (recommended)
npm run commit

# Or follow conventional commit format manually
git commit -m "feat: add new thumbnail filter"
```

### 5. Push and Create PR
```bash
git push origin feat/your-feature-name
# Then create a Pull Request on GitHub
```

## 🎯 Code Standards

### Naming Conventions
- **Files**: PascalCase for components, camelCase for services
- **Variables**: camelCase
- **Constants**: UPPER_CASE
- **Classes**: PascalCase
- **Interfaces**: PascalCase

### Code Style
- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: ES5 style

### TypeScript Guidelines
- Prefer interfaces over types
- Use explicit return types for functions
- Avoid `any` - use specific types
- Use optional chaining (`?.`) and nullish coalescing (`??`)

## 🧪 Testing Guidelines

### Backend Tests
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
```

### Frontend Tests
```bash
cd client && npm test      # Run client tests
```

### Test Requirements
- Unit tests for new functions/methods
- Integration tests for API endpoints
- Component tests for React components
- Minimum 80% code coverage for new code

## 📚 Documentation

### Required Documentation
- JSDoc comments for public APIs
- README updates for new features
- API documentation for endpoints
- Component documentation for complex UI

### Documentation Style
```typescript
/**
 * Creates a new thumbnail with the specified parameters
 * @param prompt - The AI prompt for generation
 * @param style - The visual style to apply
 * @param projectId - ID of the associated project
 * @returns Promise resolving to the created thumbnail
 */
async createThumbnail(prompt: string, style: string, projectId: string): Promise<Thumbnail> {
  // Implementation
}
```

## 🔍 Pull Request Guidelines

### PR Checklist
- [ ] Branch name follows convention (`feat/`, `fix/`, `docs/`, etc.)
- [ ] Commit messages follow conventional commits
- [ ] Code is formatted with Prettier
- [ ] No ESLint errors or warnings
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Changes are described in PR description

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature  
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🎨 UI/UX Guidelines

### Component Structure
```tsx
interface ComponentProps {
  title: string;
  onAction: () => void;
}

const Component: React.FC<ComponentProps> = ({ title, onAction }) => {
  const { theme } = useTheme();
  
  return (
    <div className="component">
      {/* Implementation */}
    </div>
  );
};

export default Component;
```

### Styling Guidelines
- Use CSS modules or styled-components
- Follow the design system
- Ensure accessibility (ARIA labels, keyboard navigation)
- Support both light and dark themes

## 🚨 Common Issues & Solutions

### Pre-commit Hook Failures
```bash
# Fix formatting issues
npm run format:all

# Fix linting issues  
npm run lint:all

# Run full quality check
npm run check
```

### Build Failures
```bash
# Check TypeScript compilation
npx tsc --noEmit

# Check for missing dependencies
npm install
cd client && npm install
```

### Test Failures
```bash
# Run tests with verbose output
npm test -- --verbose

# Run specific test file
npm test -- specific-test.test.ts
```

## 🏆 Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributor statistics

## 💬 Getting Help

- **Documentation**: Check DEVELOPMENT_WORKFLOW.md
- **Issues**: Create a GitHub issue with details
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for feedback in your PR

## 📋 Code Review Process

### For Reviewers
- Check code quality and standards compliance
- Verify tests pass and coverage is adequate
- Ensure documentation is complete
- Test functionality manually if needed

### For Contributors
- Respond to feedback constructively
- Make requested changes promptly
- Ask questions if feedback is unclear
- Be patient during the review process

---

*Thank you for contributing to Thumbnail Maker Studio! Your efforts help make this project better for everyone.* 🌟