import {
  validateRequest,
  commonValidations,
} from '../../middleware/validation.middleware';
import { Request, Response, NextFunction } from 'express';

// Explicit mock interfaces — Partial<Request/Response> does not work with Express 5
// @types/express-serve-static-core v5 changed Request/Response inheritance in ways that
// break Partial<T>; define only what the test needs.
interface MockReq {
  body: Record<string, unknown>;
  params: Record<string, string>;
  query: Record<string, unknown>;
  ip: string;
  get: jest.Mock;
  url: string;
  method: string;
}
interface MockRes {
  status: jest.Mock;
  json: jest.Mock;
}

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
  },
}));

// Mock DOMPurify
jest.mock('isomorphic-dompurify', () => ({
  sanitize: jest.fn((input, options) => {
    if (options && options.ALLOWED_TAGS && options.ALLOWED_TAGS.length === 0) {
      // Strip all HTML tags when no tags are allowed
      return input.replace(/<[^>]*>/g, '');
    }
    // Default behavior: just remove script tags
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<script[^>]*>/gi, '');
  }),
}));

describe('Security - Input Validation', () => {
  let req: MockReq;
  let res: MockRes;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-agent'),
      url: '/test',
      method: 'POST',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('Email Validation', () => {
    test('should accept valid emails', () => {
      req.body = { email: 'test@example.com' };

      const middleware = validateRequest({
        body: [commonValidations.email],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject invalid emails', () => {
      req.body = { email: 'invalid-email' };

      const middleware = validateRequest({
        body: [commonValidations.email],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should sanitize email input', () => {
      req.body = { email: 'test@example.com<script>alert("xss")</script>' };

      const middleware = validateRequest({
        body: [
          { field: 'email', required: true, type: 'string', sanitize: true },
        ],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      // The middleware should sanitize and continue processing
      expect(next).toHaveBeenCalled();
      expect(req.body.email).toBeDefined();
      expect(req.body.email).toBe('test@example.comalert("xss")');
      expect(req.body.email).not.toContain('<script>');
    });
  });

  describe('Password Validation', () => {
    test('should accept strong passwords', () => {
      req.body = { password: 'StrongPass123!' };

      const middleware = validateRequest({
        body: [commonValidations.strongPassword],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject weak passwords', () => {
      req.body = { password: 'weak' };

      const middleware = validateRequest({
        body: [commonValidations.strongPassword],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject common passwords', () => {
      req.body = { password: 'password123' };

      const middleware = validateRequest({
        body: [commonValidations.strongPassword],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize malicious scripts in name field', () => {
      req.body = { name: 'John<script>alert("xss")</script>Doe' };

      const middleware = validateRequest({
        body: [
          {
            field: 'name',
            required: true,
            type: 'string',
            sanitize: true,
            minLength: 1,
            maxLength: 100,
          },
        ],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
      expect(req.body.name).toBeDefined();
      expect(req.body.name).not.toContain('<script>');
      expect(req.body.name).toBe('Johnalert("xss")Doe');
    });

    test('should sanitize HTML in description fields', () => {
      req.body = { description: '<img src="x" onerror="alert(1)">' };

      const middleware = validateRequest({
        body: [{ ...commonValidations.description, sanitize: true }],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(req.body.description).toBeDefined();
      expect(req.body.description).not.toContain('onerror');
      expect(req.body.description).not.toContain('<img');
      expect(req.body.description).toBe('');
    });
  });

  describe('Data Type Security', () => {
    test('should validate UUID format', () => {
      req.params = { id: 'not-a-uuid' };

      const middleware = validateRequest({
        params: [commonValidations.id],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept valid UUIDs', () => {
      req.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validateRequest({
        params: [commonValidations.id],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('should validate URL format', () => {
      req.body = { url: 'not-a-url' };

      const middleware = validateRequest({
        body: [commonValidations.url],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept valid URLs', () => {
      req.body = { url: 'https://example.com' };

      const middleware = validateRequest({
        body: [commonValidations.url],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Platform Whitelist Security', () => {
    test('should accept whitelisted platforms', () => {
      req.body = { platform: 'twitter' };

      const middleware = validateRequest({
        body: [commonValidations.platform],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject non-whitelisted platforms', () => {
      req.body = { platform: 'malicious-platform' };

      const middleware = validateRequest({
        body: [commonValidations.platform],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Array Validation Security', () => {
    test('should validate array structure for tags', () => {
      req.body = { tags: ['valid', 'tags'] };

      const middleware = validateRequest({
        body: [commonValidations.tags],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('should reject oversized tag arrays', () => {
      req.body = { tags: new Array(15).fill('tag') }; // More than 10 allowed

      const middleware = validateRequest({
        body: [commonValidations.tags],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should reject tags with oversized strings', () => {
      req.body = { tags: ['a'.repeat(100)] }; // More than 50 chars allowed

      const middleware = validateRequest({
        body: [commonValidations.tags],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Length Limit Security', () => {
    test('should enforce title length limits', () => {
      req.body = { title: 'a'.repeat(300) }; // More than 200 allowed

      const middleware = validateRequest({
        body: [commonValidations.title],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should enforce description length limits', () => {
      req.body = { description: 'a'.repeat(1500) }; // More than 1000 allowed

      const middleware = validateRequest({
        body: [commonValidations.description],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Pattern Matching Security', () => {
    test('should enforce name pattern restrictions', () => {
      req.body = { name: 'John123Doe' }; // Contains numbers which are not allowed in name pattern

      const middleware = validateRequest({
        body: [commonValidations.name],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('should accept valid name patterns', () => {
      req.body = { name: 'John Doe-Smith Jr.' };

      const middleware = validateRequest({
        body: [commonValidations.name],
      });

      middleware(req as unknown as Request, res as unknown as Response, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
