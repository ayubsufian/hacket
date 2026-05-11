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
  const { email, password } = req.body;

  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('User already exists', 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'ADMIN',
      verificationStatus: 'VERIFIED'
    }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'ADMIN_PROVISIONED',
    entity: 'user',
    entityId: admin.id,
    details: { email }
  });

  res.status(201).json({
    success: true,
    message: 'Administrator successfully provisioned.',
    data: { user: { id: admin.id, email: admin.email, role: admin.role } }
  });
});

// ─── AF2: Account Suspension ────────────────────────────────────────────

exports.suspendUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false }
  });

  // Mathematically revoke active session tokens in PostgreSQL AND Redis
  await prisma.session.deleteMany({ where: { userId: id } });
  await destroySession(id);

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'USER_SUSPENDED',
    entity: 'user',
    entityId: id,
    details: { email: user.email }
  });

  res.status(200).json({
    success: true,
    message: 'User account suspended and session tokens revoked.'
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
