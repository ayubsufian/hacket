const discussionsService = require('../services/discussions/discussions.service');
const catchAsync = require('../utils/catchAsync');

exports.createPost = catchAsync(async (req, res) => {
  const { hackathonId, title, body, category } = req.body;
  
  const { post, metadata } = await discussionsService.createPost(
    hackathonId,
    req.user.id,
    title,
    body,
    category
  );

  res.status(201).json({
    success: true,
    data: { post, metadata }
  });
});

exports.createComment = catchAsync(async (req, res) => {
  const { parentId, body } = req.body;
  const discussionId = req.params.id;

  const { comment, metadata } = await discussionsService.createComment(
    discussionId,
    req.user.id,
    parentId,
    body
  );

  res.status(201).json({
    success: true,
    data: { comment, metadata }
  });
});
