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
import { AuthRequest } from '../../types/auth';
import * as profileService from '../user/profile.service';
import * as securityService from '../security/security.service';
import * as notificationService from '../notification/notification.service';
import * as settingsService from '../settings/settings.service';
import * as teamService from '../team/team.service';
import { getSubscriptionTier } from '../user/profile.service';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

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
