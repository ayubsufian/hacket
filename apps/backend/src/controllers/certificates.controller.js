// =============================================================================
// HackET — Certificates Controller
// =============================================================================

const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const notificationService = require('../services/notifications/notification.service');
const eventBus = require('../utils/eventBus');

// ─── Main Flow: View Certificates ───────────────────────────────────────

exports.getMyCertificates = catchAsync(async (req, res) => {
  const certificates = await prisma.certificate.findMany({
    where: { userId: req.user.id },
    orderBy: { issuedAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    data: { certificates },
  });
});

// ─── AF2: Bulk Issuance by Administrator ────────────────────────────────

exports.bulkIssue = catchAsync(async (req, res) => {
  const { hackathonId, userIds, title, type, metadata } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new AppError('An array of userIds is required.', 400);
  }

  // AF2: Validate completion status (only issue to users who actually submitted)
  const validUsers = [];
  for (const userId of userIds) {
    const isVerified = await prisma.teamMember.findFirst({
      where: {
        userId,
        team: {
          hackathonId,
          submissions: { some: { status: { in: ['SUBMITTED', 'SCORED', 'FINALIZED'] } } }
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
      type: type || 'PARTICIPATION',
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
