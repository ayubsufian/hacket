// =============================================================================
// HackET — Recommendation Engine
// Content-based filtering: matches event tags with user profile interests.
// =============================================================================

const prisma = require('../../config/database');

class RecommendationService {
  /**
   * Get hackathon recommendations for a user based on their interests.
   *
   * Algorithm: Cosine-like similarity between user.interests and hackathon.tags.
   * We use Jaccard index (intersection / union) for simplicity with tag sets.
   *
   * @param {string} userId
   * @param {object} [options]
   * @param {number} [options.limit=10]
   * @param {boolean} [options.includeRegistered=false]
   * @returns {Array<{ hackathon, relevanceScore, matchedTags }>}
   */
  async recommendEvents(userId, { limit = 10, includeRegistered = false } = {}) {
    // 1. Load user interests
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { interests: true, region: true },
    });

    if (!profile || profile.interests.length === 0) {
      // Fallback: return popular/upcoming events
      return this._getUpcomingEvents(limit);
    }

    const userInterests = new Set(
      profile.interests.map((i) => i.toLowerCase().trim())
    );

    // 2. Load active/upcoming hackathons with tags
    const now = new Date();
    const hackathons = await prisma.hackathon.findMany({
      where: {
        status: { in: ['REGISTRATION_OPEN', 'DRAFT'] },
        registrationEnd: { gte: now },
      },
      include: {
        tags: { select: { tag: true } },
        _count: { select: { teams: true } },
      },
    });

    // 3. If requested, filter out already-registered events
    let filteredHackathons = hackathons;
    if (!includeRegistered) {
      const userTeams = await prisma.teamMember.findMany({
        where: { userId },
        select: { team: { select: { hackathonId: true } } },
      });
      const registeredIds = new Set(userTeams.map((t) => t.team.hackathonId));
      filteredHackathons = hackathons.filter((h) => !registeredIds.has(h.id));
    }

    // 4. Score each hackathon
    const scored = filteredHackathons.map((hackathon) => {
      const hackathonTags = new Set(
        hackathon.tags.map((t) => t.tag.toLowerCase().trim())
      );

      // Jaccard similarity: |A ∩ B| / |A ∪ B|
      const intersection = new Set(
        [...userInterests].filter((i) => hackathonTags.has(i))
      );
      const union = new Set([...userInterests, ...hackathonTags]);

      let relevanceScore = union.size > 0 ? intersection.size / union.size : 0;

      // Region bonus: slight boost if hackathon region matches user region
      if (profile.region && hackathon.region) {
        if (
          hackathon.region.toLowerCase() === profile.region.toLowerCase()
        ) {
          relevanceScore += 0.15;
        }
      }

      // Recency bonus: prefer events with registration closing soon (urgency)
      const daysUntilClose = Math.max(
        0,
        (new Date(hackathon.registrationEnd) - now) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilClose <= 7) {
        relevanceScore += 0.05;
      }

      return {
        hackathon: {
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
          teamCount: hackathon._count.teams,
          tags: hackathon.tags.map((t) => t.tag),
        },
        relevanceScore: Math.round(Math.min(relevanceScore, 1.0) * 1000) / 1000,
        matchedTags: Array.from(intersection),
      };
    });

    // 5. Sort by relevance and return top-N
    scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return scored.slice(0, limit);
  }

  /**
   * Fallback: return upcoming events sorted by registration deadline.
   */
  async _getUpcomingEvents(limit) {
    const now = new Date();
    const hackathons = await prisma.hackathon.findMany({
      where: {
        status: { in: ['REGISTRATION_OPEN'] },
        registrationEnd: { gte: now },
      },
      orderBy: { registrationEnd: 'asc' },
      take: limit,
      include: {
        tags: { select: { tag: true } },
        _count: { select: { teams: true } },
      },
    });

    return hackathons.map((h) => ({
      hackathon: {
        id: h.id,
        slug: h.slug,
        title: h.title,
        titleAm: h.titleAm,
        description: h.description,
        coverImageUrl: h.coverImageUrl,
        status: h.status,
        region: h.region,
        isVirtual: h.isVirtual,
        registrationStart: h.registrationStart,
        registrationEnd: h.registrationEnd,
        eventStart: h.eventStart,
        eventEnd: h.eventEnd,
        teamCount: h._count.teams,
        tags: h.tags.map((t) => t.tag),
      },
      relevanceScore: 0,
      matchedTags: [],
    }));
  }
}

module.exports = new RecommendationService();
