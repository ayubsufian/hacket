// =============================================================================
// HackET — Judging Controller
// =============================================================================

const scoringService = require('../services/judging/scoring.service');
const leaderboardService = require('../services/judging/leaderboard.service');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

exports.addCriteria = catchAsync(async (req, res) => {
  const criteria = await prisma.judgingCriteria.create({
    data: {
      hackathonId: req.params.hackathonId,
      ...req.body
    }
  });

  res.status(201).json({
    success: true,
    data: { criteria }
  });
});

exports.removeCriteria = catchAsync(async (req, res) => {
  const criteria = await prisma.judgingCriteria.findUnique({
    where: { id: req.params.id },
    include: { hackathon: true }
  });

  if (!criteria) {
    throw new AppError('Criteria not found.', 404);
  }

  // Authorize dynamically
  if (req.user.role !== 'ADMIN' && criteria.hackathon.organizerId !== req.user.id) {
    const staffAssignment = await prisma.staffAssignment.findFirst({
      where: {
        userId: req.user.id,
        hackathonId: criteria.hackathonId,
        staffRole: { in: ['CO_ORGANIZER', 'TECHNICAL_LEAD'] },
        isActive: true
      }
    });

    if (!staffAssignment) {
      throw new AppError('Forbidden. You do not have permission to delete judging criteria.', 403);
    }
  }

  await prisma.judgingCriteria.delete({ where: { id: req.params.id } });

  res.status(204).send();
});

exports.submitScore = catchAsync(async (req, res) => {
  const { submissionId, criteriaId, value, comment } = req.body;

  const score = await scoringService.submitScore({
    judgeId: req.user.id,
    submissionId,
    criteriaId,
    value,
    comment,
  });

  res.status(200).json({
    success: true,
    message: 'Score submitted.',
    data: { score },
  });
});

exports.normalizeScores = catchAsync(async (req, res) => {
  const results = await scoringService.normalizeAndRank(req.params.hackathonId);

  res.status(200).json({
    success: true,
    message: `Scores normalized. ${results.length} submissions ranked.`,
    data: { results },
  });
});

exports.getLeaderboard = catchAsync(async (req, res) => {
  const { page, limit } = req.query;

  const result = await leaderboardService.getLeaderboard(
    req.params.hackathonId,
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 25,
    }
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
    metadata: result.metadata,
  });
});

exports.releaseFeedback = catchAsync(async (req, res) => {
  await scoringService.releaseFeedback(req.params.hackathonId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Feedback has been successfully released to participants.',
  });
});

exports.setAssignments = catchAsync(async (req, res) => {
  const assignments = await scoringService.setJudgingAssignments(
    req.params.hackathonId,
    req.body.assignments,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Judging assignments updated.',
    data: { assignments },
  });
});

exports.getAssignments = catchAsync(async (req, res) => {
  const assignments = await scoringService.getJudgingAssignments(
    req.params.hackathonId,
    {
      judgeId: req.eventStaffRole === 'JUDGE' && req.user.role !== 'ADMIN'
        ? req.user.id
        : null,
    }
  );

  res.status(200).json({
    success: true,
    data: { assignments },
  });
});

exports.getScoreBreakdown = catchAsync(async (req, res) => {
  const result = await scoringService.getScoreBreakdown(
    req.params.submissionId,
    req.user
  );

  res.status(200).json({
    success: true,
    message: result.message || undefined,
    data: { breakdown: result.breakdown },
  });
});
