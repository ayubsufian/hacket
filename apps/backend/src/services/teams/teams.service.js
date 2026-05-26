// =============================================================================
// HackET - Teams Service
// Team discovery, membership management, and invitation/request lifecycle.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

const FORMATION_LOCKED_STATUSES = new Set([
  'IN_PROGRESS',
  'JUDGING',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
  'ARCHIVED',
]);

const UPDATE_LOCKED_STATUSES = new Set([
  'JUDGING',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
  'ARCHIVED',
]);

const ACTIVE_REGISTRATION_STATUSES = ['REGISTERED', 'CHECKED_IN'];

const clampLimit = (value, fallback = 20, max = 100) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const positivePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

const normalizeList = (value) => {
  if (!value) return [];
  const raw = Array.isArray(value) ? value : String(value).split(',');
  return raw.map((item) => String(item).trim()).filter(Boolean);
};

const normalizeComparable = (value) => String(value || '').trim().toLowerCase();

class TeamsService {
  /**
   * List teams with discovery filters for hackathon pages and dashboards.
   */
  async list({
    hackathonId,
    search,
    skills,
    neededSkills,
    isOpen,
    memberCount,
    minMemberCount,
    maxMemberCount,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = {}) {
    const requestedSkills = normalizeList(skills || neededSkills).map(normalizeComparable);
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const requestedSort = ['name', 'createdAt', 'updatedAt', 'memberCount'].includes(sortBy)
      ? sortBy
      : 'createdAt';
    const direction = String(sortOrder).toLowerCase() === 'asc' ? 'asc' : 'desc';

    const where = {};
    if (hackathonId) where.hackathonId = hackathonId;
    where.isAutoCreatedSolo = false;
    if (typeof isOpen === 'boolean') where.isOpen = isOpen;
    if (typeof isOpen === 'string') where.isOpen = isOpen === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { neededSkills: { has: search } },
      ];
    }

    const teams = await prisma.team.findMany({
      where,
      include: {
        _count: {
          select: {
            members: true,
            invitations: { where: { status: 'PENDING', type: 'INVITATION' } },
          },
        },
        hackathon: {
          select: {
            id: true,
            title: true,
            status: true,
            minTeamSize: true,
            maxTeamSize: true,
          },
        },
        members: {
          select: {
            role: true,
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
          orderBy: { joinedAt: 'asc' },
        },
      },
    });

    const exactMemberCount = memberCount ? parseInt(memberCount, 10) : null;
    const minCount = minMemberCount ? parseInt(minMemberCount, 10) : null;
    const maxCount = maxMemberCount ? parseInt(maxMemberCount, 10) : null;

    const filtered = teams.filter((team) => {
      const count = team._count.members;
      if (!Number.isNaN(exactMemberCount) && exactMemberCount !== null && count !== exactMemberCount) {
        return false;
      }
      if (!Number.isNaN(minCount) && minCount !== null && count < minCount) return false;
      if (!Number.isNaN(maxCount) && maxCount !== null && count > maxCount) return false;

      if (requestedSkills.length > 0) {
        const teamSkills = new Set(team.neededSkills.map(normalizeComparable));
        return requestedSkills.some((skill) => teamSkills.has(skill));
      }

      return true;
    });

    filtered.sort((a, b) => {
      let aValue;
      let bValue;
      if (requestedSort === 'memberCount') {
        aValue = a._count.members;
        bValue = b._count.members;
      } else if (requestedSort === 'name') {
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
      } else {
        aValue = new Date(a[requestedSort]).getTime();
        bValue = new Date(b[requestedSort]).getTime();
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    const offset = (normalizedPage - 1) * normalizedLimit;
    const data = filtered.slice(offset, offset + normalizedLimit).map((team) =>
      this._formatTeam(team)
    );

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / normalizedLimit),
      },
    };
  }

