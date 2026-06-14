import { Request, Response } from 'express';
import { AuthRequest } from '../../types/auth';
import { CollaborationService } from './collaboration.service';
import { logger } from '../../utils/logger';

const collaborationService = new CollaborationService();

/**
 * Create a new team
 */
export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    // Create team logic here
    const team = { id: '1', name, description };
    
    return res.status(201).json({ team });
  } catch (error) {
    logger.error('Error creating team', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get teams for the current user
 */
export const getUserTeams = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const teams = await collaborationService.getUserTeams(userId);

    res.status(200).json(teams);
  } catch (error: unknown) {
    logger.error('Error fetching user teams', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch teams' });
  }
};

/**
 * Get team by ID
 */
export const getTeamById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const team = await collaborationService.getTeamById(id);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    return res.status(200).json({ team });
  } catch (error) {
    logger.error('Error getting team', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update team information
 */
export const updateTeam = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const { name, description } = req.body;
    
    // Update team logic here
    const team = { id, name, description };
    
    return res.status(200).json({ team });
  } catch (error) {
    logger.error('Error updating team', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a team
 */
export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    // Delete team logic here
    
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting team', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Invite a user to a team
 */
export const inviteUserToTeam = async (req: Request, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Invite user logic here
    const invitation = { id: '1', teamId, email, status: 'pending' };
    
    return res.status(201).json({ invitation });
  } catch (error) {
    logger.error('Error inviting user', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get pending invitations for the current user
 */
export const getUserInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const invitations = await collaborationService.getUserInvitations(userId);

    res.status(200).json(invitations);
  } catch (error: unknown) {
    logger.error('Error fetching user invitations', error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch invitations' });
  }
};

/**
 * Respond to a team invitation
 */
export const respondToInvitation = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!id) {
      return res.status(400).json({ error: 'Invitation ID is required' });
    }
    const { accept } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Validate required fields
    if (accept === undefined) {
      return res.status(400).json({ error: 'Accept status is required' });
    }

    const invitation = await collaborationService.respondToInvitation(
      id,
      userId,
      accept
    );

    return res.status(200).json(invitation);
  } catch (error: unknown) {
    logger.error('Error responding to invitation', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to respond to invitation' });
  }
};

/**
 * Remove a member from a team
 */
export const removeTeamMember = async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    const memberId = req.params.memberId as string;
    if (!teamId || !memberId) {
      return res.status(400).json({ error: 'Team ID and Member ID are required' });
    }
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await collaborationService.removeTeamMember(teamId, memberId, userId);

    return res.status(204).send();
  } catch (error: unknown) {
    logger.error('Error removing team member', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove team member' });
  }
};

/**
 * Update member role in a team
 */
export const updateMemberRole = async (req: AuthRequest, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    const memberId = req.params.memberId as string;
    if (!teamId || !memberId) {
      return res.status(400).json({ error: 'Team ID and Member ID are required' });
    }
    const { role } = req.body;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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

    return res.status(200).json(updatedMember);
  } catch (error: unknown) {
    logger.error('Error updating member role', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update member role' });
  }
};

/**
 * Get team projects
 */
export const getTeamProjects = async (req: Request, res: Response) => {
  try {
    const teamId = req.params.teamId as string;
    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' });
    }

    const projects = await collaborationService.getTeamProjects(teamId);
    return res.status(200).json({ projects });
  } catch (error) {
    logger.error('Error getting team projects', error instanceof Error ? error : new Error(String(error)));
    return res.status(500).json({ error: 'Internal server error' });
  }
};
