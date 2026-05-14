// =============================================================================
// HackET — Submissions Controller
// =============================================================================

const submissionsService = require('../services/submissions/submissions.service');
const storageService = require('../services/storage/storage.service');
const catchAsync = require('../utils/catchAsync');

exports.upsert = catchAsync(async (req, res) => {
  let fileUrls = [];
  if (req.files && req.files.length > 0) {
    fileUrls = req.files.map(f => `/uploads/tmp/${f.filename}`); // Temporary URLs
    req.body.fileUrls = fileUrls;
  }

  const submission = await submissionsService.upsert({
    teamId: req.body.teamId,
    userId: req.user.id,
    data: req.body,
  });

  // Now that we have the submission ID, move files to Blob Storage
  if (req.files && req.files.length > 0) {
    const newFileUrls = [];
    for (const f of req.files) {
      const filename = f.mimetype.startsWith('video/') ? 'video.mp4' : 'spec.pdf';
      const storageKey = `/submissions/${submission.id}/${filename}`;
      const newPath = await storageService.moveToBlobStorage(f.path, storageKey);
      
      if (newPath) {
        newFileUrls.push(`/api/v1/storage${newPath}`);
      }
    }

    // Update submission with new permanent URLs
    await submissionsService.upsert({
      teamId: req.body.teamId,
      userId: req.user.id,
      data: { ...req.body, fileUrls: newFileUrls },
    });
    submission.fileUrls = newFileUrls;
  }

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
