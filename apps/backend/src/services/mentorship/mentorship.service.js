const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');
const { formatIcsDate } = require('../../utils/calendar');

const ACTIVE_REQUEST_STATUSES = ['PENDING', 'ACCEPTED'];
const MENTOR_STAFF_ROLE = 'MENTOR';

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

class MentorshipService {
  /**
   * Request a mentor.
   */
  async requestMentor(requesterId, mentorId, teamId, message, preferredAt = null) {
    const team = await this._getTeamOrThrow(teamId, { includeMembers: true });
    this._ensureTeamMember(team, requesterId);
    await this._ensureActiveMentor(mentorId, team.hackathonId);
    await this._ensureMentorDailyCapacity(mentorId);

    const existing = await prisma.mentorRequest.findFirst({
      where: {
        requesterId,
        mentorId,
        teamId,
        status: { in: ACTIVE_REQUEST_STATUSES },
      },
    });

    if (existing) {
      throw new AppError('An active mentorship request already exists for this mentor and team.', 409);
    }

    const request = await prisma.mentorRequest.create({
      data: {
        requesterId,
        mentorId,
        teamId,
        message,
        preferredAt: preferredAt ? new Date(preferredAt) : null,
        status: 'PENDING',
      },
      include: this._requestInclude(),
    });

    this._emitAudit(requesterId, 'MENTORSHIP_REQUEST_CREATED', 'mentorRequest', request.id, {
      mentorId,
      teamId,
      hackathonId: team.hackathonId,
    });

    eventBus.emit('mentorship:requested', { requesterId, mentorId, teamId });

    return request;
  }

  /**
   * Log an interaction.
   */
  async logInteraction(mentorId, teamId, durationMinutes, notes) {
    const team = await this._getTeamOrThrow(teamId);
    await this._ensureActiveMentor(mentorId, team.hackathonId);

    let assignment = await prisma.mentorAssignment.findFirst({
      where: { mentorId, teamId },
    });

    if (!assignment) {
      assignment = await prisma.mentorAssignment.create({
        data: { mentorId, teamId, isActive: true },
      });
    } else if (!assignment.isActive) {
      throw new AppError('This mentor assignment is inactive.', 409);
    }

    const interaction = await prisma.mentorInteraction.create({
      data: {
        mentorAssignmentId: assignment.id,
        durationMinutes,
        notes,
      },
    });

    this._emitAudit(mentorId, 'MENTORSHIP_INTERACTION_LOGGED', 'mentorInteraction', interaction.id, {
      teamId,
      assignmentId: assignment.id,
      durationMinutes,
    });

    return interaction;
  }

