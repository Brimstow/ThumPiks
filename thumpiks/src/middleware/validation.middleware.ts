import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';
import { AuthRequest } from '../types/auth';

// Enhanced email validation regex (more comprehensive)
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Password validation - enhanced security
const MIN_PASSWORD_LENGTH = 8;
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/; // At least one lowercase, uppercase, digit, and special char

interface ValidationRule {
  field: string;
  required?: boolean;
  type?:
    | 'string'
    | 'number'
    | 'email'
    | 'array'
    | 'object'
    | 'url'
    | 'uuid'
    | 'password';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  whitelist?: string[]; // Allowed values
  blacklist?: string[]; // Forbidden values
  sanitize?: boolean; // Enable HTML sanitization
  custom?: (value: unknown) => boolean | string;
}

interface ValidationOptions {
  body?: ValidationRule[];
  params?: ValidationRule[];
  query?: ValidationRule[];
}

export const validateRequest = (options: ValidationOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate body
    if (options.body) {
      const {
        errors: bodyErrors,
        warnings: bodyWarnings,
        sanitized,
      } = validateFields(req.body, options.body, 'body');
      errors.push(...bodyErrors);
      warnings.push(...bodyWarnings);
      req.body = sanitized; // Apply sanitized data
    }

    // Validate params
    if (options.params) {
      const {
        errors: paramErrors,
        warnings: paramWarnings,
        sanitized,
      } = validateFields(req.params, options.params, 'params');
      errors.push(...paramErrors);
      warnings.push(...paramWarnings);
      req.params = sanitized as typeof req.params;
    }

    // Validate query
    if (options.query) {
      const {
        errors: queryErrors,
        warnings: queryWarnings,
        sanitized,
      } = validateFields(req.query, options.query, 'query');
      errors.push(...queryErrors);
      warnings.push(...queryWarnings);
      req.query = sanitized as typeof req.query;
    }

    // Log warnings but don't block request
    if (warnings.length > 0) {
      const userId = (req as AuthRequest).user?.id;
      logger.warn('Validation warnings', {
        url: req.url,
        method: req.method,
        warnings,
        ...(userId !== undefined && { userId }),
      });
    }

    if (errors.length > 0) {
      const userId = (req as AuthRequest).user?.id;
      const ip = req.ip;
      const userAgent = req.get('User-Agent');
      logger.warn('Validation failed', {
        url: req.url,
        method: req.method,
        errors,
        ...(userId !== undefined && { userId }),
        ...(ip !== undefined && { ip }),
        ...(userAgent !== undefined && { userAgent }),
      });

      return res.status(400).json({
        error: 'Validation failed',
        errors: errors,
        code: 'VALIDATION_ERROR',
      });
    }

    return next();
  };
};

interface ZodLikeSchema {
  validate: (data: unknown) => {
    error?: { details: Array<{ message: string }> };
  };
}

export const validateSchema = (schema: ZodLikeSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ error: error.details[0]?.message ?? 'Validation error' });
    }
    return next();
  };
};

