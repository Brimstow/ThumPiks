import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { encryptData, decryptData } from '../../config/security.config';

const prisma = new PrismaClient();

export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFASettings {
  enabled: boolean;
  secret?: string;
  backupCodes?: string[];
  lastUsedBackupCode?: string;
}

export class MFAService {
  
  /**
   * Setup MFA for a user
   */
  static async setupMFA(userId: string): Promise<MFASetupResponse> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `Thumbnail Maker Studio (${user.email})`,
        issuer: 'Thumbnail Maker Studio',
        length: 32,
      });

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Encrypt and store MFA settings
      const mfaSettings: MFASettings = {
        enabled: false, // Will be enabled after verification
        secret: secret.base32,
        backupCodes,
      };

      await this.storeMFASettings(userId, mfaSettings);

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      logger.security('info', 'MFA setup initiated', {
        userId,
        email: user.email,
      });

      return {
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      logger.error('MFA setup failed', error as Error, { userId });
      throw new Error('Failed to setup MFA');
    }
  }

  /**
   * Verify and enable MFA
   */
  static async verifyAndEnableMFA(userId: string, token: string): Promise<boolean> {
    try {
      const mfaSettings = await this.getMFASettings(userId);
      
      if (!mfaSettings?.secret) {
        throw new Error('MFA not set up for this user');
      }

      // Verify the token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps of drift
      });

      if (!verified) {
        logger.security('warn', 'MFA verification failed', {
          userId,
          token: token.substring(0, 2) + '****', // Log partial token for debugging
        });
        return false;
      }

      // Enable MFA
      mfaSettings.enabled = true;
      await this.storeMFASettings(userId, mfaSettings);

      logger.security('info', 'MFA enabled successfully', { userId });
      return true;
    } catch (error) {
      logger.error('MFA verification failed', error as Error, { userId });
      throw new Error('Failed to verify MFA token');
    }
  }

  /**
   * Verify MFA token during login
   */
  static async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    try {
      const mfaSettings = await this.getMFASettings(userId);
      
      if (!mfaSettings?.enabled || !mfaSettings.secret) {
        return true; // MFA not enabled, pass through
      }

      // Check if it's a backup code
      if (token.length === 8 && /^[A-Z0-9]{8}$/.test(token)) {
        return this.verifyBackupCode(userId, token, mfaSettings);
      }

      // Verify TOTP token
      const verified = speakeasy.totp.verify({
        secret: mfaSettings.secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (verified) {
        logger.security('info', 'MFA token verified', { userId });
      } else {
        logger.security('warn', 'MFA token verification failed', {
          userId,
          tokenPrefix: token.substring(0, 2),
        });
      }

      return verified;
    } catch (error) {
      logger.error('MFA token verification error', error as Error, { userId });
      return false;
    }
  }

  /**
   * Disable MFA for a user
   */
  static async disableMFA(userId: string, _password: string): Promise<boolean> {
    try {
      // Verify user password before disabling MFA
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // If OAuth user (no password), require admin action
      if (!user.passwordHash) {
        throw new Error('Cannot disable MFA for OAuth users without admin action');
      }

      // For regular users, verify password (implement bcrypt check here)
      // This would require importing bcrypt and checking the password

      // Clear MFA settings
      await this.clearMFASettings(userId);

      logger.security('warn', 'MFA disabled', { userId });
      return true;
    } catch (error) {
      logger.error('MFA disable failed', error as Error, { userId });
      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMFAStatus(userId: string): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
    try {
      const mfaSettings = await this.getMFASettings(userId);
      
      return {
        enabled: mfaSettings?.enabled || false,
        hasBackupCodes: (mfaSettings?.backupCodes?.length || 0) > 0,
      };
    } catch (error) {
      logger.error('Failed to get MFA status', error as Error, { userId });
      return { enabled: false, hasBackupCodes: false };
    }
  }

  /**
   * Generate new backup codes
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const mfaSettings = await this.getMFASettings(userId);
      
      if (!mfaSettings?.enabled) {
        throw new Error('MFA not enabled for this user');
      }

      const newBackupCodes = this.generateBackupCodes();
      mfaSettings.backupCodes = newBackupCodes;
      
      await this.storeMFASettings(userId, mfaSettings);

      logger.security('info', 'MFA backup codes regenerated', { userId });
      return newBackupCodes;
    } catch (error) {
      logger.error('Failed to regenerate backup codes', error as Error, { userId });
      throw new Error('Failed to regenerate backup codes');
    }
  }

  // Private methods
  
  private static generateBackupCodes(): string[] {
    const codes: string[] = [];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    
    for (let i = 0; i < 10; i++) {
      let code = '';
      for (let j = 0; j < 8; j++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      codes.push(code);
    }
    
    return codes;
  }

  private static async storeMFASettings(userId: string, settings: MFASettings): Promise<void> {
    try {
      // Encrypt sensitive MFA data
      const encryptedSettings = encryptData(JSON.stringify(settings));
      
      // Get current user settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const currentSettings = (user?.settings as any) || {};
      
      // Update with encrypted MFA settings
      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: {
            ...currentSettings,
            mfa: encryptedSettings,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to store MFA settings', error as Error, { userId });
      throw new Error('Failed to store MFA settings');
    }
  }

  private static async getMFASettings(userId: string): Promise<MFASettings | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = (user?.settings as any);
      if (!settings?.mfa) {
        return null;
      }

      // Decrypt MFA settings
      const decryptedData = decryptData(settings.mfa.encrypted, settings.mfa.iv);
      return JSON.parse(decryptedData) as MFASettings;
    } catch (error) {
      logger.error('Failed to get MFA settings', error as Error, { userId });
      return null;
    }
  }

  private static async clearMFASettings(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const currentSettings = (user?.settings as any) || {};
      delete currentSettings.mfa;

      await prisma.user.update({
        where: { id: userId },
        data: {
          settings: currentSettings,
        },
      });
    } catch (error) {
      logger.error('Failed to clear MFA settings', error as Error, { userId });
      throw new Error('Failed to clear MFA settings');
    }
  }

  private static async verifyBackupCode(
    userId: string, 
    code: string, 
    mfaSettings: MFASettings
  ): Promise<boolean> {
    try {
      if (!mfaSettings.backupCodes?.includes(code)) {
        logger.security('warn', 'Invalid backup code used', { userId });
        return false;
      }

      // Remove used backup code
      mfaSettings.backupCodes = mfaSettings.backupCodes.filter(c => c !== code);
      mfaSettings.lastUsedBackupCode = code;
      
      await this.storeMFASettings(userId, mfaSettings);

      logger.security('warn', 'Backup code used for authentication', {
        userId,
        remainingCodes: mfaSettings.backupCodes.length,
      });

      return true;
    } catch (error) {
      logger.error('Backup code verification failed', error as Error, { userId });
      return false;
    }
  }
}