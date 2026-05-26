// =============================================================================
// HackET - Submissions Controller
// =============================================================================

const submissionsService = require('../services/submissions/submissions.service');
const storageService = require('../services/storage/storage.service');
const catchAsync = require('../utils/catchAsync');

exports.upsert = catchAsync(async (req, res) => {
  let fileUrls = [];
  if (req.files && req.files.length > 0) {
    fileUrls = req.files.map((file) => `/uploads/tmp/${file.filename}`);
    req.body.fileUrls = fileUrls;
  }

  const submission = await submissionsService.upsert({
    teamId: req.body.teamId,
    hackathonId: req.body.hackathonId,
    userId: req.user.id,
    data: req.body,
  });

  if (req.files && req.files.length > 0) {
    const newFileUrls = [];
    for (const file of req.files) {
      const filename = file.mimetype.startsWith('video/') ? 'video.mp4' : 'spec.pdf';
      const storageKey = `/submissions/${submission.id}/${filename}`;
      const newPath = await storageService.moveToBlobStorage(file.path, storageKey);

      if (newPath) {
        newFileUrls.push(`/api/v1/storage${newPath}`);
      }
    }

    const updated = await submissionsService.patch(submission.id, req.user.id, {
      fileUrls: newFileUrls,
    });
    submission.fileUrls = updated.fileUrls;
    submission.version = updated.version;
  }

  res.status(200).json({
    success: true,
    message: 'Submission saved.',
    data: { submission },
  });
});

exports.patch = catchAsync(async (req, res) => {
  const submission = await submissionsService.patch(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Submission updated.',
    data: { submission },
  });
});

exports.submit = catchAsync(async (req, res) => {
  const submission = await submissionsService.submit(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Submission finalized successfully.',
    data: { submission },
  });
});

exports.withdraw = catchAsync(async (req, res) => {
  const submission = await submissionsService.withdraw(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Submission withdrawn to draft.',
    data: { submission },
  });
});

exports.getById = catchAsync(async (req, res) => {
  const submission = await submissionsService.getById(req.params.id, req.user, {
    include: req.query.include,
  });

  res.status(200).json({
    success: true,
    data: { submission },
  });
});

exports.getHistory = catchAsync(async (req, res) => {
  const history = await submissionsService.getHistory(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: { history },
  });
});

exports.getFiles = catchAsync(async (req, res) => {
  const files = await submissionsService.getFiles(req.params.id, req.user);

  res.status(200).json({
    success: true,
    data: { files },
  });
});

exports.listMine = catchAsync(async (req, res) => {
  const result = await submissionsService.listMine(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.listByHackathon = catchAsync(async (req, res) => {
  const result = await submissionsService.listByHackathon(
    req.params.hackathonId,
    req.query
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});
