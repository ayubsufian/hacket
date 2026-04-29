// =============================================================================
// HackET — Teams Controller
// =============================================================================

const teamsService = require('../services/teams/teams.service');
const catchAsync = require('../utils/catchAsync');

exports.create = catchAsync(async (req, res) => {
  const { hackathonId, name, description, neededSkills } = req.body;

  const team = await teamsService.create({
    hackathonId,
    userId: req.user.id,
    name,
    description,
    neededSkills,
  });

  res.status(201).json({
    success: true,
    message: 'Team created successfully.',
    data: { team },
  });
});

exports.getById = catchAsync(async (req, res) => {
  const team = await teamsService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: { team },
  });
});

exports.update = catchAsync(async (req, res) => {
  const team = await teamsService.update(req.params.id, req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: 'Team updated successfully.',
    data: { team },
  });
});

exports.sendInvitation = catchAsync(async (req, res) => {
  const invitation = await teamsService.sendInvitation({
    teamId: req.params.id,
    senderId: req.user.id,
    receiverId: req.body.receiverId,
    message: req.body.message,
  });

  res.status(201).json({
    success: true,
    message: 'Invitation sent successfully.',
    data: { invitation },
  });
});

exports.respondToInvitation = catchAsync(async (req, res) => {
  const result = await teamsService.respondToInvitation(
    req.params.id,
    req.user.id,
    req.body.accept
  );

  res.status(200).json({
    success: true,
    message: `Invitation ${result.status.toLowerCase()}.`,
    data: result,
  });
});

exports.leave = catchAsync(async (req, res) => {
  const result = await teamsService.leave(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
