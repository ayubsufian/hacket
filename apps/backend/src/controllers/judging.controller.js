// =============================================================================
// HackET — Judging Controller
// =============================================================================

const scoringService = require('../services/judging/scoring.service');
const leaderboardService = require('../services/judging/leaderboard.service');
const catchAsync = require('../utils/catchAsync');

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
  await scoringService.releaseFeedback(req.params.hackathonId);

  res.status(200).json({
    success: true,
    message: 'Feedback has been successfully released to participants.',
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
