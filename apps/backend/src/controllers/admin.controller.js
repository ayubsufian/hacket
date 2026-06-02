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
const { redisClient } = require('../config/redis');
const { normalizePagination, buildPagination } = require('../utils/pagination');

const userListSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  verificationStatus: true,
  suspendedAt: true,
  createdAt: true,
  updatedAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      avatarUrl: true,
      university: true,
      city: true,
      region: true,
    },
  },
  organizationMemberships: {
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true, logoUrl: true },
      },
    },
  },
  _count: {
    select: {
      teamMemberships: true,
      registrations: true,
      sessions: true,
      certificates: true,
    },
  },
};

function auditAdminAction(req, action, entity, entityId, details = {}) {
  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action,
    entity,
    entityId,
    details,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
}

function makeContainsFilter(fields, q) {
  if (!q) return undefined;
  return fields.map((field) => ({ [field]: { contains: q, mode: 'insensitive' } }));
}

function sanitizeJob(job, type) {
  return {
    ...job,
    type,
  };
}

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

exports.listUsers = catchAsync(async (req, res) => {
  const { q, role, status, verificationStatus } = req.query;
  const { page, limit, skip } = normalizePagination(req.query, { defaultLimit: 25, maxLimit: 100 });

  const where = {};
  if (role) where.role = role;
  if (verificationStatus) where.verificationStatus = verificationStatus;
  if (status === 'active') where.isActive = true;
  if (status === 'suspended') where.isActive = false;

  const search = makeContainsFilter(['email'], q);
  if (search) {
    where.OR = [
      ...search,
      { profile: { is: { firstName: { contains: q, mode: 'insensitive' } } } },
      { profile: { is: { lastName: { contains: q, mode: 'insensitive' } } } },
    ];
  }

  const [total, users] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: userListSelect,
    }),
  ]);

  res.status(200).json({
    success: true,
    data: { users },
    pagination: buildPagination({ page, limit, total }),
  });
});

exports.getUserDetail = catchAsync(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      ...userListSelect,
      authProvider: true,
      suspensionReason: true,
      profile: true,
      teamMemberships: {
        orderBy: { joinedAt: 'desc' },
        include: {
          team: {
            select: {
              id: true,
              name: true,
              hackathonId: true,
              hackathon: { select: { id: true, title: true, status: true } },
              submission: { select: { id: true, title: true, status: true, finalScore: true, rank: true } },
            },
          },
        },
      },
      registrations: {
        orderBy: { createdAt: 'desc' },
        include: { hackathon: { select: { id: true, title: true, status: true } } },
      },
      sessions: {
        orderBy: { lastActiveAt: 'desc' },
        select: {
          id: true,
          userAgent: true,
          ipAddress: true,
          lastActiveAt: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
      },
      certificates: {
        orderBy: { issuedAt: 'desc' },
        select: { id: true, title: true, type: true, awardTier: true, status: true, issuedAt: true },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

exports.changeUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role, reason } = req.body;

  if (id === req.user.id && role !== 'ADMIN') {
    throw new AppError('You cannot remove your own administrator role.', 400);
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!target) throw new AppError('User not found.', 404);
  if (!target.isActive) throw new AppError('Cannot change the role of a suspended user.', 409);
  if (target.role === role) throw new AppError('User already has that role.', 400);

  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: userListSelect,
  });

  auditAdminAction(req, 'USER_ROLE_CHANGED', 'user', id, {
    email: target.email,
    from: target.role,
    to: role,
    reason: reason || null,
  });

  res.status(200).json({
    success: true,
    message: 'User role updated successfully.',
    data: { user },
  });
});

exports.listHackathons = catchAsync(async (req, res) => {
  const { q, status, organizerId, organizationId } = req.query;
  const { page, limit, skip } = normalizePagination(req.query, { defaultLimit: 25, maxLimit: 100 });

  const where = {};
  if (status) where.status = status;
  if (organizerId) where.organizerId = organizerId;
  if (organizationId) where.organizationId = organizationId;
  const search = makeContainsFilter(['title', 'description', 'region'], q);
  if (search) where.OR = search;

  const [total, hackathons] = await prisma.$transaction([
    prisma.hackathon.count({ where }),
    prisma.hackathon.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        region: true,
        eventStart: true,
        eventEnd: true,
        registrationStart: true,
        registrationEnd: true,
        organizer: { select: { id: true, email: true, profile: { select: { firstName: true, lastName: true } } } },
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { teams: true, registrations: true, submissions: true, discussions: true } },
      },
    }),
  ]);

  res.status(200).json({
    success: true,
    data: { hackathons },
    pagination: buildPagination({ page, limit, total }),
  });
});

