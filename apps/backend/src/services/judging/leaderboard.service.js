// =============================================================================
// HackET — Leaderboard Service
// Redis-backed real-time leaderboard with fallback to database.
// Works in tandem with ScoringNormalizationService.
// =============================================================================

const prisma = require('../../config/database');
const { redisClient } = require('../../config/redis');

const LEADERBOARD_KEY = (hackathonId) => `leaderboard:${hackathonId}`;

class LeaderboardService {
  /**
   * Get the leaderboard for a hackathon (Redis-first, DB fallback).
   * @param {string} hackathonId
   * @param {object} [options]
   * @param {number} [options.page=1]
   * @param {number} [options.limit=25]
   * @returns {{ data: Array, pagination: object }}
   */
  async getLeaderboard(hackathonId, { page = 1, limit = 25 } = {}) {
    const offset = (page - 1) * limit;

    // Try Redis cache first
    try {
      const cached = await redisClient.get(LEADERBOARD_KEY(hackathonId));
      if (cached) {
        const all = JSON.parse(cached);
        return {
          data: all.slice(offset, offset + limit),
          pagination: {
            page,
            limit,
            total: all.length,
            totalPages: Math.ceil(all.length / limit),
          },
        };
      }
    } catch (err) {
      console.warn('[Leaderboard] Redis error, falling back to DB:', err.message);
    }

    // Fallback: query database
    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: {
          hackathonId,
          finalScore: { not: null },
          rank: { not: null },
        },
        orderBy: { rank: 'asc' },
        skip: offset,
        take: limit,
        include: {
          team: {
            select: {
              name: true,
              members: {
                select: {
                  user: {
                    select: {
                      id: true,
                      profile: {
                        select: { firstName: true, lastName: true, avatarUrl: true },
                      },
                    },
                  },
                  role: true,
                },
              },
            },
          },
        },
      }),
      prisma.submission.count({
        where: {
          hackathonId,
          finalScore: { not: null },
          rank: { not: null },
        },
      }),
    ]);

    const data = submissions.map((s) => ({
      rank: s.rank,
      submissionId: s.id,
      teamName: s.team.name,
      finalScore: Math.round(s.finalScore * 1000) / 1000,
      members: s.team.members.map((m) => ({
        userId: m.user.id,
        name: m.user.profile
          ? `${m.user.profile.firstName} ${m.user.profile.lastName}`
          : 'Unknown',
        avatarUrl: m.user.profile?.avatarUrl,
        role: m.role,
      })),
    }));

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

  /**
   * Invalidate the leaderboard cache for a hackathon.
   * @param {string} hackathonId
   */
  async invalidateCache(hackathonId) {
    try {
      await redisClient.del(LEADERBOARD_KEY(hackathonId));
    } catch (err) {
      console.warn('[Leaderboard] Failed to invalidate cache:', err.message);
    }
  }
}

module.exports = new LeaderboardService();
