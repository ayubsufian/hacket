// =============================================================================
// HackET - Recommendation Engine
// Content-based filtering with persisted recommendation history.
// =============================================================================

const prisma = require('../../config/database');
const AppError = require('../../utils/AppError');

const clampLimit = (value, fallback = 10, max = 100) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const positivePage = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
};

class RecommendationService {
  async getRecommendations(userId, {
    page = 1,
    limit = 10,
    includeDismissed = false,
    isViewed,
  } = {}) {
    const normalizedPage = positivePage(page);
    const normalizedLimit = clampLimit(limit);
    const offset = (normalizedPage - 1) * normalizedLimit;
    const now = new Date();

    const where = {
      userId,
      ...(includeDismissed ? {} : { isDismissed: false }),
      ...(isViewed !== undefined ? { isViewed: String(isViewed).toLowerCase() === 'true' } : {}),
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    };

    const [data, total] = await Promise.all([
      prisma.recommendation.findMany({
        where,
        orderBy: [{ score: 'desc' }, { createdAt: 'desc' }],
        skip: offset,
        take: normalizedLimit,
        include: {
          hackathon: {
            include: {
              tags: { select: { tag: true } },
              _count: { select: { teams: true } },
            },
          },
        },
      }),
      prisma.recommendation.count({ where }),
    ]);

    return {
      data: data.map((recommendation) => this._formatStoredRecommendation(recommendation)),
      pagination: {
        page: normalizedPage,
        limit: normalizedLimit,
        total,
        totalPages: Math.ceil(total / normalizedLimit),
      },
    };
  }

