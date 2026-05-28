// =============================================================================
// HackET — Admin Controller
// =============================================================================

const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const auditService = require('../services/audit/audit.service');
const { destroySession } = require('../config/redis');
const bcrypt = require('bcryptjs');
const eventBus = require('../utils/eventBus');
const { createObjectCsvStringifier } = require('csv-writer');
const archivingService = require('../services/archiving/archiving.service');

// ─── Main Flow: Monitoring Dashboard ────────────────────────────────────

exports.getAuditLogs = catchAsync(async (req, res) => {
  const { actorId, action, entity, entityId, from, to, page, limit } = req.query;

  const result = await auditService.query({
    actorId, action, entity, entityId, from, to,
    page: page ? parseInt(page, 10) : 1,
    limit: limit ? parseInt(limit, 10) : 50
  });

  res.status(200).json({
    success: true,
    data: result
  });
});

// ─── AF3: Filter/Export Logs ────────────────────────────────────────────

exports.exportAuditLogs = catchAsync(async (req, res) => {
  const { actorId, action, entity, entityId, from, to } = req.query;

  const result = await auditService.query({
    actorId, action, entity, entityId, from, to,
    page: 1, limit: 10000 // Safely pull up to 10k logs for export
  });

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'createdAt', title: 'Timestamp' },
      { id: 'action', title: 'Action' },
      { id: 'actor', title: 'Actor Email' },
      { id: 'entity', title: 'Entity Type' },
      { id: 'entityId', title: 'Entity ID' },
    ]
  });

  const records = result.data.map(log => ({
    createdAt: log.createdAt.toISOString(),
    action: log.action,
    actor: log.actor?.email || 'SYSTEM',
    entity: log.entity,
    entityId: log.entityId || 'N/A',
  }));

  const csvString = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(records);

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': 'attachment; filename="hacket-audit-logs.csv"',
  });
  
  res.send(csvString);
});

// ─── AF1: Provision Secondary Administrator ─────────────────────────────

exports.provisionAdmin = catchAsync(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400);
  }

  if (!firstName || !lastName) {
    throw new AppError('First name and last name are required.', 400);
  }

  // 2026 Standard: Enforce password complexity even for admin-provisioned accounts
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;
  if (password.length < 8 || !passwordRegex.test(password)) {
    throw new AppError(
      'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
      400
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('A user with this email already exists.', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
      verificationStatus: 'VERIFIED',
      profile: {
        create: {
          firstName,
          lastName,
        }
      }
    },
    include: {
      profile: { select: { firstName: true, lastName: true } }
    }
  });

  // Notify the new admin via email
  eventBus.emit('email:admin_provisioned', {
    email,
    firstName,
    provisionedBy: req.user.email || req.user.id,
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'ADMIN_PROVISIONED',
    entity: 'user',
    entityId: admin.id,
    details: { email, firstName, lastName }
  });

  res.status(201).json({
    success: true,
    message: 'Administrator successfully provisioned.',
    data: { user: { id: admin.id, email: admin.email, role: admin.role, profile: admin.profile } }
  });
});

// ─── AF2: Account Suspension ────────────────────────────────────────────

exports.suspendUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  // 2026 Security: Prevent admin from suspending themselves
  if (id === req.user.id) {
    throw new AppError('You cannot suspend your own account.', 400);
  }

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    throw new AppError('User not found.', 404);
  }

  // 2026 Security: Block admin-to-admin suspension (prevents mutual destruction attacks)
  if (targetUser.role === 'ADMIN') {
    throw new AppError(
      'Administrators cannot suspend other administrators. This action requires direct database intervention for security.',
      403
    );
  }

  if (!targetUser.isActive) {
    throw new AppError('This user is already suspended.', 400);
  }

  // Update user: deactivate and record suspension metadata
  const user = await prisma.user.update({
    where: { id },
    data: {
      isActive: false,
      suspendedAt: new Date(),
      suspensionReason: reason || null,
    }
  });

  // Revoke ALL active sessions: fetch tokens from DB, then destroy each in Redis
  const activeSessions = await prisma.session.findMany({
    where: { userId: id },
    select: { token: true }
  });

  for (const session of activeSessions) {
    await destroySession(session.token);
  }
  await prisma.session.deleteMany({ where: { userId: id } });

  // Notify the suspended user via in-app notification
  const notificationService = require('../services/notifications/notification.service');
  await notificationService.create({
    userId: id,
    type: 'SYSTEM_ALERT',
    title: 'Your account has been suspended',
    message: reason
      ? `Your account has been suspended. Reason: ${reason}. Please contact support for more information.`
      : 'Your account has been suspended. Please contact support for more information.',
    metadata: { suspendedBy: req.user.id, reason: reason || null }
  });

  // Send email notification
  eventBus.emit('email:account_suspended', {
    email: user.email,
    reason: reason || null,
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'USER_SUSPENDED',
    entity: 'user',
    entityId: id,
    details: { email: user.email, reason: reason || null }
  });

  res.status(200).json({
    success: true,
    message: 'User account suspended and all session tokens revoked.'
  });
});

