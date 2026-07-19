// Mock dependencies BEFORE importing the service
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Mock Prisma Client to return our mock instance
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
}));

// Mock speakeasy
const mockGenerateSecret = jest.fn();
const mockTotpVerify = jest.fn();
jest.mock('speakeasy', () => ({
  generateSecret: mockGenerateSecret,
  totp: {
    verify: mockTotpVerify
  }
}));

// Mock QRCode
const mockQRCodeToDataURL = jest.fn();
jest.mock('qrcode', () => ({
  toDataURL: mockQRCodeToDataURL
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    security: jest.fn(),
    error: jest.fn()
  }
}));

// Mock security config
const mockEncryptData = jest.fn();
const mockDecryptData = jest.fn();
jest.mock('../../config/security.config', () => ({
  encryptData: mockEncryptData,
  decryptData: mockDecryptData
}));

// Import the service AFTER mocks are set up
import { MFAService } from '../../modules/auth/mfa.service';

describe('Security - Multi-Factor Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset default mocks
    mockGenerateSecret.mockReturnValue({
      base32: 'MOCK_SECRET_BASE32',
      otpauth_url: 'otpauth://totp/TestApp?secret=MOCK_SECRET_BASE32',
      ascii: 'mock_ascii',
      hex: 'mock_hex',
      google_auth_qr: 'mock_qr'
    });
    
    mockQRCodeToDataURL.mockResolvedValue('data:image/png;base64,mockqrcode');
    
    mockEncryptData.mockReturnValue({
      encrypted: 'encrypted_data',
      iv: 'initialization_vector',
    });
    
    mockDecryptData.mockReturnValue(JSON.stringify({
      enabled: true,
      secret: 'MOCK_SECRET_BASE32',
      backupCodes: ['ABCD1234', 'EFGH5678'],
    }));
    
    // Reset TOTP verify to not return any default value (let tests control it)
    mockTotpVerify.mockClear();
    
    // Setup default user mock for user.findUnique calls
    mockPrisma.user.findUnique.mockResolvedValue({
      settings: {
        mfa: {
          encrypted: 'encrypted_data',
          iv: 'initialization_vector',
        },
      },
    });
  });

  describe('MFA Setup', () => {
    test('should setup MFA for valid user', async () => {
      // Mock the initial user lookup for email/name
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          email: 'test@example.com',
          name: 'Test User',
        })
        // Mock the user lookup for storeMFASettings (current settings)
        .mockResolvedValueOnce({
          settings: {},
        });
      
      // Mock the update for storeMFASettings
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user123' });

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
      // Mock the initial user lookup for email/name
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          email: 'test@example.com',
          name: 'Test User',
        })
        // Mock the user lookup for storeMFASettings (current settings)
        .mockResolvedValueOnce({
          settings: {},
        });
      
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user123' });

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

      mockTotpVerify.mockReturnValue(true);

      const result = await MFAService.verifyMFAToken('user123', '123456');
      expect(result).toBe(true);
    });

    test('should reject invalid TOTP token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      // Override the default mock to return false for this test
      mockTotpVerify.mockReturnValueOnce(false);

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
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      // Test with a backup code format but invalid code
      const result = await MFAService.verifyMFAToken('user123', 'INVALID1');
      expect(result).toBe(false);
    });

    test('should pass through when MFA not enabled', async () => {
      mockDecryptData.mockReturnValue(JSON.stringify({
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
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockDecryptData.mockReturnValueOnce(JSON.stringify({
        enabled: false,
        secret: 'MOCK_SECRET_BASE32',
      }));

      mockTotpVerify.mockReturnValueOnce(true);
      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user123' });

      const result = await MFAService.verifyAndEnableMFA('user123', '123456');
      expect(result).toBe(true);
    });

    test('should not enable MFA with invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockDecryptData.mockReturnValueOnce(JSON.stringify({
        enabled: false,
        secret: 'MOCK_SECRET_BASE32',
      }));

      mockTotpVerify.mockReturnValueOnce(false);

      const result = await MFAService.verifyAndEnableMFA('user123', '123456');
      expect(result).toBe(false);
    });
  });

  describe('Backup Code Management', () => {
    test('should regenerate backup codes for enabled MFA user', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockDecryptData.mockReturnValueOnce(JSON.stringify({
        enabled: true,
        secret: 'MOCK_SECRET_BASE32',
        backupCodes: ['OLD1234', 'OLD5678'],
      }));

      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user123' });

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

      mockDecryptData.mockReturnValue(JSON.stringify({
        enabled: false,
      }));

      await expect(MFAService.regenerateBackupCodes('user123')).rejects.toThrow('MFA not enabled');
    });

    test('should remove used backup codes', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockPrisma.user.update.mockResolvedValueOnce({ id: 'user123' });

      const result = await MFAService.verifyMFAToken('user123', 'ABCD1234');
      expect(result).toBe(true);

      // Verify the user.update was called (backup code removal happens internally)
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user123' },
          data: expect.objectContaining({
            settings: expect.any(Object)
          })
        })
      );
    });
  });

  describe('MFA Status', () => {
    test('should return correct status for enabled MFA', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        settings: {
          mfa: {
            encrypted: 'encrypted_data',
            iv: 'initialization_vector',
          },
        },
      });

      mockDecryptData.mockReturnValueOnce(JSON.stringify({
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