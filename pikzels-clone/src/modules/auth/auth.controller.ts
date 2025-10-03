import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { logger } from '../../utils/logger';

const authService = new AuthService();

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await authService.register(email, password, name);

    return res.status(201).json(result);
  } catch (error: any) {
    logger.error('Registration failed', error, {
      email: req.body.email,
      userAgent: req.get('User-Agent'),
    });
    
    if (error.message === 'User already exists') {
      return res.status(409).json({
        error: 'User already exists',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await authService.login(email, password);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Login failed', error, {
      email: req.body.email,
      userAgent: req.get('User-Agent'),
    });
    
    if (error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
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
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Reset password logic here
    
    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify email logic here
    
    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
