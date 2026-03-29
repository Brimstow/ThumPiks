// Mock Prisma first (before importing EmailService)
const mockEmailLogCreate = jest.fn();
const mockEmailLogUpdate = jest.fn();
const mockEmailLogUpdateMany = jest.fn();
const mockEmailLogFindFirst = jest.fn();
const mockEmailLogCount = jest.fn();

jest.mock('../../../utils/prisma-factory', () => ({
  getPrisma: jest.fn(() => ({
    emailLog: {
      create: mockEmailLogCreate,
      update: mockEmailLogUpdate,
      updateMany: mockEmailLogUpdateMany,
      findFirst: mockEmailLogFindFirst,
      count: mockEmailLogCount,
    },
  })),
}));

import { EmailService } from '../../email/email.service';

// Mock Resend
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('EmailService', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeAll(() => {
    process.env.RESEND_API_KEY = 're_test_api_key';
    process.env.FRONTEND_URL = 'https://example.com';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Spy on console.log to verify email content
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    // Reset mock send function
    mockSend.mockReset();
    // Reset Prisma mocks
    mockEmailLogCreate.mockReset();
    mockEmailLogUpdate.mockReset();
    mockEmailLogUpdateMany.mockReset();
    mockEmailLogFindFirst.mockReset();
    mockEmailLogCount.mockReset();
    
    // Default mock implementations
    mockEmailLogCreate.mockResolvedValue({ id: 'log-id-123' });
    mockEmailLogUpdate.mockResolvedValue({});
    mockEmailLogUpdateMany.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email via Resend', async () => {
      const email = 'user@example.com';
      const resetToken = 'mock-reset-token-abc123';

      mockSend.mockResolvedValue({
        data: { id: 'email-message-id' },
        error: null,
      });

      await EmailService.sendPasswordResetEmail(email, resetToken);

      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('ThumPiks'),
        to: [email],
        subject: 'Reset Your Password',
        html: expect.stringContaining(resetToken),
      });
    });

    it('should include reset URL in email HTML', async () => {
      const email = 'user@example.com';
      const resetToken = 'mock-reset-token';

      mockSend.mockResolvedValue({
        data: { id: 'email-message-id' },
        error: null,
      });

      await EmailService.sendPasswordResetEmail(email, resetToken);

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.html).toContain('reset-password?token=' + resetToken);
      expect(callArgs.html).toContain('Reset Password');
      expect(callArgs.html).toContain('Password Reset Request');
    });

    it('should return error when Resend returns an error', async () => {
      const email = 'user@example.com';
      const resetToken = 'mock-token';

      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      const result = await EmailService.sendPasswordResetEmail(email, resetToken);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid API key');
    });

    it('should return error when RESEND_API_KEY is not configured', async () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      // Need to re-import to trigger the lazy initialization check
      jest.resetModules();
      const { EmailService: EmailServiceNoKey } = await import(
        '../../email/email.service'
      );

      const result = await EmailServiceNoKey.sendPasswordResetEmail('test@example.com', 'token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('RESEND_API_KEY is not configured');

      process.env.RESEND_API_KEY = originalKey;
    });

    it('should log email to database', async () => {
      const email = 'user@example.com';
      const resetToken = 'test-token';
      const userId = 'user-123';

      mockSend.mockResolvedValue({
        data: { id: 'email-id' },
        error: null,
      });

      await EmailService.sendPasswordResetEmail(email, resetToken, userId);

      // Verify database logging
      expect(mockEmailLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailType: 'password_reset',
          recipientEmail: email,
          status: 'pending',
          userId: userId,
        }),
      });
      
      // Verify email was sent via Resend
      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('ThumPiks'),
        to: [email],
        subject: 'Reset Your Password',
        html: expect.stringContaining(resetToken),
      });
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email and log to database', async () => {
      const email = 'newuser@example.com';
      const name = 'John Doe';
      const userId = 'user-456';

      mockSend.mockResolvedValue({
        data: { id: 'welcome-email-id' },
        error: null,
      });

      const result = await EmailService.sendWelcomeEmail(email, name, userId);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('ThumPiks'),
        to: [email],
        subject: expect.stringContaining('Welcome'),
        html: expect.stringContaining(name),
      });
      expect(mockEmailLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailType: 'welcome',
          recipientEmail: email,
          userId: userId,
        }),
      });
    });

    it('should handle missing name with default greeting', async () => {
      const email = 'user@example.com';

      mockSend.mockResolvedValue({
        data: { id: 'welcome-email-id' },
        error: null,
      });

      await EmailService.sendWelcomeEmail(email, '');

      const sendCall = mockSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Hello');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email and log to database', async () => {
      const email = 'verify@example.com';
      const name = 'Jane Smith';
      const token = 'verification-token-abc123';
      const userId = 'user-789';

      mockSend.mockResolvedValue({
        data: { id: 'verify-email-id' },
        error: null,
      });

      const result = await EmailService.sendVerificationEmail(email, name, token, userId);

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        from: expect.stringContaining('ThumPiks'),
        to: [email],
        subject: 'Verify Your Email Address',
        html: expect.stringContaining(token),
      });
      expect(mockEmailLogCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailType: 'verification',
          recipientEmail: email,
          userId: userId,
        }),
      });
    });

    it('should use FRONTEND_URL from environment', async () => {
      const email = 'user@example.com';
      const name = 'Test User';
      const token = 'test-token-123';

      mockSend.mockResolvedValue({
        data: { id: 'verify-email-id' },
        error: null,
      });

      await EmailService.sendVerificationEmail(email, name, token);

      const sendCall = mockSend.mock.calls[0][0];
      expect(sendCall.html).toContain(
        `${process.env.FRONTEND_URL}/verify-email/${token}`
      );
    });
  });
});
