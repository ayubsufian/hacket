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
