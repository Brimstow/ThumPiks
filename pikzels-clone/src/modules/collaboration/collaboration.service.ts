import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CollaborationService {
  /**
   * Create a new team
   */
  async createTeam(data: {
    name: string;
    description?: string;
    ownerId: string;
  }) {
    // Create the team
    const team = await prisma.team.create({
      data: {
        ...data,
        members: {
          create: {
            userId: data.ownerId,
            role: 'owner',
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    return team;
  }

  /**
   * Get teams for a user
   */
  async getUserTeams(userId: string) {
    return prisma.team.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  }

  /**
   * Get team by ID with members
   */
  async getTeamById(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    });
  }

  /**
   * Update team information
   */
  async updateTeam(
    teamId: string,
    data: Partial<{
      name: string;
      description: string;
    }>
  ) {
    return prisma.team.update({
      where: { id: teamId },
      data,
    });
  }

  /**
   * Delete a team (only owner can delete)
   */
  async deleteTeam(teamId: string, userId: string) {
    // Check if user is the owner
    const team = await prisma.team.findUnique({
      where: { id: teamId },
    });

    if (!team || team.ownerId !== userId) {
      throw new Error('Only team owners can delete teams');
    }

    // Delete the team (cascade will handle members and invitations)
    return prisma.team.delete({
      where: { id: teamId },
    });
  }

  /**
   * Invite a user to a team
   */
  async inviteUserToTeam(data: {
    teamId: string;
    inviterId: string;
    inviteeEmail: string;
  }) {
    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: data.teamId },
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Check if inviter is a member of the team
    const isMember = await prisma.teamMember.findFirst({
      where: {
        teamId: data.teamId,
        userId: data.inviterId,
      },
    });

    if (!isMember) {
      throw new Error('Only team members can invite others');
    }

    // Find the user by email
    const invitee = await prisma.user.findUnique({
      where: { email: data.inviteeEmail },
    });

    if (!invitee) {
      throw new Error('User with this email not found');
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: data.teamId,
        userId: invitee.id,
      },
    });

    if (existingMember) {
      throw new Error('User is already a member of this team');
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: data.teamId,
        inviteeId: invitee.id,
        status: 'pending',
      },
    });

    if (existingInvitation) {
      throw new Error('User already has a pending invitation to this team');
    }

    // Create the invitation
    return prisma.teamInvitation.create({
      data: {
        teamId: data.teamId,
        inviterId: data.inviterId,
        inviteeId: invitee.id,
        status: 'pending',
      },
      include: {
        team: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invitee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get pending invitations for a user
   */
  async getUserInvitations(userId: string) {
    return prisma.teamInvitation.findMany({
      where: {
        inviteeId: userId,
        status: 'pending',
      },
      include: {
        team: true,
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Respond to a team invitation
   */
  async respondToInvitation(
    invitationId: string,
    userId: string,
    accept: boolean
  ) {
    // Check if invitation exists and belongs to user
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { team: true },
    });

    if (!invitation || invitation.inviteeId !== userId) {
      throw new Error('Invitation not found or not authorized');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation already responded to');
    }

    // Update invitation status
    const updatedInvitation = await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: {
        status: accept ? 'accepted' : 'declined',
        respondedAt: new Date(),
      },
    });

    // If accepted, add user to team
    if (accept) {
      await prisma.teamMember.create({
        data: {
          teamId: invitation.teamId,
          userId: userId,
          role: 'member',
        },
      });
    }

    return updatedInvitation;
  }

  /**
   * Remove a member from a team
   */
  async removeTeamMember(teamId: string, memberId: string, removerId: string) {
    // Check if remover is authorized (owner or admin)
    const remover = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: removerId,
      },
    });

    if (!remover) {
      throw new Error('Not authorized to remove members');
    }

    // Only owners and admins can remove members
    if (remover.role !== 'owner' && remover.role !== 'admin') {
      throw new Error('Not authorized to remove members');
    }

    // Cannot remove owner
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: memberId,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    // Remove the member
    return prisma.teamMember.delete({
      where: {
        id: member.id,
      },
    });
  }

  /**
   * Update member role in a team
   */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    updaterId: string,
    newRole: string
  ) {
    // Check if updater is authorized (owner)
    const updater = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: updaterId,
      },
    });

    if (!updater || updater.role !== 'owner') {
      throw new Error('Only team owners can update member roles');
    }

    // Cannot change owner role
    const member = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: memberId,
      },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    if (member.role === 'owner') {
      throw new Error('Cannot change team owner role');
    }

    // Update the member role
    return prisma.teamMember.update({
      where: {
        id: member.id,
      },
      data: {
        role: newRole,
      },
    });
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId: string) {
    return prisma.project.findMany({
      where: {
        teamId: teamId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        thumbnails: {
          take: 5, // Limit to 5 thumbnails for preview
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: { thumbnails: true },
        },
      },
    });
  }
}