  /**
   * Return every team the authenticated user belongs to across hackathons.
   */
  async getMine(userId, { page = 1, limit = 20 } = {}) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = { userId, team: { isAutoCreatedSolo: false } };
    const [memberships, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        orderBy: { joinedAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: {
          team: {
            include: {
              _count: { select: { members: true, invitations: true } },
              hackathon: {
                select: {
                  id: true,
                  slug: true,
                  title: true,
                  status: true,
                  minTeamSize: true,
                  maxTeamSize: true,
                },
              },
            },
          },
        },
      }),
      prisma.teamMember.count({ where }),
    ]);

    return {
      data: memberships.map((membership) => ({
        role: membership.role,
        joinedAt: membership.joinedAt,
        isLeader: membership.role === 'LEADER',
        team: {
          ...membership.team,
          memberCount: membership.team._count.members,
          invitationCount: membership.team._count.invitations,
        },
      })),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  /**
   * Create a new team within a hackathon.
   */
  async create({ hackathonId, userId, name, description, neededSkills }) {
    const hackathon = await this._getHackathonOrThrow(hackathonId);
    this._assertFormationAllowed(hackathon, 'Team creation');

    await this._ensureCompetitionEligible(userId, hackathonId);
    await this._ensureNoTeamMembership(userId, hackathonId);

    const team = await prisma.team.create({
      data: {
        hackathonId,
        name,
        description,
        neededSkills: neededSkills || [],
        members: {
          create: { userId, role: 'LEADER' },
        },
      },
      include: this._teamDetailInclude(userId),
    });

    this._emitAudit(userId, 'TEAM_CREATED', 'team', team.id, {
      hackathonId,
      name: team.name,
    });

    eventBus.emit('team:created', { teamId: team.id, hackathonId, leaderId: userId });

    return this._formatTeam(team, userId);
  }

  /**
   * Get team details by ID.
   */
  async getById(teamId, requesterId = null) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: this._teamDetailInclude(requesterId),
    });

    if (!team) throw new AppError('Team not found.', 404);
    return this._formatTeam(team, requesterId, { includeLeaderInvitations: true });
  }

  /**
   * Update team details. Only the leader may edit these fields.
   */
  async update(teamId, userId, data) {
    await this._ensureLeader(teamId, userId);
    const team = await this._getTeamWithHackathon(teamId);

    if (UPDATE_LOCKED_STATUSES.has(team.hackathon.status)) {
      throw new AppError('Team updates are locked for this hackathon status.', 409);
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.neededSkills !== undefined && { neededSkills: data.neededSkills }),
        ...(data.isOpen !== undefined && { isOpen: data.isOpen }),
      },
      include: this._teamDetailInclude(userId),
    });

    this._emitAudit(userId, 'TEAM_UPDATED', 'team', teamId, {
      fields: Object.keys(data),
    });

    return this._formatTeam(updated, userId);
  }

  /**
   * Send a team invitation.
   */
  async sendInvitation({ teamId, senderId, receiverId, message }) {
    if (senderId === receiverId) {
      throw new AppError('You cannot invite yourself to your own team.', 400);
    }

    await this._ensureLeader(teamId, senderId);

    const team = await this._getTeamWithHackathon(teamId, {
      includeCounts: true,
      includeMembers: true,
    });

    this._assertFormationAllowed(team.hackathon, 'Sending team invitations');
    this._assertTeamHasCapacity(team);
    await this._ensureCompetitionEligible(receiverId, team.hackathonId);
    await this._ensureNoTeamMembership(receiverId, team.hackathonId);
    await this._ensureNoPendingInvitationOrRequest(teamId, receiverId);

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        senderId,
        receiverId,
        message,
        type: 'INVITATION',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: this._invitationInclude(),
    });

    this._emitAudit(senderId, 'TEAM_INVITED', 'teamInvitation', invitation.id, {
      teamId,
      receiverId,
    });

    eventBus.emit('team:invited', { teamId, senderId, receiverId });

    return invitation;
  }

  /**
   * Request to join an open team.
   */
  async requestToJoin({ teamId, requesterId, message }) {
    const team = await this._getTeamWithHackathon(teamId, {
      includeCounts: true,
      includeMembers: true,
    });

    if (!team.isOpen) {
      throw new AppError('This team is closed and is not accepting join requests.', 403);
    }

    this._assertFormationAllowed(team.hackathon, 'Join requests');
    this._assertTeamHasCapacity(team);
    await this._ensureCompetitionEligible(requesterId, team.hackathonId);
    await this._ensureNoTeamMembership(requesterId, team.hackathonId);
    await this._ensureNoPendingInvitationOrRequest(teamId, requesterId);

    const leader = team.members.find((member) => member.role === 'LEADER');
    if (!leader) {
      throw new AppError('This team has no active leader to receive requests.', 409);
    }

    const request = await prisma.teamInvitation.create({
      data: {
        teamId,
        senderId: requesterId,
        receiverId: leader.userId,
        message,
        type: 'REQUEST',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      include: this._invitationInclude(),
    });

    this._emitAudit(requesterId, 'TEAM_JOIN_REQUESTED', 'teamInvitation', request.id, {
      teamId,
      leaderId: leader.userId,
    });

    eventBus.emit('team:join_requested', {
      teamId,
      requesterId,
      leaderId: leader.userId,
    });

    return request;
  }

  /**
   * Respond to an invitation or join request.
   */
  async respondToInvitation(invitationId, userId, accept) {
    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: {
        team: {
          include: {
            members: true,
            _count: { select: { members: true } },
            hackathon: true,
          },
        },
      },
    });

    if (!invitation) throw new AppError('Invitation or request not found.', 404);
    if (invitation.status !== 'PENDING') {
      throw new AppError(`This invitation or request is already ${invitation.status.toLowerCase()}.`, 400);
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('Invitation or request has expired.', 400);
    }

    const isJoinRequest = invitation.type === 'REQUEST';
    const memberUserId = isJoinRequest ? invitation.senderId : invitation.receiverId;

    if (isJoinRequest) {
      await this._ensureLeader(invitation.teamId, userId);
    } else if (invitation.receiverId !== userId) {
      throw new AppError('This invitation is not addressed to you.', 403);
    }

    if (accept) {
      this._assertFormationAllowed(invitation.team.hackathon, 'Joining teams');
      this._assertTeamHasCapacity(invitation.team);
      await this._ensureCompetitionEligible(memberUserId, invitation.team.hackathonId);
      await this._ensureNoTeamMembership(memberUserId, invitation.team.hackathonId);

      await prisma.$transaction([
        prisma.teamInvitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED' },
        }),
        prisma.teamMember.create({
          data: { teamId: invitation.teamId, userId: memberUserId, role: 'MEMBER' },
        }),
      ]);

      this._emitAudit(userId, 'TEAM_MEMBER_JOINED', 'team', invitation.teamId, {
        invitationId,
        memberUserId,
        type: invitation.type,
      });

      eventBus.emit('team:member_joined', {
        teamId: invitation.teamId,
        userId: memberUserId,
        approvedBy: userId,
      });
    } else {
      await prisma.teamInvitation.update({
        where: { id: invitationId },
        data: { status: 'DECLINED' },
      });

      eventBus.emit('team:invite_declined', {
        teamId: invitation.teamId,
        senderId: invitation.senderId,
        receiverId: invitation.receiverId,
        reason: 'DECLINED',
      });
    }

    this._emitAudit(userId, 'TEAM_INVITATION_RESPONDED', 'teamInvitation', invitationId, {
      teamId: invitation.teamId,
      type: invitation.type,
      accepted: accept,
    });

    return { status: accept ? 'ACCEPTED' : 'DECLINED' };
  }

  async listTeamInvitations(teamId, userId, filters = {}) {
    await this._ensureLeader(teamId, userId);
    const { status, type, page = 1, limit = 20 } = filters;
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = {
      teamId,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.teamInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: this._invitationInclude(),
      }),
      prisma.teamInvitation.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async listUserInvitations(userId, filters = {}) {
    const { status, direction = 'all', hackathonId, type, page = 1, limit = 20 } = filters;
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const directionWhere =
      direction === 'sent'
        ? { senderId: userId }
        : direction === 'received'
          ? { receiverId: userId }
          : { OR: [{ senderId: userId }, { receiverId: userId }] };

    const where = {
      ...directionWhere,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(hackathonId ? { team: { hackathonId } } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.teamInvitation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: this._invitationInclude(),
      }),
      prisma.teamInvitation.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async cancelInvitation(teamId, invitationId, userId) {
    await this._ensureLeader(teamId, userId);

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id: invitationId },
      include: { team: { include: { hackathon: true } } },
    });

    if (!invitation || invitation.teamId !== teamId) {
      throw new AppError('Invitation not found for this team.', 404);
    }
    if (invitation.type !== 'INVITATION') {
      throw new AppError('Join requests must be accepted or declined, not cancelled.', 400);
    }
    if (invitation.status !== 'PENDING') {
      throw new AppError('Only pending invitations can be cancelled.', 400);
    }

    const updated = await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: 'EXPIRED' },
      include: this._invitationInclude(),
    });

    this._emitAudit(userId, 'TEAM_INVITATION_CANCELLED', 'teamInvitation', invitationId, {
      teamId,
      receiverId: invitation.receiverId,
    });

    eventBus.emit('team:invite_cancelled', {
      teamId,
      senderId: invitation.senderId,
      receiverId: invitation.receiverId,
    });

    return updated;
  }

  async disband(teamId, userId) {
    const team = await this._getTeamWithHackathon(teamId, { includeMembers: true });
    const isLeader = team.members.some((member) => member.userId === userId && member.role === 'LEADER');
    const isOrganizer = team.hackathon.organizerId === userId;

    if (!isLeader && !isOrganizer) {
      throw new AppError('Only the team leader or event organizer can disband this team.', 403);
    }
    if (FORMATION_LOCKED_STATUSES.has(team.hackathon.status)) {
      throw new AppError('Teams cannot be disbanded after the hackathon has started or been locked.', 409);
    }

    await prisma.team.delete({ where: { id: teamId } });

    this._emitAudit(userId, 'TEAM_DISBANDED', 'team', teamId, {
      hackathonId: team.hackathonId,
      memberCount: team.members.length,
    });

    eventBus.emit('team:disbanded', { teamId, hackathonId: team.hackathonId, actorId: userId });

    return { message: 'Team disbanded successfully.' };
  }

  async kickMember(teamId, targetUserId, leaderId) {
    if (targetUserId === leaderId) {
      throw new AppError('Team leaders cannot kick themselves.', 400);
    }

    await this._ensureLeader(teamId, leaderId);
    const team = await this._getTeamWithHackathon(teamId, { includeMembers: true });

    if (FORMATION_LOCKED_STATUSES.has(team.hackathon.status)) {
      throw new AppError('Team membership changes are locked for this hackathon status.', 409);
    }

    const targetMembership = team.members.find((member) => member.userId === targetUserId);
    if (!targetMembership) {
      throw new AppError('User is not a member of this team.', 404);
    }
    if (targetMembership.role === 'LEADER') {
      throw new AppError('Use leadership transfer before removing a leader.', 400);
    }

    this._assertMinimumSizeAfterRemoval(team);

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    this._emitAudit(leaderId, 'TEAM_MEMBER_KICKED', 'team', teamId, {
      targetUserId,
      hackathonId: team.hackathonId,
    });

    eventBus.emit('team:member_kicked', { teamId, leaderId, userId: targetUserId });

    return { message: 'Member removed successfully.' };
  }

  async transferLeadership(teamId, currentLeaderId, newLeaderUserId) {
    if (currentLeaderId === newLeaderUserId) {
      throw new AppError('You are already the team leader.', 400);
    }

    await this._ensureLeader(teamId, currentLeaderId);
    const team = await this._getTeamWithHackathon(teamId, { includeMembers: true });

    if (FORMATION_LOCKED_STATUSES.has(team.hackathon.status)) {
      throw new AppError('Leadership transfers are locked for this hackathon status.', 409);
    }

    const targetMembership = team.members.find((member) => member.userId === newLeaderUserId);
    if (!targetMembership) {
      throw new AppError('New leader must be an active team member.', 400);
    }

    const currentMembership = team.members.find((member) => member.userId === currentLeaderId);

    await prisma.$transaction([
      prisma.teamMember.update({
        where: { id: currentMembership.id },
        data: { role: 'MEMBER' },
      }),
      prisma.teamMember.update({
        where: { id: targetMembership.id },
        data: { role: 'LEADER' },
      }),
      prisma.teamInvitation.updateMany({
        where: {
          teamId,
          type: 'REQUEST',
          status: 'PENDING',
        },
        data: { receiverId: newLeaderUserId },
      }),
    ]);

    this._emitAudit(currentLeaderId, 'TEAM_LEADERSHIP_TRANSFERRED', 'team', teamId, {
      previousLeaderId: currentLeaderId,
      newLeaderUserId,
    });

    eventBus.emit('team:leadership_transferred', {
      teamId,
      previousLeaderId: currentLeaderId,
      newLeaderUserId,
    });

    return this.getById(teamId, newLeaderUserId);
  }

  /**
   * Leave a team. Leaders must transfer leadership first.
   */
  async leave(teamId, userId) {
    const team = await this._getTeamWithHackathon(teamId, { includeMembers: true });
    const membership = team.members.find((member) => member.userId === userId);

    if (!membership) {
      throw new AppError('You are not a member of this team.', 404);
    }

    if (FORMATION_LOCKED_STATUSES.has(team.hackathon.status)) {
      throw new AppError('Team membership changes are locked for this hackathon status.', 409);
    }

    if (membership.role === 'LEADER') {
      throw new AppError('Transfer leadership before leaving this team, or disband the team if appropriate.', 403);
    }

    this._assertMinimumSizeAfterRemoval(team);

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId } },
    });

    const leader = team.members.find((member) => member.role === 'LEADER');
    this._emitAudit(userId, 'TEAM_MEMBER_LEFT', 'team', teamId, {
      hackathonId: team.hackathonId,
    });

    eventBus.emit('team:member_left', {
      teamId,
      leaderId: leader?.userId || null,
      userId,
    });

    return { message: 'Left team successfully.' };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async _getHackathonOrThrow(hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        id: true,
        organizerId: true,
        status: true,
        minTeamSize: true,
        maxTeamSize: true,
      },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    return hackathon;
  }

  async _getTeamWithHackathon(teamId, { includeCounts = false, includeMembers = false } = {}) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        hackathon: {
          select: {
            id: true,
            organizerId: true,
            status: true,
            minTeamSize: true,
            maxTeamSize: true,
          },
        },
        ...(includeCounts ? { _count: { select: { members: true, invitations: true } } } : {}),
        ...(includeMembers ? { members: true } : {}),
      },
    });

    if (!team) throw new AppError('Team not found.', 404);
    return team;
  }

  _teamDetailInclude(requesterId = null) {
    return {
      _count: {
        select: {
          members: true,
          invitations: { where: { status: 'PENDING', type: 'INVITATION' } },
        },
      },
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
                  university: true,
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      hackathon: {
        select: {
          id: true,
          slug: true,
          title: true,
          maxTeamSize: true,
          minTeamSize: true,
          status: true,
        },
      },
      invitations: requesterId
        ? {
            where: { status: 'PENDING' },
            include: this._invitationInclude({ includeTeam: false }),
            orderBy: { createdAt: 'desc' },
          }
        : false,
      submission: { select: { id: true, status: true, title: true } },
    };
  }

  _invitationInclude({ includeTeam = true } = {}) {
    return {
      ...(includeTeam
        ? {
            team: {
              select: {
                id: true,
                name: true,
                hackathonId: true,
                hackathon: {
                  select: {
                    id: true,
                    title: true,
                    status: true,
                    minTeamSize: true,
                    maxTeamSize: true,
                  },
                },
              },
            },
          }
        : {}),
      sender: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
      receiver: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    };
  }

  _formatTeam(team, requesterId = null, { includeLeaderInvitations = false } = {}) {
    const isCurrentUserLeader = team.members?.some(
      (member) => member.userId === requesterId && member.role === 'LEADER'
    ) || false;

    return {
      id: team.id,
      hackathonId: team.hackathonId,
      name: team.name,
      description: team.description,
      neededSkills: team.neededSkills,
      isOpen: team.isOpen,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      hackathon: team.hackathon,
      memberCount: team._count?.members ?? team.members?.length ?? 0,
      invitationCount: team._count?.invitations ?? 0,
      isCurrentUserLeader,
      members: (team.members || []).map((member) => ({
        id: member.id,
        userId: member.userId || member.user?.id,
        role: member.role,
        joinedAt: member.joinedAt,
        user: member.user || undefined,
      })),
      submission: team.submission || undefined,
      invitations: includeLeaderInvitations && isCurrentUserLeader ? team.invitations || [] : undefined,
    };
  }

  async _ensureLeader(teamId, userId) {
    const membership = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (!membership || membership.role !== 'LEADER') {
      throw new AppError('Only the team leader can perform this action.', 403);
    }

    return membership;
  }

  _assertFormationAllowed(hackathon, action) {
    if (FORMATION_LOCKED_STATUSES.has(hackathon.status)) {
      throw new AppError(`${action} is locked for this hackathon status.`, 409);
    }

    if (hackathon.maxTeamSize <= 1) {
      throw new AppError('This hackathon is configured for solo participation only.', 409);
    }
  }

  _assertTeamHasCapacity(team) {
    const memberCount = team._count?.members ?? team.members?.length ?? 0;
    if (memberCount >= team.hackathon.maxTeamSize) {
      throw new AppError(`Team size limit reached (${team.hackathon.maxTeamSize} members).`, 409);
    }
  }

  _assertMinimumSizeAfterRemoval(team) {
    const memberCount = team.members?.length ?? team._count?.members ?? 0;
    if (memberCount - 1 < team.hackathon.minTeamSize) {
      throw new AppError(
        `Removing this member would put the team below the minimum size of ${team.hackathon.minTeamSize}.`,
        409
      );
    }
  }

  async _ensureCompetitionEligible(userId, hackathonId) {
    const [hackathon, user, registration, staffAssignment] = await Promise.all([
      prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { organizerId: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActive: true },
      }),
      prisma.registration.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
        select: { status: true },
      }),
      prisma.staffAssignment.findFirst({
        where: { userId, hackathonId, isActive: true },
        select: { staffRole: true },
      }),
    ]);

    if (!user || !user.isActive) {
      throw new AppError('Participant account is not active.', 403);
    }
    if (!registration || !ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
      throw new AppError('Participant must be actively registered for this hackathon.', 403);
    }
    if (hackathon?.organizerId === userId) {
      throw new AppError('Conflict of interest: event organizers cannot compete in their own hackathon.', 403);
    }
    if (staffAssignment) {
      throw new AppError(
        `Conflict of interest: active ${staffAssignment.staffRole} staff cannot compete in this hackathon.`,
        403
      );
    }
  }

  async _ensureNoTeamMembership(userId, hackathonId) {
    const existing = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: { hackathonId },
      },
      select: { teamId: true },
    });

    if (existing) {
      throw new AppError('Participant is already a member of a team for this hackathon.', 409);
    }
  }

  async _ensureNoPendingInvitationOrRequest(teamId, userId) {
    const pending = await prisma.teamInvitation.findFirst({
      where: {
        teamId,
        status: 'PENDING',
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      select: { id: true, type: true },
    });

    if (pending) {
      throw new AppError('A pending invitation or join request already exists for this user and team.', 409);
    }
  }

  _emitAudit(actorId, action, entity, entityId, details) {
    eventBus.emit('audit:log', {
      actorId,
      action,
      entity,
      entityId,
      details,
    });
  }
}

module.exports = new TeamsService();
