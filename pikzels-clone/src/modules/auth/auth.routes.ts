import { Router } from 'express';
import {
  register,
  login,
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
      { field: 'refreshToken', required: true, type: 'string', minLength: 1 },
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

export default router;
