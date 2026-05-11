// =============================================================================
// HackET — Submissions Controller
// =============================================================================

const submissionsService = require('../services/submissions/submissions.service');
const catchAsync = require('../utils/catchAsync');

exports.upsert = catchAsync(async (req, res) => {
  if (req.files && req.files.length > 0) {
    req.body.fileUrls = req.files.map(f => `/uploads/${f.filename}`);
  }

  const submission = await submissionsService.upsert({
    teamId: req.body.teamId,
    userId: req.user.id,
    data: req.body,
  });

  res.status(200).json({
    success: true,
    message: 'Submission saved.',
    data: { submission },
  });
});

exports.submit = catchAsync(async (req, res) => {
  const submission = await submissionsService.submit(
    req.params.id,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Submission finalized successfully.',
    data: { submission },
  });
});

exports.getById = catchAsync(async (req, res) => {
  const submission = await submissionsService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: { submission },
  });
});

exports.listByHackathon = catchAsync(async (req, res) => {
  const { page, limit } = req.query;

  const result = await submissionsService.listByHackathon(
    req.params.hackathonId,
    {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
    }
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});
