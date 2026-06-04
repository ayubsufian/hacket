// =============================================================================
// HackET — Events Controller
// =============================================================================

const eventsService = require('../services/events/events.service');
const archivingService = require('../services/archiving/archiving.service');
const catchAsync = require('../utils/catchAsync');
const { generateIcs } = require('../utils/calendar');
const AppError = require('../utils/AppError');
const prisma = require('../config/database');

exports.getCalendar = catchAsync(async (req, res) => {
  const hackathon = await eventsService.getById(req.params.id);

  if (!hackathon) {
    throw new AppError('Hackathon not found.', 404);
  }

  if (!hackathon.eventStart || !hackathon.eventEnd) {
    throw new AppError('Calendar export is only available after the event schedule is configured.', 409);
  }

  // 2026 Standard: Respect user's preferred calendar type for Ethiopian date annotation
  let calendarType = 'GREGORIAN';
  if (req.user) {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
      select: { preferredCalendar: true },
    });
    calendarType = profile?.preferredCalendar || 'GREGORIAN';
  }

  // Allow explicit override via query parameter
  if (req.query.calendar === 'ETHIOPIAN' || req.query.calendar === 'GREGORIAN') {
    calendarType = req.query.calendar;
  }

  const icsContent = generateIcs(hackathon, calendarType);

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="hackathon-${hackathon.id}.ics"`
  );

  res.status(200).send(icsContent);
});

exports.getSchedule = catchAsync(async (req, res) => {
  const schedule = await eventsService.getSchedule(req.params.id);

  res.status(200).json({
    success: true,
    data: { schedule },
  });
});

exports.create = catchAsync(async (req, res) => {
  const hackathon = await eventsService.create(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Hackathon created successfully.',
    data: { hackathon },
  });
});

exports.getById = catchAsync(async (req, res) => {
  const hackathon = await eventsService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: { hackathon },
  });
});

exports.listMine = catchAsync(async (req, res) => {
  const { page, limit } = req.query;
  const result = await eventsService.listMine(req.user.id, req.user.role, {
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 50,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.list = catchAsync(async (req, res) => {
  const { status, region, theme, category, schedule, search, page, limit } = req.query;

  let statusArray = ['UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'JUDGING', 'COMPLETED'];

  if (status) {
    // Support both comma-separated strings and arrays
    const parsedStatus = Array.isArray(status) ? status : status.split(',');
    
    // Filter out 'DRAFT' and map to uppercase
    statusArray = parsedStatus
      .filter((s) => s && s.trim().toUpperCase() !== 'DRAFT')
      .map((s) => s.trim().toUpperCase());
      
    // Fallback if they only requested DRAFT or provided an invalid array
    if (statusArray.length === 0) {
      statusArray = ['UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'JUDGING', 'COMPLETED'];
    }
  }

  const result = await eventsService.list({
    status: statusArray,
    region,
    theme,
    category,
    schedule,
    search,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 12,
    actorId: req.user ? req.user.id : null,
  });

  const responsePayload = {
    success: true,
    data: result.data,
    pagination: result.pagination,
  };

  if (result.suggestion) {
    responsePayload.suggestion = result.suggestion;
  }

  res.status(200).json(responsePayload);
});

exports.update = catchAsync(async (req, res) => {
  const hackathon = await eventsService.update(
    req.params.id,
    req.user.id,
    req.body,
    req.eventStaffRole || (req.user.role === 'ADMIN' ? 'ADMIN' : 'PRIMARY_ORGANIZER')
  );

  res.status(200).json({
    success: true,
    message: 'Hackathon updated successfully.',
    data: { hackathon },
  });
});

exports.remove = catchAsync(async (req, res) => {
  await eventsService.delete(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Hackathon deleted successfully.',
  });
});

exports.registerParticipant = catchAsync(async (req, res) => {
  const result = await eventsService.registerParticipant(
    req.params.id,
    req.user.id,
    req.body
  );

  res.status(201).json({
    success: true,
    message: result.status === 'WAITLISTED'
      ? 'Hackathon is full. You have been added to the waitlist.'
      : 'Successfully registered for hackathon.',
    data: result,
  });
});

exports.unregisterParticipant = catchAsync(async (req, res) => {
  const hackathon = await eventsService.unregisterParticipant(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Successfully unregistered from hackathon.',
    data: { hackathon },
  });
});

exports.kickParticipant = catchAsync(async (req, res) => {
  const result = await eventsService.kickParticipant(req.params.id, req.params.userId, req.user.id, req.body.reason);
  res.status(200).json({
    success: true,
    message: 'Participant was successfully kicked from the hackathon.',
    data: { result },
  });
});

exports.getParticipants = catchAsync(async (req, res) => {
  const participants = await eventsService.getParticipants(req.params.id);

  res.status(200).json({
    success: true,
    data: { participants },
  });
});


exports.checkInParticipant = catchAsync(async (req, res) => {
  const registration = await eventsService.checkInParticipant(req.params.id, req.params.userId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Participant checked in successfully.',
    data: { registration },
  });
});

exports.undoCheckIn = catchAsync(async (req, res) => {
  const registration = await eventsService.undoCheckIn(req.params.id, req.params.userId, req.user.id);

  res.status(200).json({
    success: true,
    message: 'Participant check-in reverted successfully.',
    data: { registration },
  });
});

exports.archive = catchAsync(async (req, res) => {
  const filePath = await archivingService.archiveHackathon(
    req.params.id,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Hackathon archival process started successfully.',
    data: { archiveJobPath: filePath },
  });
});

exports.clone = catchAsync(async (req, res) => {
  const hackathon = await eventsService.cloneEvent(
    req.params.id,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'Hackathon cloned successfully.',
    data: { hackathon },
  });
});

exports.getContext = catchAsync(async (req, res) => {
  const context = await eventsService.getContext(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    data: { context },
  });
});

exports.getStats = catchAsync(async (req, res) => {
  const stats = await eventsService.getQuickStats(req.params.id);
  res.status(200).json({
    success: true,
    data: { stats },
  });
});

exports.publish = catchAsync(async (req, res) => {
  const hackathon = await eventsService.publishEvent(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Hackathon published successfully.',
    data: { hackathon },
  });
});

exports.cancel = catchAsync(async (req, res) => {
  const hackathon = await eventsService.cancelEvent(req.params.id, req.user.id, req.body.reason);
  res.status(200).json({
    success: true,
    message: 'Hackathon cancelled successfully.',
    data: { hackathon },
  });
});

exports.complete = catchAsync(async (req, res) => {
  const result = await eventsService.completeEvent(req.params.id, req.user.id, {
    reason: req.body.reason,
    source: 'MANUAL',
  });
  res.status(200).json({
    success: true,
    message: result.completion.completedEarly
      ? 'Hackathon judging completed early.'
      : 'Hackathon judging completed.',
    data: result,
  });
});

exports.suspend = catchAsync(async (req, res) => {
  const hackathon = await eventsService.suspendEvent(req.params.id, req.user.id, req.body.reason);
  res.status(200).json({
    success: true,
    message: 'Hackathon suspended successfully.',
    data: { hackathon },
  });
});

exports.resume = catchAsync(async (req, res) => {
  const hackathon = await eventsService.resumeEvent(req.params.id, req.user.id);
  res.status(200).json({
    success: true,
    message: 'Hackathon resumed successfully.',
    data: { hackathon },
  });
});

exports.updateSchedule = catchAsync(async (req, res) => {
  const hackathon = await eventsService.updateSchedule(req.params.id, req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: 'Hackathon schedule updated successfully.',
    data: { hackathon },
  });
});
