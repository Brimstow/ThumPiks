import { MFAService } from '../mfa.service';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { logger } from '../../../utils/logger';
import { encryptData, decryptData } from '../../../config/security.config';

// Mock dependencies
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('../../../utils/logger');
jest.mock('../../../config/security.config');

describe('MFAService', () => {
  let mockPrisma: any;

  beforeAll(() => {
    mockPrisma = new PrismaClient();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setupMFA', () => {
    it('should setup MFA successfully for a user', async () => {
      const userId = 'user123';
      const mockUser = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockSecret = {
        base32: 'JBSWY3DPEHPK3PXP',
        otpauth_url: 'otpauth://totp/Test?secret=JBSWY3DPEHPK3PXP',
      };

      const mockQrUrl = 'data:image/png;base64,mockQRCode';

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue(mockSecret);
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrUrl);
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'encrypted', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.setupMFA(userId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUrl', mockQrUrl);
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{8}$/);

      expect(speakeasy.generateSecret).toHaveBeenCalledWith({
        name: `Thumbnail Maker Studio (${mockUser.email})`,
        issuer: 'Thumbnail Maker Studio',
        length: 32,
      });

      expect(logger.security).toHaveBeenCalledWith('info', 'MFA setup initiated', {
        userId,
        email: mockUser.email,
      });
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(MFAService.setupMFA('nonexistent')).rejects.toThrow('User not found');
    });

    it('should handle encryption failure gracefully', async () => {
      const mockUser = { email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (encryptData as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      await expect(MFAService.setupMFA('user123')).rejects.toThrow('Failed to store MFA settings');
    });

    it('should generate unique backup codes', async () => {
      const mockUser = { email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('qr');
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result1 = await MFAService.setupMFA('user123');
      const result2 = await MFAService.setupMFA('user123');

      // Backup codes should be different each time
      expect(result1.backupCodes).not.toEqual(result2.backupCodes);
    });
  });

  describe('verifyAndEnableMFA', () => {
    it('should verify token and enable MFA', async () => {
      const userId = 'user123';
      const token = '123456';
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      const decryptedSettings = {
        enabled: false,
        secret: 'JBSWY3DPEHPK3PXP',
        backupCodes: ['CODE1234'],
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify(decryptedSettings));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.verifyAndEnableMFA(userId, token);

      expect(result).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        encoding: 'base32',
        token,
        window: 2,
      });
      expect(logger.security).toHaveBeenCalledWith('info', 'MFA enabled successfully', { userId });
    });

    it('should return false for invalid token', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: false,
        secret: 'SECRET',
      }));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await MFAService.verifyAndEnableMFA('user123', '000000');

      expect(result).toBe(false);
      expect(logger.security).toHaveBeenCalledWith('warn', 'MFA verification failed', expect.any(Object));
    });

    it('should throw error when MFA not set up', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({ enabled: false }));

      await expect(MFAService.verifyAndEnableMFA('user123', '123456')).rejects.toThrow('Failed to verify MFA token');
    });
  });

  describe('verifyMFAToken', () => {
    it('should verify valid TOTP token', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'JBSWY3DPEHPK3PXP',
      }));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      const result = await MFAService.verifyMFAToken('user123', '123456');

      expect(result).toBe(true);
      expect(logger.security).toHaveBeenCalledWith('info', 'MFA token verified', { userId: 'user123' });
    });

    it('should return true when MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({ enabled: false }));

      const result = await MFAService.verifyMFAToken('user123', '123456');

      expect(result).toBe(true);
    });

    it('should verify valid backup code', async () => {
      const backupCode = 'ABCD1234';
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
        backupCodes: [backupCode, 'CODE5678'],
      }));
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.verifyMFAToken('user123', backupCode);

      expect(result).toBe(true);
      expect(logger.security).toHaveBeenCalledWith(
        'warn',
        'Backup code used for authentication',
        expect.objectContaining({
          userId: 'user123',
          remainingCodes: 1,
        })
      );
    });

    it('should reject invalid backup code', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
        backupCodes: ['VALID123'],
      }));

      const result = await MFAService.verifyMFAToken('user123', 'INVALID1');

      expect(result).toBe(false);
      expect(logger.security).toHaveBeenCalledWith('warn', 'Invalid backup code used', { userId: 'user123' });
    });

    it('should return false for invalid TOTP token', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
      }));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

      const result = await MFAService.verifyMFAToken('user123', '000000');

      expect(result).toBe(false);
      expect(logger.security).toHaveBeenCalledWith(
        'warn',
        'MFA token verification failed',
        expect.objectContaining({
          userId: 'user123',
        })
      );
    });

    it('should handle verification errors gracefully', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await MFAService.verifyMFAToken('user123', '123456');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith(
        'MFA token verification error',
        expect.any(Error),
        { userId: 'user123' }
      );
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA for user with password', async () => {
      const mockUser = {
        passwordHash: 'hashed_password',
      };

      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // First call for disable check
        .mockResolvedValueOnce({ settings: { mfa: 'data' } }); // Second call for clear
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.disableMFA('user123', 'password');

      expect(result).toBe(true);
      expect(logger.security).toHaveBeenCalledWith('warn', 'MFA disabled', { userId: 'user123' });
    });

    it('should throw error for OAuth users', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: null });

      await expect(MFAService.disableMFA('user123', 'password')).rejects.toThrow(
        'Cannot disable MFA for OAuth users without admin action'
      );
    });

    it('should throw error when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(MFAService.disableMFA('user123', 'password')).rejects.toThrow('User not found');
    });
  });

  describe('getMFAStatus', () => {
    it('should return enabled status with backup codes', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        backupCodes: ['CODE1', 'CODE2'],
      }));

      const status = await MFAService.getMFAStatus('user123');

      expect(status).toEqual({
        enabled: true,
        hasBackupCodes: true,
      });
    });

    it('should return disabled status when MFA not set up', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      (decryptData as jest.Mock).mockReturnValue(null);

      const status = await MFAService.getMFAStatus('user123');

      expect(status).toEqual({
        enabled: false,
        hasBackupCodes: false,
      });
    });

    it('should handle errors and return disabled status', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const status = await MFAService.getMFAStatus('user123');

      expect(status).toEqual({
        enabled: false,
        hasBackupCodes: false,
      });
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes for enabled MFA', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
        backupCodes: ['OLD1', 'OLD2'],
      }));
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const newCodes = await MFAService.regenerateBackupCodes('user123');

      expect(newCodes).toHaveLength(10);
      expect(newCodes[0]).toMatch(/^[A-Z0-9]{8}$/);
      expect(newCodes).not.toContain('OLD1');
      expect(logger.security).toHaveBeenCalledWith('info', 'MFA backup codes regenerated', { userId: 'user123' });
    });

    it('should throw error when MFA not enabled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ settings: {} });
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({ enabled: false }));

      await expect(MFAService.regenerateBackupCodes('user123')).rejects.toThrow('MFA not enabled');
    });

    it('should handle storage failure', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
      }));
      (encryptData as jest.Mock).mockImplementation(() => {
        throw new Error('Encryption failed during store');
      });

      await expect(MFAService.regenerateBackupCodes('user123')).rejects.toThrow('Failed to store backup codes');
    });
  });

  describe('Backup Code Generation', () => {
    it('should generate 10 backup codes', async () => {
      const mockUser = { email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('qr');
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.setupMFA('user123');

      expect(result.backupCodes).toHaveLength(10);
    });

    it('should generate codes with correct format', async () => {
      const mockUser = { email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue('qr');
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      const result = await MFAService.setupMFA('user123');

      result.backupCodes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
        expect(code).toHaveLength(8);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle QR code generation failure', async () => {
      const mockUser = { email: 'test@example.com', name: 'Test' };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (speakeasy.generateSecret as jest.Mock).mockReturnValue({
        base32: 'SECRET',
        otpauth_url: 'otpauth://url',
      });
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR generation failed'));

      await expect(MFAService.setupMFA('user123')).rejects.toThrow();
    });

    it('should use backup code only once', async () => {
      const backupCode = 'ONCE1234';
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      let callCount = 0;
      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return JSON.stringify({
            enabled: true,
            secret: 'SECRET',
            backupCodes: [backupCode],
          });
        }
        // Second call - backup code already removed
        return JSON.stringify({
          enabled: true,
          secret: 'SECRET',
          backupCodes: [],
        });
      });
      (encryptData as jest.Mock).mockReturnValue({ encrypted: 'enc', iv: 'iv' });
      mockPrisma.user.update.mockResolvedValue({});

      // First use should succeed
      const result1 = await MFAService.verifyMFAToken('user123', backupCode);
      expect(result1).toBe(true);

      // Second use should fail (code already used)
      const result2 = await MFAService.verifyMFAToken('user123', backupCode);
      expect(result2).toBe(false);
    });

    it('should handle TOTP window parameter correctly', async () => {
      const mockSettings = {
        settings: {
          mfa: { encrypted: 'encrypted', iv: 'iv' },
        },
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockSettings);
      (decryptData as jest.Mock).mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'SECRET',
      }));
      (speakeasy.totp.verify as jest.Mock).mockReturnValue(true);

      await MFAService.verifyMFAToken('user123', '123456');

      expect(speakeasy.totp.verify).toHaveBeenCalledWith(
        expect.objectContaining({
          window: 2, // Allows 2 time steps of drift
        })
      );
    });
  });
});
