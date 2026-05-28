// =============================================================================
// HackET — Staff Role Config Controller
// =============================================================================

const prisma = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const eventBus = require('../utils/eventBus');

exports.getStaffConfigs = catchAsync(async (req, res) => {
  const { eventId } = req.params;

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: eventId },
    select: { defaultMinLeads: true, defaultMaxLeads: true }
  });

  if (!hackathon) throw new AppError('Hackathon not found', 404);

  const configs = await prisma.staffRoleConfig.findMany({
    where: { hackathonId: eventId }
  });

  res.status(200).json({
    success: true,
    data: {
      defaults: hackathon,
      overrides: configs
    }
  });
});

exports.updateStaffConfig = catchAsync(async (req, res) => {
  const { eventId, staffRole } = req.params;
  const { minLeads, maxLeads } = req.body;

  if (minLeads !== undefined && minLeads < 0) {
    throw new AppError('minLeads cannot be negative.', 400);
  }

  if (maxLeads !== undefined && minLeads !== undefined && maxLeads < minLeads) {
    throw new AppError('maxLeads must be greater than or equal to minLeads.', 400);
  }

  const hackathon = await prisma.hackathon.findUnique({
    where: { id: eventId },
    select: { defaultMinLeads: true, defaultMaxLeads: true }
  });

  if (!hackathon) throw new AppError('Hackathon not found', 404);

  const existingConfig = await prisma.staffRoleConfig.findUnique({
    where: { hackathonId_staffRole: { hackathonId: eventId, staffRole } }
  });

  const finalMinLeads = minLeads !== undefined ? minLeads : (existingConfig?.minLeads ?? hackathon.defaultMinLeads);
  const finalMaxLeads = maxLeads !== undefined ? maxLeads : (existingConfig?.maxLeads ?? hackathon.defaultMaxLeads);

  if (finalMaxLeads < finalMinLeads) {
      throw new AppError('maxLeads must be greater than or equal to minLeads.', 400);
  }

  const config = await prisma.staffRoleConfig.upsert({
    where: { hackathonId_staffRole: { hackathonId: eventId, staffRole } },
    update: { minLeads: finalMinLeads, maxLeads: finalMaxLeads },
    create: { hackathonId: eventId, staffRole, minLeads: finalMinLeads, maxLeads: finalMaxLeads }
  });

  eventBus.emit('audit:log', {
    actorId: req.user.id,
    action: 'STAFF_ROLE_CONFIG_UPDATED',
    entity: 'staffRoleConfig',
    entityId: config.id,
    details: { eventId, staffRole, minLeads: finalMinLeads, maxLeads: finalMaxLeads },
  });

  res.status(200).json({
    success: true,
    message: `Configuration for ${staffRole} updated successfully.`,
    data: config
  });
});
