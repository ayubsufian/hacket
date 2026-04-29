// =============================================================================
// HackET — Matching Controller
// =============================================================================

const matchingService = require('../services/matching/matching.service');
const recommendationService = require('../services/matching/recommendation.service');
const catchAsync = require('../utils/catchAsync');

exports.suggestTeams = catchAsync(async (req, res) => {
  const { limit } = req.query;

  const suggestions = await matchingService.suggestTeams({
    userId: req.user.id,
    hackathonId: req.params.hackathonId,
    limit: parseInt(limit) || 10,
  });

  res.status(200).json({
    success: true,
    data: { suggestions },
  });
});

exports.suggestMembers = catchAsync(async (req, res) => {
  const { limit } = req.query;

  const suggestions = await matchingService.suggestMembers({
    teamId: req.params.teamId,
    limit: parseInt(limit) || 10,
  });

  res.status(200).json({
    success: true,
    data: { suggestions },
  });
});

exports.recommendEvents = catchAsync(async (req, res) => {
  const { limit } = req.query;

  const recommendations = await recommendationService.recommendEvents(
    req.user.id,
    { limit: parseInt(limit) || 10 }
  );

  res.status(200).json({
    success: true,
    data: { recommendations },
  });
});
