# Warp Agent Project Rules - Thumbnail_maker

## 🏗️ ARCHITECTURE & DESIGN PRINCIPLES

### API Design Standards
- Use RESTful conventions with consistent resource naming
- Implement proper HTTP status codes and error responses
- Follow JSON:API specification for complex data structures
- Always include request/response validation schemas
- Use OpenAPI/Swagger documentation for all endpoints

### Error Handling Standards
```typescript
// Standard error response format
interface ErrorResponse {
  success: false;
  error: {
    code: string;           // UPPERCASE_SNAKE_CASE
    message: string;        // Human-readable message
    details?: any;          // Additional context
    timestamp: string;      // ISO 8601 format
    requestId: string;      // For tracing
  }
}
```

### Data Validation Rules
- Validate at API boundaries using Zod schemas
- Validate at database level using Prisma constraints
- Sanitize all user inputs before processing
- Use strong typing throughout the application
- Never trust client-side validation alone

## 💎 CODE QUALITY STANDARDS

### TypeScript Strictness
- NO `any` types - always use proper typing
- Enable all strict TypeScript compiler options
- Use union types and type guards for flexibility
- Implement proper generic constraints
- Document complex types with JSDoc comments

### SOLID Principles Enforcement
- **Single Responsibility**: One class/function = one purpose
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Derived classes must be substitutable
- **Interface Segregation**: Many specific interfaces > one general
- **Dependency Inversion**: Depend on abstractions, not concretions

### Clean Code Standards
- Functions should be < 20 lines when possible
- Classes should be < 200 lines when possible
- Use meaningful names that express intent
- Avoid deep nesting (max 3 levels)
- Comment WHY, not WHAT
- Use early returns to reduce nesting

## 🧪 TESTING REQUIREMENTS

### Coverage Standards
- Minimum 90% code coverage (prefer 100%)
- 100% coverage for security-critical functions
- 100% coverage for data validation functions
- Include both positive and negative test cases
- Test error conditions and edge cases

### Testing Strategy
- Unit tests for business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Security tests for authentication/authorization
- Performance tests for data-heavy operations

### Test Structure
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', () => {});
    it('should throw error with invalid email', () => {});
    it('should hash password before saving', () => {});
    it('should emit user creation event', () => {});
  });
});
```

## 📚 DOCUMENTATION STANDARDS

### JSDoc Requirements
- Document all public functions and classes
- Include parameter types and descriptions
- Document return types and possible exceptions
- Provide usage examples for complex functions
- Document side effects and async behavior

### Code Documentation
- Update README.md for significant changes
- Maintain API documentation (OpenAPI/Swagger)
- Document architectural decisions (ADRs)
- Keep migration guides up to date
- Document breaking changes in CHANGELOG.md

### Example JSDoc Template
```typescript
/**
 * [Brief description of what the function does]
 * 
 * @param {Type} paramName - Description of parameter
 * @returns {Type} Description of return value
 * @throws {ErrorType} When this error occurs
 * @example
 * ```typescript
 * const result = await functionName(param);
 * ```
 * 
 * @since 1.0.0
 * @see {@link RelatedFunction} For related functionality
 */
```

## 🔒 SECURITY STANDARDS

### Security-First Development
- Validate and sanitize ALL user inputs
- Use parameterized queries (Prisma handles this)
- Implement proper authentication/authorization
- Add security headers (CORS, CSP, HSTS)
- Log security events and monitor anomalies
- Regular dependency vulnerability scans
- Never log sensitive information

### Authentication/Authorization
- Use JWT with proper expiration
- Implement refresh token rotation
- Use role-based access control (RBAC)
- Add rate limiting to prevent abuse
- Implement account lockout for failed attempts

## 🚀 PERFORMANCE STANDARDS

### Optimization Requirements
- Database queries must be optimized (proper indexing)
- Implement caching for frequently accessed data
- Use lazy loading for large datasets
- Optimize images and static assets
- Monitor and profile performance regularly
- Set performance budgets for API responses

### Performance Metrics
- API responses < 200ms for simple operations
- API responses < 1s for complex operations
- Database queries < 100ms when possible
- Frontend bundle size < 1MB initial load
- Lighthouse score > 90 for performance

## 🔄 GIT WORKFLOW & BEST PRACTICES

### Branch Strategy
```bash
main          # Production-ready code
develop       # Integration branch
feature/xyz   # New features
bugfix/xyz    # Bug fixes
hotfix/xyz    # Critical production fixes
```

### Commit Conventions
```bash
feat: add user authentication system
fix: resolve thumbnail generation memory leak
docs: update API documentation
style: fix code formatting issues
refactor: optimize database queries
test: add unit tests for user service
chore: update dependencies
```

### Code Review Checklist
- Code follows established patterns
- Tests are included and pass
- Documentation is updated
- No security vulnerabilities
- Performance impact considered
- Breaking changes documented

## 🛠️ REFACTORING GUIDELINES

### When to Suggest Refactoring
- Functions exceed 20 lines
- Classes exceed 200 lines
- Code duplication detected
- Performance bottlenecks identified
- Security vulnerabilities found
- Type safety can be improved
- Architecture can be simplified

### Refactoring Priorities
1. Security improvements
2. Performance optimizations
3. Type safety enhancements
4. Code maintainability
5. Documentation improvements

## 📦 DEPLOYMENT STANDARDS

### Environment Management
- Use environment-specific configurations
- Never commit secrets to repository
- Use proper secret management
- Implement health checks
- Add monitoring and logging
- Plan for graceful shutdowns

### CI/CD Pipeline
- Run all tests before deployment
- Check code quality and coverage
- Security vulnerability scanning
- Automated database migrations
- Rollback capabilities
- Performance monitoring

## 🎯 MODULE-SPECIFIC RULES

### Backend Modules (src/modules/)
- Each module should be self-contained
- Follow the established request flow pattern
- Implement proper error boundaries
- Add comprehensive logging
- Include module-specific tests

### Frontend Components
- Use TypeScript for all components
- Implement proper prop validation
- Add accessibility attributes
- Include component-specific tests
- Follow naming conventions

### Database Operations
- Use Prisma for all database interactions
- Implement proper transaction handling
- Add database-level constraints
- Include migration rollback plans
- Monitor query performance

---

*These rules are designed to maintain enterprise-level code quality while keeping the development process efficient and enjoyable. They should be followed consistently across all project development.*