exports.changeHackathonStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id },
    select: { id: true, title: true, status: true },
  });
  if (!hackathon) throw new AppError('Hackathon not found.', 404);
  if (hackathon.status === status) throw new AppError('Hackathon already has that status.', 400);

  const updated = await prisma.hackathon.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      title: true,
      status: true,
      updatedAt: true,
      organizerId: true,
      organizationId: true,
    },
  });

  auditAdminAction(req, 'HACKATHON_STATUS_CHANGED', 'hackathon', id, {
    title: hackathon.title,
    from: hackathon.status,
    to: status,
    reason: reason || null,
  });

  res.status(200).json({
    success: true,
    message: 'Hackathon status updated successfully.',
    data: { hackathon: updated },
  });
});

exports.listJobs = catchAsync(async (req, res) => {
  const { type, status, hackathonId } = req.query;
  const { page, limit } = normalizePagination(req.query, { defaultLimit: 25, maxLimit: 100 });
  const perTypeTake = page * limit;

  const selectedTypes = type ? [type] : ['report', 'archive', 'analytics', 'certificate'];
  const queries = [];

  if (selectedTypes.includes('report')) {
    const where = {};
    if (status) where.status = status;
    if (hackathonId) where.hackathonId = hackathonId;
    queries.push(prisma.reportJob.findMany({
      where,
      take: perTypeTake,
      orderBy: { createdAt: 'desc' },
      include: { file: true, hackathon: { select: { id: true, title: true } }, createdByUser: { select: { id: true, email: true } } },
    }).then((rows) => rows.map((job) => sanitizeJob(job, 'report'))));
  }

  if (selectedTypes.includes('archive')) {
    const where = {};
    if (status) where.status = status;
    if (hackathonId) where.hackathonId = hackathonId;
    queries.push(prisma.archiveJob.findMany({
      where,
      take: perTypeTake,
      orderBy: { createdAt: 'desc' },
      include: { hackathon: { select: { id: true, title: true } }, createdByUser: { select: { id: true, email: true } } },
    }).then((rows) => rows.map((job) => sanitizeJob(job, 'archive'))));
  }

  if (selectedTypes.includes('analytics')) {
    const where = {};
    if (status) where.status = status;
    if (hackathonId) where.hackathonId = hackathonId;
    queries.push(prisma.analyticsJob.findMany({
      where,
      take: perTypeTake,
      orderBy: { createdAt: 'desc' },
      include: { hackathon: { select: { id: true, title: true } }, createdByUser: { select: { id: true, email: true } } },
    }).then((rows) => rows.map((job) => sanitizeJob(job, 'analytics'))));
  }

  if (selectedTypes.includes('certificate')) {
    const where = {};
    if (status) where.status = status;
    if (hackathonId) where.hackathonId = hackathonId;
    queries.push(prisma.certificateIssuanceJob.findMany({
      where,
      take: perTypeTake,
      orderBy: { createdAt: 'desc' },
      include: { hackathon: { select: { id: true, title: true } }, createdByUser: { select: { id: true, email: true } } },
    }).then((rows) => rows.map((job) => sanitizeJob(job, 'certificate'))));
  }

  const countQueries = selectedTypes.map((jobType) => {
    const where = {};
    if (status) where.status = status;
    if (hackathonId) where.hackathonId = hackathonId;
    if (jobType === 'report') return prisma.reportJob.count({ where });
    if (jobType === 'archive') return prisma.archiveJob.count({ where });
    if (jobType === 'analytics') return prisma.analyticsJob.count({ where });
    return prisma.certificateIssuanceJob.count({ where });
  });

  const [jobGroups, counts] = await Promise.all([
    Promise.all(queries),
    Promise.all(countQueries),
  ]);

  const allJobs = jobGroups
    .flat()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const total = counts.reduce((sum, value) => sum + value, 0);
  const start = (page - 1) * limit;
  const jobs = allJobs.slice(start, start + limit);

  res.status(200).json({
    success: true,
    data: { jobs },
    pagination: buildPagination({ page, limit, total }),
  });
});

