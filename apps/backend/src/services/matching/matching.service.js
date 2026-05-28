// =============================================================================
// HackET - Team Matching Engine
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');
const eventBus = require('../../utils/eventBus');

const ACTIVE_REGISTRATION_STATUSES = ['REGISTERED', 'CHECKED_IN'];
const TEAM_FORMATION_LOCKED_STATUSES = [
  'IN_PROGRESS',
  'JUDGING',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
  'ARCHIVED',
];

const clampLimit = (value, fallback = 10, max = 100) => {
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

class TeamMatchingEngine {
  async suggestTeams({
    userId,
    hackathonId,
    page = 1,
    limit = 10,
    skills,
    isOpen,
  }) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const requestedSkills = normalizeList(skills).map(normalizeComparable);

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if ((!userProfile || userProfile.skills.length === 0) && requestedSkills.length === 0) {
      throw new AppError(
        'Please complete your profile with skills before seeking team matches.',
        400
      );
    }

    const userSkills = new Set(
      (requestedSkills.length > 0 ? requestedSkills : userProfile.skills.map(normalizeComparable))
    );

    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { maxTeamSize: true, id: true, status: true },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    await this._assertCanSeekTeam(userId, hackathonId, hackathon);

    const isOpenFilter =
      isOpen === undefined ? true : String(isOpen).toLowerCase() === 'true';

    const teams = await prisma.team.findMany({
      where: {
        hackathonId,
        isAutoCreatedSolo: false,
        ...(isOpen === undefined ? { isOpen: true } : { isOpen: isOpenFilter }),
        members: {
          none: { userId },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                profile: {
                  select: { firstName: true, lastName: true, skills: true },
                },
              },
            },
          },
        },
      },
    });

    const scoredTeams = [];

    for (const team of teams) {
      if (team.members.length >= hackathon.maxTeamSize) continue;

      const neededSkills = team.neededSkills.map(normalizeComparable);
      if (requestedSkills.length > 0 && !requestedSkills.some((skill) => neededSkills.includes(skill))) {
        continue;
      }

      if (neededSkills.length === 0) {
        scoredTeams.push({
          team: this._formatTeam(team),
          matchScore: 0.1,
          matchedSkills: [],
          missingSkills: [],
          reason: 'Team has no specific skill requirements.',
        });
        continue;
      }

      const matchedSkills = neededSkills.filter((neededSkill) => userSkills.has(neededSkill));
      const missingSkills = neededSkills.filter((neededSkill) => !userSkills.has(neededSkill));
      const coverageScore = matchedSkills.length / neededSkills.length;

      const existingTeamSkills = new Set();
      for (const member of team.members) {
        for (const skill of member.user.profile?.skills || []) {
          existingTeamSkills.add(normalizeComparable(skill));
        }
      }

      const uniqueContribution = matchedSkills.filter((skill) => !existingTeamSkills.has(skill));
      const diversityBonus = (uniqueContribution.length / neededSkills.length) * 0.2;
      const capacityBonus = (1 - team.members.length / hackathon.maxTeamSize) * 0.1;
      const finalScore = Math.min(coverageScore + diversityBonus + capacityBonus, 1.0);

      scoredTeams.push({
        team: this._formatTeam(team),
        matchScore: Math.round(finalScore * 1000) / 1000,
        matchedSkills,
        missingSkills,
        uniqueContribution,
        reason: this._generateReason(matchedSkills, missingSkills, uniqueContribution),
      });
    }

    scoredTeams.sort((a, b) => b.matchScore - a.matchScore);

    const offset = (normalizedPage - 1) * normalizedLimit;
    return {
      suggestions: scoredTeams.slice(offset, offset + normalizedLimit),
      metadata: {
        prompt: scoredTeams.length === 0
          ? 'No suitable matches found at this time. Try again later or broaden your search criteria.'
          : null,
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total: scoredTeams.length,
          totalPages: Math.ceil(scoredTeams.length / normalizedLimit),
        },
      },
    };
  }

  async suggestMembers({
    teamId,
    requesterId,
    page = 1,
    limit = 10,
    skills,
    region,
  }) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const requestedSkills = normalizeList(skills).map(normalizeComparable);

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { userId: true, role: true } },
        hackathon: { select: { id: true, maxTeamSize: true, status: true } },
      },
    });

    if (!team) throw new AppError('Team not found.', 404);
    if (team.isAutoCreatedSolo) {
      throw new AppError('Solo submission teams cannot search for additional members.', 409);
    }

    const requesterMembership = team.members.find((member) => member.userId === requesterId);
    if (!requesterMembership || requesterMembership.role !== 'LEADER') {
      throw new AppError('Only team leaders can search for candidate members.', 403);
    }

    if (team.members.length >= team.hackathon.maxTeamSize) {
      throw new AppError('Team is already full.', 400);
    }
    if (TEAM_FORMATION_LOCKED_STATUSES.includes(team.hackathon.status)) {
      throw new AppError('Member suggestions are locked for this hackathon status.', 409);
    }
    if (team.hackathon.maxTeamSize <= 1) {
      throw new AppError('This hackathon is configured for solo participation only.', 409);
    }

    const skillBasis = requestedSkills.length > 0
      ? requestedSkills
      : team.neededSkills.map(normalizeComparable);

    if (skillBasis.length === 0) {
      throw new AppError(
        'Please specify needed skills on your team or in the query to get member suggestions.',
        400
      );
    }

    const neededSkills = new Set(skillBasis);
    const existingMemberIds = team.members.map((member) => member.userId);

    const candidates = await prisma.userProfile.findMany({
      where: {
        isSeekingTeam: true,
        ...(region ? { region: { equals: region, mode: 'insensitive' } } : {}),
        user: {
          role: 'PARTICIPANT',
          isActive: true,
          id: { notIn: existingMemberIds },
          registrations: {
            some: {
              hackathonId: team.hackathon.id,
              status: { in: ACTIVE_REGISTRATION_STATUSES },
            },
          },
          staffAssignments: {
            none: {
              hackathonId: team.hackathon.id,
              isActive: true,
            },
          },
          teamMemberships: {
            none: {
              team: { hackathonId: team.hackathon.id },
            },
          },
        },
        skills: { isEmpty: false },
      },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    const scored = candidates
      .map((profile) => {
        const candidateSkills = profile.skills.map(normalizeComparable);
        const matchedSkills = candidateSkills.filter((skill) => neededSkills.has(skill));
        const matchScore = neededSkills.size > 0 ? matchedSkills.length / neededSkills.size : 0;

        return {
          user: {
            id: profile.user.id,
            email: profile.user.email,
            firstName: profile.firstName,
            lastName: profile.lastName,
            avatarUrl: profile.avatarUrl,
            skills: profile.skills,
            university: profile.university,
            city: profile.city,
            region: profile.region,
          },
          matchScore: Math.round(matchScore * 1000) / 1000,
          matchedSkills,
        };
      })
      .filter((candidate) => candidate.matchScore > 0);

    scored.sort((a, b) => b.matchScore - a.matchScore);

    const offset = (normalizedPage - 1) * normalizedLimit;
    return {
      suggestions: scored.slice(offset, offset + normalizedLimit),
      metadata: {
        prompt: scored.length === 0
          ? 'No suitable matches found at this time. Try again later or broaden your search criteria.'
          : null,
        pagination: {
          page: normalizedPage,
          limit: normalizedLimit,
          total: scored.length,
          totalPages: Math.ceil(scored.length / normalizedLimit),
        },
      },
    };
  }

  async autoMatch({ userId, hackathonId, skills }) {
    await this._assertAutoMatchEligible(userId, hackathonId);

    const { suggestions } = await this.suggestTeams({
      userId,
      hackathonId,
      limit: 1,
      page: 1,
      skills,
      isOpen: true,
    });

    if (suggestions.length === 0) {
      throw new AppError('No open team is currently available for auto-match.', 404);
    }

    const teamId = suggestions[0].team.id;
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: true,
        hackathon: { select: { maxTeamSize: true } },
      },
    });

    if (!team || !team.isOpen || team.members.length >= team.hackathon.maxTeamSize) {
      throw new AppError('Selected team is no longer available for auto-match.', 409);
    }

    const membership = await prisma.teamMember.create({
      data: { teamId, userId, role: 'MEMBER' },
      include: {
        team: { select: { id: true, name: true, hackathonId: true } },
      },
    });

    eventBus.emit('audit:log', {
      actorId: userId,
      action: 'TEAM_AUTO_MATCHED',
      entity: 'team',
      entityId: teamId,
      details: { hackathonId, matchScore: suggestions[0].matchScore },
    });

    eventBus.emit('team:auto_matched', { teamId, userId, hackathonId });

    return {
      membership,
      match: suggestions[0],
    };
  }

  _formatTeam(team) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      neededSkills: team.neededSkills,
      isOpen: team.isOpen,
      memberCount: team.members.length,
      members: team.members.map((member) => ({
        userId: member.user.id,
        name: member.user.profile
          ? [member.user.profile.firstName, member.user.profile.lastName].filter(Boolean).join(' ')
          : 'Unknown',
        skills: member.user.profile?.skills || [],
      })),
    };
  }

  _generateReason(matchedSkills, missingSkills, uniqueContribution) {
    const parts = [];
    if (matchedSkills.length > 0) {
      parts.push(`You match ${matchedSkills.length} needed skill(s): ${matchedSkills.join(', ')}.`);
    }
    if (uniqueContribution && uniqueContribution.length > 0) {
      parts.push(`You uniquely bring: ${uniqueContribution.join(', ')}.`);
    }
    if (missingSkills.length > 0 && missingSkills.length <= 3) {
      parts.push(`Team still needs: ${missingSkills.join(', ')}.`);
    }
    return parts.join(' ') || 'General match.';
  }

  async _assertAutoMatchEligible(userId, hackathonId) {
    const [hackathon, registration, staffAssignment, existingTeam] = await Promise.all([
      prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { status: true, maxTeamSize: true },
      }),
      prisma.registration.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
        select: { status: true },
      }),
      prisma.staffAssignment.findFirst({
        where: { userId, hackathonId, isActive: true },
      }),
      prisma.teamMember.findFirst({
        where: { userId, team: { hackathonId } },
      }),
    ]);

    this._assertCanSeekTeamResult({ hackathon, registration, staffAssignment, existingTeam });
  }

  async _assertCanSeekTeam(userId, hackathonId, hackathon) {
    const [registration, staffAssignment, existingTeam] = await Promise.all([
      prisma.registration.findUnique({
        where: { userId_hackathonId: { userId, hackathonId } },
        select: { status: true },
      }),
      prisma.staffAssignment.findFirst({
        where: { userId, hackathonId, isActive: true },
      }),
      prisma.teamMember.findFirst({
        where: { userId, team: { hackathonId } },
      }),
    ]);

    this._assertCanSeekTeamResult({ hackathon, registration, staffAssignment, existingTeam });
  }

  _assertCanSeekTeamResult({ hackathon, registration, staffAssignment, existingTeam }) {
    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (TEAM_FORMATION_LOCKED_STATUSES.includes(hackathon.status)) {
      throw new AppError('Team matching is locked for this hackathon status.', 409);
    }
    if (hackathon.maxTeamSize <= 1) {
      throw new AppError('This hackathon is configured for solo participation only.', 409);
    }
    if (!registration || !ACTIVE_REGISTRATION_STATUSES.includes(registration.status)) {
      throw new AppError('You must be actively registered for this hackathon before team matching.', 403);
    }
    if (staffAssignment) throw new AppError('Active event staff cannot compete in team matching.', 403);
    if (existingTeam) throw new AppError('You are already a member of a team for this hackathon.', 409);
  }
}

module.exports = new TeamMatchingEngine();
