import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { logger } from '../../utils/logger';
import {
  ValidationError,
  ConflictError,
  UnauthorizedError,
} from '../../utils/errors';

const authService = new AuthService();

/**
 * Register a new user
 * POST /api/auth/register
 * Body: { username, email, name, password }
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { username, email, name, password } = req.body;

    // Validate required fields
    if (!username || !email || !name || !password) {
      return res.status(400).json({
        error: 'Username, email, name, and password are required',
      });
    }

    const result = await authService.register(username, email, name, password);

    // Determine cookie settings for cross-origin (Netlify -> Railway)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Required for sameSite: 'none'
      sameSite: isProduction ? 'none' as const : 'strict' as const, // 'none' required for cross-origin cookies
    };

    // Set HttpOnly cookie for access token
    res.cookie('token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set HttpOnly cookie for refresh token
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // Return user info without tokens in response body
    // Tokens are stored securely in HttpOnly cookies (set above)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, refreshToken, ...userResponse } = result;
    return res.status(201).json(userResponse);
  } catch (error: any) {
    logger.error('Registration failed', error, {
      username: req.body.username,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
    });

    // Handle typed errors with appropriate status codes
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: error.message,
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: error.message,
      });
    }

    // Generic error for unexpected failures
    return res.status(500).json({
      error: 'Registration failed. Please try again.',
    });
  }
};

/**
 * Login with username or email
 * POST /api/auth/login
 * Body: { identifier, password } where identifier can be username or email
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;

    // Support both 'identifier' and 'email' fields for backward compatibility
    const loginIdentifier = identifier || email;

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        error: 'Username/email and password are required',
      });
    }

    const result = await authService.login(loginIdentifier, password);

    // Determine cookie settings for cross-origin (Netlify -> Railway)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction, // Required for sameSite: 'none'
      sameSite: isProduction ? 'none' as const : 'strict' as const, // 'none' required for cross-origin cookies
    };

    // Set HttpOnly cookie for access token
    res.cookie('token', result.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    // Set HttpOnly cookie for refresh token
    if (result.refreshToken) {
      res.cookie('refreshToken', result.refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // Return user info without tokens in response body
    // Tokens are stored securely in HttpOnly cookies (set above)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { accessToken, refreshToken, ...userResponse } = result;
    return res.status(200).json(userResponse);
  } catch (error: any) {
    logger.error('Login failed', error, {
      identifier: req.body.identifier || req.body.email,
      userAgent: req.get('User-Agent'),
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorName: error?.name,
    });

    // Log to console for Railway logs
    console.error('🔴 LOGIN ERROR DETAILS:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      identifier: req.body.identifier || req.body.email,
    });

    // Handle typed errors with appropriate status codes
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({
        error: error.message,
      });
    }

    // Generic error for unexpected failures - include error message in development
    return res.status(500).json({
      error: 'Login failed. Please try again.',
      debug: process.env.NODE_ENV !== 'production' ? error?.message : undefined,
    });
  }
};

/**
 * Logout user by clearing authentication cookies
 * POST /api/auth/logout
 */
export const logout = async (_req: Request, res: Response) => {
  try {
    // Determine cookie settings for cross-origin (Netlify -> Railway)
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' as const : 'strict' as const,
    };

    // Clear authentication cookies
    res.clearCookie('token', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error: any) {
    logger.error('Logout failed', error);
    return res.status(500).json({
      success: false,
      error: 'Logout failed. Please try again.'
    });
  }
};

/**
 * Verify email with token
 * GET /api/auth/verify-email/:token
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.params.token as string;

    if (!token) {
      return res.status(400).json({
        error: 'Verification token is required',
      });
    }

    const result = await authService.verifyEmail(token);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Email verification failed', error, {
      token: req.params.token,
    });

    if (
      error.message.includes('Invalid') ||
      error.message.includes('expired')
    ) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Email verification failed',
    });
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 * Body: { email }
 */
export const resendVerification = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    const result = await authService.resendVerification(email);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Resend verification failed', error, {
      email: req.body.email,
    });

    if (error.message === 'Email is already verified') {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: 'Failed to resend verification email',
    });
  }
};

/**
 * Request password reset
 * POST /api/auth/request-password-reset
 * Body: { email }
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Email is required',
      });
    }

    const result = await authService.requestPasswordReset(email);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Password reset request failed', error, {
      email: req.body.email,
    });

    return res.status(500).json({
      error: 'Password reset request failed',
    });
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 * Body: { token, newPassword }
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    const result = await authService.resetPassword(token, newPassword);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Password reset failed', error);

    if (error.message.includes('Password')) {
      return res.status(400).json({
        error: error.message,
      });
    }

    if (
      error.message.includes('Invalid') ||
      error.message.includes('expired')
    ) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
      });
    }

    return res.status(500).json({
      error: 'Password reset failed',
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 * Body: { refreshToken }
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    // Try to get refresh token from cookie first, then fallback to request body
    let refreshToken = (req as any).cookies?.refreshToken;
    
    // Fallback to request body for backwards compatibility
    if (!refreshToken) {
      refreshToken = req.body.refreshToken;
    }

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
      });
    }

    const result = await authService.refreshToken(refreshToken);

    // Set new tokens in HttpOnly cookies
    res.cookie('token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Token refresh failed', error);

    return res.status(401).json({
      error: 'Invalid refresh token',
    });
  }
};

/**
 * Generate username suggestions
 * POST /api/auth/suggest-usernames
 * Body: { fullName, email }
 */
export const suggestUsernames = async (req: Request, res: Response) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        error: 'Full name and email are required',
      });
    }

    const result = await authService.generateUsernameSuggestions(
      fullName,
      email
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Username suggestion generation failed', error);

    return res.status(500).json({
      error: 'Failed to generate username suggestions',
    });
  }
};

/**
 * Check username availability
 * GET /api/auth/check-username/:username
 */
export const checkUsername = async (req: Request, res: Response) => {
  try {
    const username = req.params.username as string;

    if (!username) {
      return res.status(400).json({
        error: 'Username is required',
      });
    }

    const result = await authService.checkUsernameAvailability(username);

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Username availability check failed', error);

    return res.status(500).json({
      error: 'Failed to check username availability',
    });
  }
};

/**
 * Update display preference
 * PUT /api/auth/display-preference
 * Body: { preference } where preference is 'name' or 'username'
 * Requires authentication
 */
export const updateDisplayPreference = async (req: Request, res: Response) => {
  try {
    const { preference } = req.body;
    const userId = (req as any).user?.id; // Assumes auth middleware sets req.user

    if (!userId) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!preference || !['name', 'username'].includes(preference)) {
      return res.status(400).json({
        error: 'Preference must be either "name" or "username"',
      });
    }

    const result = await authService.updateDisplayPreference(
      userId,
      preference
    );

    return res.status(200).json(result);
  } catch (error: any) {
    logger.error('Display preference update failed', error);

    return res.status(500).json({
      error: 'Failed to update display preference',
    });
  }
};
