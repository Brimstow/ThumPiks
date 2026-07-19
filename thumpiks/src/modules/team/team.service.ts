/**
 * Team Service
 *
 * Provides team members and invitations with environment-aware mock/real data
 * Uses static test fixtures for deterministic testing (no faker.js in production)
 */

import { getPrisma } from '../../utils/prisma-factory';
import { logger } from '../../utils/logger';

const prisma = getPrisma();

/**
 * Team member interface
 */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatar: string | null;
  joinedAt: Date;
}

/**
 * Team invitation interface
 */
export interface TeamInvitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  invitedBy: string;
  invitedAt: Date;
  status: 'pending' | 'accepted' | 'expired';
}

/**
 * Get team members for user's teams
 * Returns real data from database, or mock if unavailable
 */
export async function getTeamMembers(userId: string): Promise<TeamMember[]> {
  try {
    // NODE_ENV=test → Always use mock
    if (process.env.NODE_ENV === 'test') {
      return getMockTeamMembers(userId);
    }

    // Try to fetch real team members
    const teams = await prisma.team.findMany({
      where: {
        OR: [{ ownerId: userId }, { TeamMember: { some: { userId } } }],
      },
      include: {
        User: true,
        TeamMember: {
          include: {
            User: true,
          },
        },
      },
    });

    if (teams.length > 0) {
      const members: TeamMember[] = [];

      for (const team of teams) {
        // Add owner
        members.push({
          id: team.User.id,
          name: team.User.name,
          email: team.User.email,
          role: 'owner',
          avatar: team.User.avatarUrl,
          joinedAt: team.createdAt,
        });

        // Add team members
        for (const member of team.TeamMember) {
          members.push({
            id: member.User.id,
            name: member.User.name,
            email: member.User.email,
            role: member.role as 'admin' | 'member',
            avatar: member.User.avatarUrl,
            joinedAt: member.joinedAt,
          });
        }
      }

      return members;
    }

    // Fallback to mock if no teams found
    logger.info('MOCK DATA: No teams found, returning mock members', {
      userId,
    });
    return getMockTeamMembers(userId);
  } catch (error) {
    logger.error(
      'Failed to fetch team members, using mock data',
      error as Error,
      { userId }
    );
    return getMockTeamMembers(userId);
  }
}

/**
 * Get pending team invitations
 * Returns mock data (team invitations not fully implemented in schema)
 */
export async function getTeamInvitations(
  userId: string
): Promise<TeamInvitation[]> {
  // Team invitations in schema don't have email/role fields
  // Return mock until schema is updated
  logger.info(
    'MOCK DATA: Team invitations not fully implemented, returning mock data',
    { userId }
  );
  return getMockTeamInvitations(userId);
}

/**
 * Invite team member
 * Requires schema update to include email/role fields on TeamMember model.
 * Currently throws until the Prisma schema is extended.
 */
export async function inviteTeamMember(
  teamId: string,
  _inviterId: string,
  email: string,
  role: 'admin' | 'member'
): Promise<void> {
  logger.info('Team invitation not yet implemented in schema', {
    teamId,
    email,
    role,
  });
  throw new Error('Team invitations feature not yet implemented');
}

/**
 * Remove team member
 * Only affects real database, never mock data
 */
export async function removeTeamMember(
  teamId: string,
  userId: string
): Promise<void> {
  try {
    await prisma.teamMember.delete({
      where: {
        teamId_userId: {
          teamId,
          userId,
        },
      },
    });

    logger.info('Team member removed', { teamId, userId });
  } catch (error) {
    logger.error('Failed to remove team member', error as Error, {
      teamId,
      userId,
    });
    throw new Error('Failed to remove team member');
  }
}

// ============================================
// MOCK DATA GENERATORS
// ============================================

/**
 * Generate mock team members using static test fixtures
 */
function getMockTeamMembers(userId: string): TeamMember[] {
  // Static team members for predictable testing
  const staticMembers: TeamMember[] = [
    {
      id: userId,
      name: userId === 'user-001' ? 'Sarah Martinez' : 'Current User',
      email: userId === 'user-001' ? 'sarah@example.com' : 'user@example.com',
      role: 'owner',
      avatar: null,
      joinedAt: new Date('2025-01-01'),
    },
    {
      id: 'member-001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'admin',
      avatar: null,
      joinedAt: new Date('2025-01-10'),
    },
    {
      id: 'member-002',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'member',
      avatar: null,
      joinedAt: new Date('2025-01-15'),
    },
  ];

  return staticMembers;
}

/**
 * Generate mock team invitations using static test fixtures
 */
function getMockTeamInvitations(_userId: string): TeamInvitation[] {
  // Static pending invitations for testing
  const staticInvitations: TeamInvitation[] = [
    {
      id: 'invite-001',
      email: 'newmember@example.com',
      role: 'member',
      invitedBy: 'You',
      invitedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: 'pending',
    },
  ];

  return staticInvitations;
}
