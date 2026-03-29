import { EmailService } from '../email.service';

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

    it('should throw error when Resend returns an error', async () => {
      const email = 'user@example.com';
      const resetToken = 'mock-token';

      mockSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      });

      await expect(
        EmailService.sendPasswordResetEmail(email, resetToken)
      ).rejects.toThrow('Failed to send email');
    });

    it('should throw error when RESEND_API_KEY is not configured', async () => {
      const originalKey = process.env.RESEND_API_KEY;
      delete process.env.RESEND_API_KEY;

      // Need to re-import to trigger the lazy initialization check
      jest.resetModules();
      const { EmailService: EmailServiceNoKey } = await import(
        '../email.service'
      );

      await expect(
        EmailServiceNoKey.sendPasswordResetEmail('test@example.com', 'token')
      ).rejects.toThrow('RESEND_API_KEY is not configured');

      process.env.RESEND_API_KEY = originalKey;
    });

    it('should log email content in development mode', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const email = 'user@example.com';
      const resetToken = 'test-token';

      mockSend.mockResolvedValue({
        data: { id: 'email-id' },
        error: null,
      });

      await EmailService.sendPasswordResetEmail(email, resetToken);

      // Find the console.log call that contains the email content
      const emailLogCall = consoleLogSpy.mock.calls.find(
        call =>
          typeof call[0] === 'string' &&
          call[0].includes('PASSWORD RESET EMAIL')
      );
      expect(emailLogCall).toBeDefined();
      expect(emailLogCall[0]).toContain(email);

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should log welcome email content', async () => {
      const email = 'newuser@example.com';
      const name = 'John Doe';

      await EmailService.sendWelcomeEmail(email, name);

      expect(consoleLogSpy).toHaveBeenCalled();
      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('WELCOME EMAIL');
      expect(emailContent).toContain(`To: ${email}`);
      expect(emailContent).toContain('Welcome to Pikzels!');
      expect(emailContent).toContain(`Hello ${name}`);
    });

    it('should handle missing name with default greeting', async () => {
      const email = 'user@example.com';

      await EmailService.sendWelcomeEmail(email, '');

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain('Hello there');
    });
  });

  describe('sendVerificationEmail', () => {
    it('should log verification email content', async () => {
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
    });

    it('should use FRONTEND_URL from environment', async () => {
      const email = 'user@example.com';
      const name = 'Test User';
      const token = 'test-token-123';

      await EmailService.sendVerificationEmail(email, name, token);

      const emailContent = consoleLogSpy.mock.calls[0][0];

      expect(emailContent).toContain(
        `${process.env.FRONTEND_URL}/verify-email/${token}`
      );
    });
  });
});
