import { Request, Response } from 'express';
import { CollaborationService } from './collaboration.service';
import { authenticateToken } from '../../middleware/auth.middleware';

const collaborationService = new CollaborationService();

/**
 * Create a new team
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const team = await collaborationService.createTeam({
      name,
      description,
      ownerId: userId,
    });

    res.status(201).json(team);
  } catch (error: any) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: error.message || 'Failed to create team' });
  }
};

/**
 * Get teams for the current user
 */
export const getUserTeams = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const teams = await collaborationService.getUserTeams(userId);

    res.status(200).json(teams);
  } catch (error: any) {
    console.error('Error fetching user teams:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch teams' });
  }
};

/**
 * Get team by ID
 */
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const team = await collaborationService.getTeamById(id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.status(200).json(team);
  } catch (error: any) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch team' });
  }
};

/**
 * Update team information
 */
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { name, description } = req.body;

    // Check if user is the owner
    const team = await collaborationService.getTeamById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.ownerId !== userId) {
      return res
        .status(403)
        .json({ error: 'Only team owners can update team information' });
    }

    const updatedTeam = await collaborationService.updateTeam(id, {
      name,
      description,
    });

    res.status(200).json(updatedTeam);
  } catch (error: any) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: error.message || 'Failed to update team' });
  }
};

/**
 * Delete a team
 */
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    await collaborationService.deleteTeam(id, userId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: error.message || 'Failed to delete team' });
  }
};

/**
 * Invite a user to a team
 */
export const inviteUserToTeam = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    const { inviteeEmail } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!inviteeEmail) {
      return res.status(400).json({ error: 'Invitee email is required' });
    }

    const invitation = await collaborationService.inviteUserToTeam({
      teamId,
      inviterId: userId,
      inviteeEmail,
    });

    res.status(201).json(invitation);
  } catch (error: any) {
    console.error('Error inviting user to team:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to invite user to team' });
  }
};

/**
 * Get pending invitations for the current user
 */
export const getUserInvitations = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;

    const invitations = await collaborationService.getUserInvitations(userId);

    res.status(200).json(invitations);
  } catch (error: any) {
    console.error('Error fetching user invitations:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to fetch invitations' });
  }
};

/**
 * Respond to a team invitation
 */
export const respondToInvitation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { accept } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (accept === undefined) {
      return res.status(400).json({ error: 'Accept status is required' });
    }

    const invitation = await collaborationService.respondToInvitation(
      id,
      userId,
      accept
    );

    res.status(200).json(invitation);
  } catch (error: any) {
    console.error('Error responding to invitation:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to respond to invitation' });
  }
};

/**
 * Remove a member from a team
 */
export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = (req as any).user.id;

    await collaborationService.removeTeamMember(teamId, memberId, userId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error removing team member:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to remove team member' });
  }
};

/**
 * Update member role in a team
 */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const { teamId, memberId } = req.params;
    const { role } = req.body;
    const userId = (req as any).user.id;

    // Validate required fields
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }

    const updatedMember = await collaborationService.updateMemberRole(
      teamId,
      memberId,
      userId,
      role
    );

    res.status(200).json(updatedMember);
  } catch (error: any) {
    console.error('Error updating member role:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to update member role' });
  }
};

/**
 * Get team projects
 */
export const getTeamProjects = async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;

    const projects = await collaborationService.getTeamProjects(teamId);

    res.status(200).json(projects);
  } catch (error: any) {
    console.error('Error fetching team projects:', error);
    res
      .status(500)
      .json({ error: error.message || 'Failed to fetch team projects' });
  }
};
