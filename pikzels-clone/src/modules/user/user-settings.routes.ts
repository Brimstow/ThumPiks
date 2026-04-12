import { Router } from 'express';
import * as userSettingsController from './user-settings.controller';
import { requestDataExport } from './data-export.controller';
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

/**
 * @route   GET /api/user/storage
 * @desc    Get user storage information
 * @access  Private
 */
router.get('/storage', authenticate, userSettingsController.getStorage);

/**
 * @route   PUT /api/user/settings/auto-save
 * @desc    Update auto-save setting
 * @access  Private
 */
router.put(
  '/settings/auto-save',
  authenticate,
  userSettingsController.updateAutoSave
);

/**
 * @route   PUT /api/user/settings/auto-import
 * @desc    Update auto-import setting
 * @access  Private
 */
router.put(
  '/settings/auto-import',
  authenticate,
  userSettingsController.updateAutoImport
);

/**
 * @route   PUT /api/user/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password', authenticate, userSettingsController.changePassword);

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account', authenticate, userSettingsController.deleteAccount);

/**
 * @route   POST /api/user/export
 * @desc    GDPR-compliant data export (download all user data as JSON)
 * @access  Private
 */
router.post('/export', authenticate, requestDataExport);

export default router;
