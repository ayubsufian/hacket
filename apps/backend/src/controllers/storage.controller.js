const fs = require('fs');
const path = require('path');
const storageService = require('../services/storage/storage.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

/**
 * 2026 Security: Validate path segments to prevent path traversal attacks
 */
const validatePathSegment = (segment) => {
  if (!segment || segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
    return false;
  }
  return true;
};

/**
 * Serves a public blob.
 */
exports.getPublicBlob = catchAsync(async (req, res, next) => {
  const { folder, entityId, filename } = req.params;

  // 2026 Security: Prevent path traversal
  if (!validatePathSegment(folder) || !validatePathSegment(entityId) || !validatePathSegment(filename)) {
    return next(new AppError('Invalid file path.', 400));
  }

  const storageKey = `/${folder}/${entityId}/${filename}`;
  const absolutePath = storageService.getAbsolutePath(storageKey);

  if (!fs.existsSync(absolutePath)) {
    return next(new AppError('File not found', 404));
  }

  res.sendFile(absolutePath);
});

/**
 * Serves an authenticated blob (e.g. Technical Docs).
 */
exports.getAuthenticatedBlob = catchAsync(async (req, res, next) => {
  const { folder, entityId, filename } = req.params;

  // 2026 Security: Prevent path traversal
  if (!validatePathSegment(folder) || !validatePathSegment(entityId) || !validatePathSegment(filename)) {
    return next(new AppError('Invalid file path.', 400));
  }

  const storageKey = `/${folder}/${entityId}/${filename}`;
  const absolutePath = storageService.getAbsolutePath(storageKey);

  if (!fs.existsSync(absolutePath)) {
    return next(new AppError('File not found', 404));
  }

  if (folder === 'submissions') {
    await authorizeSubmissionBlob(req.user, entityId);
  }

  res.sendFile(absolutePath);
});

async function authorizeSubmissionBlob(user, submissionId) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      team: { include: { members: true } },
      hackathon: { select: { organizerId: true } },
    },
  });

  if (!submission) {
    throw new AppError('Submission not found.', 404);
  }

  if (user.role === 'ADMIN') return;

  const isTeamMember = submission.team.members.some((member) => member.userId === user.id);
  const isOrganizer = submission.hackathon.organizerId === user.id;
  if (isTeamMember || isOrganizer) return;

  const staff = await prisma.staffAssignment.findFirst({
    where: {
      userId: user.id,
      hackathonId: submission.hackathonId,
      isActive: true,
      staffRole: { in: ['CO_ORGANIZER', 'TECHNICAL_LEAD', 'JUDGE'] },
    },
  });

  if (!staff) {
    throw new AppError('You do not have access to this submission file.', 403);
  }
}
