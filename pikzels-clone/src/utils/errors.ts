/**
 * Custom Error Classes for Type-Safe Error Handling
 * 
 * These custom errors allow controllers to handle different error types
 * with appropriate HTTP status codes without relying on string matching.
 */

/**
 * Base class for all application errors
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 * Used for: validation errors, malformed requests, invalid input
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 401 Unauthorized - Authentication failed
 * Used for: invalid credentials, missing authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message);
  }
}

/**
 * 403 Forbidden - User lacks permission
 * Used for: insufficient permissions, forbidden actions
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message);
  }
}

/**
 * 404 Not Found - Resource doesn't exist
 * Used for: user not found, resource not found
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message);
  }
}

/**
 * 409 Conflict - Resource already exists
 * Used for: duplicate email, duplicate username, conflicting updates
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Used for: rate limiting, throttling
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 * Used for: database errors, unexpected failures
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error') {
    super(message);
  }
}

/**
 * Helper function to map errors to HTTP status codes
 */
export function getErrorStatusCode(error: Error): number {
  if (error instanceof ValidationError) return 400;
  if (error instanceof UnauthorizedError) return 401;
  if (error instanceof ForbiddenError) return 403;
  if (error instanceof NotFoundError) return 404;
  if (error instanceof ConflictError) return 409;
  if (error instanceof RateLimitError) return 429;
  if (error instanceof InternalServerError) return 500;
  
  // Default to 500 for unknown errors
  return 500;
}

/**
 * Helper function to determine if error should be logged as critical
 */
export function isCriticalError(error: Error): boolean {
  // Only 5xx errors are critical
  return getErrorStatusCode(error) >= 500;
}
