// =============================================================================
// HackET — Scoring Normalization Service  ⭐
// =============================================================================
//
// Implements the Internal Scoring Module with:
//   1. Outlier filtering (Modified Olympic: drop highest & lowest if ≥4 judges)
//   2. Min-Max normalization per criteria to eliminate judge scale bias
//   3. Weighted aggregation across criteria
//   4. Final ranking and Redis leaderboard caching
//
// This is a pure Use Case layer service — no HTTP concerns.
// =============================================================================

const prisma = require('../../config/database');
const { redisClient } = require('../../config/redis');
const eventBus = require('../../utils/eventBus');

// Redis key prefix for leaderboards
const LEADERBOARD_KEY = (hackathonId) => `leaderboard:${hackathonId}`;

class ScoringNormalizationService {
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Submit a score for a specific criteria on a submission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Submit or update a judge's score for a single criteria.
   * @param {object} params
   * @param {string} params.judgeId
   * @param {string} params.submissionId
   * @param {string} params.criteriaId
   * @param {number} params.value
   * @param {string} [params.comment]
   * @returns {object} The created/updated Score record
   */
  async submitScore({ judgeId, submissionId, criteriaId, value, comment }) {
    // Validate: criteria exists and score is within range
    const criteria = await prisma.judgingCriteria.findUnique({
      where: { id: criteriaId },
    });
    if (!criteria) {
      const AppError = require('../../utils/AppError');
      throw new AppError('Judging criteria not found.', 404);
    }
    if (value < 0 || value > criteria.maxScore) {
      const AppError = require('../../utils/AppError');
      throw new AppError(
        `Score must be between 0 and ${criteria.maxScore}.`,
        400
      );
    }

    // Upsert score (a judge can update their score)
    const score = await prisma.score.upsert({
      where: {
        submissionId_judgeId_criteriaId: {
          submissionId,
          judgeId,
          criteriaId,
        },
      },
      update: { value, comment, updatedAt: new Date() },
      create: { submissionId, judgeId, criteriaId, value, comment },
    });

    // Emit event for audit logging
    eventBus.emit('audit:log', {
      actorId: judgeId,
      action: 'SCORE_SUBMIT',
      entity: 'score',
      entityId: score.id,
      details: { submissionId, criteriaId, value },
    });

    return score;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Normalize and rank all submissions for a hackathon
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run the full normalization pipeline for a hackathon.
   * Updates finalScore and rank on each Submission.
   * Caches the leaderboard in Redis.
   *
   * @param {string} hackathonId
   * @returns {Array<{ submissionId, teamName, finalScore, rank }>}
   */
  async normalizeAndRank(hackathonId) {
    // 1. Fetch all submissions with their scores, criteria, and team info
    const submissions = await prisma.submission.findMany({
      where: { hackathonId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SCORED'] } },
      include: {
        scores: {
          include: { criteria: true },
        },
        team: { select: { id: true, name: true } },
      },
    });

    // 2. Fetch criteria definitions (for weights)
    const criteria = await prisma.judgingCriteria.findMany({
      where: { hackathonId },
      orderBy: { sortOrder: 'asc' },
    });

    if (criteria.length === 0) {
      const AppError = require('../../utils/AppError');
      throw new AppError('No judging criteria defined for this hackathon.', 400);
    }

    const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

    // 3. Process each submission
    const results = [];

    for (const submission of submissions) {
      const finalScore = this._computeFinalScore(submission.scores, criteriaMap);
      results.push({
        submissionId: submission.id,
        teamId: submission.team.id,
        teamName: submission.team.name,
        finalScore,
      });
    }

    // 4. Sort by finalScore descending and assign ranks
    results.sort((a, b) => b.finalScore - a.finalScore);
    results.forEach((r, idx) => {
      r.rank = idx + 1;
    });

    // 5. Persist results to database (transactional)
    await prisma.$transaction(
      results.map((r) =>
        prisma.submission.update({
          where: { id: r.submissionId },
          data: {
            finalScore: r.finalScore,
            rank: r.rank,
            status: 'SCORED',
          },
        })
      )
    );

    // 6. Cache leaderboard in Redis sorted set
    await this._cacheLeaderboard(hackathonId, results);

    // 7. Emit event
    eventBus.emit('scores:updated', { hackathonId });

    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get cached leaderboard from Redis
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Retrieve the leaderboard from Redis cache.
   * Falls back to database if cache miss.
   * @param {string} hackathonId
   * @param {number} [limit=50]
   * @returns {Array<{ rank, teamName, finalScore }>}
   */
  async getLeaderboard(hackathonId, limit = 50) {
    const key = LEADERBOARD_KEY(hackathonId);

    try {
      // Try Redis first
      const cached = await redisClient.get(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        return parsed.slice(0, limit);
      }
    } catch (err) {
      console.warn('[Scoring] Redis cache miss, falling back to DB:', err.message);
    }

    // Fallback: query database
    const submissions = await prisma.submission.findMany({
      where: { hackathonId, finalScore: { not: null } },
      orderBy: { rank: 'asc' },
      take: limit,
      include: {
        team: { select: { name: true } },
      },
    });

    return submissions.map((s) => ({
      rank: s.rank,
      submissionId: s.id,
      teamName: s.team.name,
      finalScore: Math.round(s.finalScore * 1000) / 1000,
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Compute final weighted score for a single submission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {Array} scores - Score records for one submission
   * @param {Map} criteriaMap - Map of criteriaId → JudgingCriteria
   * @returns {number} Normalized weighted final score
   */
  _computeFinalScore(scores, criteriaMap) {
    if (scores.length === 0) return 0;

    // Group scores by judge
    const scoresByJudge = new Map();
    for (const score of scores) {
      if (!scoresByJudge.has(score.judgeId)) {
        scoresByJudge.set(score.judgeId, []);
      }
      scoresByJudge.get(score.judgeId).push(score);
    }

    // ── Step 1: Outlier filtering (Modified Olympic Scoring) ────────────
    // If ≥4 judges, drop the judge with the highest and lowest total score
    let filteredJudgeIds = Array.from(scoresByJudge.keys());

    if (filteredJudgeIds.length >= 4) {
      const judgeTotals = filteredJudgeIds.map((judgeId) => {
        const judgeScores = scoresByJudge.get(judgeId);
        const total = judgeScores.reduce((sum, s) => sum + s.value, 0);
        return { judgeId, total };
      });

      judgeTotals.sort((a, b) => a.total - b.total);

      // Drop lowest and highest
      const dropped = new Set([
        judgeTotals[0].judgeId,
        judgeTotals[judgeTotals.length - 1].judgeId,
      ]);

      filteredJudgeIds = filteredJudgeIds.filter((id) => !dropped.has(id));
    }

    // Collect remaining scores
    const filteredScores = scores.filter((s) =>
      filteredJudgeIds.includes(s.judgeId)
    );

    // ── Step 2: Normalize per criteria ──────────────────────────────────
    // Group filtered scores by criteria
    const scoresByCriteria = new Map();
    for (const score of filteredScores) {
      if (!scoresByCriteria.has(score.criteriaId)) {
        scoresByCriteria.set(score.criteriaId, []);
      }
      scoresByCriteria.get(score.criteriaId).push(score.value);
    }

    // ── Step 3: Weighted aggregation ────────────────────────────────────
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [criteriaId, values] of scoresByCriteria) {
      const criteriaInfo = criteriaMap.get(criteriaId);
      if (!criteriaInfo) continue;

      const { maxScore, weight } = criteriaInfo;

      // Average score for this criteria across remaining judges
      const avg = values.reduce((s, v) => s + v, 0) / values.length;

      // Min-Max normalize to [0, 1] based on criteria's maxScore
      // (0 is always the minimum possible)
      const normalized = maxScore > 0 ? avg / maxScore : 0;

      weightedSum += normalized * weight;
      totalWeight += weight;
    }

    // Final score as percentage (0-100)
    const finalScore = totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;

    return Math.round(finalScore * 1000) / 1000; // 3 decimal precision
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Cache leaderboard in Redis
  // ─────────────────────────────────────────────────────────────────────────

  async _cacheLeaderboard(hackathonId, results) {
    const key = LEADERBOARD_KEY(hackathonId);
    const leaderboard = results.map((r) => ({
      rank: r.rank,
      submissionId: r.submissionId,
      teamName: r.teamName,
      finalScore: r.finalScore,
    }));

    try {
      await redisClient.set(key, JSON.stringify(leaderboard), {
        EX: 60 * 5, // Cache for 5 minutes
      });
    } catch (err) {
      console.warn('[Scoring] Failed to cache leaderboard:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get detailed score breakdown for a submission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {string} submissionId
   * @returns {object} Detailed score breakdown by criteria and judge
   */
  async getScoreBreakdown(submissionId) {
    const scores = await prisma.score.findMany({
      where: { submissionId },
      include: {
        criteria: { select: { name: true, maxScore: true, weight: true } },
        judge: { select: { id: true, email: true } },
      },
      orderBy: [{ criteria: { sortOrder: 'asc' } }, { createdAt: 'asc' }],
    });

    // Group by criteria
    const breakdown = {};
    for (const score of scores) {
      const key = score.criteria.name;
      if (!breakdown[key]) {
        breakdown[key] = {
          criteriaName: score.criteria.name,
          maxScore: score.criteria.maxScore,
          weight: score.criteria.weight,
          judges: [],
        };
      }
      breakdown[key].judges.push({
        judgeId: score.judge.id,
        value: score.value,
        comment: score.comment,
      });
    }

    return Object.values(breakdown);
  }
}

module.exports = new ScoringNormalizationService();
