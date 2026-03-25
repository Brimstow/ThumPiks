import { Router } from 'express';
import passport from 'passport';
import {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  requestPasswordReset,
  resetPassword,
  refreshToken,
  suggestUsernames,
  checkUsername,
  updateDisplayPreference,
} from './auth.controller';
import {
  validateRequest,
  commonValidations,
} from '../../middleware/validation.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { OAuthService } from './oauth.service';
import { isProductionLike } from '../../utils/env';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user with username, email, name, and password
 */
router.post(
  '/register',
  validateRequest({
    body: [
      {
        field: 'username',
        required: true,
        type: 'string',
        minLength: 3,
        maxLength: 30,
      },
      commonValidations.email,
      {
        field: 'name',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        sanitize: true,
        custom: (value: string) => {
          // Reject if contains HTML tags after sanitization check
          const htmlPattern = /<[^>]*>/g;
          if (htmlPattern.test(value)) {
            return 'Name cannot contain HTML tags or scripts';
          }
          return true;
        },
      },
      commonValidations.password,
    ],
  }),
  register
);

/**
 * POST /api/auth/login
 * Login with username or email
 */
router.post(
  '/login',
  validateRequest({
    body: [
      { field: 'identifier', required: false, type: 'string' }, // Username or email
      { field: 'email', required: false, type: 'string' }, // Backward compatibility
      commonValidations.password,
    ],
  }),
  login
);

/**
 * POST /api/auth/logout
 * Logout user by clearing cookies
 */
router.post('/logout', logout);

/**
 * GET /api/auth/verify-email/:token
 * Verify email with token
 */
router.get('/verify-email/:token', verifyEmail);

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post(
  '/resend-verification',
  validateRequest({
    body: [commonValidations.email],
  }),
  resendVerification
);

/**
 * POST /api/auth/request-password-reset
 * Request password reset email
 */
router.post(
  '/request-password-reset',
  validateRequest({
    body: [commonValidations.email],
  }),
  requestPasswordReset
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  validateRequest({
    body: [
      { field: 'token', required: true, type: 'string', minLength: 1 },
      { field: 'newPassword', required: true, type: 'string', minLength: 8 },
    ],
  }),
  resetPassword
);

/**
 * POST /api/auth/refresh-token
 * Refresh access token
 */
router.post(
  '/refresh-token',
  validateRequest({
    body: [
      { field: 'refreshToken', required: false, type: 'string', minLength: 1 },
    ],
  }),
  refreshToken
);

/**
 * POST /api/auth/suggest-usernames
 * Generate username suggestions based on name and email
 */
router.post(
  '/suggest-usernames',
  validateRequest({
    body: [
      {
        field: 'fullName',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        sanitize: true,
        custom: (value: string) => {
          const htmlPattern = /<[^>]*>/g;
          if (htmlPattern.test(value)) {
            return 'Name cannot contain HTML tags or scripts';
          }
          return true;
        },
      },
      commonValidations.email,
    ],
  }),
  suggestUsernames
);

/**
 * GET /api/auth/check-username/:username
 * Check if username is available
 */
router.get('/check-username/:username', checkUsername);

/**
 * PUT /api/auth/display-preference
 * Update user's display preference (requires authentication)
 */
router.put(
  '/display-preference',
  authenticate,
  validateRequest({
    body: [
      {
        field: 'preference',
        required: true,
        type: 'string',
        whitelist: ['name', 'username'],
      },
    ],
  }),
  updateDisplayPreference
);

// =============================================================================
// OAUTH ROUTES
// =============================================================================

/**
 * GET /api/auth/google
 * Initiate Google OAuth login
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback - handles success/failure and sets cookies
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:8556'}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
        return res.redirect(`${clientUrl}/login?error=oauth_no_user`);
      }

      // Generate tokens for OAuth user
      const result = await OAuthService.generateTokensForOAuthUser(
        req.user as any
      );

      // Cookie settings
      const isProduction = isProductionLike();
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? ('none' as const) : ('lax' as const),
      };

      // Set access token cookie
      res.cookie('token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Set refresh token cookie
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      logger.info('OAuth login successful', {
        userId: result.user.id,
        provider: 'google',
        email: result.user.email,
      });

      // Redirect to frontend dashboard
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
      res.redirect(`${clientUrl}/dashboard`);
    } catch (error) {
      logger.error('OAuth callback error', error as Error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
      res.redirect(`${clientUrl}/login?error=oauth_callback_error`);
    }
  }
);

/**
 * GET /api/auth/github
 * Initiate GitHub OAuth login
 */
router.get(
  '/github',
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);

/**
 * GET /api/auth/github/callback
 * GitHub OAuth callback - handles success/failure and sets cookies
 */
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL || 'http://localhost:8556'}/login?error=oauth_failed`,
  }),
  async (req, res) => {
    try {
      if (!req.user) {
        const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
        return res.redirect(`${clientUrl}/login?error=oauth_no_user`);
      }

      // Generate tokens for OAuth user
      const result = await OAuthService.generateTokensForOAuthUser(
        req.user as any
      );

      // Cookie settings
      const isProduction = isProductionLike();
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? ('none' as const) : ('lax' as const),
      };

      // Set access token cookie
      res.cookie('token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Set refresh token cookie
      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      logger.info('OAuth login successful', {
        userId: result.user.id,
        provider: 'github',
        email: result.user.email,
      });

      // Redirect to frontend dashboard
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
      res.redirect(`${clientUrl}/dashboard`);
    } catch (error) {
      logger.error('OAuth callback error', error as Error);
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:8556';
      res.redirect(`${clientUrl}/login?error=oauth_callback_error`);
    }
  }
);

export default router;
