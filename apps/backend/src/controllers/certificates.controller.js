// =============================================================================
// HackET — Certificates Controller
// =============================================================================

const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const notificationService = require('../services/notifications/notification.service');
const eventBus = require('../utils/eventBus');
const { signDownloadToken, verifyDownloadToken } = require('../utils/signedUrl');
const { normalizePagination, buildPagination } = require('../utils/pagination');
const { uploadsRoot } = require('../utils/paths');

const UPLOADS_DIR = uploadsRoot;

async function authorizeCertificateAccess(user, certificate) {
  if (user.role === 'ADMIN' || certificate.userId === user.id) return true;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: certificate.hackathonId },
    select: { organizerId: true },
  });
  if (hackathon?.organizerId === user.id) return true;

  const staff = await prisma.staffAssignment.findFirst({
    where: {
      userId: user.id,
      hackathonId: certificate.hackathonId,
      isActive: true,
      staffRole: { in: ['CO_ORGANIZER', 'FINANCE'] },
    },
  });
  if (staff) return true;

  throw new AppError('Certificate not found.', 404);
}

function certificateDownloadUrl(req, certificate) {
  const token = signDownloadToken({
    purpose: 'certificate-download',
    certificateId: certificate.id,
    userId: certificate.userId,
  });
  return `${req.protocol}://${req.get('host')}/api/v1/certificates/${certificate.id}/download?token=${encodeURIComponent(token)}`;
}

// ─── Main Flow: View Certificates ───────────────────────────────────────

exports.getMyCertificates = catchAsync(async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    orderBy: { issuedAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    data: {
      certificates: certificates.map((certificate) => ({
        ...certificate,
        downloadUrl: certificate.status === 'GENERATED' ? certificateDownloadUrl(req, certificate) : null,
      })),
    },
  });
});

exports.getById = catchAsync(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id: req.params.id },
    include: {
      user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
      hackathon: { select: { id: true, title: true, status: true } },
      issuanceJob: true,
    },
  });

  if (!certificate) throw new AppError('Certificate not found.', 404);
  await authorizeCertificateAccess(req.user, certificate);

  res.status(200).json({
    success: true,
    data: {
      certificate: {
        ...certificate,
        downloadUrl: certificate.status === 'GENERATED' ? certificateDownloadUrl(req, certificate) : null,
      },
    },
  });
});

