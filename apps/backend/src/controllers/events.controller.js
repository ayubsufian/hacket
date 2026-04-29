// =============================================================================
// HackET — Events Controller
// =============================================================================

const eventsService = require('../services/events/events.service');
const catchAsync = require('../utils/catchAsync');

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

exports.list = catchAsync(async (req, res) => {
  const { status, region, theme, search, page, limit } = req.query;

  const result = await eventsService.list({
    status,
    region,
    theme,
    search,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 12,
  });

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.update = catchAsync(async (req, res) => {
  const hackathon = await eventsService.update(
    req.params.id,
    req.user.id,
    req.body
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
  const team = await eventsService.registerParticipant(
    req.params.id,
    req.user.id
  );

  res.status(201).json({
    success: true,
    message: 'Successfully registered for hackathon.',
    data: { team },
  });
});