  async markViewed(userId, recommendationId) {
    const recommendation = await this._getOwnedRecommendation(userId, recommendationId);
    return prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { isViewed: true },
      include: { hackathon: { include: { tags: { select: { tag: true } } } } },
    });
  }

  async dismiss(userId, recommendationId) {
    const recommendation = await this._getOwnedRecommendation(userId, recommendationId);
    return prisma.recommendation.update({
      where: { id: recommendation.id },
      data: { isDismissed: true, isViewed: true },
      include: { hackathon: { include: { tags: { select: { tag: true } } } } },
    });
  }

  /**
   * Generate recommendations and persist them to the Recommendation table.
   */
  async recommendEvents(userId, { limit = 10, includeRegistered = false } = {}) {
    const { redisClient } = require('../../config/redis');
    const normalizedLimit = clampLimit(limit);
    const key = `recom:${userId}`;

    try {
      const cached = await redisClient.lRange(key, 0, -1);
      if (cached && cached.length > 0) {
        const recommendations = cached.map((item) => JSON.parse(item));
        await this._persistRecommendations(userId, recommendations);
        return {
          recommendations,
          metadata: { prompt: null, isFallback: false, fromCache: true },
        };
      }
    } catch (err) {
      console.warn('[Recommendation] Redis cache get error:', err.message);
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { interests: true, region: true },
    });

    const userTeams = await prisma.teamMember.findMany({
      where: { userId },
      select: {
        team: {
          select: {
            hackathonId: true,
            hackathon: { select: { tags: { select: { tag: true } } } },
          },
        },
      },
    });

    const pastHackathonTags = userTeams.flatMap((membership) =>
      membership.team.hackathon.tags.map((tag) => tag.tag)
    );
    const explicitInterests = profile?.interests || [];
    const combinedInterests = [...explicitInterests, ...pastHackathonTags];

    if (combinedInterests.length === 0) {
      const fallbackEvents = await this._getUpcomingEvents(normalizedLimit);
      await this._persistRecommendations(userId, fallbackEvents, { fallback: true });
      return {
        recommendations: fallbackEvents,
        metadata: {
          prompt: 'Update your profile for better recommendations.',
          isFallback: true,
        },
      };
    }

    const userInterests = new Set(
      combinedInterests.map((interest) => interest.toLowerCase().trim())
    );

    const now = new Date();
    const hackathons = await prisma.hackathon.findMany({
      where: {
        status: { in: ['REGISTRATION_OPEN', 'UPCOMING'] },
        OR: [{ registrationEnd: null }, { registrationEnd: { gte: now } }],
      },
      include: {
        tags: { select: { tag: true } },
        _count: { select: { teams: true } },
      },
    });

    let filteredHackathons = hackathons;
    if (!includeRegistered) {
      const registeredIds = new Set(userTeams.map((team) => team.team.hackathonId));
      filteredHackathons = hackathons.filter((hackathon) => !registeredIds.has(hackathon.id));
    }

    const scored = filteredHackathons.map((hackathon) => {
      const hackathonTags = new Set(hackathon.tags.map((tag) => tag.tag.toLowerCase().trim()));
      const intersection = new Set([...userInterests].filter((interest) => hackathonTags.has(interest)));
      const union = new Set([...userInterests, ...hackathonTags]);

      let relevanceScore = union.size > 0 ? intersection.size / union.size : 0;

      if (profile?.region && hackathon.region) {
        if (hackathon.region.toLowerCase() === profile.region.toLowerCase()) {
          relevanceScore += 0.15;
        }
      }

      if (hackathon.registrationEnd) {
        const daysUntilClose = Math.max(
          0,
          (new Date(hackathon.registrationEnd) - now) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilClose <= 7) relevanceScore += 0.05;
      }

      return {
        hackathon: this._formatHackathon(hackathon),
        relevanceScore: Math.round(Math.min(relevanceScore, 1.0) * 1000) / 1000,
        matchedTags: Array.from(intersection),
      };
    });

    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

    if (scored.length === 0 || scored[0].relevanceScore === 0) {
      const fallbackEvents = await this._getUpcomingEvents(normalizedLimit);
      await this._persistRecommendations(userId, fallbackEvents, { fallback: true });
      return {
        recommendations: fallbackEvents,
        metadata: {
          prompt: 'No specific recommendations found. Displaying popular or featured events instead.',
          isFallback: true,
        },
      };
    }

    const finalRecommendations = scored.slice(0, normalizedLimit);
    await this._persistRecommendations(userId, finalRecommendations);

    try {
      const multi = redisClient.multi();
      multi.del(key);
      finalRecommendations.forEach((recommendation) => multi.rPush(key, JSON.stringify(recommendation)));
      multi.expire(key, 12 * 60 * 60);
      await multi.exec();
    } catch (err) {
      console.warn('[Recommendation] Redis cache set error:', err.message);
    }

    return {
      recommendations: finalRecommendations,
      metadata: {
        prompt: null,
        isFallback: false,
      },
    };
  }

  async _getOwnedRecommendation(userId, recommendationId) {
    const recommendation = await prisma.recommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation || recommendation.userId !== userId) {
      throw new AppError('Recommendation not found.', 404);
    }

    return recommendation;
  }

  async _persistRecommendations(userId, recommendations, extraReason = {}) {
    if (!recommendations || recommendations.length === 0) return;

    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    await prisma.$transaction(
      recommendations.map((recommendation) =>
        prisma.recommendation.upsert({
          where: {
            userId_hackathonId: {
              userId,
              hackathonId: recommendation.hackathon.id,
            },
          },
          update: {
            score: recommendation.relevanceScore || 0,
            reason: {
              matchedTags: recommendation.matchedTags || [],
              ...extraReason,
            },
            expiresAt,
          },
          create: {
            userId,
            hackathonId: recommendation.hackathon.id,
            score: recommendation.relevanceScore || 0,
            reason: {
              matchedTags: recommendation.matchedTags || [],
              ...extraReason,
            },
            expiresAt,
          },
        })
      )
    );
  }

  async _getUpcomingEvents(limit) {
    const now = new Date();
    const hackathons = await prisma.hackathon.findMany({
      where: {
        status: 'REGISTRATION_OPEN',
        OR: [{ registrationEnd: null }, { registrationEnd: { gte: now } }],
      },
      orderBy: { registrationEnd: 'asc' },
      take: limit,
      include: {
        tags: { select: { tag: true } },
        _count: { select: { teams: true } },
      },
    });

    return hackathons.map((hackathon) => ({
      hackathon: this._formatHackathon(hackathon),
      relevanceScore: 0,
      matchedTags: [],
    }));
  }

  _formatStoredRecommendation(recommendation) {
    return {
      id: recommendation.id,
      score: recommendation.score,
      reason: recommendation.reason,
      isViewed: recommendation.isViewed,
      isDismissed: recommendation.isDismissed,
      createdAt: recommendation.createdAt,
      expiresAt: recommendation.expiresAt,
      hackathon: this._formatHackathon(recommendation.hackathon),
    };
  }

  _formatHackathon(hackathon) {
    return {
      id: hackathon.id,
      slug: hackathon.slug,
      title: hackathon.title,
      titleAm: hackathon.titleAm,
      description: hackathon.description,
      coverImageUrl: hackathon.coverImageUrl,
      status: hackathon.status,
      region: hackathon.region,
      isVirtual: hackathon.isVirtual,
      registrationStart: hackathon.registrationStart,
      registrationEnd: hackathon.registrationEnd,
      eventStart: hackathon.eventStart,
      eventEnd: hackathon.eventEnd,
      teamCount: hackathon._count?.teams || 0,
      tags: (hackathon.tags || []).map((tag) => tag.tag),
    };
  }
}

module.exports = new RecommendationService();
