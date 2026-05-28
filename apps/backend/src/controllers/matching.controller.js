// =============================================================================
// HackET - Matching Controller
// =============================================================================

const matchingService = require('../services/matching/matching.service');
const recommendationService = require('../services/matching/recommendation.service');
const catchAsync = require('../utils/catchAsync');

exports.suggestTeams = catchAsync(async (req, res) => {
  const { suggestions, metadata } = await matchingService.suggestTeams({
    userId: req.user.id,
    hackathonId: req.params.hackathonId,
    page: req.query.page,
    limit: req.query.limit,
    skills: req.query.skills,
    isOpen: req.query.isOpen,
  });

  res.status(200).json({
    success: true,
    data: { suggestions, metadata },
  });
});

exports.suggestMembers = catchAsync(async (req, res) => {
  const { suggestions, metadata } = await matchingService.suggestMembers({
    teamId: req.params.teamId,
    requesterId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    skills: req.query.skills,
    region: req.query.region,
  });

  res.status(200).json({
    success: true,
    data: { suggestions, metadata },
  });
});

exports.autoMatch = catchAsync(async (req, res) => {
  const result = await matchingService.autoMatch({
    userId: req.user.id,
    hackathonId: req.params.hackathonId,
    skills: req.body.skills || req.query.skills,
  });

  res.status(201).json({
    success: true,
    message: 'Auto-match completed.',
    data: result,
  });
});

exports.recommendEvents = catchAsync(async (req, res) => {
  const { limit, includeRegistered } = req.query;

  const { recommendations, metadata } = await recommendationService.recommendEvents(
    req.user.id,
    {
      limit,
      includeRegistered: String(includeRegistered).toLowerCase() === 'true',
    }
  );

  res.status(200).json({
    success: true,
    data: { recommendations, metadata },
  });
});

exports.getRecommendations = catchAsync(async (req, res) => {
  if (String(req.query.refresh).toLowerCase() === 'true') {
    await recommendationService.recommendEvents(req.user.id, {
      limit: req.query.limit,
      includeRegistered: String(req.query.includeRegistered).toLowerCase() === 'true',
    });
  }

  let result = await recommendationService.getRecommendations(req.user.id, req.query);

  if (result.pagination.total === 0) {
    await recommendationService.recommendEvents(req.user.id, {
      limit: req.query.limit,
      includeRegistered: String(req.query.includeRegistered).toLowerCase() === 'true',
    });
    result = await recommendationService.getRecommendations(req.user.id, req.query);
  }

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.markRecommendationViewed = catchAsync(async (req, res) => {
  const recommendation = await recommendationService.markViewed(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Recommendation marked as viewed.',
    data: { recommendation },
  });
});

exports.dismissRecommendation = catchAsync(async (req, res) => {
  const recommendation = await recommendationService.dismiss(req.user.id, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Recommendation dismissed.',
    data: { recommendation },
  });
});