  async getIncomingRequests(mentorId, filters = {}) {
    const { status, hackathonId, teamId, page = 1, limit = 20 } = filters;
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = {
      mentorId,
      ...(status ? { status } : {}),
      ...(teamId ? { teamId } : {}),
      ...(hackathonId ? { team: { hackathonId } } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.mentorRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: this._requestInclude(),
      }),
      prisma.mentorRequest.count({ where }),
    ]);

    return this._paginated(data, total, normalizedPage, normalizedLimit);
  }

  async getOutgoingRequests(requesterId, filters = {}) {
    const { status, hackathonId, teamId, page = 1, limit = 20 } = filters;
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = {
      requesterId,
      ...(status ? { status } : {}),
      ...(teamId ? { teamId } : {}),
      ...(hackathonId ? { team: { hackathonId } } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.mentorRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
        include: this._requestInclude(),
      }),
      prisma.mentorRequest.count({ where }),
    ]);

    return this._paginated(data, total, normalizedPage, normalizedLimit);
  }

  async cancelRequest(requesterId, requestId) {
    const request = await prisma.mentorRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) throw new AppError('Mentor request not found.', 404);
    if (request.requesterId !== requesterId) {
      throw new AppError('Only the requester can cancel this mentorship request.', 403);
    }
    if (request.status !== 'PENDING') {
      throw new AppError('Only pending mentorship requests can be cancelled.', 400);
    }

    const updated = await prisma.mentorRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
      include: this._requestInclude(),
    });

    this._emitAudit(requesterId, 'MENTORSHIP_REQUEST_CANCELLED', 'mentorRequest', requestId, {
      mentorId: request.mentorId,
      teamId: request.teamId,
    });

    return updated;
  }

  /**
   * Accept or decline a mentor request.
   */
  async respondToRequest(mentorId, requestId, status) {
    const request = await prisma.mentorRequest.findUnique({
      where: { id: requestId },
      include: { team: true },
    });

    if (!request) throw new AppError('Mentor request not found.', 404);
    if (request.mentorId !== mentorId) {
      throw new AppError('Forbidden. This request is not addressed to you.', 403);
    }
    if (request.status !== 'PENDING') {
      throw new AppError(`This request has already been ${request.status.toLowerCase()}.`, 400);
    }

    await this._ensureActiveMentor(mentorId, request.team.hackathonId);

    const updated = await prisma.mentorRequest.update({
      where: { id: requestId },
      data: { status },
      include: this._requestInclude(),
    });

    if (status === 'ACCEPTED' && request.teamId) {
      await prisma.mentorAssignment.upsert({
        where: {
          mentorId_teamId: {
            mentorId,
            teamId: request.teamId,
          },
        },
        update: { isActive: true },
        create: {
          mentorId,
          teamId: request.teamId,
          isActive: true,
        },
      });
    }

    this._emitAudit(mentorId, 'MENTORSHIP_REQUEST_RESPONDED', 'mentorRequest', requestId, {
      status,
      teamId: request.teamId,
    });

    return updated;
  }

  async getAssignments(mentorId) {
    return prisma.mentorAssignment.findMany({
      where: { mentorId, isActive: true },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            hackathon: {
              select: { id: true, title: true, status: true },
            },
            members: {
              select: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: { select: { firstName: true, lastName: true } },
                  },
                },
                role: true,
              },
            },
          },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            notes: true,
            durationMinutes: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async deactivateAssignment(actor, assignmentId) {
    const assignment = await prisma.mentorAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        team: { include: { hackathon: true } },
      },
    });

    if (!assignment) throw new AppError('Mentor assignment not found.', 404);

    const isMentor = assignment.mentorId === actor.id;
    const canManage = await this._canManageMentorship(actor.id, assignment.team.hackathonId, assignment.team.hackathon.organizerId, actor.role);
    if (!isMentor && !canManage) {
      throw new AppError('You do not have permission to deactivate this assignment.', 403);
    }

    const updated = await prisma.mentorAssignment.update({
      where: { id: assignmentId },
      data: { isActive: false },
    });

    this._emitAudit(actor.id, 'MENTORSHIP_ASSIGNMENT_DEACTIVATED', 'mentorAssignment', assignmentId, {
      teamId: assignment.teamId,
      mentorId: assignment.mentorId,
    });

    return updated;
  }

  async getInteractions(actor, { assignmentId, page = 1, limit = 20 } = {}) {
    if (!assignmentId) throw new AppError('assignmentId is required.', 400);

    const assignment = await prisma.mentorAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        team: {
          include: {
            members: true,
            hackathon: true,
          },
        },
      },
    });

    if (!assignment) throw new AppError('Mentor assignment not found.', 404);

    const isMentor = assignment.mentorId === actor.id;
    const isTeamMember = assignment.team.members.some((member) => member.userId === actor.id);
    const canManage = await this._canManageMentorship(actor.id, assignment.team.hackathonId, assignment.team.hackathon.organizerId, actor.role);

    if (!isMentor && !isTeamMember && !canManage) {
      throw new AppError('You do not have permission to view these interactions.', 403);
    }

    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;

    const where = { mentorAssignmentId: assignmentId };
    const [data, total] = await Promise.all([
      prisma.mentorInteraction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: normalizedLimit,
      }),
      prisma.mentorInteraction.count({ where }),
    ]);

    return this._paginated(data, total, normalizedPage, normalizedLimit);
  }

  async findMentors(hackathonId, filters = {}) {
    const { skills, page = 1, limit = 20 } = filters;
    const requestedSkills = normalizeList(skills).map(normalizeComparable);
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);

    const assignments = await prisma.staffAssignment.findMany({
      where: {
        hackathonId,
        staffRole: MENTOR_STAFF_ROLE,
        isActive: true,
        user: { isActive: true },
      },
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
                bio: true,
                skills: true,
                mentorMaxDailyInteractions: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const enriched = [];
    for (const assignment of assignments) {
      const mentorSkills = new Set((assignment.user.profile?.skills || []).map(normalizeComparable));
      if (requestedSkills.length > 0 && !requestedSkills.some((skill) => mentorSkills.has(skill))) {
        continue;
      }

      enriched.push({
        id: assignment.user.id,
        email: assignment.user.email,
        profile: assignment.user.profile,
        staffAssignmentId: assignment.id,
        dailyLimit: await this._getDailyLimitStatus(assignment.user.id, assignment.user.profile),
      });
    }

    const offset = (normalizedPage - 1) * normalizedLimit;
    return this._paginated(
      enriched.slice(offset, offset + normalizedLimit),
      enriched.length,
      normalizedPage,
      normalizedLimit
    );
  }

  async createSession(requesterId, { mentorId, teamId, startAt, durationMinutes, agenda }) {
    const team = await this._getTeamOrThrow(teamId, { includeMembers: true, includeHackathon: true });
    this._ensureTeamMember(team, requesterId);
    await this._ensureActiveMentor(mentorId, team.hackathonId);
    await this._ensureMentorDailyCapacity(mentorId);

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime()) || start <= new Date()) {
      throw new AppError('Session startAt must be a valid future time.', 400);
    }

    const duration = parseInt(durationMinutes, 10);
    if (Number.isNaN(duration) || duration < 15 || duration > 240) {
      throw new AppError('Session duration must be between 15 and 240 minutes.', 400);
    }

    const end = new Date(start.getTime() + duration * 60 * 1000);

    const overlap = await prisma.mentorSession.findFirst({
      where: {
        mentorId,
        status: 'SCHEDULED',
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });

    if (overlap) {
      throw new AppError('This mentor already has a session during that time.', 409);
    }

    const assignment = await prisma.mentorAssignment.upsert({
      where: { mentorId_teamId: { mentorId, teamId } },
      update: { isActive: true },
      create: { mentorId, teamId, isActive: true },
    });

    const session = await prisma.mentorSession.create({
      data: {
        mentorId,
        requesterId,
        teamId,
        hackathonId: team.hackathonId,
        mentorAssignmentId: assignment.id,
        startAt: start,
        endAt: end,
        durationMinutes: duration,
        agenda,
        status: 'SCHEDULED',
      },
      include: {
        mentor: {
          select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
        },
        requester: {
          select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } },
        },
        team: { select: { id: true, name: true } },
        hackathon: { select: { id: true, title: true } },
      },
    });

    this._emitAudit(requesterId, 'MENTORSHIP_SESSION_SCHEDULED', 'mentorSession', session.id, {
      mentorId,
      teamId,
      hackathonId: team.hackathonId,
    });

    eventBus.emit('mentorship:session_scheduled', {
      sessionId: session.id,
      mentorId,
      requesterId,
      teamId,
    });

    return {
      session,
      calendar: {
        contentType: 'text/calendar',
        ics: this._generateSessionIcs(session),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  async _getTeamOrThrow(teamId, { includeMembers = false, includeHackathon = false } = {}) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        ...(includeMembers ? { members: true } : {}),
        hackathon: includeHackathon ? { select: { id: true, title: true, organizerId: true } } : false,
      },
    });

    if (!team) throw new AppError('Team not found.', 404);
    return team;
  }

  _ensureTeamMember(team, userId) {
    const isMember = team.members.some((member) => member.userId === userId);
    if (!isMember) {
      throw new AppError('You must be a member of the team to request mentorship.', 403);
    }
  }

  async _ensureActiveMentor(mentorId, hackathonId) {
    const mentorUser = await prisma.user.findUnique({
      where: { id: mentorId },
      include: { profile: true },
    });

    if (!mentorUser || !mentorUser.isActive) {
      throw new AppError('Mentor not found.', 404);
    }

    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: mentorId,
        hackathonId,
        staffRole: MENTOR_STAFF_ROLE,
        isActive: true,
      },
    });

    if (!staffAssignment) {
      throw new AppError('The requested user is not assigned as a Mentor for this hackathon.', 403);
    }

    return mentorUser;
  }

  async _ensureMentorDailyCapacity(mentorId) {
    const user = await prisma.user.findUnique({
      where: { id: mentorId },
      include: { profile: true },
    });
    const limit = user?.profile?.mentorMaxDailyInteractions;
    if (!limit) return;

    const status = await this._getDailyLimitStatus(mentorId, user.profile);
    if (status.remaining <= 0) {
      throw new AppError('Mentor is currently unavailable. Try another mentor or send an asynchronous message.', 409);
    }
  }

  async _getDailyLimitStatus(mentorId, profile = null) {
    const maxDaily = profile?.mentorMaxDailyInteractions || null;
    if (!maxDaily) {
      return { maxDaily: null, usedToday: 0, remaining: null, isAtCapacity: false };
    }

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [interactions, sessions] = await Promise.all([
      prisma.mentorInteraction.count({
        where: {
          createdAt: { gte: startOfDay, lte: endOfDay },
          mentorAssignment: { mentorId },
        },
      }),
      prisma.mentorSession.count({
        where: {
          mentorId,
          status: 'SCHEDULED',
          startAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    const usedToday = interactions + sessions;
    const remaining = Math.max(maxDaily - usedToday, 0);
    return { maxDaily, usedToday, remaining, isAtCapacity: remaining === 0 };
  }

  async _canManageMentorship(userId, hackathonId, organizerId, role) {
    if (role === 'ADMIN' || organizerId === userId) return true;

    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId,
        hackathonId,
        isActive: true,
        staffRole: { in: ['CO_ORGANIZER', 'TECHNICAL_LEAD'] },
      },
    });

    return !!staffAssignment;
  }

  _requestInclude() {
    return {
      requester: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, skills: true, avatarUrl: true } },
        },
      },
      mentor: {
        select: {
          id: true,
          email: true,
          profile: { select: { firstName: true, lastName: true, skills: true, avatarUrl: true } },
        },
      },
      team: {
        select: {
          id: true,
          name: true,
          description: true,
          hackathonId: true,
          hackathon: { select: { id: true, title: true, status: true } },
        },
      },
    };
  }

  _paginated(data, total, page, limit) {
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  _generateSessionIcs(session) {
    const summary = `Mentorship session: ${session.team.name}`.replace(/,/g, '\\,');
    const description = (session.agenda || `Hackathon: ${session.hackathon.title}`)
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,');

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//HackET//Mentorship Scheduler//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${session.id}@hacket.com`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(session.startAt)}`,
      `DTEND:${formatIcsDate(session.endAt)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
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

module.exports = new MentorshipService();
