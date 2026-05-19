const mentorshipService = require('../services/mentorship/mentorship.service');
const catchAsync = require('../utils/catchAsync');

exports.requestMentor = catchAsync(async (req, res) => {
  const { mentorId, teamId, message } = req.body;
  
  const request = await mentorshipService.requestMentor(
    req.user.id,
    mentorId,
    teamId,
    message
  );

  res.status(201).json({
    success: true,
    data: { request }
  });
});

exports.getIncomingRequests = catchAsync(async (req, res) => {
  const requests = await mentorshipService.getIncomingRequests(req.user.id);

  res.status(200).json({
    success: true,
    data: { requests }
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
    data: { request: result }
  });
});

exports.getAssignments = catchAsync(async (req, res) => {
  const assignments = await mentorshipService.getAssignments(req.user.id);

  res.status(200).json({
    success: true,
    data: { assignments }
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
    data: { interaction }
  });
});
