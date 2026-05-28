const feedbacksService = require('../services/events/feedbacks.service');
const catchAsync = require('../utils/catchAsync');

exports.submitRating = catchAsync(async (req, res) => {
  const { orgRating, rulesRating, judgingRating, comment } = req.body;
  const hackathonId = req.params.eventId;
  
  const feedback = await feedbacksService.submitRating(
    req.user.id,
    hackathonId,
    orgRating,
    rulesRating,
    judgingRating,
    comment
  );

  res.status(201).json({
    success: true,
    data: { feedback }
  });
});
