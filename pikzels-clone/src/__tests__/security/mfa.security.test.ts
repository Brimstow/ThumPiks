// Mock dependencies BEFORE importing the service
jest.mock('@prisma/client');
jest.mock('speakeasy');
jest.mock('qrcode');
jest.mock('../../utils/logger');
jest.mock('../../config/security.config');

// Now setup the mocks
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

const mockSpeakeasy = {
  generateSecret: jest.fn(),
  totp: {
    verify: jest.fn(),
  },
};

const mockQRCode = {
  toDataURL: jest.fn(),
};

const mockSecurityConfig = {
  encryptData: jest.fn(),
  decryptData: jest.fn(),
};

// Apply the mocks
(require('@prisma/client') as any).PrismaClient = jest.fn(() => mockPrisma);
(require('speakeasy') as any).default = mockSpeakeasy;
(require('qrcode') as any).default = mockQRCode;
(require('../../config/security.config') as any).encryptData = mockSecurityConfig.encryptData;
(require('../../config/security.config') as any).decryptData = mockSecurityConfig.decryptData;

// NOW import the service
import { MFAService } from '../../modules/auth/mfa.service';
import { PrismaClient } from '@prisma/client';

describe('Security - Multi-Factor Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mocks
    mockSpeakeasy.generateSecret.mockReturnValue({
      base32: 'MOCK_SECRET_BASE32',
      otpauth_url: 'otpauth://totp/TestApp?secret=MOCK_SECRET_BASE32',
    });
    
    mockQRCode.toDataURL.mockResolvedValue('data:image/png;base64,mockqrcode');
    
    mockSecurityConfig.encryptData.mockReturnValue({
      encrypted: 'encrypted_data',
      iv: 'initialization_vector',
    });
    
    mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
      enabled: true,
      secret: 'MOCK_SECRET_BASE32',
      backupCodes: ['ABCD1234', 'EFGH5678'],
    }));
  });

  describe('MFA Setup', () => {
    test('should setup MFA for valid user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      });
      
      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const result = await MFAService.setupMFA('user123');

      expect(result.secret).toBe('MOCK_SECRET_BASE32');
      expect(result.qrCodeUrl).toBe('data:image/png;base64,mockqrcode');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{8}$/);
    });

    test('should fail setup for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(MFAService.setupMFA('nonexistent')).rejects.toThrow('User not found');
    });

    test('should generate unique backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
      });
      
      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const result = await MFAService.setupMFA('user123');
      const codes = result.backupCodes;
      
      // Check all codes are unique
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
      
      // Check format
      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });
  });

  describe('MFA Verification', () => {
    test('should verify valid TOTP token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSpeakeasy.totp.verify.mockReturnValue(true);

      const result = await MFAService.verifyMFAToken('user123', '123456');
      expect(result).toBe(true);
    });

    test('should reject invalid TOTP token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSpeakeasy.totp.verify.mockReturnValue(false);

      const result = await MFAService.verifyMFAToken('user123', '123456');
      expect(result).toBe(false);
    });

    test('should accept valid backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });
      
      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const result = await MFAService.verifyMFAToken('user123', 'ABCD1234');
      expect(result).toBe(true);
    });

    test('should reject invalid backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      const result = await MFAService.verifyMFAToken('user123', 'INVALID1');
      expect(result).toBe(false);
    });

    test('should pass through when MFA not enabled', async () => {
      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: false,
      }));

      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      const result = await MFAService.verifyMFAToken('user123', '123456');
      expect(result).toBe(true);
    });
  });

  describe('MFA Enable/Disable', () => {
    test('should enable MFA after successful verification', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: false,
        secret: 'MOCK_SECRET_BASE32',
      }));

      mockSpeakeasy.totp.verify.mockReturnValue(true);
      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const result = await MFAService.verifyAndEnableMFA('user123', '123456');
      expect(result).toBe(true);
    });

    test('should not enable MFA with invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: false,
        secret: 'MOCK_SECRET_BASE32',
      }));

      mockSpeakeasy.totp.verify.mockReturnValue(false);

      const result = await MFAService.verifyAndEnableMFA('user123', '123456');
      expect(result).toBe(false);
    });
  });

  describe('Backup Code Management', () => {
    test('should regenerate backup codes for enabled MFA user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: true,
        secret: 'MOCK_SECRET_BASE32',
        backupCodes: ['OLD1234', 'OLD5678'],
      }));

      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const newCodes = await MFAService.regenerateBackupCodes('user123');
      
      expect(newCodes).toHaveLength(10);
      expect(newCodes).not.toContain('OLD1234');
      expect(newCodes).not.toContain('OLD5678');
    });

    test('should fail to regenerate codes for non-MFA user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: false,
      }));

      await expect(MFAService.regenerateBackupCodes('user123')).rejects.toThrow('MFA not enabled');
    });

    test('should remove used backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockPrisma.user.update.mockResolvedValue({ id: 'user123' });

      const result = await MFAService.verifyMFAToken('user123', 'ABCD1234');
      expect(result).toBe(true);

      // Verify the used code is removed from the stored settings
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: {
          settings: expect.objectContaining({
            mfa: expect.objectContaining({
              encrypted: 'encrypted_data',
              iv: 'initialization_vector',
            }),
          }),
        },
      });
    });
  });

  describe('MFA Status', () => {
    test('should return correct status for enabled MFA', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockSecurityConfig.decryptData.mockReturnValue(JSON.stringify({
        enabled: true,
        backupCodes: ['CODE123', 'CODE456'],
      }));

      const status = await MFAService.getMFAStatus('user123');
      
      expect(status.enabled).toBe(true);
      expect(status.hasBackupCodes).toBe(true);
    });

    test('should return correct status for disabled MFA', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        settings: {},
      });

      const status = await MFAService.getMFAStatus('user123');
      
      expect(status.enabled).toBe(false);
      expect(status.hasBackupCodes).toBe(false);
    });
  });
});