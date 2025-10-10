# Security Middleware

<cite>
**Referenced Files in This Document**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts) - *Added in commit 92c9c4f8*
- [security.config.ts](file://pikzels-clone\src\config\security.config.ts) - *Added in commit 92c9c4f8*
- [jwt.enhanced.service.ts](file://pikzels-clone\src\services\jwt.enhanced.service.ts) - *Security enhancements*
- [server.ts](file://pikzels-clone\src\server.ts) - *Middleware integration*
- [auth.middleware.ts](file://pikzels-clone\src\middleware\auth.middleware.ts) - *Authentication integration*
</cite>

## Update Summary
**Changes Made**   
- Added comprehensive documentation for newly implemented security middleware
- Created detailed sections for rate limiting, input sanitization, security headers, and logging
- Integrated configuration details from security.config.ts
- Added practical implementation examples
- Enhanced source tracking with file references and annotations

## Table of Contents
- [Security Middleware](#security-middleware)
  - [Overview](#overview)
  - [Core Components](#core-components)
    - [Security Headers](#security-headers)
    - [Rate Limiting](#rate-limiting)
    - [Input Sanitization](#input-sanitization)
    - [Security Logging](#security-logging)
    - [Request Size Limiting](#request-size-limiting)
  - [Configuration](#configuration)
  - [Integration Examples](#integration-examples)
  - [Testing and Validation](#testing-and-validation)

## Overview
The Security Middleware system provides a comprehensive set of security features to protect the Thumbnail Maker application from common web vulnerabilities. Implemented as Express middleware, it offers protection against XSS, CSRF, brute force attacks, and other security threats.

The middleware suite was recently enhanced with a complete security layer including input sanitization, rate limiting, security headers, and request size limiting, addressing critical security requirements for production deployment.

## Core Components

### Security Headers
The security headers middleware uses Helmet.js to set various HTTP headers that enhance security by preventing common attacks.

**Features:**
- Content Security Policy (CSP) to prevent XSS attacks
- HSTS (HTTP Strict Transport Security) for secure connections
- X-Frame-Options to prevent clickjacking
- X-Content-Type-Options to prevent MIME type sniffing

```typescript
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});
```

**Section sources**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts#L1-L50) - *Security headers implementation*

### Rate Limiting
Rate limiting middleware prevents brute force attacks and API abuse by limiting the number of requests from a single IP address.

**Available configurations:**
- **General Rate Limiting**: 100 requests per 15 minutes
- **Authentication Rate Limiting**: 5 attempts per 15 minutes (skips successful requests)
- **Upload Rate Limiting**: 20 uploads per 15 minutes

```typescript
export const generalRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes',
    });
  },
});
```

**Section sources**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts#L52-L100) - *Rate limiting implementation*
- [security.config.ts](file://pikzels-clone\src\config\security.config.ts#L30-L50) - *Rate limiting configuration*

### Input Sanitization
Input sanitization middleware protects against XSS and code injection attacks by cleaning user input.

**Sanitization rules:**
- Removes script tags and javascript: protocol
- Strips event handlers (on\w+=)
- Trims whitespace
- Recursively sanitizes nested objects and arrays

```typescript
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};
```

**Section sources**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts#L140-L190) - *Input sanitization implementation*

### Security Logging
Security logging middleware monitors and logs suspicious activities and authentication attempts.

**Detection patterns:**
- Directory traversal (../)
- XSS attempts (<script)
- SQL injection (union select)
- Code injection (eval()
- Cookie theft attempts (document.cookie)

```typescript
export const securityLogger = (req: Request, _res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    /\.\./g,
    /<script/gi,
    /union.*select/gi,
    /eval\s*\(/gi,
    /document\.cookie/gi,
  ];

  const requestString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(requestString));

  if (isSuspicious) {
    logger.warn('Suspicious request detected', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });
  }

  if (req.url.includes('/auth/') || req.url.includes('/login') || req.url.includes('/register')) {
    logger.info('Authentication attempt', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method,
    });
  }

  next();
};
```

**Section sources**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts#L192-L220) - *Security logging implementation*

### Request Size Limiting
Request size limiting middleware prevents denial-of-service attacks by limiting the size of incoming requests.

```typescript
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
  
  if (req.headers['content-length']) {
    const contentLength = parseInt(req.headers['content-length']);
    if (contentLength > maxSize) {
      logger.warn('Request size exceeded', {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.url,
      });
      return res.status(413).json({
        error: 'Request entity too large',
        maxSize: `${maxSize} bytes`,
      });
    }
  }
  
  return next();
};
```

**Section sources**   
- [security.middleware.ts](file://pikzels-clone\src\middleware\security.middleware.ts#L222-L230) - *Request size limiting implementation*

## Configuration
Security configuration is managed through environment variables and centralized configuration.

**Key configuration options:**
- JWT secrets and expiration times
- Encryption keys and algorithms
- Database connection settings
- CORS origins and credentials
- Rate limiting parameters
- Security feature toggles

```typescript
export function getSecurityConfig(): SecurityConfig {
  const config: SecurityConfig = {
    jwt: {
      secret: getRequiredEnv('JWT_SECRET'),
      refreshSecret: getRequiredEnv('REFRESH_TOKEN_SECRET', 'different-secret-from-jwt'),
      accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
      refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
      resetExpiry: process.env.JWT_RESET_EXPIRY || '1h',
    },
    rateLimiting: {
      enabled: process.env.ENABLE_RATE_LIMITING === 'true',
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000'),
      authMaxAttempts: parseInt(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || '5'),
    },
    security: {
      enableHeaders: process.env.ENABLE_SECURITY_HEADERS === 'true',
      enableHttpsRedirect: process.env.ENABLE_HTTPS_REDIRECT === 'true',
      requireEmailVerification: process.env.REQUIRE_EMAIL_VERIFICATION === 'true',
      enableSanitization: process.env.ENABLE_INPUT_SANITIZATION !== 'false',
    },
  };

  validateSecurityConfig(config);
  return config;
}
```

**Section sources**   
- [security.config.ts](file://pikzels-clone\src\config\security.config.ts) - *Complete security configuration*
- [security.config.ts](file://pikzels-clone\src\config\security.config.ts#L100-L150) - *Environment validation*
- [security.config.ts](file://pikzels-clone\src\config\security.config.ts#L200-L250) - *Configuration validation*

## Integration Examples
### Basic Server Integration
```typescript
import express from 'express';
import { 
  securityHeaders, 
  generalRateLimit, 
  sanitizeInput, 
  securityLogger,
  requestSizeLimit 
} from './middleware/security.middleware';

const app = express();

// Apply security middleware
app.use(securityHeaders);
app.use(generalRateLimit);
app.use(sanitizeInput);
app.use(securityLogger);
app.use(requestSizeLimit);
app.use(express.json());

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/thumbnails', thumbnailRoutes);
```

### Authentication-Specific Rate Limiting
```typescript
import { authRateLimit } from './middleware/security.middleware';

// Apply stricter rate limiting to authentication endpoints
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', authRateLimit);
app.use('/api/auth/reset-password', authRateLimit);

app.use('/api/auth', authRoutes);
```

### Selective Input Sanitization
```typescript
// Apply sanitization only to specific routes
app.use('/api/user/profile', sanitizeInput, profileRoutes);
app.use('/api/content', sanitizeInput, contentRoutes);

// Skip sanitization for trusted internal APIs
app.use('/api/internal', internalRoutes);
```

**Section sources**   
- [server.ts](file://pikzels-clone\src\server.ts) - *Server integration*
- [auth.middleware.ts](file://pikzels-clone\src\middleware\auth.middleware.ts) - *Authentication middleware integration*

## Testing and Validation
The security middleware has been thoroughly tested with integration tests that verify all security features.

**Test coverage includes:**
- Security headers presence and values
- Input sanitization effectiveness
- Rate limiting enforcement
- Security logging functionality
- Configuration validation

```typescript
describe('Security Integration Tests', () => {
  test('should set security headers', async () => {
    const response = await request(app).get('/test');
    
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toBeTruthy();
  });

  test('should sanitize malicious input', async () => {
    const maliciousInput = {
      name: 'John<script>alert("xss")</script>Doe',
      description: '<img src="x" onerror="alert(1)">',
    };

    const response = await request(app)
      .post('/test-input')
      .send(maliciousInput);

    expect(response.body.received.name).toBeTruthy();
    expect(response.body.received.description).toBeTruthy();
  });
});
```

**Section sources**   
- [security-integration.test.ts](file://pikzels-clone\src\__tests__\security\security-integration.test.ts) - *Integration tests*
- [jwt.enhanced.service.ts](file://pikzels-clone\src\services\jwt.enhanced.service.ts) - *JWT security tests*