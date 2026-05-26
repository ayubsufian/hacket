// =============================================================================
// HackET - Judging Controller
// =============================================================================

const scoringService = require('../services/judging/scoring.service');
const leaderboardService = require('../services/judging/leaderboard.service');
const catchAsync = require('../utils/catchAsync');
const prisma = require('../config/database');
const AppError = require('../utils/AppError');

const CRITERIA_VIEW_ROLES = ['CO_ORGANIZER', 'TECHNICAL_LEAD', 'JUDGE'];
const CRITERIA_MANAGE_ROLES = ['CO_ORGANIZER', 'TECHNICAL_LEAD'];

exports.addCriteria = catchAsync(async (req, res) => {
  const criteria = await scoringService.addCriteria(
    req.params.hackathonId,
    req.body,
    req.user.id
  );

  res.status(201).json({
    success: true,
    data: { criteria },
  });
});

exports.getCriteria = catchAsync(async (req, res) => {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  });

  if (hackathon) {
    await ensureEventStaffAccess(req.user, req.params.id, CRITERIA_VIEW_ROLES);
    const criteria = await scoringService.listCriteria(req.params.id);
    return res.status(200).json({
      success: true,
      data: { criteria },
    });
  }

  const criteria = await scoringService.getCriteria(req.params.id);
  await ensureEventStaffAccess(req.user, criteria.hackathonId, CRITERIA_VIEW_ROLES);

  res.status(200).json({
    success: true,
    data: { criteria },
  });
});

exports.updateCriteria = catchAsync(async (req, res) => {
  const criteria = await scoringService.getCriteria(req.params.id);
  await ensureEventStaffAccess(req.user, criteria.hackathonId, CRITERIA_MANAGE_ROLES);

  const updated = await scoringService.updateCriteria(req.params.id, req.body, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Criteria updated.',
    data: { criteria: updated },
  });
});

exports.removeCriteria = catchAsync(async (req, res) => {
  const criteria = await scoringService.getCriteria(req.params.id);
  await ensureEventStaffAccess(req.user, criteria.hackathonId, CRITERIA_MANAGE_ROLES);
  await scoringService.removeCriteria(req.params.id, req.user.id);

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

exports.submitBatchScores = catchAsync(async (req, res) => {
  const scores = await scoringService.submitBatch(req.user.id, req.body.scores);

  res.status(200).json({
    success: true,
    message: 'Scores submitted.',
    data: { scores },
  });
});

exports.getMyScores = catchAsync(async (req, res) => {
  const { hackathonId } = req.query;
  if (!hackathonId) throw new AppError('hackathonId is required.', 400);

  await ensureActiveJudge(req.user.id, hackathonId);
  const scores = await scoringService.getScoresForJudge(req.user.id, hackathonId);

  res.status(200).json({
    success: true,
    data: { scores },
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
  const result = await leaderboardService.getLeaderboard(
    req.params.hackathonId,
    {
      page: parseInt(req.query.page, 10) || 1,
      limit: parseInt(req.query.limit, 10) || 25,
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

exports.deleteAssignment = catchAsync(async (req, res) => {
  const assignment = await prisma.judgingAssignment.findUnique({
    where: { id: req.params.assignmentId },
  });
  if (!assignment) throw new AppError('Judging assignment not found.', 404);

  await ensureEventStaffAccess(req.user, assignment.hackathonId, CRITERIA_MANAGE_ROLES);
  await scoringService.deleteJudgingAssignment(req.params.assignmentId, req.user.id);

  res.status(204).send();
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

exports.getReviewProgress = catchAsync(async (req, res) => {
  await ensureEventStaffAccess(req.user, req.params.hackathonId, CRITERIA_MANAGE_ROLES);
  const progress = await scoringService.getReviewProgress(req.params.hackathonId);

  res.status(200).json({
    success: true,
    data: { progress },
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

async function ensureActiveJudge(userId, hackathonId) {
  const assignment = await prisma.staffAssignment.findFirst({
    where: {
      userId,
      hackathonId,
      staffRole: 'JUDGE',
      isActive: true,
    },
  });

  if (!assignment) {
    throw new AppError('Forbidden. You must be an active judge for this hackathon.', 403);
  }
}

async function ensureEventStaffAccess(user, hackathonId, allowedRoles) {
  if (user.role === 'ADMIN') return;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { organizerId: true },
  });

  if (!hackathon) throw new AppError('Hackathon not found.', 404);
  if (hackathon.organizerId === user.id) return;

  const assignment = await prisma.staffAssignment.findFirst({
    where: {
      userId: user.id,
      hackathonId,
      staffRole: { in: allowedRoles },
      isActive: true,
    },
  });

  if (!assignment) {
    throw new AppError(`Forbidden. Requires one of: ${allowedRoles.join(', ')}.`, 403);
  }
}
