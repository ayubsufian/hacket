// =============================================================================
// HackET - Teams Controller
// =============================================================================

const teamsService = require('../services/teams/teams.service');
const catchAsync = require('../utils/catchAsync');

exports.list = catchAsync(async (req, res) => {
  const result = await teamsService.list(req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.getMine = catchAsync(async (req, res) => {
  const result = await teamsService.getMine(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

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
  const team = await teamsService.getById(req.params.id, req.user.id);

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

exports.requestToJoin = catchAsync(async (req, res) => {
  const request = await teamsService.requestToJoin({
    teamId: req.params.id,
    requesterId: req.user.id,
    message: req.body.message,
  });

  res.status(201).json({
    success: true,
    message: 'Join request sent successfully.',
    data: { request },
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

exports.listUserInvitations = catchAsync(async (req, res) => {
  const result = await teamsService.listUserInvitations(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.listTeamInvitations = catchAsync(async (req, res) => {
  const result = await teamsService.listTeamInvitations(
    req.params.id,
    req.user.id,
    req.query
  );

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.cancelInvitation = catchAsync(async (req, res) => {
  const invitation = await teamsService.cancelInvitation(
    req.params.id,
    req.params.invitationId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: 'Invitation cancelled successfully.',
    data: { invitation },
  });
});

exports.transferLeadership = catchAsync(async (req, res) => {
  const team = await teamsService.transferLeadership(
    req.params.id,
    req.user.id,
    req.body.newLeaderUserId
  );

  res.status(200).json({
    success: true,
    message: 'Leadership transferred successfully.',
    data: { team },
  });
});

exports.kickMember = catchAsync(async (req, res) => {
  const result = await teamsService.kickMember(
    req.params.id,
    req.params.userId,
    req.user.id
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

exports.disband = catchAsync(async (req, res) => {
  const result = await teamsService.disband(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

exports.leave = catchAsync(async (req, res) => {
  const result = await teamsService.leave(req.params.id, req.user.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});
