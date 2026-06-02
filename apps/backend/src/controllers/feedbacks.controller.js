const feedbacksService = require('../services/events/feedbacks.service');
const catchAsync = require('../utils/catchAsync');

exports.getMyFeedback = catchAsync(async (req, res) => {
  const feedback = await feedbacksService.getMyFeedback(req.user.id, req.params.eventId);

  res.status(200).json({
    success: true,
    data: { feedback },
  });
});

exports.listFeedback = catchAsync(async (req, res) => {
  const result = await feedbacksService.listForHackathon(req.params.eventId, req.query, req.user);

  res.status(200).json({
    success: true,
    data: { feedbacks: result.data, summary: result.summary },
    pagination: result.pagination,
  });
});

exports.getSummary = catchAsync(async (req, res) => {
  const summary = await feedbacksService.getSummary(req.params.eventId, req.user);

  res.status(200).json({
    success: true,
    data: { summary },
  });
});

exports.exportCsv = catchAsync(async (req, res) => {
  const csv = await feedbacksService.exportCsv(req.params.eventId, req.user);

  res.set({
    'Content-Type': 'text/csv',
    'Content-Disposition': `attachment; filename="hacket-feedback-${req.params.eventId}.csv"`,
  });
  res.send(csv);
});

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