exports.download = catchAsync(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id: req.params.id },
  });
  if (!certificate) throw new AppError('Certificate not found.', 404);
  await authorizeCertificateAccess(req.user, certificate);

  let tokenOk = false;
  if (req.query.token) {
    try {
      const decoded = verifyDownloadToken(req.query.token, {
        purpose: 'certificate-download',
        certificateId: certificate.id,
      });
      tokenOk = decoded?.userId === certificate.userId;
    } catch (err) {
      tokenOk = false;
    }
  }

  if (!tokenOk && certificate.downloadToken) {
    tokenOk = req.query.token === certificate.downloadToken
      && (!certificate.tokenExpiresAt || new Date(certificate.tokenExpiresAt) > new Date());
  }

  if (!tokenOk) {
    throw new AppError('A valid certificate download token is required.', 403);
  }

  if (certificate.status !== 'GENERATED') {
    throw new AppError('Certificate is not available for download.', 409);
  }

  if (!certificate.storagePath && certificate.certificateUrl) {
    return res.redirect(certificate.certificateUrl);
  }
  if (!certificate.storagePath) {
    throw new AppError('Certificate file has not been generated yet.', 404);
  }

  const absolutePath = path.join(UPLOADS_DIR, certificate.storagePath.replace(/^[/\\]+/, ''));
  if (!fs.existsSync(absolutePath)) {
    throw new AppError('Certificate file not found.', 404);
  }

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'CERTIFICATE_DOWNLOADED',
    entity: 'certificate',
    entityId: certificate.id,
    details: { hackathonId: certificate.hackathonId },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.set({
    'Content-Type': certificate.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="certificate-${certificate.id}"`,
  });
  res.sendFile(absolutePath);
});

exports.listHackathonCertificates = catchAsync(async (req, res) => {
  const { type, status, q } = req.query;
  const { page, limit, skip } = normalizePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const where = { hackathonId: req.params.hackathonId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { user: { is: { email: { contains: q, mode: 'insensitive' } } } },
      { user: { is: { profile: { is: { firstName: { contains: q, mode: 'insensitive' } } } } } },
      { user: { is: { profile: { is: { lastName: { contains: q, mode: 'insensitive' } } } } } },
    ];
  }

  const [total, certificates] = await prisma.$transaction([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issuedAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        issuanceJob: { select: { id: true, status: true, createdAt: true } },
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: { certificates },
    pagination: buildPagination({ page, limit, total }),
  });
});

// ─── AF2: Bulk Issuance by Administrator ────────────────────────────────

exports.bulkIssue = catchAsync(async (req, res) => {
  const { hackathonId, userIds, title, type, awardTier, metadata } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError('An array of userIds is required.', 400);
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: hackathonId },
    select: { organizerId: true },
  });
  if (!hackathon) throw new AppError('Hackathon not found.', 404);
  if (req.user.role !== 'ADMIN' && hackathon.organizerId !== req.user.id) {
    throw new AppError('Only the event organizer or an administrator can issue certificates.', 403);
  }

  // AF2: Validate completion status (only issue to users who actually submitted)
  const validUsers = [];
  for (const userId of userIds) {
    const isVerified = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: {
          hackathonId,
          submission: { is: { status: { in: ['SUBMITTED', 'SCORED'] } } }
        }
      }
    });
    if (isVerified) {
      validUsers.push(userId);
    }
  }

  // Execute Main Flow for validated users
  const issued = [];
  for (const userId of validUsers) {
    const cert = await notificationService.issueCertificate({
      userId,
      hackathonId,
      title,
      type,
      awardTier,
      issuedBy: req.user.id,
      metadata: metadata || {}
    });
    issued.push(cert);
  }

  res.status(200).json({
    success: true,
    message: `Successfully validated and issued ${issued.length} certificates.`,
    data: { issued, invalidCount: userIds.length - issued.length },
  });
});

exports.revoke = catchAsync(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id: req.params.id },
  });
  if (!certificate) throw new AppError('Certificate not found.', 404);

  const updated = await prisma.certificate.update({
    where: { id: certificate.id },
    data: {
      status: 'FAILED',
      downloadToken: null,
      tokenExpiresAt: new Date(),
      generationError: { revokedBy: req.user.id, reason: req.body.reason || null },
    },
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'CERTIFICATE_REVOKED',
    entity: 'certificate',
    entityId: certificate.id,
    details: { reason: req.body.reason || null },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(200).json({
    success: true,
    message: 'Certificate revoked.',
    data: { certificate: updated },
  });
});

exports.regenerate = catchAsync(async (req, res) => {
  const certificate = await prisma.certificate.findUnique({
    where: { id: req.params.id },
    include: { hackathon: { select: { organizerId: true } } },
  });
  if (!certificate) throw new AppError('Certificate not found.', 404);
  if (req.user.role !== 'ADMIN' && certificate.hackathon.organizerId !== req.user.id) {
    throw new AppError('Only the event organizer or an administrator can regenerate certificates.', 403);
  }

  const job = await prisma.certificateIssuanceJob.create({
    data: {
      hackathonId: certificate.hackathonId,
      createdBy: req.user.id,
      payload: {
        certificateId: certificate.id,
        userId: certificate.userId,
        type: certificate.type,
        awardTier: certificate.awardTier,
      },
    },
  });

  const updated = await prisma.certificate.update({
    where: { id: certificate.id },
    data: {
      status: 'PENDING',
      issuanceJobId: job.id,
      generationError: null,
      downloadToken: null,
      tokenExpiresAt: null,
    },
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'CERTIFICATE_REGENERATE_REQUESTED',
    entity: 'certificate',
    entityId: certificate.id,
    details: { jobId: job.id },
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.status(202).json({
    success: true,
    message: 'Certificate regeneration queued.',
    data: { certificate: updated, job },
  });
});

// ─── AF1: Notification Link Failure ─────────────────────────────────────

exports.reportBrokenLink = catchAsync(async (req, res) => {
  const { id } = req.params; // Certificate ID

  const certificate = await prisma.certificate.findUnique({
    where: { id }
  });

  if (!certificate || certificate.userId !== req.user.id) {
    throw new AppError('Certificate not found.', 404);
  }

  // AF1: System logs the link failure
  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'CERTIFICATE_LINK_FAILURE',
    entity: 'certificate',
    entityId: id,
    details: { message: `Participant reported a broken repository link for certificate ${id}.` }
  });

  // AF1: System attempts to correct the link and sends a follow-up notification
  const correctedUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'}/certificates/${id}/download`;

  await notificationService.create({
    userId: req.user.id,
    type: 'SYSTEM_ALERT',
    title: 'Corrected Certificate Link 🛠️',
    message: `We detected a broken link for your "${certificate.title}" certificate. You can safely download it here: ${correctedUrl}`,
    metadata: { certificateId: id, url: correctedUrl }
  });

  res.status(200).json({
    success: true,
    message: 'Link failure reported. A corrected link has been sent to your dashboard notifications.',
  });
});
