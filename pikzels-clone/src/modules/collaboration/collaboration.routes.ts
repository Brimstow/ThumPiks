import express, { RequestHandler } from 'express';
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
router.get('/teams', authenticateToken, userApiRateLimit, getUserTeams as unknown as RequestHandler);
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
  removeTeamMember as unknown as RequestHandler
);
router.put(
  '/teams/:teamId/members/:memberId/role',
  authenticateToken,
  userApiRateLimit,
  updateMemberRole as unknown as RequestHandler
);

// Invitation routes
router.get(
  '/invitations',
  authenticateToken,
  userApiRateLimit,
  getUserInvitations as unknown as RequestHandler
);
router.post(
  '/invitations/:id/respond',
  authenticateToken,
  userApiRateLimit,
  respondToInvitation as unknown as RequestHandler
);

// Team projects routes
router.get(
  '/teams/:teamId/projects',
  authenticateToken,
  userApiRateLimit,
  getTeamProjects
);

export default router;
