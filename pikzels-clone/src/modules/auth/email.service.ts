import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class EmailService {
  static async sendPasswordResetEmail(
    email: string,
    userId: string
  ): Promise<{ resetToken: string }> {
    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { userId, action: 'reset-password' },
      JWT_SECRET,
      {
        expiresIn: '1h',
      }
    );

    // In a real application, we would integrate with an email service like:
    // - Nodemailer with SMTP
    // - SendGrid
    // - AWS SES
    // - etc.

    // Simulate sending email
    console.log(`
    ==================== PASSWORD RESET EMAIL ====================
    To: ${email}
    Subject: Password Reset Request

    Hello,

    You have requested to reset your password. Please click the link below to reset your password:

    http://localhost:5173/reset-password?token=${resetToken}

    This link will expire in 1 hour.

    If you did not request a password reset, please ignore this email.

    Thanks,
    The Pikzels Team
    ==================== END EMAIL ====================
    `);

    // Return the token so the frontend can use it for testing
    return { resetToken };
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
