import { Router, RequestHandler, Response, NextFunction } from 'express';
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
import { AuthRequest } from '../../types/auth';
import { OAuthService } from './oauth.service';
import { isProductionLike, getClientUrl } from '../../utils/env';
import { logger } from '../../utils/logger';
import { EmailService } from '../email/email.service';

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
        custom: (value: unknown) => {
          // Reject if contains HTML tags after sanitization check
          const htmlPattern = /<[^>]*>/g;
          if (typeof value === 'string' && htmlPattern.test(value)) {
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
router.post('/logout', logout as unknown as RequestHandler);

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
  refreshToken as unknown as RequestHandler
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
        custom: (value: unknown) => {
          const htmlPattern = /<[^>]*>/g;
          if (typeof value === 'string' && htmlPattern.test(value)) {
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
  updateDisplayPreference as unknown as RequestHandler
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
 * Shared OAuth callback handler — eliminates duplication between providers.
 */
function oauthCallbackHandler(provider: string) {
  return async (req: AuthRequest, res: Response, _next: NextFunction) => {
    try {
      if (!req.user) {
        return res.redirect(`${getClientUrl()}/login?error=oauth_no_user`);
      }

      const result = await OAuthService.generateTokensForOAuthUser(
        req.user as unknown as Parameters<
          typeof OAuthService.generateTokensForOAuthUser
        >[0]
      );

      const isProduction = isProductionLike();
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
      };

      res.cookie('token', result.accessToken, {
        ...cookieOptions,
        maxAge: 15 * 60 * 1000,
      });

      if (result.refreshToken) {
        res.cookie('refreshToken', result.refreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
      }

      logger.info('OAuth login successful', {
        userId: result.user.id,
        provider,
        email: result.user.email,
      });

      res.redirect(`${getClientUrl()}/dashboard`);
    } catch (error) {
      logger.error('OAuth callback error', error as Error);
      res.redirect(`${getClientUrl()}/login?error=oauth_callback_error`);
    }
  };
}

/**
 * GET /api/auth/google/callback
 * Google OAuth callback - handles success/failure and sets cookies
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${getClientUrl()}/login?error=oauth_failed`,
  }),
  oauthCallbackHandler('google') as RequestHandler
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
    failureRedirect: `${getClientUrl()}/login?error=oauth_failed`,
  }),
  oauthCallbackHandler('github') as RequestHandler
);

/**
 * POST /api/auth/webhooks/resend
 * Handle Resend webhook events (bounces, deliveries, complaints)
 */
router.post('/webhooks/resend', async (req, res) => {
  try {
    // Resend webhook payload structure: { type, created_at, data: { email_id, to, from, ... } }
    const { type, data } = req.body;
    const messageId = data?.email_id;
    const email = Array.isArray(data?.to) ? data.to[0] : data?.to;
    const reason = data?.reason;
    const bounceType = data?.bounce_type;

    logger.info('Received Resend webhook', {
      type,
      email,
      messageId,
    });

    await EmailService.handleWebhook({
      type,
      email,
      messageId,
      reason,
      bounceType,
    });

    // Always return 200 to acknowledge receipt
    res.status(200).json({ received: true });
  } catch (error) {
    logger.error('Error processing Resend webhook', error as Error);
    // Still return 200 to prevent Resend from retrying
    res.status(200).json({ received: true });
  }
});

export default router;
