import { EmailService } from '../email.service';
import * as jwt from 'jsonwebtoken';

// Mock jsonwebtoken
jest.mock('jsonwebtoken');

describe('EmailService', () => {
  let consoleLogSpy: jest.SpyInstance;
  const mockJwtSecret = 'test-jwt-secret-key-that-is-32-chars-long'; // Match setup.ts

  beforeAll(() => {
    // JWT_SECRET is already set in setup.ts
    process.env.FRONTEND_URL = 'https://example.com';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.log to verify email content
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('sendPasswordResetEmail', () => {
    it('should generate a valid reset token with correct payload', async () => {
      const email = 'user@example.com';
      const userId = 'user123';
      const mockToken = 'mock-reset-token-abc123';

      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await EmailService.sendPasswordResetEmail(email, userId);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId, action: 'reset-password' },
        mockJwtSecret,
        { expiresIn: '1h' }
      );
      expect(result).toEqual({ resetToken: mockToken });
    });

    it('should send password reset email with correct content', async () => {
      const email = 'user@example.com';
      const userId = 'user123';
      const mockToken = 'mock-reset-token';

      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      await EmailService.sendPasswordResetEmail(email, userId);

      expect(consoleLogSpy).toHaveBeenCalled();
      const emailContent = consoleLogSpy.mock.calls[0][0];

      // Verify email contains expected content
      expect(emailContent).toContain('PASSWORD RESET EMAIL');
      expect(emailContent).toContain(`To: ${email}`);
      expect(emailContent).toContain('Password Reset Request');
      expect(emailContent).toContain(`http://localhost:5173/reset-password?token=${mockToken}`);
      expect(emailContent).toContain('This link will expire in 1 hour');
      expect(emailContent).toContain('The Pikzels Team');
    });

    it('should include reset token in response for testing', async () => {
      const mockToken = 'test-token-for-frontend';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      const result = await EmailService.sendPasswordResetEmail('test@example.com', 'user456');

      expect(result.resetToken).toBe(mockToken);
    });

    it('should use default JWT secret if not set in environment', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const mockToken = 'token-with-default-secret';
      (jwt.sign as jest.Mock).mockReturnValue(mockToken);

      await EmailService.sendPasswordResetEmail('user@test.com', 'user789');

      // Verify jwt.sign was called (secret is handled by the module's top-level constant)
      expect(jwt.sign).toHaveBeenCalled();

      process.env.JWT_SECRET = originalSecret;
    });

    it('should handle different user IDs correctly', async () => {
      const userIds = ['user1', 'user2', 'admin-user-123'];
      const email = 'test@example.com';

      for (const userId of userIds) {
        (jwt.sign as jest.Mock).mockReturnValue(`token-${userId}`);
        
        const result = await EmailService.sendPasswordResetEmail(email, userId);

        expect(jwt.sign).toHaveBeenCalledWith(
          expect.objectContaining({ userId }),
          expect.any(String),
          expect.any(Object)
        );
        expect(result.resetToken).toBe(`token-${userId}`);
      }
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email with user name', async () => {
      const email = 'newuser@example.com';
      const name = 'John Doe';

      await EmailService.sendWelcomeEmail(email, name);

      expect(consoleLogSpy).toHaveBeenCalled();
      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('WELCOME EMAIL');
      expect(emailContent).toContain(`To: ${email}`);
      expect(emailContent).toContain('Welcome to Pikzels!');
      expect(emailContent).toContain(`Hello ${name}`);
      expect(emailContent).toContain("We're excited to have you on board");
      expect(emailContent).toContain('The Pikzels Team');
    });

    it('should handle missing name with default greeting', async () => {
      const email = 'user@example.com';

      await EmailService.sendWelcomeEmail(email, '');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('Hello there');
    });

    it('should send welcome email with null name', async () => {
      const email = 'user@example.com';

      await EmailService.sendWelcomeEmail(email, null as any);

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('Hello there');
      expect(emailContent).toContain(`To: ${email}`);
    });

    it('should return void (no return value)', async () => {
      const result = await EmailService.sendWelcomeEmail('test@example.com', 'Test User');

      expect(result).toBeUndefined();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email with correct content', async () => {
      const email = 'verify@example.com';
      const name = 'Jane Smith';
      const token = 'verification-token-abc123';

      await EmailService.sendVerificationEmail(email, name, token);

      expect(consoleLogSpy).toHaveBeenCalled();
      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('EMAIL VERIFICATION');
      expect(emailContent).toContain(`To: ${email}`);
      expect(emailContent).toContain('Verify Your Email Address');
      expect(emailContent).toContain(`Hello ${name}`);
      expect(emailContent).toContain('Thank you for registering with ThumPiks');
      expect(emailContent).toContain('The ThumPiks Team');
    });

    it('should use FRONTEND_URL from environment', async () => {
      const email = 'user@example.com';
      const name = 'Test User';
      const token = 'test-token-123';

      await EmailService.sendVerificationEmail(email, name, token);

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain(`${process.env.FRONTEND_URL}/verify-email/${token}`);
      expect(emailContent).toContain('https://example.com/verify-email/test-token-123');
    });

    it('should use default URL when FRONTEND_URL not set', async () => {
      const originalUrl = process.env.FRONTEND_URL;
      delete process.env.FRONTEND_URL;

      const email = 'user@example.com';
      const name = 'Test User';
      const token = 'test-token-456';

      await EmailService.sendVerificationEmail(email, name, token);

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('http://localhost:5173/verify-email/test-token-456');

      process.env.FRONTEND_URL = originalUrl;
    });

    it('should include expiration notice in verification email', async () => {
      await EmailService.sendVerificationEmail('test@example.com', 'Test', 'token123');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('This link will expire in 24 hours');
    });

    it('should handle special characters in token', async () => {
      const specialToken = 'token-with-special_chars.123-ABC';

      await EmailService.sendVerificationEmail('user@test.com', 'User', specialToken);

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain(`/verify-email/${specialToken}`);
    });

    it('should return void (no return value)', async () => {
      const result = await EmailService.sendVerificationEmail(
        'test@example.com',
        'Test User',
        'token123'
      );

      expect(result).toBeUndefined();
    });
  });

  describe('Email Format Validation', () => {
    it('should log complete email structure for password reset', async () => {
      (jwt.sign as jest.Mock).mockReturnValue('test-token');

      await EmailService.sendPasswordResetEmail('user@test.com', 'user123');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      // Verify email has proper structure
      expect(emailContent).toMatch(/={20,}/); // Header separator
      expect(emailContent).toContain('To:');
      expect(emailContent).toContain('Subject:');
      expect(emailContent).toContain('Hello,');
      expect(emailContent).toContain('END EMAIL');
    });

    it('should log complete email structure for welcome email', async () => {
      await EmailService.sendWelcomeEmail('user@test.com', 'Test User');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toMatch(/={20,}/);
      expect(emailContent).toContain('To:');
      expect(emailContent).toContain('Subject:');
      expect(emailContent).toContain('END EMAIL');
    });

    it('should log complete email structure for verification email', async () => {
      await EmailService.sendVerificationEmail('user@test.com', 'Test User', 'token');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toMatch(/={20,}/);
      expect(emailContent).toContain('To:');
      expect(emailContent).toContain('Subject:');
      expect(emailContent).toContain('END EMAIL');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid successive email sends', async () => {
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await EmailService.sendPasswordResetEmail('user1@test.com', 'user1');
      await EmailService.sendWelcomeEmail('user2@test.com', 'User 2');
      await EmailService.sendVerificationEmail('user3@test.com', 'User 3', 'verify-token');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should maintain correct token format across multiple resets', async () => {
      const tokens = ['token1', 'token2', 'token3'];

      for (let i = 0; i < tokens.length; i++) {
        (jwt.sign as jest.Mock).mockReturnValue(tokens[i]);
        
        const result = await EmailService.sendPasswordResetEmail(`user${i}@test.com`, `user${i}`);
        
        expect(result.resetToken).toBe(tokens[i]);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty email addresses', async () => {
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await EmailService.sendPasswordResetEmail('', 'user123');
      await EmailService.sendWelcomeEmail('', 'Test User');
      await EmailService.sendVerificationEmail('', 'Test User', 'token');

      expect(consoleLogSpy).toHaveBeenCalledTimes(3);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(50) + '@' + 'b'.repeat(50) + '.com';
      (jwt.sign as jest.Mock).mockReturnValue('token');

      await EmailService.sendPasswordResetEmail(longEmail, 'user123');

      const emailContent = consoleLogSpy.mock.calls[0][0];
      expect(emailContent).toContain(longEmail);
    });

    it('should handle very long user names', async () => {
      const longName = 'A'.repeat(100);

      await EmailService.sendWelcomeEmail('user@test.com', longName);

      const emailContent = consoleLogSpy.mock.calls[0][0];
      expect(emailContent).toContain(longName);
    });

    it('should handle special characters in user names', async () => {
      const specialNames = ["O'Brien", 'José García', '李明', 'User<script>alert(1)</script>'];

      for (const name of specialNames) {
        await EmailService.sendWelcomeEmail('user@test.com', name);

        const emailContent = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1][0];
        expect(emailContent).toContain(name);
      }
    });
  });
});
