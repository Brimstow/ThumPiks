# JSDoc Templates for Professional Documentation

## **Why JSDoc is Professional Standard**

JSDoc automatically generates documentation, provides IDE tooltips, and improves code maintainability. It's used by Google, Microsoft, Facebook, and most professional development teams.

## **Template Examples**

### **Service Functions**
```typescript
/**
 * Brief description of what the function does (one sentence)
 * 
 * Longer description explaining the purpose, behavior, and any important details.
 * Include business logic context when relevant.
 * 
 * @param {Type} paramName - Description of parameter and its constraints
 * @param {Type} [optionalParam] - Optional parameter description  
 * @param {Object} options - Configuration object
 * @param {number} options.property - Specific option description
 * @returns {Promise<Type>} Description of what is returned
 * @throws {ErrorType} When this specific error occurs
 * @throws {AnotherErrorType} When this other error occurs
 * 
 * @example
 * ```typescript
 * const result = await functionName(param, { option: value });
 * console.log(result.data);
 * ```
 * 
 * @example Error handling
 * ```typescript
 * try {
 *   await functionName(invalidParam);
 * } catch (error) {
 *   if (error instanceof ValidationError) {
 *     // Handle validation error
 *   }
 * }
 * ```
 * 
 * @since 1.0.0
 * @see {@link RelatedFunction} For related functionality
 * @see {@link ExternalService} For dependency information
 */
```

### **API Controllers**
```typescript
/**
 * Handles HTTP request for [specific action]
 * 
 * @route POST /api/endpoint
 * @access Private (requires authentication)
 * @middleware authMiddleware, validationMiddleware
 * 
 * @param {Request} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.requiredField - Required field description
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 * 
 * @returns {Promise<void>} Sends JSON response
 * 
 * @example Request body
 * ```json
 * {
 *   "requiredField": "value",
 *   "optionalField": "value"
 * }
 * ```
 * 
 * @example Success response (200)
 * ```json
 * {
 *   "success": true,
 *   "data": { ... }
 * }
 * ```
 * 
 * @example Error response (400)
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "code": "VALIDATION_ERROR",
 *     "message": "Invalid input data"
 *   }
 * }
 * ```
 */
```

### **Database Services**
```typescript
/**
 * Database operation description
 * 
 * @async
 * @param {string} userId - User identifier
 * @param {Object} data - Data to process
 * @returns {Promise<DatabaseResult>} Database operation result
 * @throws {PrismaError} When database operation fails
 * @throws {ValidationError} When data validation fails
 * 
 * @example
 * ```typescript
 * const result = await dbOperation('user123', { name: 'John' });
 * console.log(result.id); // newly created record ID
 * ```
 * 
 * @since 1.0.0
 */
```

### **Utility Functions**
```typescript
/**
 * Utility function description
 * 
 * @pure This function has no side effects
 * @param {InputType} input - Input description
 * @returns {OutputType} Output description
 * 
 * @example
 * ```typescript
 * const result = utilityFunction(input);
 * ```
 * 
 * @since 1.0.0
 */
```

### **Class Documentation**
```typescript
/**
 * Class description and purpose
 * 
 * @class
 * @classdesc Detailed description of the class purpose and behavior
 * 
 * @example
 * ```typescript
 * const instance = new MyClass(options);
 * await instance.method();
 * ```
 * 
 * @since 1.0.0
 */
class MyClass {
  /**
   * Constructor description
   * 
   * @param {OptionsType} options - Configuration options
   * @param {string} options.required - Required option
   * @param {boolean} [options.optional=false] - Optional option with default
   */
  constructor(options: OptionsType) { }

  /**
   * Method description
   * 
   * @async
   * @param {ParamType} param - Parameter description
   * @returns {Promise<ResultType>} Result description
   * @memberof MyClass
   */
  async method(param: ParamType): Promise<ResultType> { }
}
```

## **Common JSDoc Tags**

| Tag | Purpose | Example |
|-----|---------|---------|
| `@param` | Document parameters | `@param {string} name - User name` |
| `@returns` | Document return value | `@returns {Promise<User>} User object` |
| `@throws` | Document exceptions | `@throws {ValidationError} Invalid input` |
| `@example` | Code examples | `@example const x = func();` |
| `@since` | Version introduced | `@since 1.0.0` |
| `@see` | Related references | `@see {@link OtherFunction}` |
| `@async` | Async function | `@async` |
| `@pure` | Pure function (no side effects) | `@pure` |
| `@deprecated` | Deprecated code | `@deprecated Use newFunction instead` |
| `@todo` | Future improvements | `@todo Add error handling` |

## **Integration with TypeScript**

JSDoc works seamlessly with TypeScript:

```typescript
/**
 * JSDoc provides additional context that TypeScript types can't express
 * 
 * @param {number} width - Width in pixels (must be between 1-4000)
 * @param {number} height - Height in pixels (must be between 1-4000) 
 * @returns {Promise<Buffer>} Processed image buffer (JPEG format)
 */
async function processImage(width: number, height: number): Promise<Buffer> {
  // TypeScript provides type safety
  // JSDoc provides usage context and constraints
}
```

## **Auto-generation Setup**

Add to package.json:
```json
{
  "scripts": {
    "docs:generate": "jsdoc -c jsdoc.conf.json",
    "docs:serve": "jsdoc -c jsdoc.conf.json && serve docs"
  }
}
```

## **Best Practices**

1. ✅ **Document all public functions and methods**
2. ✅ **Include practical examples**  
3. ✅ **Document all parameters and return values**
4. ✅ **Specify all possible exceptions**
5. ✅ **Keep descriptions concise but complete**
6. ✅ **Update docs when code changes**
7. ✅ **Use consistent formatting**
8. ✅ **Include business context when relevant**

JSDoc transforms your code into self-documenting, professional-grade software that any developer can understand and maintain.