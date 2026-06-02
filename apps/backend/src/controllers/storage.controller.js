const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const storageService = require('../services/storage/storage.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');
const eventBus = require('../utils/eventBus');

const FOLDER_RULES = {
  profiles: {
    maxSize: 5 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accessLevel: 'PUBLIC',
  },
  submissions: {
    maxSize: 50 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'application/zip', 'image/png', 'image/jpeg', 'video/mp4', 'text/plain'],
    accessLevel: 'PRIVATE',
  },
  events: {
    maxSize: 15 * 1024 * 1024,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    accessLevel: 'PUBLIC',
  },
  awards: {
    maxSize: 20 * 1024 * 1024,
    mimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    accessLevel: 'PRIVATE',
  },
};

/**
 * 2026 Security: Validate path segments to prevent path traversal attacks
 */
const validatePathSegment = (segment) => {
  if (!segment || segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
    return false;
  }
  return true;
};

exports.upload = catchAsync(async (req, res) => {
  const { folder } = req.params;
  const { entityId } = req.body;
  if (!validatePathSegment(folder) || !validatePathSegment(entityId)) {
    throw new AppError('Invalid upload target.', 400);
  }
  if (!req.file) throw new AppError('A file is required.', 400);

  const rule = FOLDER_RULES[folder];
  if (!rule) throw new AppError('Unsupported upload folder.', 400);
  if (req.file.size > rule.maxSize) throw new AppError('File exceeds the allowed size for this folder.', 413);
  if (!rule.mimeTypes.includes(req.file.mimetype)) throw new AppError('File type is not allowed for this folder.', 400);

  await authorizeFolderWrite(req.user, folder, entityId);
  await scanFileOrThrow(req.file.path);

  const filename = safeFilename(req.file.originalname);
  const storageKey = `/${folder}/${entityId}/${Date.now()}-${filename}`;
  const checksum = crypto.createHash('sha256').update(fs.readFileSync(req.file.path)).digest('hex');
  await storageService.moveToBlobStorage(req.file.path, storageKey);

  const storedFile = await prisma.storedFile.create({
    data: {
      storageKey,
      folder,
      entityId,
      filename: path.basename(storageKey),
      ownerId: req.user.id,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      checksum,
      accessLevel: rule.accessLevel,
    },
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STORAGE_FILE_UPLOADED',
    entity: 'storedFile',
    entityId: storedFile.id,
    details: { folder, entityId, storageKey },
  });

  res.status(201).json({
    success: true,
    data: {
      file: storedFile,
      url: `/api/v1/storage/${folder}/${entityId}/${storedFile.filename}`,
    },
  });
});

exports.deleteBlob = catchAsync(async (req, res) => {
  const { folder, entityId, filename } = req.params;
  if (!validatePathSegment(folder) || !validatePathSegment(entityId) || !validatePathSegment(filename)) {
    throw new AppError('Invalid file path.', 400);
  }

  await authorizeFolderDelete(req.user, folder, entityId);
  const storageKey = `/${folder}/${entityId}/${filename}`;
  const storedFile = await prisma.storedFile.findFirst({
    where: { storageKey, isDeleted: false },
  });
  if (!storedFile) throw new AppError('Stored file not found.', 404);

  const updated = await prisma.storedFile.update({
    where: { id: storedFile.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: req.user.id,
    },
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STORAGE_FILE_DELETED',
    entity: 'storedFile',
    entityId: storedFile.id,
    details: { folder, entityId, storageKey },
  });

  res.status(200).json({
    success: true,
    message: 'File deleted.',
    data: { file: updated },
  });
});

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
  const storedFile = await prisma.storedFile.findUnique({ where: { storageKey } });
  if (storedFile?.isDeleted) {
    return next(new AppError('File not found', 404));
  }
  if (storedFile?.accessLevel === 'PRIVATE') {
    return next(new AppError('Authentication is required for this file.', 401));
  }
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
  const storedFile = await prisma.storedFile.findUnique({ where: { storageKey } });
  if (storedFile?.isDeleted) {
    return next(new AppError('File not found', 404));
  }
  if (storedFile && storedFile.accessLevel === 'PRIVATE') {
    await authorizeFolderRead(req.user, folder, entityId);
  }
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

async function authorizeFolderWrite(user, folder, entityId) {
  if (user.role === 'ADMIN') return;
  if (folder === 'profiles' && entityId === user.id) return;
  if (folder === 'submissions') return authorizeSubmissionBlob(user, entityId);
  if (folder === 'events') return authorizeHackathonMedia(user, entityId);
  if (folder === 'awards') return authorizeHackathonMedia(user, entityId);
  throw new AppError('You do not have upload access for this folder.', 403);
}

async function authorizeFolderDelete(user, folder, entityId) {
  if (user.role === 'ADMIN') return;
  if (folder === 'profiles' && entityId === user.id) return;
  if (folder === 'submissions') return authorizeSubmissionBlob(user, entityId);
  if (folder === 'events' || folder === 'awards') return authorizeHackathonMedia(user, entityId);
  throw new AppError('You do not have deletion access for this folder.', 403);
}

async function authorizeFolderRead(user, folder, entityId) {
  if (folder === 'submissions') return authorizeSubmissionBlob(user, entityId);
  if (folder === 'awards') return authorizeHackathonMedia(user, entityId);
}

async function authorizeHackathonMedia(user, hackathonId) {
  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { organizerId: true },
  });
  if (!hackathon) throw new AppError('Hackathon not found.', 404);
  if (hackathon.organizerId === user.id) return;

  const staff = await prisma.staffAssignment.findFirst({
    where: {
      userId: user.id,
      hackathonId,
      isActive: true,
      staffRole: { in: ['CO_ORGANIZER', 'TECHNICAL_LEAD', 'COMMUNICATIONS'] },
    },
  });
  if (!staff) throw new AppError('You do not have storage access for this hackathon.', 403);
}

function safeFilename(filename) {
  const parsed = path.parse(filename || 'upload.bin');
  const base = parsed.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'upload';
  const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 12);
  return `${base}${ext}`;
}

async function scanFileOrThrow(filePath) {
  const scanner = process.env.VIRUS_SCANNER_COMMAND;
  if (!scanner) return;
  const { execFile } = require('child_process');
  const { promisify } = require('util');
  const execFileAsync = promisify(execFile);
  try {
    await execFileAsync(scanner, [filePath], { timeout: 30000 });
  } catch (err) {
    throw new AppError('File failed security scanning.', 422);
  }
}
