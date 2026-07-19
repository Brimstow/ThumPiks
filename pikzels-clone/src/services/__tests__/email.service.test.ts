// ── Mocks (hoisted) ─────────────────────────────────────────────────

jest.mock('nodemailer', () => ({
  __esModule: true,
  default: {
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
      verify: jest.fn().mockResolvedValue(true),
      close: jest.fn(),
    })),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

// ── Imports ──────────────────────────────────────────────────────────

import { EmailService } from '../email.service';

// ── Tests ────────────────────────────────────────────────────────────

describe('EmailService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    // Reset singleton
    (EmailService as any).instance = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getInstance', () => {
    it('returns singleton instance', () => {
      process.env.NODE_ENV = 'test';
      const a = EmailService.getInstance();
      const b = EmailService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('send (test/mock mode)', () => {
    it('returns success in test environment without sending', async () => {
      process.env.NODE_ENV = 'test';
      const service = EmailService.getInstance();

      const result = await service.send({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toMatch(/^mock-/);
    });

    it('handles array of recipients', async () => {
      process.env.NODE_ENV = 'test';
      const service = EmailService.getInstance();

      const result = await service.send({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Test',
        html: '<p>Hello</p>',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('getStatus', () => {
    it('reports initialization status', () => {
      process.env.NODE_ENV = 'test';
      const service = EmailService.getInstance();
      const status = service.getStatus();

      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('error');
      expect(status).toHaveProperty('host');
    });
  });

  describe('healthCheck', () => {
    it('returns false when transport is not initialized', async () => {
      process.env.NODE_ENV = 'test';
      const service = EmailService.getInstance();

      const result = await service.healthCheck();

      // In test mode, transport is null
      expect(result).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('completes without error even when no transport', async () => {
      process.env.NODE_ENV = 'test';
      const service = EmailService.getInstance();

      await expect(service.disconnect()).resolves.toBeUndefined();
    });
  });
});
