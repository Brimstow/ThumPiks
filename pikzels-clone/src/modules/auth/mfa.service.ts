import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';
import { encryptData, decryptData } from '../../config/security.config';

const prisma = getPrisma();

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
   * Setup Multi-Factor Authentication for a user
   *
   * Generates TOTP secret, backup codes, and QR code for authenticator app setup.
   * The MFA is initially disabled until user verifies they can generate valid tokens.
   *
   * @param {string} userId - Unique identifier for the user
   * @returns {Promise<MFASetupResponse>} Setup data including secret, QR code, and backup codes
   * @throws {Error} Specific error messages for different failure scenarios
   *
   * @example
   * ```typescript
   * const setupData = await MFAService.setupMFA('user_123');
   * // User scans setupData.qrCodeUrl with authenticator app
   * // setupData.backupCodes should be saved securely by user
   * ```
   *
   * @since 1.0.0
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
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
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
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        secret: secret.base32,
        backupCodes,
      };

      await this.storeMFASettings(userId, mfaSettings);

      // Generate QR code
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      logger.security('info', 'MFA setup initiated', {
        userId,
        email: user.email,
      });

      return {
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
        secret: secret.base32,
        qrCodeUrl,
        backupCodes,
      };
    } catch (error) {
      const err = error as Error;

      // ENHANCED: Log the exact error for debugging but preserve specific messages
      try {
        logger.error('MFA setup failed', err, { userId, step: 'setup' });
      } catch (logError) {
        // If logger fails, don't let it break the error reporting
        console.error('Logger error:', logError);
        console.error('Original MFA error:', err.message);
      }

      // FIXED: Preserve specific error messages instead of masking them
      if (err.message === 'User not found') {
        throw new Error('User not found');
      }
      if (
        err.message.includes('already enabled') ||
        err.message.includes('MFA')
      ) {
        throw err; // Preserve MFA-specific errors
      }
      if (
        err.message.includes('encrypt') ||
        err.message.includes('store') ||
        err.message.includes('Failed to store')
      ) {
        throw new Error('Failed to store MFA settings');
      }
      if (err.message.includes('logger') || err.message.includes('security')) {
        // Logger-related errors shouldn't break MFA setup
        throw new Error('MFA setup completed but logging failed');
      }

      // For debugging: include the original error message
      throw new Error(`Failed to setup MFA: ${err.message}`);
    }
  }

  /**
   * Verify and enable MFA
   */
  static async verifyAndEnableMFA(
    userId: string,
    token: string
  ): Promise<boolean> {
    try {
      const mfaSettings = await this.getMFASettings(userId);

      if (!mfaSettings?.secret) {
        throw new Error('MFA not set up for this user');
      }

      // Verify the token
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      const verified = speakeasy.totp.verify({
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
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
      // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
      const verified = speakeasy.totp.verify({
        // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
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
  // secretlint-disable-next-line @secretlint/secretlint-rule-pattern
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
        throw new Error(
          'Cannot disable MFA for OAuth users without admin action'
        );
      }

      // For regular users, verify password (implement bcrypt check here)
      // This would require importing bcrypt and checking the password

      // Clear MFA settings
      await this.clearMFASettings(userId);

      logger.security('warn', 'MFA disabled', { userId });
      return true;
    } catch (error) {
      const err = error as Error;
      logger.error('MFA disable failed', err, { userId });

      // Preserve specific error messages
      if (
        err.message === 'User not found' ||
        err.message ===
          'Cannot disable MFA for OAuth users without admin action'
      ) {
        throw err;
      }

      throw new Error('Failed to disable MFA');
    }
  }

  /**
   * Get MFA status for a user
   */
  static async getMFAStatus(
    userId: string
  ): Promise<{ enabled: boolean; hasBackupCodes: boolean }> {
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
   * Generate new backup codes for MFA
   *
   * Replaces existing backup codes with fresh ones. Only works for users with MFA enabled.
   * Old backup codes become invalid immediately.
   *
   * @param {string} userId - User identifier
   * @returns {Promise<string[]>} Array of 10 new 8-character backup codes
   * @throws {Error} When MFA is not enabled or regeneration fails
   *
   * @example
   * ```typescript
   * const newCodes = await MFAService.regenerateBackupCodes('user_123');
   * // newCodes = ['ABC12345', 'DEF67890', ...]
   * ```
   *
   * @since 1.0.0
   */
  static async regenerateBackupCodes(userId: string): Promise<string[]> {
    try {
      const mfaSettings = await this.getMFASettings(userId);

      if (!mfaSettings?.enabled) {
        throw new Error('MFA not enabled');
      }

      const newBackupCodes = this.generateBackupCodes();
      mfaSettings.backupCodes = newBackupCodes;

      await this.storeMFASettings(userId, mfaSettings);

      logger.security('info', 'MFA backup codes regenerated', { userId });
      return newBackupCodes;
    } catch (error) {
      const err = error as Error;
      logger.error('Failed to regenerate backup codes', err, { userId });

      // FIXED: Preserve specific error messages
      if (err.message === 'MFA not enabled') {
        throw new Error('MFA not enabled');
      }
      if (err.message.includes('store') || err.message.includes('encrypt')) {
        throw new Error('Failed to store backup codes');
      }

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

  private static async storeMFASettings(
    userId: string,
    settings: MFASettings
  ): Promise<void> {
    try {
      // Encrypt sensitive MFA data
      const { encrypted, iv, authTag } = encryptData(JSON.stringify(settings));

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
            mfa: { encrypted, iv, authTag },
          },
        },
      });
    } catch (error) {
      logger.error('Failed to store MFA settings', error as Error, { userId });
      throw new Error('Failed to store MFA settings');
    }
  }

  private static async getMFASettings(
    userId: string
  ): Promise<MFASettings | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { settings: true },
      });

      const settings = user?.settings as any;
      if (!settings?.mfa) {
        return null; // MFA not set up - this is valid, not an error
      }

      // Decrypt MFA settings
      const decryptedData = decryptData(
        settings.mfa.encrypted,
        settings.mfa.iv,
        settings.mfa.authTag
      );
      return JSON.parse(decryptedData) as MFASettings;
    } catch (error) {
      // SECURITY: Don't swallow errors - throw them so callers can handle appropriately
      logger.error('Failed to get MFA settings', error as Error, { userId });
      throw error; // Let caller decide how to handle (fail-safe)
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
      logger.error('Backup code verification failed', error as Error, {
        userId,
      });
      return false;
    }
  }
}
