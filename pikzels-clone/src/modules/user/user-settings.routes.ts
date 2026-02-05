import { Router } from 'express';
import * as userSettingsController from './user-settings.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /api/user/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', authenticate, userSettingsController.getSettings);

/**
 * @route   PUT /api/user/settings/email
 * @desc    Update email preferences
 * @access  Private
 */
router.put(
  '/settings/email',
  authenticate,
  userSettingsController.updateEmailPreferences
);

export default router;