exports.cancelJob = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { type, reason } = req.body;
  const requestedTypes = type ? [type] : ['report', 'archive', 'analytics', 'certificate'];
  const cancellationData = {
    cancelledAt: new Date(),
    cancellationReason: reason || null,
  };

  let cancelled = null;
  for (const jobType of requestedTypes) {
    if (jobType === 'report') {
      const job = await prisma.reportJob.findUnique({ where: { id } });
      if (job) {
        if (!['PENDING', 'RUNNING'].includes(job.status)) throw new AppError('Only pending or running jobs can be cancelled.', 409);
        cancelled = await prisma.reportJob.update({
          where: { id },
          data: { status: 'CANCELLED', ...cancellationData },
        });
        cancelled.type = 'report';
        break;
      }
    }
    if (jobType === 'archive') {
      const job = await prisma.archiveJob.findUnique({ where: { id } });
      if (job) {
        if (!['PENDING', 'RUNNING'].includes(job.status)) throw new AppError('Only pending or running jobs can be cancelled.', 409);
        cancelled = await prisma.archiveJob.update({
          where: { id },
          data: { status: 'CANCELLED', ...cancellationData },
        });
        cancelled.type = 'archive';
        break;
      }
    }
    if (jobType === 'analytics') {
      const job = await prisma.analyticsJob.findUnique({ where: { id } });
      if (job) {
        if (!['PENDING', 'RUNNING'].includes(job.status)) throw new AppError('Only pending or running jobs can be cancelled.', 409);
        cancelled = await prisma.analyticsJob.update({
          where: { id },
          data: { status: 'CANCELLED', ...cancellationData },
        });
        cancelled.type = 'analytics';
        break;
      }
    }
    if (jobType === 'certificate') {
      const job = await prisma.certificateIssuanceJob.findUnique({ where: { id } });
      if (job) {
        if (!['PENDING', 'RUNNING'].includes(job.status)) throw new AppError('Only pending or running jobs can be cancelled.', 409);
        cancelled = await prisma.certificateIssuanceJob.update({
          where: { id },
          data: { status: 'CANCELLED', ...cancellationData },
        });
        cancelled.type = 'certificate';
        break;
      }
    }
  }

  if (!cancelled) throw new AppError('Job not found.', 404);

  auditAdminAction(req, 'JOB_CANCELLED', 'job', id, {
    type: cancelled.type,
    reason: reason || null,
  });

  res.status(200).json({
    success: true,
    message: 'Job cancelled successfully.',
    data: { job: cancelled },
  });
});

exports.getSystemHealth = catchAsync(async (req, res) => {
  const startedAt = Date.now();
  const checks = {
    database: { ok: false },
    redis: { ok: false },
    jobs: {},
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - startedAt };
  } catch (err) {
    checks.database = { ok: false, error: err.message };
  }

  try {
    const redisStartedAt = Date.now();
    const pong = await redisClient.ping();
    checks.redis = { ok: pong === 'PONG', latencyMs: Date.now() - redisStartedAt };
  } catch (err) {
    checks.redis = { ok: false, error: err.message };
  }

  const [report, archive, analytics, certificate] = await Promise.all([
    prisma.reportJob.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.archiveJob.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.analyticsJob.groupBy({ by: ['status'], _count: { id: true } }),
    prisma.certificateIssuanceJob.groupBy({ by: ['status'], _count: { id: true } }),
  ]);

  const asQueueCounts = (rows) => rows.reduce((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {});

  checks.jobs = {
    report: asQueueCounts(report),
    archive: asQueueCounts(archive),
    analytics: asQueueCounts(analytics),
    certificate: asQueueCounts(certificate),
  };

  const healthy = checks.database.ok && checks.redis.ok;
  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
  });
});

exports.reindexSearch = catchAsync(async (req, res) => {
  const [hackathons, discussions] = await Promise.all([
    prisma.hackathon.findMany({
      where: { status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        slug: true,
        region: true,
        updatedAt: true,
      },
    }),
    prisma.discussion.findMany({
      where: { isArchived: false, deletedAt: null },
      select: {
        id: true,
        hackathonId: true,
        title: true,
        body: true,
        category: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);

  await prisma.searchDocument.deleteMany({ where: { source: 'CURRENT' } });
  const documents = [
    ...hackathons.map((hackathon) => ({
      entity: 'hackathon',
      entityId: hackathon.id,
      source: 'CURRENT',
      title: hackathon.title,
      url: `/hackathons/${hackathon.slug || hackathon.id}`,
      searchText: [hackathon.title, hackathon.description, hackathon.region].filter(Boolean).join('\n'),
      metadata: { status: hackathon.status, updatedAt: hackathon.updatedAt },
    })),
    ...discussions.map((discussion) => ({
      entity: 'discussion',
      entityId: discussion.id,
      source: 'CURRENT',
      title: discussion.title,
      url: `/discussions/${discussion.id}`,
      searchText: [discussion.title, discussion.body, discussion.category].filter(Boolean).join('\n'),
      metadata: {
        hackathonId: discussion.hackathonId,
        status: discussion.status,
        category: discussion.category,
        updatedAt: discussion.updatedAt,
      },
    })),
  ];

  if (documents.length > 0) {
    await prisma.searchDocument.createMany({ data: documents });
  }

  auditAdminAction(req, 'SEARCH_REINDEX_REQUESTED', 'searchDocument', null, {
    count: documents.length,
  });

  res.status(202).json({
    success: true,
    message: 'Search reindex completed.',
    data: { indexed: documents.length },
  });
});

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
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
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