// ─── Unsuspend / Reactivate User ────────────────────────────────────────

exports.unsuspendUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) {
    throw new AppError('User not found.', 404);
  }

  if (targetUser.isActive) {
    throw new AppError('This user is not currently suspended.', 400);
  }

  await prisma.user.update({
    where: { id },
    data: {
      isActive: true,
      suspendedAt: null,
      suspensionReason: null,
    }
  });

  // Notify user
  const notificationService = require('../services/notifications/notification.service');
  await notificationService.create({
    userId: id,
    type: 'SYSTEM_ALERT',
    title: 'Your account has been reactivated',
    message: 'Your account suspension has been lifted. You now have full access to the platform again.',
    metadata: { reactivatedBy: req.user.id }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'USER_UNSUSPENDED',
    entity: 'user',
    entityId: id,
    details: { email: targetUser.email }
  });

  res.status(200).json({
    success: true,
    message: 'User account has been reactivated.'
  });
});

// ─── AF4: Organizer Approval ──────────────────────────────────────────────

exports.listOrganizerVerifications = catchAsync(async (req, res) => {
  const { status = 'UNDER_REVIEW', page, limit } = req.query;
  const allowedStatuses = ['PENDING', 'UNDER_REVIEW', 'REJECTED', 'VERIFIED'];

  if (!allowedStatuses.includes(status)) {
    throw new AppError('Invalid organizer verification status filter.', 400);
  }

  const pageNumber = page ? parseInt(page, 10) : 1;
  const pageSize = limit ? parseInt(limit, 10) : 25;
  const skip = (pageNumber - 1) * pageSize;

  const where = {
    role: 'ORGANIZER',
    verificationStatus: status,
  };

  const [total, organizers] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        email: true,
        verificationStatus: true,
        authProvider: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            firstName: true,
            lastName: true,
            representativeName: true,
          },
        },
        organizationMemberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                contactEmail: true,
                verificationDocUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      organizers,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        pages: Math.ceil(total / pageSize),
      },
    },
  });
});

exports.getOrganizerVerification = catchAsync(async (req, res) => {
  const { id } = req.params;

  const organizer = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      verificationStatus: true,
      authProvider: true,
      createdAt: true,
      updatedAt: true,
      profile: true,
      organizationMemberships: {
        select: {
          role: true,
          organization: true,
        },
      },
    },
  });

  if (!organizer || organizer.role !== 'ORGANIZER') {
    throw new AppError('Organizer account not found.', 404);
  }

  res.status(200).json({
    success: true,
    data: { organizer },
  });
});

exports.approveOrganizer = catchAsync(async (req, res) => {
  const { id } = req.params;

  const target = await prisma.user.findUnique({
    where: { id },
    include: {
      organizationMemberships: {
        include: { organization: true },
      },
    },
  });

  if (!target || target.role !== 'ORGANIZER') {
    throw new AppError('Organizer account not found.', 404);
  }

  if (target.verificationStatus !== 'UNDER_REVIEW') {
    throw new AppError('Organizer must be under review before approval.', 400);
  }

  const organization = target.organizationMemberships?.[0]?.organization;
  if (!organization?.verificationDocUrl) {
    throw new AppError('Organizer verification document must be submitted before approval.', 400);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { verificationStatus: 'VERIFIED' }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'ORGANIZER_APPROVED',
    entity: 'user',
    entityId: id,
    details: { email: user.email }
  });

  res.status(200).json({
    success: true,
    message: 'Organizer has been officially approved and verified.'
  });
});

exports.rejectOrganizer = catchAsync(async (req, res) => {
  const { id } = req.params;

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.role !== 'ORGANIZER') {
    throw new AppError('Organizer account not found.', 404);
  }

  if (!['PENDING', 'UNDER_REVIEW'].includes(target.verificationStatus)) {
    throw new AppError('Only pending or under-review organizers can be rejected.', 400);
  }

  const user = await prisma.user.update({
    where: { id },
    data: { verificationStatus: 'REJECTED' }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'ORGANIZER_REJECTED',
    entity: 'user',
    entityId: id,
    details: { email: user.email }
  });

  res.status(200).json({
    success: true,
    message: 'Organizer registration has been rejected.'
  });
});

// ─── Main Flow: Archive Event Data ──────────────────────────────────────

exports.archiveEvent = catchAsync(async (req, res) => {
  const { id } = req.params;

  const filePath = await archivingService.archiveHackathon(id, req.user.id);

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'HACKATHON_ARCHIVED',
    entity: 'hackathon',
    entityId: id,
    details: { filePath }
  });

  res.status(200).json({
    success: true,
    message: 'Event metadata and discussion data successfully archived.',
    data: { filePath }
  });
});
