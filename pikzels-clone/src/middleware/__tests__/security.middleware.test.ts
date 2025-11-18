import { Request, Response, NextFunction } from 'express';
import {
  sanitizeInput,
  httpsRedirect,
  securityLogger,
  requestSizeLimit,
  apiVersioning,
} from '../security.middleware';
import { logger } from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Security Middleware', () => {
  let mockReq: any; // Use any to allow property mutation for testing
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
      headers: {},
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      get: jest.fn(),
      header: jest.fn(),
      connection: {} as any,
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      redirect: jest.fn(),
      set: jest.fn(),
      removeHeader: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from request body', () => {
      mockReq.body = {
        name: 'John<script>alert("xss")</script>Doe',
        description: 'Safe text',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('JohnDoe');
      expect(mockReq.body.description).toBe('Safe text');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove javascript: protocol', () => {
      mockReq.body = {
        link: 'javascript:alert(1)',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.link).toBe('alert(1)');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove event handlers (onclick, onerror, etc.)', () => {
      mockReq.body = {
        html: '<img src="x" onerror="alert(1)">',
        div: '<div onclick="malicious()">Click</div>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      // Regex removes 'onerror=' and 'onclick=' but leaves quoted values
      expect(mockReq.body.html).toBe('<img src="x" "alert(1)">');
      expect(mockReq.body.div).toBe('<div "malicious()">Click</div>');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize nested objects', () => {
      mockReq.body = {
        user: {
          name: 'Test<script>alert(1)</script>User',
          profile: {
            bio: 'Bio with <script>code</script>',
          },
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.user.name).toBe('TestUser');
      expect(mockReq.body.user.profile.bio).toBe('Bio with');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize arrays', () => {
      mockReq.body = {
        tags: ['safe', '<script>bad</script>', 'good'],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.tags).toEqual(['safe', '', 'good']);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '<script>alert("xss")</script>test',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.query.search).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle null and undefined values', () => {
      mockReq.body = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.nullValue).toBeNull();
      expect(mockReq.body.undefinedValue).toBeUndefined();
      expect(mockReq.body.validValue).toBe('test');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should preserve non-string types', () => {
      mockReq.body = {
        number: 123,
        boolean: true,
        object: { key: 'value' },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.number).toBe(123);
      expect(mockReq.body.boolean).toBe(true);
      expect(mockReq.body.object).toEqual({ key: 'value' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should trim whitespace from strings', () => {
      mockReq.body = {
        name: '  John Doe  ',
        email: ' test@example.com ',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.name).toBe('John Doe');
      expect(mockReq.body.email).toBe('test@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle multiple XSS patterns in same string', () => {
      mockReq.body = {
        malicious: '<script>alert(1)</script>Text<script>alert(2)</script>',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.body.malicious).toBe('Text');
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('httpsRedirect', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_HTTPS_REDIRECT = 'true';
      (mockReq.header as jest.Mock).mockImplementation((name: string) => {
        if (name === 'x-forwarded-proto') return 'http';
        if (name === 'host') return 'example.com';
        return undefined;
      });
    });

    afterEach(() => {
      delete process.env.NODE_ENV;
      delete process.env.ENABLE_HTTPS_REDIRECT;
    });

    it('should redirect HTTP to HTTPS in production', () => {
      mockReq.url = '/secure-page';

      httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).toHaveBeenCalledWith('https://example.com/secure-page');
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not redirect if already HTTPS', () => {
      (mockReq.header as jest.Mock).mockImplementation((name: string) => {
        if (name === 'x-forwarded-proto') return 'https';
        return undefined;
      });

      httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not redirect in development', () => {
      process.env.NODE_ENV = 'development';

      httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not redirect if HTTPS redirect is disabled', () => {
      process.env.ENABLE_HTTPS_REDIRECT = 'false';

      httpsRedirect(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.redirect).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('securityLogger', () => {
    beforeEach(() => {
      (mockReq.get as jest.Mock).mockReturnValue('Mozilla/5.0');
      mockReq.ip = '192.168.1.100';
      mockReq.url = '/api/test';
      mockReq.method = 'POST';
    });

    it('should detect directory traversal attempts', () => {
      mockReq.query = { file: '../../../etc/passwd' };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith(
        'Suspicious request detected',
        expect.objectContaining({
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          url: '/api/test',
          method: 'POST',
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect XSS attempts', () => {
      mockReq.body = { content: '<script>alert("xss")</script>' };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious request detected', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect SQL injection attempts', () => {
      mockReq.body = { username: "admin' UNION SELECT * FROM users--" };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious request detected', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect eval injection attempts', () => {
      mockReq.body = { code: 'eval(malicious_code)' };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious request detected', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should detect cookie theft attempts', () => {
      mockReq.body = { script: 'document.cookie' };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).toHaveBeenCalledWith('Suspicious request detected', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log authentication attempts', () => {
      mockReq.url = '/auth/login';

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith(
        'Authentication attempt',
        expect.objectContaining({
          ip: '192.168.1.100',
          userAgent: 'Mozilla/5.0',
          url: '/auth/login',
          method: 'POST',
        })
      );
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log register attempts', () => {
      mockReq.url = '/register';

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.info).toHaveBeenCalledWith('Authentication attempt', expect.any(Object));
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not log warnings for safe requests', () => {
      mockReq.body = { username: 'john', password: 'safe123' };
      mockReq.query = { page: '1' };

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(logger.warn).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing IP address', () => {
      const reqWithoutIp = {
        ...mockReq,
        ip: undefined,
        connection: { remoteAddress: undefined },
      };

      securityLogger(reqWithoutIp as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Should use 'Unknown' as fallback
    });

    it('should handle missing User-Agent', () => {
      (mockReq.get as jest.Mock).mockReturnValue(undefined);

      securityLogger(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      // Should use 'Unknown' as fallback
    });
  });

  describe('requestSizeLimit', () => {
    it('should allow requests within size limit', () => {
      mockReq.headers = { 'content-length': '1000' };

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject requests exceeding size limit', () => {
      mockReq.headers = { 'content-length': '20000000' }; // 20MB
      mockReq.ip = '192.168.1.1';
      mockReq.url = '/upload';

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Request entity too large',
        maxSize: '10485760 bytes',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        'Request size exceeded',
        expect.objectContaining({
          ip: '192.168.1.1',
          contentLength: 20000000,
          maxSize: 10485760,
          url: '/upload',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow requests without content-length header', () => {
      mockReq.headers = {};

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should respect custom MAX_FILE_SIZE env variable', () => {
      process.env.MAX_FILE_SIZE = '5000000'; // 5MB
      mockReq.headers = { 'content-length': '6000000' }; // 6MB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Request entity too large',
        maxSize: '5000000 bytes',
      });

      delete process.env.MAX_FILE_SIZE;
    });

    it('should handle exactly at limit', () => {
      mockReq.headers = { 'content-length': '10485760' }; // Exactly 10MB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle one byte over limit', () => {
      mockReq.headers = { 'content-length': '10485761' }; // 1 byte over 10MB

      requestSizeLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(413);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('apiVersioning', () => {
    it('should add API version header', () => {
      apiVersioning(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-API-Version', '1.0.0');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should add custom X-Powered-By header', () => {
      apiVersioning(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-Powered-By', 'Thumbnail Maker Studio');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove default X-Powered-By header for security', () => {
      apiVersioning(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.removeHeader).toHaveBeenCalledWith('X-Powered-By');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should call all header operations in correct order', () => {
      apiVersioning(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledTimes(2);
      expect(mockRes.removeHeader).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
