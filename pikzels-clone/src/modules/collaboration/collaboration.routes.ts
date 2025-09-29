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
  getTeamProjects
} from './collaboration.controller';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = express.Router();

// Team routes
router.post('/teams', authenticateToken, createTeam);
router.get('/teams', authenticateToken, getUserTeams);
router.get('/teams/:id', authenticateToken, getTeamById);
router.put('/teams/:id', authenticateToken, updateTeam);
router.delete('/teams/:id', authenticateToken, deleteTeam);

// Team member routes
router.post('/teams/:teamId/invite', authenticateToken, inviteUserToTeam);
router.delete('/teams/:teamId/members/:memberId', authenticateToken, removeTeamMember);
router.put('/teams/:teamId/members/:memberId/role', authenticateToken, updateMemberRole);

// Invitation routes
router.get('/invitations', authenticateToken, getUserInvitations);
router.post('/invitations/:id/respond', authenticateToken, respondToInvitation);

// Team projects routes
router.get('/teams/:teamId/projects', authenticateToken, getTeamProjects);

export default router;