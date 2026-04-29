// =============================================================================
// HackET — Team Matching Engine  ⭐
// =============================================================================
//
// Rule-based content-filtering engine for suggesting teams/partners.
//
// Algorithm:
//   1. Load the requesting user's skills from their profile
//   2. Find all open teams in the given hackathon that are not full
//   3. Compute intersection score: |user.skills ∩ team.neededSkills| / |team.neededSkills|
//   4. Apply bonus weight for partial coverage diversity
//   5. Return top-N teams sorted by match score (descending)
//
// This is a pure Use Case layer service — no HTTP concerns.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');

class TeamMatchingEngine {
  /**
   * Get team suggestions for a user within a hackathon.
   *
   * @param {object} params
   * @param {string} params.userId    - The user looking for a team
   * @param {string} params.hackathonId - The hackathon context
   * @param {number} [params.limit=10] - Max results to return
   * @returns {Array<{ team, matchScore, matchedSkills, missingSkills }>}
   */
  async suggestTeams({ userId, hackathonId, limit = 10 }) {
    // 1. Load user profile and skills
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    if (!userProfile || userProfile.skills.length === 0) {
      throw new AppError(
        'Please complete your profile with skills before seeking team matches.',
        400
      );
    }

    const userSkills = new Set(
      userProfile.skills.map((s) => s.toLowerCase().trim())
    );

    // 2. Load hackathon to get team size limits
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { maxTeamSize: true, id: true },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    // 3. Find all open teams the user is NOT already a member of
    const teams = await prisma.team.findMany({
      where: {
        hackathonId,
        isOpen: true,
        // Exclude teams the user is already in
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

    // 4. Score each team
    const scoredTeams = [];

    for (const team of teams) {
      // Skip full teams
      if (team.members.length >= hackathon.maxTeamSize) continue;

      const neededSkills = team.neededSkills.map((s) =>
        s.toLowerCase().trim()
      );

      // If team hasn't specified needed skills, use a basic score
      if (neededSkills.length === 0) {
        scoredTeams.push({
          team: this._formatTeam(team),
          matchScore: 0.1, // Low baseline for teams with no requirements
          matchedSkills: [],
          missingSkills: [],
          reason: 'Team has no specific skill requirements.',
        });
        continue;
      }

      // Compute intersection
      const matchedSkills = neededSkills.filter((ns) => userSkills.has(ns));
      const missingSkills = neededSkills.filter((ns) => !userSkills.has(ns));

      // Primary score: coverage ratio
      const coverageScore = matchedSkills.length / neededSkills.length;

      // Diversity bonus: bonus for teams that already have some skills covered
      // (the user fills gaps, not duplicates)
      const existingTeamSkills = new Set();
      for (const member of team.members) {
        if (member.user.profile) {
          for (const skill of member.user.profile.skills) {
            existingTeamSkills.add(skill.toLowerCase().trim());
          }
        }
      }

      // Skills the user brings that the team doesn't already have
      const uniqueContribution = matchedSkills.filter(
        (s) => !existingTeamSkills.has(s)
      );
      const diversityBonus =
        neededSkills.length > 0
          ? (uniqueContribution.length / neededSkills.length) * 0.2
          : 0;

      // Team capacity bonus: prefer teams that still have room
      const capacityRatio =
        1 - team.members.length / hackathon.maxTeamSize;
      const capacityBonus = capacityRatio * 0.1;

      const finalScore = Math.min(
        coverageScore + diversityBonus + capacityBonus,
        1.0
      );

      scoredTeams.push({
        team: this._formatTeam(team),
        matchScore: Math.round(finalScore * 1000) / 1000,
        matchedSkills,
        missingSkills,
        uniqueContribution,
        reason: this._generateReason(matchedSkills, missingSkills, uniqueContribution),
      });
    }

    // 5. Sort by match score descending and return top-N
    scoredTeams.sort((a, b) => b.matchScore - a.matchScore);
    return scoredTeams.slice(0, limit);
  }

  /**
   * Suggest individual participants to a team captain based on skill gaps.
   *
   * @param {object} params
   * @param {string} params.teamId - The team looking for members
   * @param {number} [params.limit=10]
   * @returns {Array<{ user, matchScore, matchedSkills }>}
   */
  async suggestMembers({ teamId, limit = 10 }) {
    // Load team with current members and hackathon context
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { userId: true } },
        hackathon: { select: { id: true, maxTeamSize: true } },
      },
    });

    if (!team) {
      throw new AppError('Team not found.', 404);
    }

    if (team.members.length >= team.hackathon.maxTeamSize) {
      throw new AppError('Team is already full.', 400);
    }

    if (team.neededSkills.length === 0) {
      throw new AppError(
        'Please specify needed skills on your team to get member suggestions.',
        400
      );
    }

    const neededSkills = new Set(
      team.neededSkills.map((s) => s.toLowerCase().trim())
    );
    const existingMemberIds = team.members.map((m) => m.userId);

    // Find participants NOT already in a team for this hackathon
    // and NOT already in this team
    const candidates = await prisma.userProfile.findMany({
      where: {
        user: {
          role: 'PARTICIPANT',
          isActive: true,
          id: { notIn: existingMemberIds },
          // Not already in a team for this hackathon
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

    // Score candidates
    const scored = candidates.map((profile) => {
      const candidateSkills = profile.skills.map((s) =>
        s.toLowerCase().trim()
      );
      const matchedSkills = candidateSkills.filter((s) => neededSkills.has(s));
      const matchScore =
        neededSkills.size > 0 ? matchedSkills.length / neededSkills.size : 0;

      return {
        user: {
          id: profile.user.id,
          email: profile.user.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          skills: profile.skills,
          university: profile.university,
        },
        matchScore: Math.round(matchScore * 1000) / 1000,
        matchedSkills,
      };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);
    return scored.slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  _formatTeam(team) {
    return {
      id: team.id,
      name: team.name,
      description: team.description,
      neededSkills: team.neededSkills,
      isOpen: team.isOpen,
      memberCount: team.members.length,
      members: team.members.map((m) => ({
        userId: m.user.id,
        name: m.user.profile
          ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
          : 'Unknown',
        skills: m.user.profile?.skills || [],
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
}

module.exports = new TeamMatchingEngine();
