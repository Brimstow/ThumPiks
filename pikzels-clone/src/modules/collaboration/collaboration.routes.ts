import express from 'express';
import {
  createTeam,
  getUserTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  inviteUserToTeam,
  getUserInvitations,
  respondToInvitation,
  removeTeamMember,
  updateMemberRole,
  getTeamProjects,
} from './collaboration.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { userApiRateLimit } from '../../middleware/security.middleware';

const router = express.Router();

// Team routes
router.post('/teams', authenticateToken, userApiRateLimit, createTeam);
router.get('/teams', authenticateToken, userApiRateLimit, getUserTeams);
router.get('/teams/:id', authenticateToken, userApiRateLimit, getTeamById);
router.put('/teams/:id', authenticateToken, userApiRateLimit, updateTeam);
router.delete('/teams/:id', authenticateToken, userApiRateLimit, deleteTeam);

// Team member routes
router.post(
  '/teams/:teamId/invite',
  authenticateToken,
  userApiRateLimit,
  inviteUserToTeam
);
router.delete(
  '/teams/:teamId/members/:memberId',
  authenticateToken,
  userApiRateLimit,
  removeTeamMember
);
router.put(
  '/teams/:teamId/members/:memberId/role',
  authenticateToken,
  userApiRateLimit,
  updateMemberRole
);

// Invitation routes
router.get(
  '/invitations',
  authenticateToken,
  userApiRateLimit,
  getUserInvitations
);
router.post(
  '/invitations/:id/respond',
  authenticateToken,
  userApiRateLimit,
  respondToInvitation
);

// Team projects routes
router.get(
  '/teams/:teamId/projects',
  authenticateToken,
  userApiRateLimit,
  getTeamProjects
);

export default router;
