import { Request, Response } from 'express';
import { AuthService } from './auth.service';

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const result = await authService.register(email, password, name);

      res.status(201).json(result);
    } catch (error: any) {
      if (error.message === 'User already exists') {
        return res.status(409).json({
          error: 'User already exists',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required',
        });
      }

      const result = await authService.login(email, password);

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          error: 'Invalid credentials',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email is required',
        });
      }

      const result = await authService.requestPasswordReset(email);

      // In a real application, we would send an email here with the reset link
      // For now, we're just returning a success message
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          error: 'Token and new password are required',
        });
      }

      // Validate password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          error: 'Password must be at least 6 characters long',
        });
      }

      const result = await authService.resetPassword(token, newPassword);

      res.status(200).json(result);
    } catch (error: any) {
      if (
        error.message === 'Invalid token' ||
        error.message === 'Invalid password reset token'
      ) {
        return res.status(400).json({
          error: 'Invalid or expired password reset token',
        });
      }

      if (error.message === 'Password reset token has expired') {
        return res.status(400).json({
          error: 'Password reset token has expired',
        });
      }

      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
}