function validateFields(
  data: Record<string, unknown>,
  rules: ValidationRule[],
  source: string
): {
  errors: string[];
  warnings: string[];
  sanitized: Record<string, unknown>;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sanitized: Record<string, unknown> = {};

  // Copy non-validated fields
  for (const key in data) {
    if (!rules.find(rule => rule.field === key)) {
      sanitized[key] = data[key];
    }
  }

  for (const rule of rules) {
    const value = data[rule.field];
    const fieldPath = `${source}.${rule.field}`;

    // Required field check
    if (
      rule.required &&
      (value === undefined || value === null || value === '')
    ) {
      errors.push(`${fieldPath} is required`);
      continue;
    }

    // Skip further validation if field is not present and not required
    if (value === undefined || value === null) {
      continue;
    }

    let processedValue = value;

    // Sanitization (before validation)
    if (rule.sanitize && typeof value === 'string') {
      try {
        processedValue = DOMPurify.sanitize(value, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
        });
        if (processedValue !== value) {
          warnings.push(
            `${fieldPath} was sanitized (removed potentially dangerous content)`
          );
        }
      } catch (sanitizeError) {
        logger.warn('Sanitization failed', {
          field: fieldPath,
          error: sanitizeError,
        });
      }
    }

    // Type validation
    if (rule.type) {
      const typeError = validateType(processedValue, rule.type, fieldPath);
      if (typeError) {
        errors.push(typeError);
        continue;
      }
    }

    // Length validation for strings and arrays
    if (typeof processedValue === 'string' || Array.isArray(processedValue)) {
      const length = processedValue.length;
      if (rule.minLength && length < rule.minLength) {
        errors.push(
          `${fieldPath} must be at least ${rule.minLength} characters`
        );
      }
      if (rule.maxLength && length > rule.maxLength) {
        errors.push(
          `${fieldPath} must be no more than ${rule.maxLength} characters`
        );
      }
    }

    // Numeric range validation
    if (typeof processedValue === 'number') {
      if (rule.min !== undefined && processedValue < rule.min) {
        errors.push(`${fieldPath} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && processedValue > rule.max) {
        errors.push(`${fieldPath} must be no more than ${rule.max}`);
      }
    }

    // Pattern validation
    if (rule.pattern && typeof processedValue === 'string') {
      if (!rule.pattern.test(processedValue)) {
        errors.push(`${fieldPath} does not match required pattern`);
      }
    }

    // Whitelist validation
    if (rule.whitelist && !rule.whitelist.includes(processedValue as string)) {
      errors.push(`${fieldPath} must be one of: ${rule.whitelist.join(', ')}`);
    }

    // Blacklist validation
    if (rule.blacklist?.includes(processedValue as string)) {
      errors.push(`${fieldPath} contains forbidden value`);
    }

    // Custom validation
    if (rule.custom) {
      const customResult = rule.custom(processedValue);
      if (typeof customResult === 'string') {
        errors.push(`${fieldPath}: ${customResult}`);
      } else if (customResult === false) {
        errors.push(`${fieldPath} is invalid`);
      }
    }

    // Store sanitized value
    sanitized[rule.field] = processedValue;
  }

  return { errors, warnings, sanitized };
}

function validateType(
  value: unknown,
  type: string,
  fieldPath: string
): string | null {
  switch (type) {
    case 'string':
      if (typeof value !== 'string') {
        return `${fieldPath} must be a string`;
      }
      break;
    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return `${fieldPath} must be a number`;
      }
      break;
    case 'email':
      if (typeof value !== 'string' || !EMAIL_REGEX.test(value)) {
        return `${fieldPath} must be a valid email address`;
      }
      // Additional email validation using validator library
      if (!validator.isEmail(value)) {
        return `${fieldPath} must be a valid email address`;
      }
      break;
    case 'url':
      if (
        typeof value !== 'string' ||
        !validator.isURL(value, { require_protocol: true })
      ) {
        return `${fieldPath} must be a valid URL`;
      }
      break;
    case 'uuid':
      if (typeof value !== 'string' || !validator.isUUID(value)) {
        return `${fieldPath} must be a valid UUID`;
      }
      break;
    case 'password':
      if (typeof value !== 'string') {
        return `${fieldPath} must be a string`;
      }
      if (value.length < MIN_PASSWORD_LENGTH) {
        return `${fieldPath} must be at least ${MIN_PASSWORD_LENGTH} characters long`;
      }
      if (!PASSWORD_REGEX.test(value)) {
        return `${fieldPath} must contain at least one uppercase letter, one lowercase letter, one digit, and one special character`;
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        return `${fieldPath} must be an array`;
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        return `${fieldPath} must be an object`;
      }
      break;
  }
  return null;
}

// Enhanced common validation rules
export const commonValidations = {
  email: {
    field: 'email',
    required: true,
    type: 'email' as const,
    sanitize: true,
  },
  password: {
    field: 'password',
    required: true,
    type: 'password' as const,
    minLength: MIN_PASSWORD_LENGTH,
  },
  strongPassword: {
    field: 'password',
    required: true,
    type: 'password' as const,
    minLength: 12,
    custom: (value: unknown) => {
      // Check against common passwords
      const commonPasswords = [
        'password',
        '123456789',
        'qwerty123',
        'admin123',
        'password123',
        'welcome123',
        'letmein123',
      ];
      if (
        typeof value === 'string' &&
        commonPasswords.includes(value.toLowerCase())
      ) {
        return 'Password is too common, please choose a stronger password';
      }
      return true;
    },
  },
  name: {
    field: 'name',
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
    sanitize: true,
    pattern: /^[a-zA-Z\s-.]+$/, // Only letters, spaces, hyphens, and dots
  },
  id: {
    field: 'id',
    required: true,
    type: 'uuid' as const,
  },
  title: {
    field: 'title',
    required: true,
    type: 'string' as const,
    minLength: 1,
    maxLength: 200,
    sanitize: true,
  },
  description: {
    field: 'description',
    required: false,
    type: 'string' as const,
    maxLength: 1000,
    sanitize: true,
  },
  url: {
    field: 'url',
    required: false,
    type: 'url' as const,
  },
  platform: {
    field: 'platform',
    required: true,
    type: 'string' as const,
    whitelist: ['twitter', 'facebook', 'linkedin', 'pinterest', 'instagram'],
  },
  tags: {
    field: 'tags',
    required: false,
    type: 'array' as const,
    maxLength: 10, // Max 10 tags
    custom: (value: unknown) => {
      if (!Array.isArray(value)) return 'Tags must be an array';
      if (value.some(tag => typeof tag !== 'string' || tag.length > 50)) {
        return 'Each tag must be a string with max 50 characters';
      }
      return true;
    },
  },
};
