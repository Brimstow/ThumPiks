import { Resend } from 'resend';
import { logger } from '../../utils/logger';

// Initialize Resend with API key (lazy initialization for tests)
let resend: Resend | null = null;
const getResend = (): Resend => {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    resend = new Resend(apiKey);
  }
  return resend;
};

// Default from address - should be updated to your verified domain
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = process.env.FROM_NAME || 'ThumPiks';

export class EmailService {
  static async sendPasswordResetEmail(
    email: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    try {
      const result = await getResend().emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [email],
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hello,</p>
            <p>You have requested to reset your password. Please click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">Thanks,<br>The ${FROM_NAME} Team</p>
          </div>
        `,
      });

      if (result.error) {
        logger.error('Failed to send password reset email', {
          error: result.error,
          email,
        });
        throw new Error(`Failed to send email: ${result.error.message}`);
      }

      logger.info('Password reset email sent successfully', {
        email,
        messageId: result.data?.id,
      });

      // Log for development/testing
      if (process.env.NODE_ENV !== 'production') {
        console.log(`
    ==================== PASSWORD RESET EMAIL ====================
    To: ${email}
    Subject: Reset Your Password
    Message ID: ${result.data?.id}
    
    Reset URL: ${resetUrl}
    ==================== END EMAIL ====================
        `);
      }
    } catch (error: any) {
      logger.error('Error sending password reset email', error, { email });
      throw error;
    }
  }

  static async sendWelcomeEmail(email: string, name: string): Promise<void> {
    // Simulate sending welcome email
    console.log(`
    ==================== WELCOME EMAIL ====================
    To: ${email}
    Subject: Welcome to Pikzels!

    Hello ${name || 'there'},

    Welcome to Pikzels! We're excited to have you on board.

    Thanks,
    The Pikzels Team
    ==================== END EMAIL ====================
    `);
  }

  static async sendVerificationEmail(
    email: string,
    name: string,
    token: string
  ): Promise<void> {
    // In a real application, we would integrate with an email service
    // For now, simulate sending verification email

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;

    console.log(`
    ==================== EMAIL VERIFICATION ====================
    To: ${email}
    Subject: Verify Your Email Address

    Hello ${name},

    Thank you for registering with ThumPiks! To complete your registration and unlock all features, please verify your email address by clicking the link below:

    ${verificationUrl}

    This link will expire in 24 hours.

    If you did not create an account, please ignore this email.

    Thanks,
    The ThumPiks Team
    ==================== END EMAIL ====================
    `);
  }
}
