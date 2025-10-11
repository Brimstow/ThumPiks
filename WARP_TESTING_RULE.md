# WARP Testing Rule: Fix Root Cause, Not Tests

## Core Principle
When tests are failing, **ALWAYS fix the root cause in the application code** rather than modifying the tests to pass.

## Scope
- **All test types**: Unit tests, integration tests, end-to-end tests
- **All failures**: Both existing failing tests and new test failures
- **All scenarios**: Whether tests never worked or stopped working after changes

## When to Fix Application Code
- Tests reveal bugs in business logic
- Tests expose architectural issues (like tight coupling, missing dependency injection)
- Tests uncover integration problems
- Tests highlight performance issues
- Tests show missing error handling

## When Tests MAY Be Modified
Only modify tests when:
- Requirements have genuinely changed and the test expectations are now incorrect
- The test itself contains bugs or incorrect assertions
- Refactoring has intentionally changed the expected behavior
- Test setup or mocking is incorrect

## Exception Handling Process
**STOP and ask for guidance** when encountering:

1. **Major architectural changes needed**
   - Example: "Fixing this requires restructuring the entire service layer"
   - Reason: May impact other teams or require coordinated deployment

2. **External dependency issues**
   - Example: "The root cause is in a third-party API that's returning different data"
   - Reason: May require vendor communication or contract renegotiation

3. **Risk of breaking other functionality**
   - Example: "Fixing this core utility function might break 20+ other features"
   - Reason: Requires comprehensive testing and possibly staged rollout

4. **Potentially controversial design decisions**
   - Example: "This requires changing the database schema in a backward-incompatible way"
   - Reason: May need stakeholder approval and migration planning

## Documentation Requirements
When fixing root causes, document:
- **What was broken**: Clear description of the issue
- **Why it was broken**: Root cause analysis
- **How it was fixed**: Technical details of the solution
- **Architectural improvements**: Any design patterns or structures added
- **Testing improvements**: How the fix makes the code more testable

## Example Documentation Format
```markdown
## Fix: [Brief description]

**Issue**: Tests were failing because services created their own Prisma instances that couldn't be mocked

**Root Cause**: Tight coupling - controllers instantiated services at module level with hardcoded dependencies

**Solution**: 
- Added dependency injection to ThumbnailService and ProjectService
- Modified controllers to use factory functions instead of module constants
- Added service initialization with mocked dependencies in tests

**Architectural Improvement**: Services now support dependency injection, making them more testable and following SOLID principles

**Testing Improvement**: Tests can now properly mock database layer without workarounds
```

## Benefits of This Approach
- **Better code quality**: Forces architectural improvements
- **Real bug fixes**: Addresses issues users would actually encounter  
- **Maintainable tests**: Tests remain trustworthy indicators of system health
- **Technical debt reduction**: Prevents accumulation of test workarounds
- **Team learning**: Root cause analysis improves understanding of the system

---
*This rule ensures our tests serve their purpose: validating that our application works correctly for real users.*