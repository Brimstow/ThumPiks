import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { EmailService } from './email.service';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export class AuthService {
  async register(email: string, password: string, name?: string) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        name,
      },
    });

    // Send welcome email
    await EmailService.sendWelcomeEmail(email, name || '');

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token,
    };
  }

  async requestPasswordReset(email: string) {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // We don't reveal if the email exists or not for security reasons
      return {
        message:
          'If your email is registered, you will receive a password reset link.',
      };
    }

    // Send password reset email
    const { resetToken } = await EmailService.sendPasswordResetEmail(
      user.email,
      user.id
    );

    return {
      message:
        'If your email is registered, you will receive a password reset link.',
      // In production, we would NOT include the resetToken in the response
      // resetToken is only included here for testing purposes
    };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify the token
      const decoded: any = jwt.verify(token, JWT_SECRET);

      if (!decoded.userId || decoded.action !== 'reset-password') {
        throw new Error('Invalid token');
      }

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update user's password
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { passwordHash: hashedPassword },
      });

      return { message: 'Password successfully reset' };
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Password reset token has expired');
      }
      throw new Error('Invalid password reset token');
    }
  }
}
