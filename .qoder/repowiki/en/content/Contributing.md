# Contributing

<cite>
**Referenced Files in This Document**   
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone/DEVELOPMENT_WORKFLOW.md)
- [Project Style Guide.md](file://pikzels-clone/Project Style Guide.md)
</cite>

## Table of Contents
1. [Contribution Workflow](#contribution-workflow)
2. [Code Review Process and Acceptance Criteria](#code-review-process-and-acceptance-criteria)
3. [Development Standards](#development-standards)
4. [Project Style Guide](#project-style-guide)
5. [Issue Tracking and Milestone Planning](#issue-tracking-and-milestone-planning)
6. [Commit Message Guidelines](#commit-message-guidelines)
7. [Community Guidelines and Support Channels](#community-guidelines-and-support-channels)

## Contribution Workflow

The contribution workflow for Thumbnail Maker Studio follows a standardized process from forking the repository to submitting a pull request. Contributors are expected to adhere to the defined branch naming conventions and PR templates to ensure consistency and streamline the review process.

### Fork and Setup
1. Fork the `pikzels-clone` repository on GitHub
2. Clone your fork locally: `git clone <your-fork-url>`
3. Install dependencies: `npm install && cd client && npm install`
4. Set up pre-commit hooks: `npx husky install`

### Branch Creation
Create a new branch using the following naming conventions:
- `feat/your-feature-name` for new features
- `fix/issue-description` for bug fixes
- `docs/update-documentation` for documentation changes
- `refactor/code-improvement` for code restructuring

Example:
```bash
git checkout -b feat/social-share-analytics
```

### Development and Quality Checks
During development, use the following commands to maintain code quality:
```bash
npm run format:all    # Format all code
npm run lint:all     # Fix linting issues
npm test             # Run backend tests
cd client && npm test # Run frontend tests
```

### Pull Request Submission
After committing changes using conventional commits, push the branch and create a pull request via GitHub. The PR must include a completed PR template with details on the changes, testing performed, and checklist verification.

**Section sources**
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md#L1-L257)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone/DEVELOPMENT_WORKFLOW.md#L1-L226)

## Code Review Process and Acceptance Criteria

The code review process ensures that all contributions meet the project's quality standards before merging into the main branch.

### Review Process
1. **Automated Checks**: All PRs trigger CI/CD pipelines that run ESLint, Prettier, tests, and security audits.
2. **Manual Review**: At least one maintainer must approve the PR after reviewing code quality, functionality, and adherence to standards.
3. **Feedback Resolution**: Contributors must address all feedback before final approval.
4. **Merge**: Once approved and checks pass, the PR can be merged.

### Acceptance Criteria
For a PR to be accepted, it must satisfy the following criteria:
- Branch name follows the defined convention
- Commit messages use conventional commits
- Code is formatted with Prettier and passes ESLint
- All tests pass with minimum 80% coverage for new code
- Documentation is updated for new features or changes
- PR description includes a clear summary and testing details

**Section sources**
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md#L1-L257)
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone/DEVELOPMENT_WORKFLOW.md#L1-L226)

## Development Standards

Thumbnail Maker Studio enforces strict development standards to maintain code quality and reliability.

### TypeScript Typing
- Prefer interfaces over types for object shapes
- Use explicit return types for all functions
- Avoid `any` type; use specific types or generics
- Utilize optional chaining (`?.`) and nullish coalescing (`??`)

### Error Handling
- Wrap asynchronous operations in try/catch blocks
- Return appropriate HTTP status codes (4xx for client errors, 5xx for server errors)
- Log errors for debugging while sending user-friendly messages
- Validate inputs and handle edge cases explicitly

### Documentation Requirements
All public APIs and complex components must be documented using JSDoc:
```typescript
/**
 * Creates a new thumbnail with the specified parameters
 * @param prompt - The AI prompt for generation
 * @param style - The visual style to apply
 * @param projectId - ID of the associated project
 * @returns Promise resolving to the created thumbnail
 */
```

**Section sources**
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md#L1-L257)
- [Project Style Guide.md](file://pikzels-clone/Project Style Guide.md#L1-L505)

## Project Style Guide

The project style guide defines coding conventions for consistency across the codebase.

### Code Formatting
- Indentation: 2 spaces
- Quotes: Single quotes
- Semicolons: Required
- Trailing commas: ES5 style
- File naming: kebab-case for modules, PascalCase for React components

### Naming Conventions
- Variables and functions: camelCase
- Classes and interfaces: PascalCase
- Constants: UPPER_SNAKE_CASE
- React event handlers: prefixed with "handle" (e.g., `handleSaveChanges`)

### Architectural Patterns
- Use functional components with hooks in React
- Follow RESTful principles for API endpoints (plural nouns, proper HTTP methods)
- Structure imports in order: external libraries, internal modules, relative imports, type imports
- Keep functions focused and under 50 lines

**Section sources**
- [Project Style Guide.md](file://pikzels-clone/Project Style Guide.md#L1-L505)

## Issue Tracking and Milestone Planning

The project uses GitHub Issues for tracking bugs, features, and tasks.

### Issue Management
- **Bug Reports**: Include reproduction steps, expected vs actual behavior, and environment details
- **Feature Requests**: Describe the use case and benefits
- **Labels**: Issues are labeled by type (bug, enhancement, documentation) and priority
- **Assignees**: Issues are assigned to contributors working on them

### Milestone Planning
- Milestones correspond to version releases or major feature sets
- Issues are grouped into milestones based on scope and priority
- Progress is tracked through issue completion within each milestone
- Regular reviews ensure milestones stay on schedule

**Section sources**
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md#L1-L257)

## Commit Message Guidelines

The project uses conventional commits for consistent and meaningful commit history.

### Commit Message Format
```
<type>[optional scope]: <description>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation update
- `style`: Code formatting changes
- `refactor`: Code restructuring without behavior change
- `test`: Adding or modifying tests
- `chore`: Maintenance tasks

### Examples
```
feat: add social share analytics dashboard
fix(thumbnail): resolve image processing timeout
docs: update contributing guidelines
style: format code with prettier
```

Use `npm run commit` for a guided commit experience that ensures proper formatting.

**Section sources**
- [DEVELOPMENT_WORKFLOW.md](file://pikzels-clone/DEVELOPMENT_WORKFLOW.md#L1-L226)
- [Project Style Guide.md](file://pikzels-clone/Project Style Guide.md#L1-L505)

## Community Guidelines and Support Channels

Contributors are expected to follow the project's code of conduct and engage respectfully.

### Code of Conduct
All contributors must adhere to professional behavior, showing respect and inclusivity in all interactions.

### Support Channels
- **GitHub Issues**: For reporting bugs and requesting features
- **GitHub Discussions**: For questions and general discussions
- **Pull Requests**: For code review and feedback
- **Documentation**: Refer to DEVELOPMENT_WORKFLOW.md and Project Style Guide.md for detailed guidance

Contributors are recognized in the CONTRIBUTORS.md file and release notes for significant contributions.

**Section sources**
- [CONTRIBUTING.md](file://pikzels-clone/CONTRIBUTING.md#L1-L257)