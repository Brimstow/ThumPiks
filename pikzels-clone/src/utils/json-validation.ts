import { ZodSchema, ZodError } from 'zod';
import { logger } from './logger';

/**
 * Validate data against a Zod schema before writing to a JSON column.
 * Throws ZodError on failure (caught by controllers to return 400).
 */
export function validateJsonColumn<T>(
  schema: ZodSchema<T>,
  data: unknown,
  columnName: string
): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn(`JSON validation failed for ${columnName}`, {
        columnName,
        issues: error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
      });
    }
    throw error;
  }
}

/**
 * Safely parse data from a JSON column on read.
 * If legacy data doesn't match the schema, logs a warning and returns
 * the raw data so the application doesn't crash.
 */
export function safeParseJsonColumn<T>(
  schema: ZodSchema<T>,
  data: unknown,
  columnName: string
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    logger.warn(`Legacy data validation warning for ${columnName}`, {
      columnName,
      issues: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`),
    });
    return data as T;
  }
  return result.data;
}

/**
 * Type guard to check if an error is a ZodError.
 * Useful in controller catch blocks to return 400 instead of 500.
 */
export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
