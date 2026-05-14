const fs = require('fs');
const storageService = require('../services/storage/storage.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

/**
 * Serves a public blob.
 */
exports.getPublicBlob = catchAsync(async (req, res, next) => {
  const { folder, entityId, filename } = req.params;
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
  // At this point, the authenticate middleware has already run.
  // We could add extra checks here to ensure the user is an admin/judge/organizer.
  // For now, we enforce Authenticated Only.
  const { folder, entityId, filename } = req.params;
  const storageKey = `/${folder}/${entityId}/${filename}`;
  const absolutePath = storageService.getAbsolutePath(storageKey);

  if (!fs.existsSync(absolutePath)) {
    return next(new AppError('File not found', 404));
  }

  res.sendFile(absolutePath);
});
