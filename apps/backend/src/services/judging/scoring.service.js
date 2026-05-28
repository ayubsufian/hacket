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
const AppError = require('../../utils/AppError');

// Redis key prefix for leaderboards
const LEADERBOARD_KEY = (hackathonId) => `leaderboard:${hackathonId}`;

const CRITERIA_LOCKED_STATUSES = new Set([
  'IN_PROGRESS',
  'JUDGING',
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
  'ARCHIVED',
]);

const ASSIGNMENT_LOCKED_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'SUSPENDED',
  'ARCHIVED',
]);

class ScoringNormalizationService {
  async listCriteria(hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true },
    });
    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    return prisma.judgingCriteria.findMany({
      where: { hackathonId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getCriteria(criteriaId) {
    const criteria = await prisma.judgingCriteria.findUnique({
      where: { id: criteriaId },
      include: { hackathon: { select: { id: true, title: true, status: true } } },
    });

    if (!criteria) throw new AppError('Criteria not found.', 404);
    return criteria;
  }

  async addCriteria(hackathonId, data, actorId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, status: true },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (CRITERIA_LOCKED_STATUSES.has(hackathon.status)) {
      throw new AppError('Judging criteria must be finalized before the hackathon starts.', 409);
    }

    const criteria = await prisma.judgingCriteria.create({
      data: { hackathonId, ...data },
    });

    eventBus.emit('audit:log', {
      actorId,
      action: 'JUDGING_CRITERIA_CREATED',
      entity: 'judgingCriteria',
      entityId: criteria.id,
      details: { hackathonId, name: criteria.name },
    });

    return criteria;
  }

  async updateCriteria(criteriaId, data, actorId) {
    const criteria = await prisma.judgingCriteria.findUnique({
      where: { id: criteriaId },
      include: { hackathon: { select: { status: true } } },
    });

    if (!criteria) throw new AppError('Criteria not found.', 404);
    if (CRITERIA_LOCKED_STATUSES.has(criteria.hackathon.status)) {
      throw new AppError('Judging criteria cannot be changed after the hackathon starts.', 409);
    }

    const updated = await prisma.judgingCriteria.update({
      where: { id: criteriaId },
      data,
    });

    eventBus.emit('audit:log', {
      actorId,
      action: 'JUDGING_CRITERIA_UPDATED',
      entity: 'judgingCriteria',
      entityId: criteriaId,
      details: { hackathonId: criteria.hackathonId, fields: Object.keys(data) },
    });

    return updated;
  }

  async removeCriteria(criteriaId, actorId) {
    const criteria = await prisma.judgingCriteria.findUnique({
      where: { id: criteriaId },
      include: { hackathon: { select: { status: true } } },
    });

    if (!criteria) throw new AppError('Criteria not found.', 404);
    if (CRITERIA_LOCKED_STATUSES.has(criteria.hackathon.status)) {
      throw new AppError('Judging criteria cannot be removed after the hackathon starts.', 409);
    }

    await prisma.judgingCriteria.delete({ where: { id: criteriaId } });

    eventBus.emit('audit:log', {
      actorId,
      action: 'JUDGING_CRITERIA_DELETED',
      entity: 'judgingCriteria',
      entityId: criteriaId,
      details: { hackathonId: criteria.hackathonId, name: criteria.name },
    });
  }

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
      include: { hackathon: true } // Need hackathonId to verify staff role
    });
    
    if (!criteria) {
      throw new AppError('Scoring criteria unavailable. Please try again.', 404);
    }

    if (criteria.hackathon.status !== 'JUDGING') {
      throw new AppError('Scores can only be submitted during the judging phase.', 409);
    }

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { id: true, hackathonId: true, status: true },
    });

    if (!submission || submission.hackathonId !== criteria.hackathonId) {
      throw new AppError('Submission does not belong to this judging criteria.', 400);
    }

    if (!['SUBMITTED', 'UNDER_REVIEW', 'SCORED'].includes(submission.status)) {
      throw new AppError('Only submitted projects can be scored.', 400);
    }

    // 2026 Security: Ensure the user is actually assigned as a JUDGE for this hackathon
    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: judgeId,
        hackathonId: criteria.hackathonId,
        staffRole: 'JUDGE',
        isActive: true
      }
    });

    if (!staffAssignment) {
      throw new AppError('Forbidden. You must be assigned as a JUDGE to evaluate submissions for this event.', 403);
    }

    if (criteria.hackathon.judgingMode === 'ASSIGNED_JUDGES') {
      const assignment = await prisma.judgingAssignment.findUnique({
        where: {
          submissionId_judgeId: {
            submissionId,
            judgeId,
          },
        },
      });

      if (!assignment) {
        throw new AppError('Forbidden. You are not assigned to judge this submission.', 403);
      }
    }
    if (value < 0 || value > criteria.maxScore) {
      throw new AppError(
        `Score must be between 0 and ${criteria.maxScore}.`,
        400
      );
    }

    // AF2 check: ensure judge hasn't already scored this criteria
    const existingScore = await prisma.score.findUnique({
      where: {
        submissionId_judgeId_criteriaId: {
          submissionId,
          judgeId,
          criteriaId,
        },
      },
    });

    if (existingScore) {
      throw new AppError('You have already scored this project.', 403);
    }

    if (criteria.hackathon.judgingMode === 'MINIMUM_REVIEWS') {
      const judgeAlreadyReviewed = await prisma.score.findFirst({
        where: { submissionId, judgeId },
        select: { id: true },
      });

      if (!judgeAlreadyReviewed) {
        const effectiveRequired = await this.recalculateEffectiveReviews(criteria.hackathonId);
        const distinctReviews = await prisma.score.findMany({
          where: { submissionId },
          distinct: ['judgeId'],
          select: { judgeId: true },
        });

        if (distinctReviews.length >= effectiveRequired) {
          throw new AppError('This submission has already received the required number of reviews.', 409);
        }
      }
    }

    // Create score (no updates allowed)
    const score = await prisma.score.create({
      data: { submissionId, judgeId, criteriaId, value, comment },
    });

    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'UNDER_REVIEW' },
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

  async submitBatch(judgeId, scores) {
    if (!Array.isArray(scores) || scores.length === 0) {
      throw new AppError('At least one score is required.', 400);
    }

    const created = [];
    for (const score of scores) {
      created.push(await this.submitScore({ judgeId, ...score }));
    }

    return created;
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
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: {
        id: true,
        status: true,
        judgingMode: true,
        requiredReviewsPerSubmission: true,
        effectiveRequiredReviewsPerSubmission: true,
      },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (hackathon.status !== 'JUDGING') {
      throw new AppError('Scores can only be normalized during the judging phase.', 409);
    }

    const effectiveRequired = await this.recalculateEffectiveReviews(hackathonId);

    // 1. Fetch all submissions with their scores, criteria, and team info
    const submissions = await prisma.submission.findMany({
      where: { hackathonId, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SCORED'] } },
      include: {
        scores: {
          include: { criteria: true },
          orderBy: { createdAt: 'asc' },
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
      throw new AppError('No judging criteria defined for this hackathon.', 400);
    }

    const criteriaMap = new Map(criteria.map((c) => [c.id, c]));

    // 3. Process each submission
    const results = [];

    for (const submission of submissions) {
      const scoresForRanking = hackathon.judgingMode === 'MINIMUM_REVIEWS'
        ? this._limitScoresToRequiredReviews(submission.scores, effectiveRequired)
        : submission.scores;
      const finalScore = this._computeFinalScore(scoresForRanking, criteriaMap);
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
      results.flatMap((r) => [
        prisma.submission.update({
          where: { id: r.submissionId },
          data: {
            finalScore: r.finalScore,
            rank: r.rank,
            status: 'SCORED',
          },
        }),
        prisma.scoreboardEntry.upsert({
          where: {
            hackathonId_submissionId: {
              hackathonId,
              submissionId: r.submissionId,
            },
          },
          update: {
            finalScore: r.finalScore,
            rank: r.rank,
            aggregatedAt: new Date(),
          },
          create: {
            hackathonId,
            submissionId: r.submissionId,
            finalScore: r.finalScore,
            rank: r.rank,
          },
        }),
      ])
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
      // Try Redis first (ZSET, highest to lowest)
      const cached = await redisClient.zRange(key, 0, limit - 1, { REV: true });
      if (cached && cached.length > 0) {
        return cached.map(c => JSON.parse(c));
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

  /**
   * Release final judging feedback and scores to participants.
   * This makes feedback visible and sends a broadcast notification.
   * @param {string} hackathonId 
   * @param {string} releasedByUserId
   */
  async releaseFeedback(hackathonId, releasedByUserId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId }
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    if (hackathon.status !== 'COMPLETED') {
      throw new AppError('Feedback can only be released after judging has been completed.', 409);
    }

    // 1. Update all submissions to make feedback visible
    await prisma.submission.updateMany({
      where: { hackathonId },
      data: { isFeedbackVisible: true }
    });

    // 2. Emit event to trigger the broadcast notification pipeline we just built!
    eventBus.emit('scores:published', { 
      hackathonId, 
      title: hackathon.title,
      releasedBy: releasedByUserId 
    });

    // Invalidate caches
    try {
      await redisClient.del(`leaderboard:${hackathonId}`);
    } catch (err) {
      console.warn('[Scoring] Redis cache invalidation error:', err.message);
    }

    return true;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE: Compute final weighted score for a single submission
  // ─────────────────────────────────────────────────────────────────────────

  async setJudgingAssignments(hackathonId, assignments, assignedBy) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { id: true, status: true },
    });

    if (!hackathon) {
      throw new AppError('Hackathon not found.', 404);
    }

    if (ASSIGNMENT_LOCKED_STATUSES.has(hackathon.status)) {
      throw new AppError('Judging assignments cannot be changed after completion.', 409);
    }

    const uniqueAssignments = Array.from(
      new Map(assignments.map((assignment) => (
        [`${assignment.submissionId}:${assignment.judgeId}`, assignment]
      ))).values(),
    );

    const submissionIds = [...new Set(uniqueAssignments.map((assignment) => assignment.submissionId))];
    const judgeIds = [...new Set(uniqueAssignments.map((assignment) => assignment.judgeId))];

    const [submissionCount, activeJudgeCount] = await Promise.all([
      prisma.submission.count({
        where: {
          id: { in: submissionIds },
          hackathonId,
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SCORED'] },
        },
      }),
      prisma.staffAssignment.count({
        where: {
          hackathonId,
          userId: { in: judgeIds },
          staffRole: 'JUDGE',
          isActive: true,
        },
      }),
    ]);

    if (submissionCount !== submissionIds.length) {
      throw new AppError('All assigned submissions must belong to this hackathon and be submitted.', 400);
    }

    if (activeJudgeCount !== judgeIds.length) {
      throw new AppError('All assigned judges must be active judges for this hackathon.', 400);
    }

    await prisma.$transaction([
      prisma.judgingAssignment.deleteMany({ where: { hackathonId } }),
      ...uniqueAssignments.map((assignment) => (
        prisma.judgingAssignment.create({
          data: {
            hackathonId,
            submissionId: assignment.submissionId,
            judgeId: assignment.judgeId,
            assignedBy,
          },
        })
      )),
    ]);

    eventBus.emit('audit:log', {
      actorId: assignedBy,
      action: 'UPDATE',
      entity: 'hackathon',
      entityId: hackathonId,
      details: {
        action: 'judging_assignments_updated',
        assignmentCount: uniqueAssignments.length,
      },
    });

    return this.getJudgingAssignments(hackathonId);
  }

  async getJudgingAssignments(hackathonId, { judgeId = null } = {}) {
    const assignments = await prisma.judgingAssignment.findMany({
      where: {
        hackathonId,
        ...(judgeId ? { judgeId } : {}),
      },
      include: {
        submission: {
          select: {
            id: true,
            title: true,
            team: { select: { name: true } },
          },
        },
        judge: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ submissionId: 'asc' }, { judgeId: 'asc' }],
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      submissionId: assignment.submissionId,
      submissionTitle: assignment.submission.title,
      teamName: assignment.submission.team?.name || null,
      judgeId: assignment.judgeId,
      judgeEmail: assignment.judge.email,
      judgeName: [
        assignment.judge.profile?.firstName,
        assignment.judge.profile?.lastName,
      ].filter(Boolean).join(' ') || null,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
    }));
  }

  async deleteJudgingAssignment(assignmentId, actorId) {
    const assignment = await prisma.judgingAssignment.findUnique({
      where: { id: assignmentId },
      include: { hackathon: { select: { id: true, status: true } } },
    });

    if (!assignment) throw new AppError('Judging assignment not found.', 404);
    if (ASSIGNMENT_LOCKED_STATUSES.has(assignment.hackathon.status)) {
      throw new AppError('Judging assignments cannot be changed after the event is finalized.', 409);
    }

    await prisma.judgingAssignment.delete({ where: { id: assignmentId } });

    eventBus.emit('audit:log', {
      actorId,
      action: 'JUDGING_ASSIGNMENT_DELETED',
      entity: 'judgingAssignment',
      entityId: assignmentId,
      details: {
        hackathonId: assignment.hackathonId,
        submissionId: assignment.submissionId,
        judgeId: assignment.judgeId,
      },
    });
  }

  async getScoresForJudge(judgeId, hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { status: true },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);
    if (['DRAFT', 'UPCOMING', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED', 'IN_PROGRESS'].includes(hackathon.status)) {
      throw new AppError('Judge scores are not available before judging begins.', 409);
    }

    return prisma.score.findMany({
      where: {
        judgeId,
        submission: { hackathonId },
      },
      include: {
        criteria: { select: { id: true, name: true, maxScore: true, weight: true } },
        submission: {
          select: {
            id: true,
            title: true,
            team: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ submissionId: 'asc' }, { criteria: { sortOrder: 'asc' } }],
    });
  }

  async getReviewProgress(hackathonId) {
    const effectiveRequired = await this.recalculateEffectiveReviews(hackathonId);

    const submissions = await prisma.submission.findMany({
      where: {
        hackathonId,
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SCORED'] },
      },
      include: {
        team: { select: { id: true, name: true } },
        scores: {
          distinct: ['judgeId'],
          select: { judgeId: true },
        },
      },
      orderBy: { submittedAt: 'asc' },
    });

    return submissions.map((submission) => ({
      submissionId: submission.id,
      title: submission.title,
      team: submission.team,
      reviewCount: submission.scores.length,
      requiredReviews: effectiveRequired,
      isComplete: submission.scores.length >= effectiveRequired,
    }));
  }

  async recalculateEffectiveReviews(hackathonId) {
    const hackathon = await prisma.hackathon.findUnique({
      where: { id: hackathonId },
      select: { requiredReviewsPerSubmission: true },
    });

    if (!hackathon) throw new AppError('Hackathon not found.', 404);

    const judgeCount = await prisma.staffAssignment.count({
      where: { hackathonId, staffRole: 'JUDGE', isActive: true },
    });

    const effective = Math.min(hackathon.requiredReviewsPerSubmission || 1, judgeCount || 0);

    await prisma.hackathon.update({
      where: { id: hackathonId },
      data: { effectiveRequiredReviewsPerSubmission: effective },
    });

    return effective;
  }

  _limitScoresToRequiredReviews(scores, requiredReviews) {
    if (!requiredReviews || requiredReviews <= 0) return [];

    const scoresByJudge = new Map();
    for (const score of scores) {
      if (!scoresByJudge.has(score.judgeId)) {
        scoresByJudge.set(score.judgeId, []);
      }
      scoresByJudge.get(score.judgeId).push(score);
    }

    const selectedJudgeIds = Array.from(scoresByJudge.entries())
      .map(([judgeId, judgeScores]) => ({
        judgeId,
        firstScoreAt: judgeScores.reduce((earliest, score) => (
          score.createdAt < earliest ? score.createdAt : earliest
        ), judgeScores[0].createdAt),
      }))
      .sort((a, b) => a.firstScoreAt - b.firstScoreAt)
      .slice(0, requiredReviews)
      .map((entry) => entry.judgeId);

    const selected = new Set(selectedJudgeIds);
    return scores.filter((score) => selected.has(score.judgeId));
  }

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
    } else {
      // AF1: Insufficient Scores Warning
      eventBus.emit('audit:log', {
        actorId: null,
        action: 'WARNING_INSUFFICIENT_SCORES',
        entity: 'submission',
        entityId: scores[0].submissionId,
        details: { 
          judgeCount: filteredJudgeIds.length, 
          message: 'Insufficient scores for normalization. Simple average used.' 
        },
      });
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

    try {
      const multi = redisClient.multi();
      multi.del(key); // Clear existing
      
      results.forEach((r) => {
        const member = JSON.stringify({
          rank: r.rank,
          submissionId: r.submissionId,
          teamName: r.teamName,
          finalScore: r.finalScore,
        });
        multi.zAdd(key, { score: r.finalScore, value: member });
      });
      
      multi.expire(key, 60 * 5); // Cache for 5 minutes
      await multi.exec();
    } catch (err) {
      console.warn('[Scoring] Failed to cache leaderboard ZSET:', err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC: Get detailed score breakdown for a submission
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {string} submissionId
   * @param {object} user
   * @returns {object} Detailed score breakdown by criteria and judge
   */
  async getScoreBreakdown(submissionId, user) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        team: { include: { members: true } },
        hackathon: true
      }
    });

    if (!submission) {
      throw new AppError('Submission not found.', 404);
    }

    if (!['COMPLETED', 'ARCHIVED'].includes(submission.hackathon.status)) {
      throw new AppError('Score breakdown is only visible after final results are published.', 403);
    }

    if (user.role !== 'ADMIN') {
      const isParticipantMember = submission.team.members.some(m => m.userId === user.id);
      const isOrganizer = submission.hackathon.organizerId === user.id;
      let isEventStaff = false;

      if (!isParticipantMember && !isOrganizer) {
        const staff = await prisma.staffAssignment.findFirst({
          where: {
            userId: user.id,
            hackathonId: submission.hackathonId,
            isActive: true,
            staffRole: { in: ['CO_ORGANIZER', 'TECHNICAL_LEAD', 'JUDGE'] },
          },
        });
        isEventStaff = !!staff;
      }

      if (!isParticipantMember && !isOrganizer && !isEventStaff) {
        throw new AppError('You do not have access to this score breakdown.', 403);
      }
    }

    if (user.role === 'PARTICIPANT') {
      const isMember = submission.team.members.some(m => m.userId === user.id);
      if (!isMember) {
        throw new AppError('You do not have access to this submission.', 403);
      }

      if (submission.hackathon.feedbackVisibility !== 'RELEASED' && !submission.isFeedbackVisible) {
        throw new AppError('Feedback release is locked until all final results are published.', 403);
      }
    }

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

    const breakdownArray = Object.values(breakdown);

    let message = null;
    if (user.role === 'PARTICIPANT') {
      const hasFeedback = scores.some(s => s.comment && s.comment.trim().length > 0);
      if (!hasFeedback) {
        message = 'No written feedback was provided by the Judge for this submission.';
      }
    }

    return { breakdown: breakdownArray, message };
  }

}

module.exports = new ScoringNormalizationService();

