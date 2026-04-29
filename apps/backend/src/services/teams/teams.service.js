// =============================================================================
// HackET — Teams Service
// Team creation, membership management, and invitation lifecycle.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

class TeamsService {
  /**
   * Create a new team within a hackathon.
   */
  async create({ hackathonId, userId, name, description, neededSkills }) {
    // Check hackathon exists
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, status: true },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (!['REGISTRATION_OPEN', 'IN_PROGRESS'].includes(hackathon.status)) {
      throw new AppError('Team creation is not currently allowed.', 400);
    }

    // Check user not already in a team for this hackathon
    const existing = await prisma.teamMember.findFirst({
      where: { userId, team: { hackathonId } },
    });
    if (existing) {
      throw new AppError('You are already in a team for this hackathon.', 409);
    }

    const team = await prisma.team.create({
      data: {
        hackathonId,
        name,
        description,
        neededSkills: neededSkills || [],
        members: {
          create: { userId, role: 'leader' },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return team;
  }

  /**
   * Get team details by ID.
   */
  async getById(teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    skills: true,
                  },
                },
              },
            },
          },
        },
        hackathon: {
          select: { id: true, title: true, maxTeamSize: true, status: true },
        },
        submission: { select: { id: true, status: true, title: true } },
      },
    });

    if (!team) throw new AppError('Team not found.', 404);
    return team;
  }

  /**
   * Update team details (leader only).
   */
  async update(teamId, userId, data) {
    await this._ensureLeader(teamId, userId);

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: data.name,
        description: data.description,
        neededSkills: data.neededSkills,
        isOpen: data.isOpen,
      },
    });

    return updated;
  }

  /**
   * Send a team invitation.
   */
  async sendInvitation({ teamId, senderId, receiverId, message }) {
    await this._ensureLeader(teamId, senderId);

    // Check receiver isn't already in the team
    const existing = await prisma.teamMember.findFirst({
      where: { teamId, userId: receiverId },
    });
    if (existing) {
      throw new AppError('User is already a member of this team.', 409);
    }

    // Check for pending invitation
    const pendingInvite = await prisma.teamInvitation.findFirst({
      where: { teamId, receiverId, status: 'PENDING' },
    });
    if (pendingInvite) {
      throw new AppError('An invitation is already pending for this user.', 409);
    }

    // Check team is not full
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        _count: { select: { members: true } },
        hackathon: { select: { maxTeamSize: true } },
      },
    });
    if (team._count.members >= team.hackathon.maxTeamSize) {
      throw new AppError('Team is already full.', 400);
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        senderId,
        receiverId,
        message,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        team: { select: { name: true } },
        sender: { select: { email: true } },
      },
    });

    eventBus.emit('team:invited', { teamId, senderId, receiverId });

    return invitation;
  }

  /**
   * Respond to a team invitation (accept/decline).
   */
  async respondToInvitation(invitationId, userId, accept) {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        team: {
          include: {
            _count: { select: { members: true } },
            hackathon: { select: { maxTeamSize: true, id: true } },
          },
        },
      },
    });

    if (!invitation) throw new AppError('Invitation not found.', 404);
    if (invitation.receiverId !== userId) {
      throw new AppError('This invitation is not for you.', 403);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError(`Invitation is already ${invitation.status.toLowerCase()}.`, 400);
    }
    if (new Date() > invitation.expiresAt) {
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Invitation has expired.', 400);
    }

    if (accept) {
      // Check team capacity
      if (
        invitation.team._count.members >= invitation.team.hackathon.maxTeamSize
      ) {
        throw new AppError('Team is now full. Cannot accept invitation.', 400);
      }

      // Check user isn't already in another team for this hackathon
      const alreadyInTeam = await prisma.teamMember.findFirst({
        where: {
          userId,
          team: { hackathonId: invitation.team.hackathon.id },
        },
      });

      if (alreadyInTeam) {
        throw new AppError(
          'You are already in a team for this hackathon. Leave your current team first.',
          409
        );
      }

      // Accept: update invitation + add member (transactional)
      await prisma.$transaction([
        prisma.teamInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED' },
        }),
        prisma.teamMember.create({
          data: { teamId: invitation.teamId, userId, role: 'member' },
        }),
      ]);
    } else {
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' },
      });
    }

    return { status: accept ? 'ACCEPTED' : 'DECLINED' };
  }

  /**
   * Leave a team.
   */
  async leave(teamId, userId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership) {
      throw new AppError('You are not a member of this team.', 404);
    }

    if (membership.role === 'leader') {
      // Transfer leadership or delete team if solo
      const otherMembers = await prisma.teamMember.findMany({
        where: { teamId, userId: { not: userId } },
        orderBy: { joinedAt: 'asc' },
      });

      if (otherMembers.length === 0) {
        // Delete the team entirely
        await prisma.team.delete({ where: { id: teamId } });
        return { message: 'Team deleted (you were the only member).' };
      }

      // Transfer to next oldest member
      await prisma.$transaction([
        prisma.teamMember.delete({
          where: { teamId_userId: { teamId, userId } },
        }),
        prisma.teamMember.update({
          where: { id: otherMembers[0].id },
          data: { role: 'leader' },
        }),
      ]);
    } else {
      await prisma.teamMember.delete({
        where: { teamId_userId: { teamId, userId } },
      });
    }

    return { message: 'Left team successfully.' };
  }

  // ─── Private ──────────────────────────────────────────────────────────

  async _ensureLeader(teamId, userId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership || membership.role !== 'leader') {
      throw new AppError('Only the team leader can perform this action.', 403);
    }
  }
}

module.exports = new TeamsService();
