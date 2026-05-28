const mentorshipService = require('../services/mentorship/mentorship.service');
const catchAsync = require('../utils/catchAsync');

exports.requestMentor = catchAsync(async (req, res) => {
  const { mentorId, teamId, message, preferredAt } = req.body;

  const request = await mentorshipService.requestMentor(
    req.user.id,
    mentorId,
    teamId,
    message,
    preferredAt
  );

  res.status(201).json({
    success: true,
    data: { request },
  });
});

exports.getIncomingRequests = catchAsync(async (req, res) => {
  const result = await mentorshipService.getIncomingRequests(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.getOutgoingRequests = catchAsync(async (req, res) => {
  const result = await mentorshipService.getOutgoingRequests(req.user.id, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.cancelRequest = catchAsync(async (req, res) => {
  const request = await mentorshipService.cancelRequest(req.user.id, req.params.requestId);

  res.status(200).json({
    success: true,
    message: 'Mentorship request cancelled.',
    data: { request },
  });
});

exports.respondToRequest = catchAsync(async (req, res) => {
  const result = await mentorshipService.respondToRequest(
    req.user.id,
    req.params.requestId,
    req.body.status
  );

  res.status(200).json({
    success: true,
    message: `Mentor request ${req.body.status.toLowerCase()} successfully.`,
    data: { request: result },
  });
});

exports.getAssignments = catchAsync(async (req, res) => {
  const assignments = await mentorshipService.getAssignments(req.user.id);

  res.status(200).json({
    success: true,
    data: { assignments },
  });
});

exports.deactivateAssignment = catchAsync(async (req, res) => {
  const assignment = await mentorshipService.deactivateAssignment(req.user, req.params.id);

  res.status(200).json({
    success: true,
    message: 'Mentor assignment deactivated.',
    data: { assignment },
  });
});

exports.logInteraction = catchAsync(async (req, res) => {
  const { teamId, durationMinutes, notes } = req.body;

  const interaction = await mentorshipService.logInteraction(
    req.user.id,
    teamId,
    durationMinutes,
    notes
  );

  res.status(201).json({
    success: true,
    data: { interaction },
  });
});

exports.getInteractions = catchAsync(async (req, res) => {
  const result = await mentorshipService.getInteractions(req.user, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.findMentors = catchAsync(async (req, res) => {
  const result = await mentorshipService.findMentors(req.params.hackathonId, req.query);

  res.status(200).json({
    success: true,
    data: result.data,
    pagination: result.pagination,
  });
});

exports.createSession = catchAsync(async (req, res) => {
  const result = await mentorshipService.createSession(req.user.id, req.body);

  res.status(201).json({
    success: true,
    message: 'Mentorship session scheduled.',
    data: result,
  });
});
