/**
 * Account API Routes
 *
 * Unified routes for all account-related data:
 * - Profile
 * - Security (2FA, sessions)
 * - Notifications (email preferences)
 * - Settings (user preferences)
 * - Team
 */

import express from 'express';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';
import { AuthRequest } from '../../types/auth';
import * as profileService from '../user/profile.service';
import * as securityService from '../security/security.service';
import * as notificationService from '../notification/notification.service';
import * as settingsService from '../settings/settings.service';
import * as teamService from '../team/team.service';
import { getSubscriptionTier } from '../user/profile.service';
import { MFAService } from '../auth/mfa.service';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);
router.use(userApiRateLimit);

// ============================================
// PROFILE ROUTES
// ============================================

/**
 * GET /api/account/profile
 * Get user profile data
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const profile = await profileService.getUserProfile(userId);

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.json(profile);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/account/profile
 * Update user profile
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { name, username } = req.body;

    await profileService.updateUserProfile(userId, { name, username });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/account/subscription
 * Get subscription tier and credits
 */
router.get('/subscription', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const subscription = await getSubscriptionTier(userId);
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ============================================
// SECURITY ROUTES
// ============================================

/**
 * GET /api/account/security/2fa
 * Get 2FA status
 */
router.get('/security/2fa', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const status = await securityService.get2FAStatus(userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
});

/**
 * GET /api/account/security/sessions
 * Get active sessions
 */
router.get('/security/sessions', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const currentSessionId = req.headers['x-session-id'] as string | undefined;
    const sessions = await securityService.getActiveSessions(
      userId,
      currentSessionId
    );
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/account/security/sessions/:sessionId
 * Terminate a session
 */
router.delete('/security/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    await securityService.terminateSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to terminate session' });
  }
});

/**
 * GET /api/account/security/history
 * Get login history
 */
router.get('/security/history', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await securityService.getLoginHistory(userId, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch login history' });
  }
});

// ============================================
// 2FA/MFA ROUTES
// ============================================

/**
 * POST /api/account/security/2fa/setup
 * Setup 2FA - Generate secret, QR code, and backup codes
 */
router.post('/security/2fa/setup', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const setupData = await MFAService.setupMFA(userId);
    res.json(setupData);
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ error: err.message || 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/account/security/2fa/enable
 * Verify code and enable 2FA
 */
router.post('/security/2fa/enable', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const verified = await MFAService.verifyAndEnableMFA(userId, token);
    return res.json({ success: verified });
  } catch (error) {
    const err = error as Error;
    return res.status(400).json({ error: err.message || 'Failed to enable 2FA' });
  }
});

/**
 * POST /api/account/security/2fa/disable
 * Disable 2FA
 */
router.post('/security/2fa/disable', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { password } = req.body;

    const disabled = await MFAService.disableMFA(userId, password);
    res.json({ success: disabled });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ error: err.message || 'Failed to disable 2FA' });
  }
});

/**
 * POST /api/account/security/2fa/verify
 * Verify 2FA token (for login)
 */
router.post('/security/2fa/verify', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const verified = await MFAService.verifyMFAToken(userId, token);
    return res.json({ success: verified });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to verify 2FA token' });
  }
});

/**
 * POST /api/account/security/2fa/regenerate-codes
 * Regenerate backup codes
 */
router.post('/security/2fa/regenerate-codes', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const newCodes = await MFAService.regenerateBackupCodes(userId);
    res.json({ backupCodes: newCodes });
  } catch (error) {
    const err = error as Error;
    res.status(400).json({ error: err.message || 'Failed to regenerate backup codes' });
  }
});

/**
 * GET /api/account/security/2fa/status
 * Get 2FA status (updated to use MFA service)
 */
router.get('/security/2fa/status', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const status = await MFAService.getMFAStatus(userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch 2FA status' });
  }
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

/**
 * GET /api/account/notifications/preferences
 * Get email notification preferences
 */
router.get('/notifications/preferences', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const preferences = await notificationService.getEmailPreferences(userId);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

/**
 * PUT /api/account/notifications/preferences
 * Update email notification preferences
 */
router.put('/notifications/preferences', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    await notificationService.updateEmailPreferences(userId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// ============================================
// SETTINGS ROUTES
// ============================================

/**
 * GET /api/account/settings
 * Get user settings/preferences
 */
router.get('/settings', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const settings = await settingsService.getUserSettings(userId);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

/**
 * PUT /api/account/settings
 * Update user settings
 */
router.put('/settings', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    await settingsService.updateUserSettings(userId, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// TEAM ROUTES
// ============================================

/**
 * GET /api/account/team/members
 * Get team members
 */
router.get('/team/members', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const members = await teamService.getTeamMembers(userId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team members' });
  }
});

/**
 * GET /api/account/team/invitations
 * Get pending team invitations
 */
router.get('/team/invitations', async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.id;
    const invitations = await teamService.getTeamInvitations(userId);
    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

export default router;
